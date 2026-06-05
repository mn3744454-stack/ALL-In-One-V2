
-- B2.3e: Stable-side customer materialization (owner tenant -> local client)

CREATE OR REPLACE FUNCTION public.materialize_owner_as_client(p_contract_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_c               public.boarding_contracts;
  v_owner_tenant    public.tenants;
  v_client_id       uuid;
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
      COALESCE(v_owner_tenant.name, 'Horse Owner'),
      v_owner_tenant.name_ar,
      'individual',
      'active',
      v_c.owner_tenant_id
    )
    ON CONFLICT (tenant_id, linked_tenant_id)
      WHERE linked_tenant_id IS NOT NULL
      DO UPDATE SET updated_at = now()
    RETURNING id INTO v_client_id;
  END IF;

  -- Link contract if missing
  UPDATE public.boarding_contracts
     SET client_id = v_client_id,
         updated_at = now()
   WHERE id = p_contract_id
     AND client_id IS NULL;

  -- Link active admissions for same stable+horse under this contract (client_id NULL only)
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

REVOKE ALL ON FUNCTION public.materialize_owner_as_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.materialize_owner_as_client(uuid) TO authenticated, service_role;

-- Wire into owner activation RPC
CREATE OR REPLACE FUNCTION public.approve_boarding_contract_as_owner(_contract_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
  v_conn_status text;
  v_cha_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _contract_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_c.status <> 'pending_owner' THEN
    RAISE EXCEPTION 'Contract must be in pending_owner to be approved by owner (current: %)', v_c.status;
  END IF;
  IF NOT public.is_tenant_member(v_user, v_c.owner_tenant_id) THEN
    RAISE EXCEPTION 'Caller is not a member of owner tenant';
  END IF;
  IF v_c.plan_id IS NULL OR v_c.plan_snapshot IS NULL THEN
    RAISE EXCEPTION 'Contract is missing plan or snapshot';
  END IF;

  SELECT status INTO v_conn_status FROM public.connections WHERE id = v_c.connection_id FOR UPDATE;
  IF v_conn_status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.connections
       SET status = 'accepted',
           accepted_at = COALESCE(accepted_at, now()),
           accepted_by = COALESCE(accepted_by, v_user),
           updated_at = now()
     WHERE id = v_c.connection_id;
  END IF;

  SELECT id INTO v_cha_id
    FROM public.connection_horse_access
   WHERE connection_id = v_c.connection_id AND horse_id = v_c.horse_id;
  IF v_cha_id IS NULL THEN
    INSERT INTO public.connection_horse_access (connection_id, horse_id, access_level, granted_by)
    VALUES (v_c.connection_id, v_c.horse_id, 'readwrite', v_user)
    RETURNING id INTO v_cha_id;
  ELSE
    UPDATE public.connection_horse_access
       SET access_level = 'readwrite'
     WHERE id = v_cha_id AND access_level <> 'readwrite';
  END IF;

  UPDATE public.boarding_contracts
     SET status = 'active',
         owner_approved_at = now(),
         activated_at = now(),
         connection_horse_access_id = v_cha_id,
         operational_phase = CASE WHEN operational_phase = 'not_started'
                                  THEN 'awaiting_arrival'
                                  ELSE operational_phase END
   WHERE id = _contract_id;

  -- B2.3e: materialize stable-side client (best-effort; do not block activation)
  BEGIN
    PERFORM public.materialize_owner_as_client(_contract_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'materialize_owner_as_client failed for %: %', _contract_id, SQLERRM;
  END;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'active', 'operational_phase', 'awaiting_arrival');
END;
$function$;

-- Backfill: materialize for all currently-active contracts
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.boarding_contracts WHERE status = 'active' AND owner_tenant_id IS NOT NULL LOOP
    BEGIN
      PERFORM public.materialize_owner_as_client(r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Backfill failed for contract %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
