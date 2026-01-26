-- Add reject_connection RPC to complete the connections lifecycle
CREATE OR REPLACE FUNCTION public.reject_connection(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn connections%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_profile profiles%ROWTYPE;
BEGIN
  -- Look up connection by token
  SELECT * INTO v_conn FROM connections WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  -- Validate status is pending
  IF v_conn.status <> 'pending' THEN
    RAISE EXCEPTION 'Connection is not pending';
  END IF;
  
  -- Check if expired
  IF v_conn.expires_at IS NOT NULL AND v_conn.expires_at < now() THEN
    -- Auto-expire it
    UPDATE connections SET status = 'expired', updated_at = now() WHERE id = v_conn.id;
    RAISE EXCEPTION 'Connection has expired';
  END IF;
  
  -- Get caller's profile for identity validation
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
  
  -- Identity validation: caller must be a valid recipient
  IF v_conn.recipient_profile_id IS NOT NULL THEN
    -- Must be the targeted profile
    IF v_user_id <> v_conn.recipient_profile_id THEN
      RAISE EXCEPTION 'Not authorized to reject this connection';
    END IF;
  ELSIF v_conn.recipient_tenant_id IS NOT NULL THEN
    -- Must be a member of the targeted tenant with permission
    IF NOT EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = v_conn.recipient_tenant_id 
        AND tm.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to reject this connection';
    END IF;
  ELSIF v_conn.recipient_email IS NOT NULL THEN
    -- Caller's profile email must match (case-insensitive)
    IF lower(btrim(COALESCE(v_profile.email, ''))) <> lower(btrim(v_conn.recipient_email)) THEN
      RAISE EXCEPTION 'Email does not match connection recipient';
    END IF;
  ELSIF v_conn.recipient_phone IS NOT NULL THEN
    -- Caller's profile phone must match
    IF btrim(COALESCE(v_profile.phone, '')) <> btrim(v_conn.recipient_phone) THEN
      RAISE EXCEPTION 'Phone does not match connection recipient';
    END IF;
  ELSE
    RAISE EXCEPTION 'Connection has no recipient target';
  END IF;
  
  -- Update connection status to rejected
  UPDATE connections
  SET status = 'rejected',
      updated_at = now()
  WHERE id = v_conn.id;
  
  -- Log the rejection event
  INSERT INTO sharing_audit_log (
    actor_user_id,
    actor_tenant_id,
    action,
    connection_id
  ) VALUES (
    v_user_id,
    v_conn.recipient_tenant_id,
    'connection.rejected',
    v_conn.id
  );
  
  RETURN v_conn.id;
END;
$$;