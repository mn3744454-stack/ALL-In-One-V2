
-- Phase 1.e.f.8.1.1a — Projection RPC Foundation Execution
-- Read-only SECURITY DEFINER RPCs + private helpers for the Unified Horse File access resolver.
-- Additive only. No table DDL. No data mutation. No base-table RLS changes.

-- ============================================================================
-- 1. Pure shape helpers (SECURITY INVOKER, IMMUTABLE) — safe, no protected reads
-- ============================================================================

CREATE OR REPLACE FUNCTION public._field(
  _value jsonb,
  _source text,
  _editable boolean,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'value', COALESCE(_value, 'null'::jsonb),
    'source', _source,
    'editable', _editable,
    'reason', _reason
  );
$$;

CREATE OR REPLACE FUNCTION public._section_permission(
  _visible boolean,
  _editable boolean,
  _snapshot_only boolean,
  _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'visible', _visible,
    'editable', _editable,
    'snapshot_only', _snapshot_only,
    'reason', _reason
  );
$$;

-- ============================================================================
-- 2. Private resolvers (SECURITY DEFINER) — must be REVOKED from public/anon/auth
-- ============================================================================

-- Owner authority: requires verified r4.1a bridge facts. Never by name.
CREATE OR REPLACE FUNCTION public._resolve_owner_authority(
  _viewer jsonb,
  _horse_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := NULLIF(_viewer->>'user_id','')::uuid;
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_found boolean := false;
  v_co boolean := false;
BEGIN
  IF _horse_id IS NULL OR v_user IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason_code', 'owner_bridge_not_provisioned');
  END IF;

  SELECT TRUE,
         (SELECT count(*) FROM public.horse_ownership ho2 WHERE ho2.horse_id = _horse_id) > 1
    INTO v_found, v_co
  FROM public.horse_ownership ho
  JOIN public.horse_owners ow ON ow.id = ho.owner_id
  WHERE ho.horse_id = _horse_id
    AND ow.claim_status = 'verified'
    AND ow.verification_level IN ('strong','verified')
    AND (
      (ow.claimed_by_user_id IS NOT NULL AND ow.claimed_by_user_id = v_user)
      OR (v_tenant IS NOT NULL AND ow.owner_tenant_id IS NOT NULL AND ow.owner_tenant_id = v_tenant)
    )
  LIMIT 1;

  IF v_found THEN
    RETURN jsonb_build_object(
      'matched', true,
      'mode', CASE WHEN v_co THEN 'co_owner_authority' ELSE 'owner_authority' END,
      'reason_code', 'owner_verified'
    );
  END IF;

  RETURN jsonb_build_object('matched', false, 'reason_code', 'owner_bridge_not_provisioned');
END;
$$;

-- Current host: active (not checked-out) boarding admission for the active tenant.
CREATE OR REPLACE FUNCTION public._resolve_host_scope(
  _viewer jsonb,
  _horse_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_admission_id uuid;
BEGIN
  IF v_tenant IS NULL OR _horse_id IS NULL THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  SELECT id INTO v_admission_id
  FROM public.boarding_admissions
  WHERE horse_id = _horse_id
    AND tenant_id = v_tenant
    AND checked_out_at IS NULL
  ORDER BY admitted_at DESC NULLS LAST
  LIMIT 1;
  IF v_admission_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'matched', true,
      'mode', 'current_host_operational',
      'reason_code', 'current_host_operational',
      'admission_id', v_admission_id
    );
  END IF;
  RETURN jsonb_build_object('matched', false);
END;
$$;

-- Previous host: there exists a checked-out admission and no active one for this tenant.
CREATE OR REPLACE FUNCTION public._resolve_previous_host_scope(
  _viewer jsonb,
  _horse_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_admission_id uuid;
  v_period_end timestamptz;
BEGIN
  IF v_tenant IS NULL OR _horse_id IS NULL THEN
    RETURN jsonb_build_object('matched', false);
  END IF;
  SELECT id, checked_out_at INTO v_admission_id, v_period_end
  FROM public.boarding_admissions
  WHERE horse_id = _horse_id
    AND tenant_id = v_tenant
    AND checked_out_at IS NOT NULL
  ORDER BY checked_out_at DESC
  LIMIT 1;
  IF v_admission_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'matched', true,
      'mode', 'previous_host_historical',
      'reason_code', 'previous_host_historical',
      'admission_id', v_admission_id,
      'period_end', to_jsonb(v_period_end)
    );
  END IF;
  RETURN jsonb_build_object('matched', false);
END;
$$;

-- Provider scope: deferred. No safe project-wide provider-to-horse relationship to assert here.
CREATE OR REPLACE FUNCTION public._resolve_provider_scope(
  _viewer jsonb,
  _horse_id uuid
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object('matched', false, 'reason_code', 'provider_scope_deferred');
$$;

-- Share-link scope: hard-safe no-access stub. Real token verification deferred.
CREATE OR REPLACE FUNCTION public._resolve_share_link_scope(
  _token text
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'matched', false,
    'mode', 'no_access',
    'reason_code', 'share_token_not_ready'
  );
$$;

-- Central access resolver. Returns full access envelope.
CREATE OR REPLACE FUNCTION public._resolve_horse_access_mode(
  _viewer jsonb,
  _horse_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := NULLIF(_viewer->>'user_id','')::uuid;
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_horse_exists boolean := false;
  v_owner jsonb;
  v_host jsonb;
  v_prev jsonb;
  v_grant jsonb;
  v_deleg jsonb;
  v_grant_id uuid;
  v_deleg_id uuid;
BEGIN
  -- Existence probe (server-side, conservative)
  SELECT EXISTS(SELECT 1 FROM public.horses WHERE id = _horse_id) INTO v_horse_exists;
  IF NOT v_horse_exists THEN
    RETURN jsonb_build_object(
      'mode','no_access',
      'reason_code','horse_not_found_or_not_accessible',
      'viewer_user_id', v_user,
      'viewer_tenant_id', v_tenant,
      'snapshot_only', false,
      'badges', '[]'::jsonb,
      'warnings', '[]'::jsonb
    );
  END IF;

  -- 1. Verified owner authority
  v_owner := public._resolve_owner_authority(_viewer, _horse_id);
  IF (v_owner->>'matched')::boolean THEN
    RETURN jsonb_build_object(
      'mode', v_owner->>'mode',
      'reason_code', v_owner->>'reason_code',
      'viewer_user_id', v_user,
      'viewer_tenant_id', v_tenant,
      'snapshot_only', false,
      'badges', jsonb_build_array('owner'),
      'warnings', '[]'::jsonb
    );
  END IF;

  -- 2. Active delegation
  IF v_user IS NOT NULL THEN
    SELECT id INTO v_deleg_id
    FROM public.owner_delegations
    WHERE horse_id = _horse_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND revoked_at IS NULL
      AND (delegate_user_id = v_user OR (v_tenant IS NOT NULL AND delegate_tenant_id = v_tenant))
    LIMIT 1;
    IF v_deleg_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'mode','delegated_identity',
        'reason_code','delegated_active',
        'viewer_user_id', v_user,
        'viewer_tenant_id', v_tenant,
        'snapshot_only', false,
        'badges', jsonb_build_array('delegated'),
        'warnings', '[]'::jsonb,
        'delegation_id', v_deleg_id
      );
    END IF;

    -- 3. Active invited grant
    SELECT id INTO v_grant_id
    FROM public.horse_owner_access_grants
    WHERE horse_id = _horse_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND revoked_at IS NULL
      AND (grantee_user_id = v_user OR (v_tenant IS NOT NULL AND grantee_owner_tenant_id = v_tenant))
    LIMIT 1;
    IF v_grant_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'mode','invited_owner_read',
        'reason_code','invited_owner_read',
        'viewer_user_id', v_user,
        'viewer_tenant_id', v_tenant,
        'snapshot_only', false,
        'badges', jsonb_build_array('invited_owner'),
        'warnings', '[]'::jsonb,
        'grant_id', v_grant_id
      );
    END IF;
  END IF;

  -- 4. Current host operational (active admission for active tenant)
  v_host := public._resolve_host_scope(_viewer, _horse_id);
  IF (v_host->>'matched')::boolean THEN
    RETURN jsonb_build_object(
      'mode','current_host_operational',
      'reason_code', v_host->>'reason_code',
      'viewer_user_id', v_user,
      'viewer_tenant_id', v_tenant,
      'snapshot_only', false,
      'badges', jsonb_build_array('current_host'),
      'warnings', '[]'::jsonb,
      'admission_id', v_host->'admission_id'
    );
  END IF;

  -- 5. Previous host historical
  v_prev := public._resolve_previous_host_scope(_viewer, _horse_id);
  IF (v_prev->>'matched')::boolean THEN
    RETURN jsonb_build_object(
      'mode','previous_host_historical',
      'reason_code', v_prev->>'reason_code',
      'viewer_user_id', v_user,
      'viewer_tenant_id', v_tenant,
      'snapshot_only', true,
      'badges', jsonb_build_array('previous_host'),
      'warnings', '[]'::jsonb,
      'admission_id', v_prev->'admission_id',
      'period_end', v_prev->'period_end'
    );
  END IF;

  -- 6. Fallback: no access
  RETURN jsonb_build_object(
    'mode','no_access',
    'reason_code','no_relationship',
    'viewer_user_id', v_user,
    'viewer_tenant_id', v_tenant,
    'snapshot_only', false,
    'badges', '[]'::jsonb,
    'warnings', '[]'::jsonb
  );
END;
$$;

-- ============================================================================
-- 3. Public authenticated RPCs
-- ============================================================================

-- Build section_perms based on resolved mode. Centralized here so projection + access agree.
CREATE OR REPLACE FUNCTION public._section_perms_for_mode(_mode text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT CASE _mode
    WHEN 'owner_authority' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,false,null),
      'identity', public._section_permission(true,false,false,'deferred_edit'),
      'ownership', public._section_permission(true,false,false,'deferred_edit'),
      'location_housing', public._section_permission(true,false,false,null),
      'movement_transfer', public._section_permission(true,false,false,null),
      'health_vet', public._section_permission(true,false,false,null),
      'lab', public._section_permission(true,false,false,null),
      'pedigree', public._section_permission(true,false,false,null),
      'documents', public._section_permission(true,false,false,null),
      'team', public._section_permission(true,false,false,null),
      'sharing_access', public._section_permission(true,false,false,null),
      'activity_history', public._section_permission(true,false,false,null)
    )
    WHEN 'co_owner_authority' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,false,null),
      'identity', public._section_permission(true,false,false,'deferred_edit'),
      'ownership', public._section_permission(true,false,false,'co_owner_consent_required'),
      'location_housing', public._section_permission(true,false,false,null),
      'movement_transfer', public._section_permission(true,false,false,null),
      'health_vet', public._section_permission(true,false,false,null),
      'lab', public._section_permission(true,false,false,null),
      'pedigree', public._section_permission(true,false,false,null),
      'documents', public._section_permission(true,false,false,null),
      'team', public._section_permission(true,false,false,null),
      'sharing_access', public._section_permission(true,false,false,null),
      'activity_history', public._section_permission(true,false,false,null)
    )
    WHEN 'delegated_identity' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,false,null),
      'identity', public._section_permission(true,false,false,'delegated_scope'),
      'ownership', public._section_permission(true,false,true,'owner_only'),
      'location_housing', public._section_permission(true,false,false,null),
      'movement_transfer', public._section_permission(true,false,false,null),
      'health_vet', public._section_permission(true,false,false,null),
      'lab', public._section_permission(true,false,false,null),
      'pedigree', public._section_permission(true,false,false,null),
      'documents', public._section_permission(true,false,false,null),
      'team', public._section_permission(false,false,false,'owner_only'),
      'sharing_access', public._section_permission(false,false,false,'owner_only'),
      'activity_history', public._section_permission(true,false,false,null)
    )
    WHEN 'invited_owner_read' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,true,null),
      'identity', public._section_permission(true,false,true,null),
      'ownership', public._section_permission(true,false,true,null),
      'location_housing', public._section_permission(true,false,true,null),
      'movement_transfer', public._section_permission(true,false,true,null),
      'health_vet', public._section_permission(true,false,true,null),
      'lab', public._section_permission(true,false,true,null),
      'pedigree', public._section_permission(true,false,true,null),
      'documents', public._section_permission(false,false,true,'invited_owner_scope'),
      'team', public._section_permission(false,false,false,'owner_only'),
      'sharing_access', public._section_permission(false,false,false,'owner_only'),
      'activity_history', public._section_permission(true,false,true,null)
    )
    WHEN 'current_host_operational' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,false,null),
      'identity', public._section_permission(true,false,true,'current_host_only'),
      'ownership', public._section_permission(true,false,true,'redacted_pii'),
      'location_housing', public._section_permission(true,false,false,null),
      'movement_transfer', public._section_permission(true,false,false,null),
      'health_vet', public._section_permission(true,false,false,'host_records_only'),
      'lab', public._section_permission(true,false,false,'host_records_only'),
      'pedigree', public._section_permission(true,false,true,null),
      'documents', public._section_permission(false,false,false,'owner_only'),
      'team', public._section_permission(true,false,false,'current_host_only'),
      'sharing_access', public._section_permission(false,false,false,'owner_only'),
      'activity_history', public._section_permission(true,false,false,null)
    )
    WHEN 'previous_host_historical' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,true,'previous_host_historical'),
      'identity', public._section_permission(true,false,true,'snapshot_only'),
      'ownership', public._section_permission(false,false,true,'owner_only'),
      'location_housing', public._section_permission(true,false,true,'snapshot_only'),
      'movement_transfer', public._section_permission(true,false,true,'snapshot_only'),
      'health_vet', public._section_permission(true,false,true,'host_records_only'),
      'lab', public._section_permission(true,false,true,'host_records_only'),
      'pedigree', public._section_permission(false,false,true,'owner_only'),
      'documents', public._section_permission(false,false,false,'owner_only'),
      'team', public._section_permission(false,false,false,'owner_only'),
      'sharing_access', public._section_permission(false,false,false,'owner_only'),
      'activity_history', public._section_permission(true,false,true,'snapshot_only')
    )
    ELSE jsonb_build_object()
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_horse_file_access(
  p_horse_id uuid,
  p_active_tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_viewer jsonb;
  v_access jsonb;
  v_section_perms jsonb;
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
        'mode','no_access',
        'reason_code','not_member_of_tenant',
        'viewer_user_id', v_user,
        'viewer_tenant_id', p_active_tenant_id,
        'snapshot_only', false,
        'badges','[]'::jsonb,
        'warnings','[]'::jsonb
      ),
      'section_perms', '{}'::jsonb,
      'action_perms', '{}'::jsonb
    );
  END IF;

  v_viewer := jsonb_build_object('user_id', v_user, 'tenant_id', p_active_tenant_id, 'channel','authenticated');
  v_access := public._resolve_horse_access_mode(v_viewer, p_horse_id);
  v_section_perms := public._section_perms_for_mode(v_access->>'mode');

  RETURN jsonb_build_object(
    'horse_id', p_horse_id,
    'access', v_access,
    'section_perms', COALESCE(v_section_perms, '{}'::jsonb),
    'action_perms', '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unified_horse_file_projection(
  p_horse_id uuid,
  p_active_tenant_id uuid,
  p_include_tabs text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_viewer jsonb;
  v_access jsonb;
  v_mode text;
  v_section_perms jsonb;
  v_horse record;
  v_header jsonb := '{}'::jsonb;
  v_sections jsonb := '{}'::jsonb;
  v_tabs jsonb := '[]'::jsonb;
  v_default_tabs text[] := ARRAY['overview','identity','ownership','location_housing','movement_transfer','health_vet','lab','pedigree','documents','team','sharing_access','activity_history'];
  v_use_tabs text[];
  v_redact_pii boolean;
  v_snapshot boolean;
  v_owner_label text;
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
        'mode','no_access',
        'reason_code','not_member_of_tenant',
        'viewer_user_id', v_user,
        'viewer_tenant_id', p_active_tenant_id,
        'is_snapshot_view', false,
        'badges','[]'::jsonb
      ),
      'header','{}'::jsonb,
      'tabs','[]'::jsonb,
      'sections','{}'::jsonb,
      'warnings','[]'::jsonb,
      'history', jsonb_build_object('events','[]'::jsonb),
      'errors','[]'::jsonb
    );
  END IF;

  v_viewer := jsonb_build_object('user_id', v_user, 'tenant_id', p_active_tenant_id, 'channel','authenticated');
  v_access := public._resolve_horse_access_mode(v_viewer, p_horse_id);
  v_mode := v_access->>'mode';
  v_section_perms := COALESCE(public._section_perms_for_mode(v_mode), '{}'::jsonb);
  v_snapshot := COALESCE((v_access->>'snapshot_only')::boolean, false);
  v_redact_pii := v_mode NOT IN ('owner_authority','co_owner_authority','delegated_identity','invited_owner_read');

  IF v_mode = 'no_access' THEN
    RETURN jsonb_build_object(
      'horse_id', p_horse_id,
      'access', v_access || jsonb_build_object('is_snapshot_view', v_snapshot),
      'header','{}'::jsonb,
      'tabs','[]'::jsonb,
      'sections','{}'::jsonb,
      'warnings','[]'::jsonb,
      'history', jsonb_build_object('events','[]'::jsonb),
      'errors','[]'::jsonb
    );
  END IF;

  -- Explicit field selection — no SELECT *
  SELECT id, name, name_ar, status, tenant_id, owner_tenant_id, avatar_url
    INTO v_horse
  FROM public.horses
  WHERE id = p_horse_id;

  -- Owner display label (no PII columns). Compact, primary-owner-first.
  SELECT COALESCE(NULLIF(ow.name,''), NULLIF(ow.name_ar,''))
    INTO v_owner_label
  FROM public.horse_ownership ho
  JOIN public.horse_owners ow ON ow.id = ho.owner_id
  WHERE ho.horse_id = p_horse_id
  ORDER BY ho.is_primary DESC NULLS LAST, ho.ownership_percentage DESC NULLS LAST, ho.created_at ASC
  LIMIT 1;

  v_header := jsonb_build_object(
    'name', public._field(to_jsonb(v_horse.name), CASE WHEN v_snapshot THEN 'snapshot' ELSE 'canonical' END, false, NULL),
    'name_ar', public._field(to_jsonb(v_horse.name_ar), CASE WHEN v_snapshot THEN 'snapshot' ELSE 'canonical' END, false, NULL),
    'status', to_jsonb(v_horse.status),
    'current_host', NULL,
    'location_summary', NULL
  );

  -- Identity section (basic, read-only in v1)
  v_sections := jsonb_set(v_sections, ARRAY['identity'], jsonb_build_object(
    'visible', COALESCE((v_section_perms->'identity'->>'visible')::boolean, false),
    'snapshot_only', COALESCE((v_section_perms->'identity'->>'snapshot_only')::boolean, false),
    'fields', jsonb_build_object(
      'name', public._field(to_jsonb(v_horse.name), CASE WHEN v_snapshot THEN 'snapshot' ELSE 'canonical' END, false, NULL),
      'name_ar', public._field(to_jsonb(v_horse.name_ar), CASE WHEN v_snapshot THEN 'snapshot' ELSE 'canonical' END, false, NULL),
      'status', public._field(to_jsonb(v_horse.status), 'canonical', false, NULL),
      'avatar_url', public._field(to_jsonb(v_horse.avatar_url), 'canonical', false, NULL)
    ),
    'actions', '{}'::jsonb
  ), true);

  -- Ownership section: owner label only; PII redacted unless owner-class mode
  v_sections := jsonb_set(v_sections, ARRAY['ownership'], jsonb_build_object(
    'visible', COALESCE((v_section_perms->'ownership'->>'visible')::boolean, false),
    'snapshot_only', COALESCE((v_section_perms->'ownership'->>'snapshot_only')::boolean, false),
    'fields', jsonb_build_object(
      'primary_owner_label', public._field(to_jsonb(v_owner_label), 'canonical', false, NULL),
      'owner_phone', public._field(NULL, 'redacted', false, CASE WHEN v_redact_pii THEN 'owner_only' ELSE 'deferred' END),
      'owner_email', public._field(NULL, 'redacted', false, CASE WHEN v_redact_pii THEN 'owner_only' ELSE 'deferred' END)
    ),
    'actions', '{}'::jsonb
  ), true);

  -- Stub other sections as visible/empty per section_perms
  FOR v_section_perms IN
    SELECT jsonb_object_agg(k, v) FROM (
      SELECT k, v FROM jsonb_each(COALESCE(public._section_perms_for_mode(v_mode), '{}'::jsonb)) AS s(k,v)
      WHERE k NOT IN ('identity','ownership')
    ) sub
  LOOP
    EXIT WHEN v_section_perms IS NULL;
    -- Iterate each remaining section and shape it
    SELECT jsonb_object_agg(k, jsonb_build_object(
      'visible', COALESCE((v->>'visible')::boolean,false),
      'snapshot_only', COALESCE((v->>'snapshot_only')::boolean,false),
      'fields', '{}'::jsonb,
      'actions', '{}'::jsonb,
      'reason', v->>'reason'
    )) INTO v_section_perms
    FROM jsonb_each(v_section_perms) AS s(k,v);
    v_sections := v_sections || v_section_perms;
    EXIT;
  END LOOP;

  -- Tabs
  v_use_tabs := COALESCE(p_include_tabs, v_default_tabs);
  SELECT jsonb_agg(jsonb_build_object(
    'key', t,
    'visible', COALESCE((public._section_perms_for_mode(v_mode)->t->>'visible')::boolean, false),
    'snapshot_only', COALESCE((public._section_perms_for_mode(v_mode)->t->>'snapshot_only')::boolean, false),
    'empty', false,
    'reason', public._section_perms_for_mode(v_mode)->t->>'reason'
  )) INTO v_tabs
  FROM unnest(v_use_tabs) AS t
  WHERE t = ANY(v_default_tabs);

  RETURN jsonb_build_object(
    'horse_id', p_horse_id,
    'access', v_access || jsonb_build_object('is_snapshot_view', v_snapshot),
    'header', v_header,
    'tabs', COALESCE(v_tabs, '[]'::jsonb),
    'sections', v_sections,
    'warnings', '[]'::jsonb,
    'history', jsonb_build_object('events','[]'::jsonb),
    'errors', '[]'::jsonb
  );
