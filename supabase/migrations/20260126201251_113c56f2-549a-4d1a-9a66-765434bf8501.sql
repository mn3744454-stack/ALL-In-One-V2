-- =====================================================
-- Phase 3.5 Critical Fixes: Rate Limiting Infrastructure
-- =====================================================

-- 1) Create connection_rate_limits table
CREATE TABLE IF NOT EXISTS public.connection_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('accept_connection', 'reject_connection')),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_connection_rate_limits_user_action_time 
  ON public.connection_rate_limits (user_id, action, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_rate_limits_attempted_at 
  ON public.connection_rate_limits (attempted_at DESC);

-- Enable RLS with all-false policies (RPC-only access)
ALTER TABLE public.connection_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct select on connection_rate_limits" ON public.connection_rate_limits;
CREATE POLICY "No direct select on connection_rate_limits" ON public.connection_rate_limits
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "No direct insert on connection_rate_limits" ON public.connection_rate_limits;
CREATE POLICY "No direct insert on connection_rate_limits" ON public.connection_rate_limits
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update on connection_rate_limits" ON public.connection_rate_limits;
CREATE POLICY "No direct update on connection_rate_limits" ON public.connection_rate_limits
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct delete on connection_rate_limits" ON public.connection_rate_limits;
CREATE POLICY "No direct delete on connection_rate_limits" ON public.connection_rate_limits
  FOR DELETE USING (false);

-- 2) Create enforce_rate_limit function
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  _action text,
  _max_attempts int,
  _window_seconds int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _attempt_count int;
BEGIN
  -- Require authenticated user
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the current attempt
  INSERT INTO public.connection_rate_limits (user_id, action, attempted_at)
  VALUES (_user_id, _action, now());

  -- Count attempts within the window
  SELECT COUNT(*) INTO _attempt_count
  FROM public.connection_rate_limits
  WHERE user_id = _user_id
    AND action = _action
    AND attempted_at > now() - (_window_seconds || ' seconds')::interval;

  -- Raise exception if limit exceeded
  IF _attempt_count > _max_attempts THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
END;
$$;

-- 3) Create cleanup_connection_rate_limits function
CREATE OR REPLACE FUNCTION public.cleanup_connection_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_count integer;
BEGIN
  DELETE FROM public.connection_rate_limits
  WHERE attempted_at < now() - interval '1 hour';
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  RETURN _deleted_count;
END;
$$;

-- 4) Patch accept_connection: add rate limiting + fix status to 'active'
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
  
  -- Accept the connection with status='active' (project contract)
  UPDATE public.connections
  SET status = 'active',
      accepted_at = now(),
      accepted_by = _user_id,
      recipient_profile_id = COALESCE(recipient_profile_id, _user_id)
  WHERE id = _conn.id;
  
  -- Log event (preserve existing signature)
  PERFORM public.log_sharing_event(
    'connection_accepted',
    _conn.id,
    NULL,
    _user_id,
    _conn.recipient_tenant_id,
    _conn.initiator_tenant_id,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$function$;

-- 5) Add UNIQUE constraint on connections.token
ALTER TABLE public.connections 
  ADD CONSTRAINT connections_token_unique UNIQUE (token);