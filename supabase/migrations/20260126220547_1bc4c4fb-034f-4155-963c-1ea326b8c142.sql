-- Fix accept_connection: when accepting via email/phone, must clear email/phone and set profile_id
-- The constraint requires EXACTLY ONE of (recipient_tenant_id, recipient_profile_id, recipient_email, recipient_phone) to be non-null.

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
  
  -- Accept the connection: 
  -- CRITICAL: Set recipient_profile_id to user, clear email/phone to satisfy constraint
  -- (exactly ONE of recipient_tenant_id, recipient_profile_id, recipient_email, recipient_phone must be non-null)
  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = _user_id,
      updated_at = now(),
      -- Convert email/phone invites to profile-based: set profile_id, clear email/phone
      recipient_profile_id = _user_id,
      recipient_email = NULL,
      recipient_phone = NULL
      -- Note: recipient_tenant_id stays as-is (if it was set, profile becomes user; if null, stays null)
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