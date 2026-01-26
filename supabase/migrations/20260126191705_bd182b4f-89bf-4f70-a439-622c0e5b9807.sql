-- =============================================================
-- Phase 3.4 Part 2: Fix reject_connection return type + add indexes
-- Drop and recreate reject_connection with uuid return type
-- =============================================================

DROP FUNCTION IF EXISTS public.reject_connection(text);

CREATE OR REPLACE FUNCTION public.reject_connection(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
BEGIN
  PERFORM public.enforce_rate_limit('reject_connection', 5, 60);

  SELECT * INTO _conn FROM public.connections WHERE token = _token;

  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found'; END IF;
  IF _conn.status <> 'pending' THEN RAISE EXCEPTION 'Connection not pending'; END IF;

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

  UPDATE public.connections
     SET status = 'rejected', updated_at = now()
   WHERE id = _conn.id;

  PERFORM public.log_sharing_event(
    'connection_rejected',
    _user_id,
    _conn.recipient_tenant_id,
    _conn.id
  );

  RETURN _conn.id;
END;
$$;

-- =============================================================
-- Add performance indexes for audit log (idempotent)
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_actor_tenant_created_at
  ON public.sharing_audit_log (actor_tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_target_tenant_created_at
  ON public.sharing_audit_log (target_tenant_id, created_at DESC);