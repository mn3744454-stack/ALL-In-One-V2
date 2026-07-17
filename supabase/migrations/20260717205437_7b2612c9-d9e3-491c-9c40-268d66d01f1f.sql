
-- Phase 1.e.f.8.1.4.d.3.fix.1.r1.qa1.local — Local Record Custodial Completion Execution
-- =====================================================================
-- 1. Permission definition
-- =====================================================================
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES (
  'horses.local_record.complete',
  'horses',
  'local_record',
  'complete',
  'Complete Local Horse Record',
  'إكمال السجل المحلي للخيل',
  'Allows an authorized Stable user to complete safe missing fields in an eligible Stable-local horse record without granting Horse Owner authority or general identity-edit authority.',
  'يسمح للمستخدم المخول في حساب الإسطبل بإكمال الحقول الآمنة الناقصة في سجل خيل محلي مؤهل، دون منحه صفة مالك الخيل أو صلاحية التعديل العام للهوية.',
  false
)
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 2. Durable owner-truth review columns on public.horses
-- =====================================================================
ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS owner_truth_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_truth_review_reason text NULL,
  ADD COLUMN IF NOT EXISTS owner_truth_review_set_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS owner_truth_review_set_by uuid NULL;

-- =====================================================================
-- 3. Shared horse-authority advisory lock helper
-- =====================================================================
CREATE OR REPLACE FUNCTION public._lock_horse_authority_scope(p_horse_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_horse_id IS NULL THEN
    RAISE EXCEPTION 'horse_id_required' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_horse_id::text, 0));
