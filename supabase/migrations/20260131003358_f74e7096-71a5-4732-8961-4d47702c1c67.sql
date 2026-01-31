-- =====================================================
-- AUDIT LOGGING TRIGGERS (Corrected per schema proof)
-- Migration: enable_audit_triggers_delegation_sharing_v1
-- =====================================================

-- 1) delegation_scopes → delegation_audit_log
CREATE OR REPLACE FUNCTION public.fn_audit_delegation_scopes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'scope_grant';
    v_actor := COALESCE(auth.uid(), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'scope_update';
    v_actor := COALESCE(auth.uid(), NEW.created_by, OLD.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'scope_revoke';
    v_actor := COALESCE(auth.uid(), OLD.created_by);
  END IF;

  INSERT INTO public.delegation_audit_log (
    id, tenant_id, actor_user_id, target_member_id, permission_key, action, created_at
  ) VALUES (
    gen_random_uuid(),
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    v_actor,
    COALESCE(NEW.grantor_member_id, OLD.grantor_member_id),
    COALESCE(NEW.permission_key, OLD.permission_key),
    v_action,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_delegation_scopes_audit ON public.delegation_scopes;
CREATE TRIGGER trg_delegation_scopes_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.delegation_scopes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_delegation_scopes();

-- 2) member_permissions → delegation_audit_log (derive tenant_id via tenant_members)
CREATE OR REPLACE FUNCTION public.fn_audit_member_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_member_id uuid;
  v_action text;
  v_actor uuid;
BEGIN
  v_member_id := COALESCE(NEW.tenant_member_id, OLD.tenant_member_id);

  SELECT tenant_id INTO v_tenant_id
  FROM public.tenant_members
  WHERE id = v_member_id;

  IF TG_OP = 'INSERT' THEN
    v_action := CASE WHEN NEW.granted THEN 'override_grant' ELSE 'override_deny' END;
    v_actor := COALESCE(auth.uid(), NEW.granted_by);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := CASE WHEN NEW.granted THEN 'override_update_grant' ELSE 'override_update_deny' END;
    v_actor := COALESCE(auth.uid(), NEW.granted_by, OLD.granted_by);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'override_revoke';
    v_actor := COALESCE(auth.uid(), OLD.granted_by);
  END IF;

  INSERT INTO public.delegation_audit_log (
    id, tenant_id, actor_user_id, target_member_id, permission_key, action, created_at
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_actor,
    v_member_id,
    COALESCE(NEW.permission_key, OLD.permission_key),
    v_action,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_member_permissions_audit ON public.member_permissions;
CREATE TRIGGER trg_member_permissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.member_permissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_member_permissions();

-- 3) connections → sharing_audit_log
CREATE OR REPLACE FUNCTION public.fn_audit_connections()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'connection_created';
    v_actor := COALESCE(auth.uid(), NEW.initiator_user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND COALESCE(OLD.status,'') <> 'accepted' THEN
      v_event_type := 'connection_accepted';
      v_actor := COALESCE(auth.uid(), NEW.accepted_by, NEW.initiator_user_id, OLD.initiator_user_id);
    ELSIF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
      v_event_type := 'connection_revoked';
      v_actor := COALESCE(auth.uid(), NEW.revoked_by, NEW.initiator_user_id, OLD.initiator_user_id);
    ELSE
      v_event_type := 'connection_updated';
      v_actor := COALESCE(auth.uid(), NEW.initiator_user_id, OLD.initiator_user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'connection_deleted';
    v_actor := COALESCE(auth.uid(), OLD.initiator_user_id);
  END IF;

  INSERT INTO public.sharing_audit_log (
    id, event_type, connection_id, grant_id, actor_user_id,
    actor_tenant_id, target_tenant_id, target_profile_id,
    resource_type, resource_ids, metadata, created_at
  ) VALUES (
    gen_random_uuid(),
    v_event_type,
    COALESCE(NEW.id, OLD.id),
    NULL,
    v_actor,
    COALESCE(NEW.initiator_tenant_id, OLD.initiator_tenant_id),
    COALESCE(NEW.recipient_tenant_id, OLD.recipient_tenant_id),
    COALESCE(NEW.recipient_profile_id, OLD.recipient_profile_id),
    'connection',
    NULL,
    jsonb_build_object(
      'status', COALESCE(NEW.status, OLD.status),
      'connection_type', COALESCE(NEW.connection_type::text, OLD.connection_type::text),
      'recipient_email', COALESCE(NEW.recipient_email, OLD.recipient_email),
      'recipient_phone', COALESCE(NEW.recipient_phone, OLD.recipient_phone)
    ),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_connections_audit ON public.connections;
CREATE TRIGGER trg_connections_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_connections();

-- 4) consent_grants → sharing_audit_log
CREATE OR REPLACE FUNCTION public.fn_audit_consent_grants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_target_tenant_id uuid;
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'grant_created';
    v_actor := COALESCE(auth.uid(), NEW.grantor_user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
      v_event_type := 'grant_revoked';
      v_actor := COALESCE(auth.uid(), NEW.revoked_by, NEW.grantor_user_id, OLD.grantor_user_id);
    ELSE
      v_event_type := 'grant_updated';
      v_actor := COALESCE(auth.uid(), NEW.grantor_user_id, OLD.grantor_user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'grant_deleted';
    v_actor := COALESCE(auth.uid(), OLD.grantor_user_id);
  END IF;

  SELECT recipient_tenant_id INTO v_target_tenant_id
  FROM public.connections
  WHERE id = COALESCE(NEW.connection_id, OLD.connection_id);

  INSERT INTO public.sharing_audit_log (
    id, event_type, connection_id, grant_id, actor_user_id,
    actor_tenant_id, target_tenant_id, target_profile_id,
    resource_type, resource_ids, metadata, created_at
  ) VALUES (
    gen_random_uuid(),
    v_event_type,
    COALESCE(NEW.connection_id, OLD.connection_id),
    COALESCE(NEW.id, OLD.id),
    v_actor,
    COALESCE(NEW.grantor_tenant_id, OLD.grantor_tenant_id),
    v_target_tenant_id,
    NULL,
    COALESCE(NEW.resource_type, OLD.resource_type),
    COALESCE(NEW.resource_ids, OLD.resource_ids),
    jsonb_build_object(
      'access_level', COALESCE(NEW.access_level, OLD.access_level),
      'status', COALESCE(NEW.status, OLD.status),
      'expires_at', COALESCE(NEW.expires_at, OLD.expires_at)
    ),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_consent_grants_audit ON public.consent_grants;
CREATE TRIGGER trg_consent_grants_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.consent_grants
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_consent_grants();