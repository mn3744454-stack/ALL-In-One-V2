-- B2.3e-S1/S2 narrow correction
-- S-1: restrict EXECUTE on materialize_owner_as_client to service_role only.
-- S-2: populate clients.name_ar from owner profile fallback when tenant.name_ar is NULL.

CREATE OR REPLACE FUNCTION public.materialize_owner_as_client(p_contract_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_c               public.boarding_contracts;
  v_owner_tenant    public.tenants;
  v_client_id       uuid;
  v_name_ar         text;
  v_name_en         text;
BEGIN
  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'contract_id required';
  END IF;

  SELECT * INTO v_c
  FROM public.boarding_contracts
  WHERE id = p_contract_id
  FOR UPDATE;

  IF v_c.id IS NULL THEN
    RAISE EXCEPTION 'Boarding contract % not found', p_contract_id;
  END IF;

  IF v_c.status <> 'active' THEN
    RAISE EXCEPTION 'Contract % is not active (status=%)', p_contract_id, v_c.status;
  END IF;

  IF v_c.stable_tenant_id IS NULL OR v_c.owner_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Contract % missing stable or owner tenant', p_contract_id;
  END IF;

  SELECT * INTO v_owner_tenant
  FROM public.tenants
  WHERE id = v_c.owner_tenant_id;

  IF v_owner_tenant.id IS NULL THEN
    RAISE EXCEPTION 'Owner tenant % not found', v_c.owner_tenant_id;
  END IF;

  -- Resolve Arabic display name from best available source
  -- Priority 1: tenants.name_ar
  v_name_ar := NULLIF(BTRIM(v_owner_tenant.name_ar), '');

  -- Priority 2: owner-role member profile full_name_ar
  IF v_name_ar IS NULL THEN
    SELECT NULLIF(BTRIM(p.full_name_ar), '')
      INTO v_name_ar
    FROM public.tenant_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.tenant_id = v_owner_tenant.id
      AND tm.role = 'owner'
      AND NULLIF(BTRIM(p.full_name_ar), '') IS NOT NULL
    ORDER BY tm.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  -- Priority 3: any tenant member with full_name_ar
  IF v_name_ar IS NULL THEN
    SELECT NULLIF(BTRIM(p.full_name_ar), '')
      INTO v_name_ar
    FROM public.tenant_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.tenant_id = v_owner_tenant.id
      AND NULLIF(BTRIM(p.full_name_ar), '') IS NOT NULL
    ORDER BY tm.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  -- Resolve English display name (tenant.name fallback to owner-member profile full_name)
  v_name_en := NULLIF(BTRIM(v_owner_tenant.name), '');
  IF v_name_en IS NULL THEN
    SELECT NULLIF(BTRIM(p.full_name), '')
      INTO v_name_en
    FROM public.tenant_members tm
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.tenant_id = v_owner_tenant.id
      AND tm.role = 'owner'
    ORDER BY tm.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  -- Reuse existing linked client if present
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE tenant_id = v_c.stable_tenant_id
    AND linked_tenant_id = v_c.owner_tenant_id
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      tenant_id,
      name,
      name_ar,
      type,
      status,
      linked_tenant_id
    ) VALUES (
      v_c.stable_tenant_id,
      COALESCE(v_name_en, 'Horse Owner'),
      v_name_ar,
      'individual',
      'active',
      v_c.owner_tenant_id
    )
    ON CONFLICT (tenant_id, linked_tenant_id)
      WHERE linked_tenant_id IS NOT NULL
      DO UPDATE SET updated_at = now()
    RETURNING id INTO v_client_id;
  ELSE
    -- Idempotent fill: populate name_ar only when currently NULL/blank
    UPDATE public.clients
       SET name_ar = v_name_ar,
           updated_at = now()
     WHERE id = v_client_id
       AND NULLIF(BTRIM(name_ar), '') IS NULL
       AND v_name_ar IS NOT NULL;
  END IF;

  -- Link contract if missing
  UPDATE public.boarding_contracts
     SET client_id = v_client_id,
         updated_at = now()
   WHERE id = p_contract_id
     AND client_id IS NULL;

  -- Link active admissions for same stable+horse (client_id NULL only)
  UPDATE public.boarding_admissions
     SET client_id = v_client_id,
         updated_at = now()
   WHERE tenant_id = v_c.stable_tenant_id
     AND horse_id = v_c.horse_id
     AND status = 'active'
     AND client_id IS NULL;

  RETURN v_client_id;
END;
$function$;

-- S-1: lock down EXECUTE. Outer SECURITY DEFINER caller
-- (approve_boarding_contract_as_owner) runs as its own owner, which retains
-- privilege; only direct callers from anon/authenticated/PUBLIC are blocked.
REVOKE EXECUTE ON FUNCTION public.materialize_owner_as_client(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.materialize_owner_as_client(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.materialize_owner_as_client(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.materialize_owner_as_client(uuid) TO service_role;

-- Backfill existing linked clients whose name_ar is NULL but profile source exists
DO $$
DECLARE
  r RECORD;
  v_ar text;
BEGIN
  FOR r IN
    SELECT c.id AS client_id, c.linked_tenant_id
    FROM public.clients c
    WHERE c.linked_tenant_id IS NOT NULL
      AND NULLIF(BTRIM(c.name_ar), '') IS NULL
  LOOP
    v_ar := NULL;

    SELECT NULLIF(BTRIM(t.name_ar), '') INTO v_ar
    FROM public.tenants t WHERE t.id = r.linked_tenant_id;

    IF v_ar IS NULL THEN
      SELECT NULLIF(BTRIM(p.full_name_ar), '') INTO v_ar
      FROM public.tenant_members tm
      JOIN public.profiles p ON p.id = tm.user_id
      WHERE tm.tenant_id = r.linked_tenant_id
        AND tm.role = 'owner'
        AND NULLIF(BTRIM(p.full_name_ar), '') IS NOT NULL
      ORDER BY tm.created_at ASC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_ar IS NULL THEN
      SELECT NULLIF(BTRIM(p.full_name_ar), '') INTO v_ar
      FROM public.tenant_members tm
      JOIN public.profiles p ON p.id = tm.user_id
      WHERE tm.tenant_id = r.linked_tenant_id
        AND NULLIF(BTRIM(p.full_name_ar), '') IS NOT NULL
      ORDER BY tm.created_at ASC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_ar IS NOT NULL THEN
      UPDATE public.clients
         SET name_ar = v_ar, updated_at = now()
       WHERE id = r.client_id;
    END IF;
  END LOOP;
END$$;