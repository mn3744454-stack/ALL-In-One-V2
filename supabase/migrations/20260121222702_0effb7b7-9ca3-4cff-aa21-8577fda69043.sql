
-- =========================================================
-- P1.1: Fix search_path for set_daily_sample_number
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_daily_sample_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.daily_number IS NULL THEN
    SELECT COALESCE(MAX(daily_number), 0) + 1 INTO NEW.daily_number
    FROM public.lab_samples
    WHERE tenant_id = NEW.tenant_id
      AND DATE(created_at AT TIME ZONE '+03:00') = DATE(NOW() AT TIME ZONE '+03:00');
  END IF;
  RETURN NEW;
END;
$function$;

-- =========================================================
-- P2.1: Audit trigger for permission_bundles (uses existing log_role_change)
-- =========================================================
DROP TRIGGER IF EXISTS trg_audit_permission_bundles ON public.permission_bundles;

CREATE TRIGGER trg_audit_permission_bundles
  AFTER INSERT OR UPDATE OR DELETE ON public.permission_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- =========================================================
-- P2.2: Audit trigger for bundle_permissions (DEDICATED, derives tenant_id safely)
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_bundle_permissions_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_tenant_id uuid;
  v_action text;
  v_row_id text;
  v_bundle_id uuid;
  v_perm_key text;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_bundle_id := COALESCE(NEW.bundle_id, OLD.bundle_id);
  v_perm_key  := COALESCE(NEW.permission_key, OLD.permission_key);

  -- Derive tenant_id from permission_bundles
  SELECT pb.tenant_id
    INTO v_tenant_id
  FROM public.permission_bundles pb
  WHERE pb.id = v_bundle_id;

  -- If we can't resolve tenant_id, skip logging to avoid breaking writes
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'permission_added_to_bundle';
    v_row_id := (v_bundle_id::text || ':' || v_perm_key);
    INSERT INTO public.role_audit_log (
      tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
    ) VALUES (
      v_tenant_id, v_actor, 'bundle_permissions', v_action, v_row_id,
      NULL,
      jsonb_build_object('bundle_id', v_bundle_id, 'permission_key', v_perm_key)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'permission_removed_from_bundle';
    v_row_id := (v_bundle_id::text || ':' || v_perm_key);
    INSERT INTO public.role_audit_log (
      tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
    ) VALUES (
      v_tenant_id, v_actor, 'bundle_permissions', v_action, v_row_id,
      jsonb_build_object('bundle_id', v_bundle_id, 'permission_key', v_perm_key),
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_bundle_permissions ON public.bundle_permissions;

CREATE TRIGGER trg_audit_bundle_permissions
  AFTER INSERT OR DELETE ON public.bundle_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_bundle_permissions_change();

-- =========================================================
-- P2.3: Dedicated trigger for tenant_members role changes ONLY
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_tenant_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.role_audit_log (
      tenant_id,
      actor_user_id,
      table_name,
      action,
      row_id,
      old_data,
      new_data
    ) VALUES (
      NEW.tenant_id,
      v_actor,
      'tenant_members',
      'role_changed',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active),
      jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_audit_tenant_members_role ON public.tenant_members;

CREATE TRIGGER trg_audit_tenant_members_role
  AFTER UPDATE ON public.tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_tenant_member_role_change();
