
-- =========================================================================
-- Phase 1.e.f.8.1.4.d.2 — update_horse_identity RPC Foundation
--
-- Adds:
--   1. public._active_tenant_context(uuid)              [private helper]
--   2. public._resolve_horse_write_authority(uuid,uuid,text) [private helper]
--   3. public.update_horse_identity(uuid,uuid,jsonb)    [authenticated RPC]
--
-- No table, RLS policy, or data is modified.
-- =========================================================================

-- ---------------------------------------------------------------
-- 1) Private helper: validate active tenant context for caller
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._active_tenant_context(
  p_active_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id       uuid := auth.uid();
  v_tenant_type   text;
  v_member_role   text;
  v_is_active     boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason_code', 'not_authenticated'
    );
  END IF;

  IF p_active_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'user_id', v_user_id,
      'reason_code', 'missing_active_tenant'
    );
  END IF;

  SELECT t.type::text
    INTO v_tenant_type
  FROM public.tenants t
  WHERE t.id = p_active_tenant_id;

  IF v_tenant_type IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'user_id', v_user_id,
      'reason_code', 'invalid_active_tenant'
    );
  END IF;

  SELECT tm.role::text, tm.is_active
    INTO v_member_role, v_is_active
  FROM public.tenant_members tm
  WHERE tm.tenant_id = p_active_tenant_id
    AND tm.user_id   = v_user_id
  LIMIT 1;

  IF v_member_role IS NULL OR v_is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'ok', false,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'tenant_type', v_tenant_type,
      'is_active_member', false,
      'reason_code', 'not_active_member'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'active_tenant_id', p_active_tenant_id,
    'tenant_type', v_tenant_type,
    'member_role', v_member_role,
    'is_active_member', true,
    'reason_code', 'ok'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public._active_tenant_context(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._active_tenant_context(uuid) FROM anon;
REVOKE ALL ON FUNCTION public._active_tenant_context(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public._active_tenant_context(uuid) TO service_role;

COMMENT ON FUNCTION public._active_tenant_context(uuid) IS
  'Private helper. Validates caller''s active tenant/member context. '
  'NOT callable by anon/authenticated; used only from SECURITY DEFINER RPCs owned by postgres.';


-- ---------------------------------------------------------------
-- 2) Private helper: resolve horse WRITE authority (identity)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._resolve_horse_write_authority(
  p_horse_id         uuid,
  p_active_tenant_id uuid,
  p_action_key       text DEFAULT 'horse.identity.update'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_ctx                 jsonb;
  v_user_id             uuid;
  v_tenant_type         text;
  v_member_role         text;
  v_horse_owner_tenant  uuid;
  v_horse_tenant        uuid;
  v_verified_ok         boolean := false;
  v_active_member_count integer;
  v_active_owner_count  integer;
  v_foreign_owner_count integer;
BEGIN
  v_ctx := public._active_tenant_context(p_active_tenant_id);
  IF (v_ctx->>'ok') <> 'true' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', COALESCE(v_ctx->>'reason_code', 'no_write_authority'),
      'action_key', p_action_key,
      'horse_id', p_horse_id,
      'active_tenant_id', p_active_tenant_id
    );
  END IF;

  v_user_id     := (v_ctx->>'user_id')::uuid;
  v_tenant_type := v_ctx->>'tenant_type';
  v_member_role := v_ctx->>'member_role';

  IF p_horse_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', 'horse_not_found',
      'action_key', p_action_key,
      'active_tenant_id', p_active_tenant_id,
      'user_id', v_user_id
    );
  END IF;

  SELECT h.owner_tenant_id, h.tenant_id
    INTO v_horse_owner_tenant, v_horse_tenant
  FROM public.horses h
  WHERE h.id = p_horse_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', 'horse_not_found',
      'action_key', p_action_key,
      'active_tenant_id', p_active_tenant_id,
      'user_id', v_user_id
    );
  END IF;

  -- ============================================================
  -- Path A — Verified current owner via owner bridge
  -- ============================================================
  SELECT EXISTS (
    SELECT 1
    FROM public.horse_ownership ho
    JOIN public.horse_owners ow ON ow.id = ho.owner_id
    WHERE ho.horse_id = p_horse_id
      AND ow.claimed_by_user_id = v_user_id
      AND ow.claim_status = 'verified'
      AND ow.verification_level IN ('strong','verified')
      AND ow.owner_tenant_id = p_active_tenant_id
      AND v_horse_owner_tenant IS NOT NULL
      AND v_horse_owner_tenant = p_active_tenant_id
  ) INTO v_verified_ok;

  IF v_verified_ok THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'authority_mode', 'current_owner_verified',
      'authority_source', 'verified_bridge',
      'is_current_effective_owner', true,
      'is_former_owner', false,
      'is_temporary_fallback', false,
      'reason_code', 'allowed_verified_current_owner',
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id,
      'tenant_type', v_tenant_type
    );
  END IF;

  -- ============================================================
  -- Path B — Temporary narrow sole-owner fallback
  --   (interim while owner bridge data is not yet populated)
  -- ============================================================
  IF v_tenant_type <> 'horse_owner' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', CASE
        WHEN v_tenant_type IN ('stable','clinic','lab','academy','pharmacy',
                               'transport','auction','trainer','doctor')
          THEN 'host_operational_denied_for_identity'
        ELSE 'no_current_owner_authority'
      END,
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id,
      'tenant_type', v_tenant_type
    );
  END IF;

  IF v_horse_owner_tenant IS NULL OR v_horse_owner_tenant <> p_active_tenant_id THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', 'owner_tenant_mismatch',
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id
    );
  END IF;

  IF v_member_role <> 'owner' THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'same_tenant_member_denied',
      'authority_source', 'none',
      'reason_code', 'member_role_not_owner',
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id
    );
  END IF;

  -- Exactly one active member total, and it is auth.uid()
  SELECT count(*)
    INTO v_active_member_count
  FROM public.tenant_members tm
  WHERE tm.tenant_id = p_active_tenant_id
    AND tm.is_active = true;

  IF v_active_member_count IS DISTINCT FROM 1 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'no_write_authority',
      'authority_source', 'none',
      'reason_code', 'multiple_active_members_ambiguous',
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id
    );
  END IF;

  -- No horse_ownership row for this horse points to a DIFFERENT owner tenant
  SELECT count(*)
    INTO v_foreign_owner_count
  FROM public.horse_ownership ho
  JOIN public.horse_owners ow ON ow.id = ho.owner_id
  WHERE ho.horse_id = p_horse_id
    AND ow.owner_tenant_id IS NOT NULL
    AND ow.owner_tenant_id <> p_active_tenant_id;

  IF v_foreign_owner_count > 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'authority_mode', 'former_owner_denied',
      'authority_source', 'none',
      'reason_code', 'ownership_transfer_completed_to_new_owner',
      'action_key', p_action_key,
      'user_id', v_user_id,
      'active_tenant_id', p_active_tenant_id,
      'horse_id', p_horse_id
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'authority_mode', 'current_owner_temporary_sole_owner_fallback',
    'authority_source', 'sole_owner_member_fallback',
    'is_current_effective_owner', true,
    'is_former_owner', false,
    'is_temporary_fallback', true,
    'fallback_expires_when',
      'verified_bridge_populated_or_second_active_member_added',
    'reason_code', 'allowed_temporary_sole_owner_fallback',
    'action_key', p_action_key,
    'user_id', v_user_id,
    'active_tenant_id', p_active_tenant_id,
    'horse_id', p_horse_id,
    'tenant_type', v_tenant_type
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public._resolve_horse_write_authority(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_horse_write_authority(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public._resolve_horse_write_authority(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public._resolve_horse_write_authority(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public._resolve_horse_write_authority(uuid, uuid, text) IS
  'Private write-specific horse authority resolver. Distinct from read access resolution. '
  'Sale/ownership-transfer future-safe: authority follows current effective owner. '
  'NOT callable by anon/authenticated.';


-- ---------------------------------------------------------------
-- 3) Public RPC: update_horse_identity (allowlist only)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_horse_identity(
  p_horse_id         uuid,
  p_active_tenant_id uuid,
  p_payload          jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_auth        jsonb;
  v_allowed     text[] := ARRAY[
    'name','name_ar','gender','birth_date',
    'breed','breed_id','color','color_id',
    'height','weight','is_pony','is_gelded',
    'registration_number','microchip_number','passport_number','ueln',
    'mane_marks','body_marks','legs_marks','distinctive_marks_notes',
    'avatar_url'
  ];
  v_key         text;
  v_val         jsonb;
  v_updated     text[] := ARRAY[]::text[];
  v_sets        text[] := ARRAY[]::text[];
  v_sql         text;
  v_gender      text;
BEGIN
  -- Payload shape validation
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'malformed_payload',
      'reason_code', 'malformed_payload'
    );
  END IF;

  IF (SELECT count(*) FROM jsonb_object_keys(p_payload)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'empty_payload',
      'reason_code', 'empty_payload'
    );
  END IF;

  -- Write authority (also validates auth + active tenant)
  v_auth := public._resolve_horse_write_authority(
    p_horse_id, p_active_tenant_id, 'horse.identity.update'
  );

  IF (v_auth->>'allowed') <> 'true' THEN
    RETURN jsonb_build_object(
      'success', false,
      'horse_id', p_horse_id,
      'authority_mode', v_auth->>'authority_mode',
      'authority_source', v_auth->>'authority_source',
      'reason_code', v_auth->>'reason_code',
      'error_code', COALESCE(v_auth->>'reason_code', 'no_write_authority')
    );
  END IF;

  -- Allowlist / blocklist enforcement + per-field validation
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_payload) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'horse_id', p_horse_id,
        'error_code', 'unsupported_field',
        'reason_code', 'unsupported_field',
        'field', v_key
      );
    END IF;

    -- Name fields: reject empty string; allow null-clear only for name_ar
    IF v_key = 'name' THEN
      IF jsonb_typeof(v_val) <> 'string' OR length(trim(v_val #>> '{}')) = 0 THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    IF v_key = 'gender' THEN
      IF jsonb_typeof(v_val) <> 'string' THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
      v_gender := v_val #>> '{}';
      IF v_gender NOT IN ('male','female') THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    -- FK existence checks
    IF v_key = 'breed_id' AND jsonb_typeof(v_val) = 'string' THEN
      IF NOT EXISTS (SELECT 1 FROM public.horse_breeds b WHERE b.id = (v_val #>> '{}')::uuid) THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;
    IF v_key = 'color_id' AND jsonb_typeof(v_val) = 'string' THEN
      IF NOT EXISTS (SELECT 1 FROM public.horse_colors c WHERE c.id = (v_val #>> '{}')::uuid) THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    v_sets    := v_sets    || format('%I = ($1->%L)', v_key, v_key)::text
                            || CASE
                                 WHEN v_key IN ('birth_date') THEN '::date'
                                 WHEN v_key IN ('breed_id','color_id') THEN '::uuid'
                                 WHEN v_key IN ('height','weight') THEN '::numeric'
                                 WHEN v_key IN ('is_pony','is_gelded') THEN '::boolean'
                                 ELSE '::text'
                               END;
    v_updated := v_updated || v_key;
  END LOOP;

  IF array_length(v_sets, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'empty_payload',
      'reason_code', 'empty_payload'
    );
  END IF;

  -- Rebuild SET clause using (payload->>'field') style casting.
  v_sets := ARRAY[]::text[];
  FOR v_key IN SELECT unnest(v_updated) LOOP
    v_sets := v_sets || (
      CASE
        WHEN v_key = 'birth_date'
          THEN format('birth_date = NULLIF($1->>%L, '''')::date', v_key)
        WHEN v_key IN ('breed_id','color_id')
          THEN format('%I = NULLIF($1->>%L, '''')::uuid', v_key, v_key)
        WHEN v_key IN ('height','weight')
          THEN format('%I = NULLIF($1->>%L, '''')::numeric', v_key, v_key)
        WHEN v_key IN ('is_pony','is_gelded')
          THEN format('%I = ($1->>%L)::boolean', v_key, v_key)
        ELSE
          format('%I = ($1->>%L)', v_key, v_key)
      END
    );
  END LOOP;

  v_sql := 'UPDATE public.horses SET '
        || array_to_string(v_sets, ', ')
        || ', updated_at = now() WHERE id = $2';

  BEGIN
    EXECUTE v_sql USING p_payload, p_horse_id;
  EXCEPTION
    WHEN unique_violation THEN
      DECLARE
        v_msg text := SQLERRM;
      BEGIN
        IF v_msg ILIKE '%microchip%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','duplicate_microchip','reason_code','duplicate_microchip');
        ELSIF v_msg ILIKE '%passport%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','duplicate_passport','reason_code','duplicate_passport');
        ELSIF v_msg ILIKE '%ueln%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','invalid_field_value','reason_code','invalid_field_value','field','ueln');
        ELSE
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','invalid_field_value','reason_code','invalid_field_value');
        END IF;
      END;
    WHEN check_violation THEN
      RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
        'error_code','invalid_field_value','reason_code','invalid_field_value');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
        'error_code','internal_error','reason_code','internal_error');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'horse_id', p_horse_id,
    'updated_fields', to_jsonb(v_updated),
    'authority_mode', v_auth->>'authority_mode',
    'authority_source', v_auth->>'authority_source',
    'is_temporary_fallback', COALESCE((v_auth->>'is_temporary_fallback')::boolean, false),
    'reason_code', v_auth->>'reason_code'
  );
END;
$fn$;

REVOKE ALL     ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL     ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) IS
  'SECURITY DEFINER RPC. Updates only canonical horse identity fields (strict allowlist). '
  'Delegates authority to _resolve_horse_write_authority; enforces write-specific rules '
  'distinct from read access. Sale/ownership-transfer future-safe.';
