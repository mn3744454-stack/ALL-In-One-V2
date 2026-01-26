-- Fix accept_connection: use 'accepted' status (allowed by constraint) and correct log_sharing_event call
CREATE OR REPLACE FUNCTION public.accept_connection(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _user_email text;
BEGIN
  -- Rate limiting at the very top
  PERFORM public.enforce_rate_limit('accept_connection', 5, 60);

  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find connection by token
  SELECT * INTO _conn FROM public.connections WHERE token = _token;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status != 'pending' THEN
    RAISE EXCEPTION 'Connection is not pending';
  END IF;
  
  IF _conn.expires_at IS NOT NULL AND _conn.expires_at < now() THEN
    RAISE EXCEPTION 'Connection has expired';
  END IF;
  
  -- Get user email for matching
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Authorization: user must be valid recipient
  IF _conn.recipient_profile_id IS NOT NULL THEN
    IF _conn.recipient_profile_id != _user_id THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_email IS NOT NULL THEN
    IF _conn.recipient_email != lower(btrim(_user_email)) THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_tenant_id IS NOT NULL THEN
    IF NOT public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.accept') THEN
      RAISE EXCEPTION 'Permission denied: connections.accept required';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid connection recipient configuration';
  END IF;
  
  -- Accept the connection with status='accepted' (matches constraint)
  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = _user_id,
      updated_at = now(),
      recipient_profile_id = COALESCE(recipient_profile_id, _user_id)
  WHERE id = _conn.id;
  
  -- Log event using NAMED arguments to ensure correct parameter binding
  PERFORM public.log_sharing_event(
    _event_type := 'connection_accepted',
    _connection_id := _conn.id,
    _grant_id := NULL,
    _actor_user_id := _user_id,
    _actor_tenant_id := _conn.recipient_tenant_id,
    _target_tenant_id := _conn.initiator_tenant_id,
    _target_profile_id := NULL,
    _resource_type := NULL,
    _resource_ids := NULL,
    _metadata := '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$function$;

-- Fix reject_connection: use named arguments for log_sharing_event
CREATE OR REPLACE FUNCTION public.reject_connection(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
BEGIN
  -- Rate limiting at the very top
  PERFORM public.enforce_rate_limit('reject_connection', 5, 60);

  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _conn FROM public.connections WHERE token = _token;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Connection not found'; 
  END IF;
  
  IF _conn.status <> 'pending' THEN 
    RAISE EXCEPTION 'Connection not pending'; 
  END IF;

  -- Authorization checks based on connection type
  IF _conn.connection_type = 'b2b' THEN
    IF NOT public.is_active_tenant_member(_user_id, _conn.recipient_tenant_id) THEN
      RAISE EXCEPTION 'Not an active member of recipient tenant';
    END IF;
    IF NOT public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.accept') THEN
      RAISE EXCEPTION 'Missing permission: connections.accept';
    END IF;
  END IF;

  IF _conn.connection_type = 'b2c' AND _conn.recipient_profile_id IS NOT NULL THEN
    IF _user_id <> _conn.recipient_profile_id THEN
      RAISE EXCEPTION 'Profile mismatch';
    END IF;
  END IF;

  -- Reject the connection
  UPDATE public.connections
     SET status = 'rejected', 
         updated_at = now()
   WHERE id = _conn.id;

  -- Log event using NAMED arguments to ensure correct parameter binding
  PERFORM public.log_sharing_event(
    _event_type := 'connection_rejected',
    _connection_id := _conn.id,
    _grant_id := NULL,
    _actor_user_id := _user_id,
    _actor_tenant_id := _conn.recipient_tenant_id,
    _target_tenant_id := _conn.initiator_tenant_id,
    _target_profile_id := NULL,
    _resource_type := NULL,
    _resource_ids := NULL,
    _metadata := '{}'::jsonb
  );

  RETURN _conn.id;
END;
$function$;