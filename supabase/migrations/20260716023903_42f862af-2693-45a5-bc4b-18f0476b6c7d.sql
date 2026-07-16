
-- Phase 1.e.f.8.1.4.d.3.fix.1.pre.r1.fix — Reproductive / Contextual Horse Quick Add Profile Access Fix
--
-- Adds a bounded 'local_tenant_horse' fallback to the Horse Profile access
-- resolver so a horse that was created directly inside the current tenant
-- (via QuickCreateHorseDialog) can be opened in Horse Profile by an active
-- member of that same tenant. The fallback is evaluated AFTER every stronger
-- mode (owner_authority, delegated_identity, invited_owner_read,
-- current_host_operational, previous_host_historical) and never overrides
-- them. It grants read-only, snapshot-only visibility: overview + identity
-- only, no ownership PII, no write authority.

CREATE OR REPLACE FUNCTION public._resolve_horse_access_mode(_viewer jsonb, _horse_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := NULLIF(_viewer->>'user_id','')::uuid;
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_horse_exists boolean := false;
  v_horse_tenant uuid;
  v_owner jsonb;
  v_host jsonb;
  v_prev jsonb;
  v_grant_id uuid;
  v_deleg_id uuid;
BEGIN
  -- Existence probe (server-side, conservative). Also capture the row's
  -- tenant_id in the same lookup so the local-tenant fallback below does
  -- not require a second query.
  SELECT true, tenant_id
    INTO v_horse_exists, v_horse_tenant
  FROM public.horses
  WHERE id = _horse_id;

  IF NOT COALESCE(v_horse_exists, false) THEN
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

  -- 4. Current host operational
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

  -- 6. Local tenant horse fallback (Phase 1.e.f.8.1.4.d.3.fix.1.pre.r1.fix)
  --
  -- The horse row belongs to the viewer's active tenant AND the viewer is an
  -- active member of that tenant (get_horse_file_access already enforces the
  -- membership check upstream, but we re-verify here so this helper is safe
  -- when called from other SECURITY DEFINER surfaces). This branch is chosen
  -- ONLY when every stronger relationship above missed. It grants read-only
  -- snapshot visibility so a horse created via Quick Add inside the tenant
  -- (e.g. from reproductive dialogs, admissions, invoices) can be opened in
  -- Horse Profile without inventing ownership, host relationship, or write
  -- authority.
  IF v_tenant IS NOT NULL
     AND v_horse_tenant IS NOT NULL
     AND v_horse_tenant = v_tenant
     AND v_user IS NOT NULL
     AND public.is_active_tenant_member(v_user, v_tenant) THEN
    RETURN jsonb_build_object(
      'mode','local_tenant_horse',
      'reason_code','local_tenant_record',
      'viewer_user_id', v_user,
      'viewer_tenant_id', v_tenant,
      'snapshot_only', true,
      'badges', jsonb_build_array('local_record'),
      'warnings', '[]'::jsonb
    );
  END IF;

  -- 7. Fallback: no access
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
$function$;

-- Add the local_tenant_horse case to the section permissions map. Read-only
-- everywhere; overview + identity visible as snapshot; ownership hidden so
-- no owner PII leaks; all other sections hidden (they will require stronger
-- modes to be surfaced).
CREATE OR REPLACE FUNCTION public._section_perms_for_mode(_mode text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    WHEN 'local_tenant_horse' THEN jsonb_build_object(
      'overview', public._section_permission(true,false,true,'local_tenant_record'),
      'identity', public._section_permission(true,false,true,'local_tenant_record'),
      'ownership', public._section_permission(false,false,true,'owner_only'),
      'location_housing', public._section_permission(true,false,true,'local_tenant_record'),
      'movement_transfer', public._section_permission(false,false,true,'not_available_locally'),
      'health_vet', public._section_permission(false,false,true,'not_available_locally'),
      'lab', public._section_permission(false,false,true,'not_available_locally'),
      'pedigree', public._section_permission(false,false,true,'not_available_locally'),
      'documents', public._section_permission(false,false,true,'owner_only'),
      'team', public._section_permission(false,false,true,'owner_only'),
      'sharing_access', public._section_permission(false,false,true,'owner_only'),
      'activity_history', public._section_permission(false,false,true,'not_available_locally')
    )
    ELSE jsonb_build_object()
  END;
$function$;
