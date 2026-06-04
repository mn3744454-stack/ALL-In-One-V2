
-- B2.1: Correct connection sequencing for boarding contracts.
-- No schema changes to existing tables. Only RPC rewrites + 1 new display RPC.

CREATE OR REPLACE FUNCTION public.create_boarding_contract_with_connection(
  _initiator_tenant_id uuid,
  _initiator_role text,
  _counterparty_tenant_id uuid,
  _horse_id uuid,
  _plan_id uuid DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _terms_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_stable_id uuid;
  v_owner_id  uuid;
  v_status text;
  v_init_type text;
  v_counter_type text;
  v_connection_id uuid;
  v_existing public.boarding_contracts;
  v_contract_id uuid;
  v_snapshot jsonb;
  v_horse_tenant uuid;
  v_client_linked uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _initiator_role NOT IN ('stable','horse_owner') THEN
    RAISE EXCEPTION 'Invalid initiator_role: must be stable or horse_owner';
  END IF;
  IF NOT public.is_tenant_member(v_user, _initiator_tenant_id) THEN
    RAISE EXCEPTION 'Caller is not a member of initiator tenant';
  END IF;

  SELECT type INTO v_init_type    FROM public.tenants WHERE id = _initiator_tenant_id;
  SELECT type INTO v_counter_type FROM public.tenants WHERE id = _counterparty_tenant_id;
  IF v_init_type IS NULL OR v_counter_type IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF _initiator_role = 'stable' THEN
    IF v_init_type <> 'stable' THEN
      RAISE EXCEPTION 'Initiator tenant must be of type stable';
    END IF;
    IF v_counter_type <> 'horse_owner' THEN
      RAISE EXCEPTION 'Counterparty tenant must be of type horse_owner';
    END IF;
    IF NOT public.has_permission(v_user, _initiator_tenant_id, 'boarding.contracts.create') THEN
      RAISE EXCEPTION 'Missing permission boarding.contracts.create';
    END IF;
    IF _plan_id IS NULL THEN
      RAISE EXCEPTION 'plan_id is required for stable-initiated contracts';
    END IF;
    IF _client_id IS NULL THEN
      RAISE EXCEPTION 'client_id is required for stable-initiated contracts';
    END IF;
    SELECT linked_tenant_id INTO v_client_linked
      FROM public.clients WHERE id = _client_id AND tenant_id = _initiator_tenant_id;
    IF v_client_linked IS NULL OR v_client_linked <> _counterparty_tenant_id THEN
      RAISE EXCEPTION 'Client is not linked to the specified Horse Owner tenant';
    END IF;
    v_stable_id := _initiator_tenant_id;
    v_owner_id  := _counterparty_tenant_id;
    v_status := 'pending_owner';
  ELSE
    IF v_init_type <> 'horse_owner' THEN
      RAISE EXCEPTION 'Initiator tenant must be of type horse_owner';
    END IF;
    IF v_counter_type <> 'stable' THEN
      RAISE EXCEPTION 'Counterparty tenant must be of type stable';
    END IF;
    SELECT tenant_id INTO v_horse_tenant FROM public.horses WHERE id = _horse_id;
    IF v_horse_tenant IS NULL OR v_horse_tenant <> _initiator_tenant_id THEN
      RAISE EXCEPTION 'Horse must belong to initiator owner tenant';
    END IF;
    v_stable_id := _counterparty_tenant_id;
    v_owner_id  := _initiator_tenant_id;
    v_status := 'pending_stable';
  END IF;

  IF v_status = 'pending_owner' THEN
    v_snapshot := public.build_boarding_plan_snapshot(_plan_id);
  END IF;

  PERFORM 1 FROM public.boarding_contracts
   WHERE stable_tenant_id = v_stable_id
     AND owner_tenant_id  = v_owner_id
     AND horse_id = _horse_id
     AND status IN ('pending_stable','pending_owner','active')
   FOR UPDATE;

  SELECT * INTO v_existing FROM public.boarding_contracts
   WHERE stable_tenant_id = v_stable_id
     AND owner_tenant_id  = v_owner_id
     AND horse_id = _horse_id
     AND status IN ('pending_stable','pending_owner','active')
   LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'contract_id', v_existing.id,
      'connection_id', v_existing.connection_id,
      'status', v_existing.status,
      'reused', true
    );
  END IF;

  -- Find existing b2c connection between the two tenants (prefer accepted, then pending)
  SELECT id INTO v_connection_id
    FROM public.connections
   WHERE connection_type = 'b2c'
     AND status IN ('pending','accepted')
     AND ((initiator_tenant_id = v_stable_id AND recipient_tenant_id = v_owner_id)
       OR (initiator_tenant_id = v_owner_id  AND recipient_tenant_id = v_stable_id))
   ORDER BY (status = 'accepted') DESC, created_at DESC
   LIMIT 1;

  IF v_connection_id IS NULL THEN
    -- Create as PENDING; stable approval (or pre-existing acceptance) is required before
    -- horse-level access is granted. This applies to both initiator roles: owner-initiated
    -- = pending owner consent on counterparty side; stable-initiated = stable drafted but
    -- owner hasn't accepted yet. In both cases connection stays pending until the other
    -- side approves a contract.
    INSERT INTO public.connections (
      connection_type, initiator_tenant_id, initiator_user_id, recipient_tenant_id,
      status, metadata
    ) VALUES (
      'b2c',
      _initiator_tenant_id,
      v_user,
      _counterparty_tenant_id,
      'pending',
      jsonb_build_object('purpose','boarding','created_via','boarding_contract')
    )
    RETURNING id INTO v_connection_id;
  ELSE
    UPDATE public.connections
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('purpose','boarding'),
           updated_at = now()
     WHERE id = v_connection_id
       AND COALESCE(metadata->>'purpose','') <> 'boarding';
  END IF;

  -- NOTE: connection_horse_access is intentionally NOT created here.
  -- It is only granted on owner final approval (approve_boarding_contract_as_owner).

  INSERT INTO public.boarding_contracts (
    stable_tenant_id, owner_tenant_id, horse_id, connection_id, connection_horse_access_id,
    client_id, plan_id, plan_snapshot, terms_metadata, status,
    stable_approved_at, created_by, created_by_role
  ) VALUES (
    v_stable_id, v_owner_id, _horse_id, v_connection_id, NULL,
    _client_id, _plan_id, v_snapshot,
    COALESCE(_terms_metadata, '{}'::jsonb),
    v_status,
    CASE WHEN v_status = 'pending_owner' THEN now() ELSE NULL END,
    v_user, _initiator_role
  )
  RETURNING id INTO v_contract_id;

  RETURN jsonb_build_object(
    'contract_id', v_contract_id,
    'connection_id', v_connection_id,
    'status', v_status,
    'reused', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_boarding_contract_as_stable(
  _contract_id uuid,
  _plan_id uuid,
  _terms_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
  v_snap jsonb;
  v_conn_status text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _contract_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_c.status <> 'pending_stable' THEN
    RAISE EXCEPTION 'Contract must be in pending_stable to be approved by stable (current: %)', v_c.status;
  END IF;
  IF NOT public.has_permission(v_user, v_c.stable_tenant_id, 'boarding.contracts.approve') THEN
    RAISE EXCEPTION 'Missing permission boarding.contracts.approve';
  END IF;
  IF _plan_id IS NULL THEN RAISE EXCEPTION 'plan_id required'; END IF;
  v_snap := public.build_boarding_plan_snapshot(_plan_id);

  -- Progress the underlying connection: pending -> accepted (stable side consent).
  SELECT status INTO v_conn_status FROM public.connections WHERE id = v_c.connection_id FOR UPDATE;
  IF v_conn_status = 'pending' THEN
    UPDATE public.connections
       SET status = 'accepted',
           accepted_at = now(),
           accepted_by = v_user,
           updated_at = now()
     WHERE id = v_c.connection_id;
  END IF;

  -- NOTE: still no connection_horse_access here. Owner final approval grants it.

  UPDATE public.boarding_contracts
     SET plan_id = _plan_id,
         plan_snapshot = v_snap,
         terms_metadata = COALESCE(_terms_metadata, terms_metadata, '{}'::jsonb),
         status = 'pending_owner',
         stable_approved_at = now()
   WHERE id = _contract_id;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'pending_owner');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_boarding_contract_as_owner(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    -- Owner final approval = owner consents to the connection too.
    UPDATE public.connections
       SET status = 'accepted',
           accepted_at = COALESCE(accepted_at, now()),
           accepted_by = COALESCE(accepted_by, v_user),
           updated_at = now()
     WHERE id = v_c.connection_id;
  END IF;

  -- Grant or upgrade connection_horse_access to readwrite for this horse.
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
         connection_horse_access_id = v_cha_id
   WHERE id = _contract_id;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'active');
END;
$$;

-- Display context RPC: minimal, read-only, membership-gated.
CREATE OR REPLACE FUNCTION public.get_boarding_contract_display_context(_contract_ids uuid[])
RETURNS TABLE (
  contract_id uuid,
  horse_name text,
  horse_name_ar text,
  owner_tenant_name text,
  owner_tenant_name_ar text,
  stable_tenant_name text,
  stable_tenant_name_ar text,
  plan_name text,
  plan_name_ar text,
  plan_base_price numeric,
  plan_currency text,
  plan_billing_cycle text,
  status text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    c.id,
    h.name,
    h.name_ar,
    ot.name,
    ot.name_ar,
    st.name,
    st.name_ar,
    COALESCE(NULLIF(c.plan_snapshot->>'name',''),    sp.name),
    COALESCE(NULLIF(c.plan_snapshot->>'name_ar',''), sp.name_ar),
    COALESCE((c.plan_snapshot->>'base_price')::numeric, sp.base_price),
    COALESCE(NULLIF(c.plan_snapshot->>'currency',''),     sp.currency),
    COALESCE(NULLIF(c.plan_snapshot->>'billing_cycle',''),sp.billing_cycle),
    c.status
  FROM public.boarding_contracts c
  LEFT JOIN public.horses h           ON h.id  = c.horse_id
  LEFT JOIN public.tenants ot         ON ot.id = c.owner_tenant_id
  LEFT JOIN public.tenants st         ON st.id = c.stable_tenant_id
  LEFT JOIN public.stable_service_plans sp ON sp.id = c.plan_id
  WHERE c.id = ANY(_contract_ids)
    AND (
      public.is_tenant_member(auth.uid(), c.stable_tenant_id)
      OR public.is_tenant_member(auth.uid(), c.owner_tenant_id)
    );
$$;

REVOKE ALL ON FUNCTION public.get_boarding_contract_display_context(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_boarding_contract_display_context(uuid[]) TO authenticated;