END;
$$;
REVOKE ALL ON FUNCTION public._lock_horse_authority_scope(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._lock_horse_authority_scope(uuid) FROM authenticated;

-- =====================================================================
-- 4. Owner-truth lock + review triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public._trg_lock_horse_ownership_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids uuid[] := ARRAY[]::uuid[];
  v_id  uuid;
  v_remaining integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_ids := ARRAY[NEW.horse_id];
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.horse_id IS DISTINCT FROM OLD.horse_id THEN
      v_ids := ARRAY[LEAST(NEW.horse_id, OLD.horse_id), GREATEST(NEW.horse_id, OLD.horse_id)];
    ELSE
      v_ids := ARRAY[NEW.horse_id];
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_ids := ARRAY[OLD.horse_id];
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    IF v_id IS NOT NULL THEN
      PERFORM public._lock_horse_authority_scope(v_id);
    END IF;
  END LOOP;

  -- If this DELETE removed the final ownership row for a horse, mark review.
  IF TG_OP = 'DELETE' THEN
    SELECT count(*) INTO v_remaining
      FROM public.horse_ownership WHERE horse_id = OLD.horse_id;
    IF v_remaining = 0 THEN
      UPDATE public.horses
         SET owner_truth_review_required = true,
             owner_truth_review_reason   = 'current_ownership_removed',
             owner_truth_review_set_at   = now(),
             owner_truth_review_set_by   = auth.uid()
       WHERE id = OLD.horse_id
         AND owner_truth_review_required = false;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public._trg_lock_horse_ownership_scope() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._trg_lock_horse_ownership_scope() FROM authenticated;

DROP TRIGGER IF EXISTS trg_lock_horse_ownership_scope_ins ON public.horse_ownership;
DROP TRIGGER IF EXISTS trg_lock_horse_ownership_scope_upd ON public.horse_ownership;
DROP TRIGGER IF EXISTS trg_lock_horse_ownership_scope_del ON public.horse_ownership;
CREATE TRIGGER trg_lock_horse_ownership_scope_ins
  BEFORE INSERT ON public.horse_ownership
  FOR EACH ROW EXECUTE FUNCTION public._trg_lock_horse_ownership_scope();
CREATE TRIGGER trg_lock_horse_ownership_scope_upd
  BEFORE UPDATE ON public.horse_ownership
  FOR EACH ROW EXECUTE FUNCTION public._trg_lock_horse_ownership_scope();
CREATE TRIGGER trg_lock_horse_ownership_scope_del
  BEFORE DELETE ON public.horse_ownership
  FOR EACH ROW EXECUTE FUNCTION public._trg_lock_horse_ownership_scope();

CREATE OR REPLACE FUNCTION public._trg_lock_horse_owner_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public._lock_horse_authority_scope(NEW.id);
  -- If owner_tenant_id transitions from non-NULL to NULL, set durable review marker.
  IF OLD.owner_tenant_id IS NOT NULL AND NEW.owner_tenant_id IS NULL THEN
    NEW.owner_truth_review_required := true;
    NEW.owner_truth_review_reason   := 'owner_tenant_id_cleared';
    NEW.owner_truth_review_set_at   := now();
    NEW.owner_truth_review_set_by   := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._trg_lock_horse_owner_tenant_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._trg_lock_horse_owner_tenant_change() FROM authenticated;

DROP TRIGGER IF EXISTS trg_lock_horse_owner_tenant_change ON public.horses;
CREATE TRIGGER trg_lock_horse_owner_tenant_change
  BEFORE UPDATE OF owner_tenant_id ON public.horses
  FOR EACH ROW
  WHEN (NEW.owner_tenant_id IS DISTINCT FROM OLD.owner_tenant_id)
  EXECUTE FUNCTION public._trg_lock_horse_owner_tenant_change();

-- =====================================================================
-- 5. Stable provisioning helper + trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public._provision_stable_local_record_permissions(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text;
BEGIN
  IF p_tenant_id IS NULL THEN RETURN; END IF;
  SELECT type::text INTO v_type FROM public.tenants WHERE id = p_tenant_id;
  IF v_type IS DISTINCT FROM 'stable' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.permission_definitions WHERE key = 'horses.local_record.complete') THEN
    RETURN;
  END IF;
  INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
  VALUES (p_tenant_id, 'manager', 'horses.local_record.complete', true)
  ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public._provision_stable_local_record_permissions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._provision_stable_local_record_permissions(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public._trg_provision_stable_local_record_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public._provision_stable_local_record_permissions(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._trg_provision_stable_local_record_permissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._trg_provision_stable_local_record_permissions() FROM authenticated;

DROP TRIGGER IF EXISTS trg_provision_stable_local_record_permissions_ins ON public.tenants;
DROP TRIGGER IF EXISTS trg_provision_stable_local_record_permissions_upd ON public.tenants;
CREATE TRIGGER trg_provision_stable_local_record_permissions_ins
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  WHEN (NEW.type::text = 'stable')
  EXECUTE FUNCTION public._trg_provision_stable_local_record_permissions();
CREATE TRIGGER trg_provision_stable_local_record_permissions_upd
  AFTER UPDATE OF type ON public.tenants
  FOR EACH ROW
  WHEN (NEW.type::text = 'stable' AND OLD.type IS DISTINCT FROM NEW.type)
  EXECUTE FUNCTION public._trg_provision_stable_local_record_permissions();

-- Backfill existing Stable tenants (idempotent, does not overwrite deliberate false).
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT t.id, 'manager', 'horses.local_record.complete', true
  FROM public.tenants t
 WHERE t.type::text = 'stable'
ON CONFLICT (tenant_id, role_key, permission_key) DO NOTHING;

-- =====================================================================
-- 6. Dedicated authority helper
-- =====================================================================
CREATE OR REPLACE FUNCTION public._resolve_local_record_completion_authority(
  p_horse_id uuid,
  p_active_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_tenant_type text;
  v_horse public.horses%ROWTYPE;
  v_has_perm boolean;
  v_owner_rows integer;
  v_editable text[] := ARRAY[]::text[];
  v_deny jsonb;
BEGIN
  v_deny := jsonb_build_object(
    'allowed', false, 'authority_mode', 'local_record_custodial',
    'reason_code', 'local_record_completion_not_available',
    'editable_fields', '[]'::jsonb, 'record_state', 'ineligible'
  );

  IF v_user IS NULL THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_authentication_required'::text));
  END IF;
  IF p_active_tenant_id IS NULL THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_active_tenant_required'::text));
  END IF;
  IF p_horse_id IS NULL THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_horse_not_found'::text));
  END IF;

  SELECT type::text INTO v_tenant_type FROM public.tenants WHERE id = p_active_tenant_id;
  IF v_tenant_type IS NULL THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_tenant_not_found'::text));
  END IF;
  IF v_tenant_type <> 'stable' THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_not_stable_tenant'::text));
  END IF;

  IF NOT public.is_active_tenant_member(v_user, p_active_tenant_id) THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_membership_inactive'::text));
  END IF;

  v_has_perm := public.has_permission(v_user, p_active_tenant_id, 'horses.local_record.complete');
  IF NOT v_has_perm THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_permission_denied'::text));
  END IF;

  SELECT * INTO v_horse FROM public.horses WHERE id = p_horse_id;
  IF NOT FOUND THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_horse_not_found'::text));
  END IF;

  IF v_horse.tenant_id IS DISTINCT FROM p_active_tenant_id THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_not_in_active_tenant'::text));
  END IF;

  -- Eligible lifecycle. Reject only known non-eligible lifecycle values.
  IF v_horse.status IS NOT NULL AND v_horse.status IN ('archived','deleted','merged','deceased','retired','transferred_out') THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_status_denied'::text));
  END IF;

  IF v_horse.owner_tenant_id IS NOT NULL THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_owner_tenant_exists'::text));
  END IF;

  SELECT count(*) INTO v_owner_rows FROM public.horse_ownership WHERE horse_id = p_horse_id;
  IF v_owner_rows > 0 THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('local_record_current_owner_exists'::text));
  END IF;

  IF v_horse.owner_truth_review_required THEN
    RETURN jsonb_set(v_deny, '{reason_code}', to_jsonb('owner_truth_review_required'::text));
  END IF;

  -- Compute currently missing safely editable fields.
  IF v_horse.name IS NULL OR btrim(v_horse.name) = '' THEN v_editable := v_editable || 'name'::text; END IF;
  IF v_horse.name_ar IS NULL OR btrim(v_horse.name_ar) = '' THEN v_editable := v_editable || 'name_ar'::text; END IF;
  IF v_horse.color_id IS NULL THEN v_editable := v_editable || 'color_id'::text; END IF;
  IF v_horse.registration_number IS NULL OR btrim(v_horse.registration_number) = '' THEN v_editable := v_editable || 'registration_number'::text; END IF;
  IF v_horse.microchip_number IS NULL OR btrim(v_horse.microchip_number) = '' THEN v_editable := v_editable || 'microchip_number'::text; END IF;
  IF v_horse.passport_number IS NULL OR btrim(v_horse.passport_number) = '' THEN v_editable := v_editable || 'passport_number'::text; END IF;
  IF v_horse.ueln IS NULL OR btrim(v_horse.ueln) = '' THEN v_editable := v_editable || 'ueln'::text; END IF;
  IF v_horse.avatar_url IS NULL OR btrim(v_horse.avatar_url) = '' THEN v_editable := v_editable || 'avatar_url'::text; END IF;
  IF v_horse.mane_marks IS NULL OR btrim(v_horse.mane_marks) = '' THEN v_editable := v_editable || 'mane_marks'::text; END IF;
  IF v_horse.body_marks IS NULL OR btrim(v_horse.body_marks) = '' THEN v_editable := v_editable || 'body_marks'::text; END IF;
  IF v_horse.legs_marks IS NULL OR btrim(v_horse.legs_marks) = '' THEN v_editable := v_editable || 'legs_marks'::text; END IF;
  IF v_horse.distinctive_marks_notes IS NULL OR btrim(v_horse.distinctive_marks_notes) = '' THEN v_editable := v_editable || 'distinctive_marks_notes'::text; END IF;
  IF v_horse.birth_date IS NULL THEN v_editable := v_editable || 'birth_date'::text; END IF;
  -- is_pony: boolean NOT NULL default false — never "missing".

  IF array_length(v_editable, 1) IS NULL OR array_length(v_editable, 1) = 0 THEN
    RETURN jsonb_build_object(
      'allowed', false, 'authority_mode', 'local_record_custodial',
      'reason_code', 'local_record_no_safe_missing_fields',
      'editable_fields', '[]'::jsonb, 'record_state', 'eligible'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true, 'authority_mode', 'local_record_custodial',
    'reason_code', NULL, 'editable_fields', to_jsonb(v_editable),
    'record_state', 'eligible'
  );
END;
$$;
REVOKE ALL ON FUNCTION public._resolve_local_record_completion_authority(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._resolve_local_record_completion_authority(uuid, uuid) FROM authenticated;

-- =====================================================================
-- 7. Extend get_horse_file_access with capabilities envelope
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_horse_file_access(p_horse_id uuid, p_active_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_viewer jsonb;
  v_access jsonb;
  v_section_perms jsonb;
  v_cap jsonb;
  v_cap_out jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_active_tenant_id IS NULL THEN
    RAISE EXCEPTION 'active_tenant_required' USING ERRCODE = '22023';
  END IF;
  IF p_horse_id IS NULL THEN
    RAISE EXCEPTION 'horse_id_required' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_active_tenant_member(v_user, p_active_tenant_id) THEN
    RETURN jsonb_build_object(
      'horse_id', p_horse_id,
      'access', jsonb_build_object(
        'mode','no_access','reason_code','not_member_of_tenant',
        'viewer_user_id', v_user, 'viewer_tenant_id', p_active_tenant_id,
        'snapshot_only', false, 'badges','[]'::jsonb, 'warnings','[]'::jsonb
      ),
      'section_perms', '{}'::jsonb,
      'action_perms', '{}'::jsonb,
      'capabilities', jsonb_build_object(
        'can_complete_local_record', false,
        'local_record_completion_reason', 'local_record_membership_inactive',
        'local_record_completion_editable_fields', '[]'::jsonb
      )
    );
  END IF;

  v_viewer := jsonb_build_object('user_id', v_user, 'tenant_id', p_active_tenant_id, 'channel','authenticated');
  v_access := public._resolve_horse_access_mode(v_viewer, p_horse_id);
  v_section_perms := public._section_perms_for_mode(v_access->>'mode');

  v_cap := public._resolve_local_record_completion_authority(p_horse_id, p_active_tenant_id);
  v_cap_out := jsonb_build_object(
    'can_complete_local_record', COALESCE((v_cap->>'allowed')::boolean, false),
    'local_record_completion_reason', v_cap->'reason_code',
    'local_record_completion_editable_fields', COALESCE(v_cap->'editable_fields', '[]'::jsonb)
  );

  RETURN jsonb_build_object(
    'horse_id', p_horse_id,
    'access', v_access,
    'section_perms', COALESCE(v_section_perms, '{}'::jsonb),
    'action_perms', '{}'::jsonb,
    'capabilities', v_cap_out
  );
END;
$$;
-- get_horse_file_access remains authenticated-callable (existing grant retained).

-- =====================================================================
-- 8. complete_local_horse_record RPC
-- =====================================================================
CREATE OR REPLACE FUNCTION public.complete_local_horse_record(
  p_horse_id uuid,
  p_active_tenant_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_cap jsonb;
  v_editable text[];
  v_key text; v_val jsonb;
  v_sets text[] := ARRAY[]::text[];
  v_updated text[] := ARRAY[]::text[];
  v_sql text;
  v_horse public.horses%ROWTYPE;
  v_existing_dob date;
  v_cap_after jsonb;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_authentication_required');
  END IF;
  IF p_active_tenant_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_active_tenant_required');
  END IF;
  IF p_horse_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_horse_not_found');
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_payload_invalid');
  END IF;

  -- Serialize on horse authority scope BEFORE reading row for TOCTOU safety.
  PERFORM public._lock_horse_authority_scope(p_horse_id);

  -- Re-evaluate authority under the lock.
  v_cap := public._resolve_local_record_completion_authority(p_horse_id, p_active_tenant_id);
  IF (v_cap->>'allowed') <> 'true' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason_code', COALESCE(v_cap->>'reason_code', 'local_record_completion_not_available'),
      'capabilities', jsonb_build_object(
        'can_complete_local_record', false,
        'local_record_completion_reason', v_cap->'reason_code',
        'local_record_completion_editable_fields', COALESCE(v_cap->'editable_fields', '[]'::jsonb)
      )
    );
  END IF;

  SELECT * INTO v_horse FROM public.horses WHERE id = p_horse_id FOR UPDATE;
  v_existing_dob := v_horse.birth_date;

  SELECT ARRAY(SELECT jsonb_array_elements_text(v_cap->'editable_fields')) INTO v_editable;

  -- Validate every payload key against the editable set.
  FOR v_key IN SELECT * FROM jsonb_object_keys(p_payload) LOOP
    IF NOT (v_key = ANY (v_editable)) THEN
      -- Distinguish field categories for accurate mapping.
      IF v_key IN ('gender','breed_id','birth_at','is_gelded','height','weight',
                   'breeding_role','is_pregnant','pregnancy_months','owner_tenant_id',
                   'tenant_id','status','pedigree') THEN
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_field_restricted', 'field', v_key);
      END IF;
      IF v_key = 'birth_date' AND v_existing_dob IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_birth_date_already_set', 'field', v_key);
      END IF;
      -- Field is either unknown or currently not-missing.
      IF v_key IN ('name','name_ar','color_id','registration_number','microchip_number',
                   'passport_number','ueln','avatar_url','mane_marks','body_marks',
                   'legs_marks','distinctive_marks_notes','birth_date','is_pony') THEN
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_field_not_missing', 'field', v_key);
      END IF;
      RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_field_restricted', 'field', v_key);
    END IF;
  END LOOP;

  -- Build SET clauses.
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_payload) LOOP
    IF v_key = 'birth_date' THEN
      IF v_existing_dob IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_birth_date_already_set', 'field', 'birth_date');
      END IF;
      IF (p_payload->>'birth_date') IS NULL OR btrim(p_payload->>'birth_date') = '' THEN
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_payload_invalid', 'field', 'birth_date');
      END IF;
      v_sets := v_sets || format('birth_date = %L::date', p_payload->>'birth_date');
    ELSE
      IF jsonb_typeof(v_val) = 'null' THEN
        v_sets := v_sets || format('%I = NULL', v_key);
      ELSIF jsonb_typeof(v_val) = 'string' THEN
        v_sets := v_sets || format('%I = %L', v_key, (p_payload->>v_key));
      ELSE
        RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_payload_invalid', 'field', v_key);
      END IF;
    END IF;
    v_updated := v_updated || v_key;
  END LOOP;

  IF array_length(v_sets, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'local_record_payload_invalid');
  END IF;

  v_sql := format('UPDATE public.horses SET %s, updated_at = now() WHERE id = %L',
                   array_to_string(v_sets, ', '), p_horse_id);
  EXECUTE v_sql;

  -- Recalculate capability post-write.
  v_cap_after := public._resolve_local_record_completion_authority(p_horse_id, p_active_tenant_id);

  RETURN jsonb_build_object(
    'ok', true,
    'horse_id', p_horse_id,
    'updated_fields', to_jsonb(v_updated),
    'capabilities', jsonb_build_object(
      'can_complete_local_record', COALESCE((v_cap_after->>'allowed')::boolean, false),
      'local_record_completion_reason', v_cap_after->'reason_code',
      'local_record_completion_editable_fields', COALESCE(v_cap_after->'editable_fields', '[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.complete_local_horse_record(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_local_horse_record(uuid, uuid, jsonb) TO authenticated;
