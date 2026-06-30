CREATE OR REPLACE FUNCTION public._resolve_owner_authority(_viewer jsonb, _horse_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := NULLIF(_viewer->>'user_id','')::uuid;
  v_tenant uuid := NULLIF(_viewer->>'tenant_id','')::uuid;
  v_found boolean := false;
  v_co boolean := false;
  v_horse_tenant uuid;
  v_active_tenant_type text;
BEGIN
  IF _horse_id IS NULL OR v_user IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason_code', 'owner_bridge_not_provisioned');
  END IF;

  -- 1) Existing verified owner bridge / claim authority (unchanged).
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

  -- 2) Phase 1.e.f.8.1.4.c.r1.correction — Same Horse-Owner-Tenant authority.
  -- Narrow branch: only when the active tenant is explicitly of type
  -- 'horse_owner', the horse row belongs to that same tenant, and the
  -- viewer is an active member of that tenant. This does NOT apply to
  -- stable / clinic / laboratory / pharmacy / transport / academy /
  -- auction / doctor / trainer tenants — those flows remain governed by
  -- host / previous-host / provider-scoped / no_access branches.
  IF v_tenant IS NOT NULL THEN
    SELECT h.tenant_id INTO v_horse_tenant
    FROM public.horses h
    WHERE h.id = _horse_id;

    IF v_horse_tenant IS NOT NULL AND v_horse_tenant = v_tenant THEN
      SELECT t.type::text INTO v_active_tenant_type
      FROM public.tenants t
      WHERE t.id = v_tenant;

      IF v_active_tenant_type = 'horse_owner'
         AND public.is_active_tenant_member(v_user, v_tenant) THEN
        RETURN jsonb_build_object(
          'matched', true,
          'mode', 'owner_authority',
          'reason_code', 'same_horse_owner_tenant_authority'
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('matched', false, 'reason_code', 'owner_bridge_not_provisioned');
END;
$function$;