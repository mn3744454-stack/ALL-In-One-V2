-- Fix audit trigger to only log on UPDATE if granted value changed
CREATE OR REPLACE FUNCTION log_delegation_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_action text;
  v_permission_key text;
  v_target_member_id uuid;
BEGIN
  -- Determine action and values based on TG_OP and TG_TABLE_NAME
  IF TG_TABLE_NAME = 'member_permissions' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END;
      v_permission_key := NEW.permission_key;
      v_target_member_id := NEW.tenant_member_id;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Only log if granted value actually changed
      IF NEW.granted IS DISTINCT FROM OLD.granted THEN
        v_action := CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END;
        v_permission_key := NEW.permission_key;
        v_target_member_id := NEW.tenant_member_id;
      ELSE
        -- No change in granted status, skip logging
        RETURN NEW;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'override_removed';
      v_permission_key := OLD.permission_key;
      v_target_member_id := OLD.tenant_member_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'member_permission_bundles' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'bundle_assigned';
      v_permission_key := NEW.bundle_id::text;
      v_target_member_id := NEW.tenant_member_id;
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'bundle_removed';
      v_permission_key := OLD.bundle_id::text;
      v_target_member_id := OLD.tenant_member_id;
    END IF;
  END IF;

  -- Get tenant_id from tenant_members
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_members
  WHERE id = v_target_member_id;

  -- Insert audit log
  INSERT INTO delegation_audit_log (
    tenant_id,
    actor_user_id,
    target_member_id,
    permission_key,
    action
  ) VALUES (
    v_tenant_id,
    auth.uid(),
    v_target_member_id,
    v_permission_key,
    v_action
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;