END;
$$;

-- Share-token RPC: hard-safe no-access stub. No private data returned.
CREATE OR REPLACE FUNCTION public.get_unified_horse_file_projection_by_share_token(
  p_token text,
  p_include_tabs text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope jsonb;
BEGIN
  v_scope := public._resolve_share_link_scope(p_token);
  RETURN jsonb_build_object(
    'horse_id', NULL,
    'access', jsonb_build_object(
      'mode', COALESCE(v_scope->>'mode','no_access'),
      'reason_code', COALESCE(v_scope->>'reason_code','share_token_not_ready'),
      'viewer_user_id', NULL,
      'viewer_tenant_id', NULL,
      'is_snapshot_view', false,
      'badges', '[]'::jsonb
    ),
    'header','{}'::jsonb,
    'tabs','[]'::jsonb,
    'sections','{}'::jsonb,
    'warnings','[]'::jsonb,
    'history', jsonb_build_object('events','[]'::jsonb),
    'errors','[]'::jsonb
  );
END;
$$;

-- ============================================================================
-- 4. GRANT / REVOKE discipline
-- ============================================================================

-- Revoke from PUBLIC on everything created/replaced above
REVOKE ALL ON FUNCTION public._field(jsonb, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._section_permission(boolean, boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._section_perms_for_mode(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_owner_authority(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_host_scope(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_previous_host_scope(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_provider_scope(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_share_link_scope(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_horse_access_mode(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_horse_file_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unified_horse_file_projection(uuid, uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unified_horse_file_projection_by_share_token(text, text[]) FROM PUBLIC;

-- Explicitly deny private helpers to anon and authenticated
REVOKE ALL ON FUNCTION public._field(jsonb, text, boolean, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._section_permission(boolean, boolean, boolean, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._section_perms_for_mode(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_owner_authority(jsonb, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_host_scope(jsonb, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_previous_host_scope(jsonb, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_provider_scope(jsonb, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_share_link_scope(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public._resolve_horse_access_mode(jsonb, uuid) FROM anon, authenticated;

-- Grant authenticated-only RPCs
GRANT EXECUTE ON FUNCTION public.get_horse_file_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_horse_file_projection(uuid, uuid, text[]) TO authenticated;

-- Share-token RPC: anon + authenticated
GRANT EXECUTE ON FUNCTION public.get_unified_horse_file_projection_by_share_token(text, text[]) TO anon, authenticated;

-- Comments
COMMENT ON FUNCTION public.get_horse_file_access(uuid, uuid) IS
  'Phase 1.e.f.8.1.1a Unified Horse File access envelope. SECURITY DEFINER. Authenticated only. Resolves access mode server-side; never trusts frontend.';
COMMENT ON FUNCTION public.get_unified_horse_file_projection(uuid, uuid, text[]) IS
  'Phase 1.e.f.8.1.1a Unified Horse File projection. SECURITY DEFINER. Authenticated only. Read-only. Respects section_perms and PII redaction.';
COMMENT ON FUNCTION public.get_unified_horse_file_projection_by_share_token(text, text[]) IS
  'Phase 1.e.f.8.1.1a share-token projection. Hard-safe no-access stub. Real token verification deferred.';
COMMENT ON FUNCTION public._resolve_horse_access_mode(jsonb, uuid) IS
  'Private resolver. Never grant to anon/authenticated. Decides Unified Horse File access mode using verified bridge facts only.';
