
-- Phase B2 Foundation: Boarding Contracts + Owner↔Stable connection orchestration
-- Adds boarding_contracts table, contract_id FK on boarding_admissions, RLS, RPCs,
-- and tenant-level permission keys for boarding contracts.

-- 1. Permission keys
INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('boarding.contracts.view',    'boarding', 'contracts', 'view',    'View Boarding Contracts',   'عرض عقود الإيواء',   'View boarding contracts for this tenant',    'عرض عقود الإيواء الخاصة بهذه المساحة',  true),
  ('boarding.contracts.create',  'boarding', 'contracts', 'create',  'Create Boarding Contracts', 'إنشاء عقود إيواء',   'Create boarding contracts as the stable side','إنشاء عقود إيواء من جهة الإسطبل',       true),
  ('boarding.contracts.approve', 'boarding', 'contracts', 'approve', 'Approve Boarding Contracts','اعتماد عقود الإيواء','Approve boarding contracts on the stable side','اعتماد عقود الإيواء من جهة الإسطبل',    true),
  ('boarding.contracts.cancel',  'boarding', 'contracts', 'cancel',  'Cancel Boarding Contracts', 'إلغاء عقود الإيواء',  'Cancel boarding contracts',                  'إلغاء عقود الإيواء',                     true),
  ('boarding.contracts.end',     'boarding', 'contracts', 'end',     'End Boarding Contracts',    'إنهاء عقود الإيواء',  'End active boarding contracts',              'إنهاء عقود الإيواء النشطة',              true)
ON CONFLICT (key) DO NOTHING;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.boarding_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stable_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  owner_tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  horse_id         uuid NOT NULL REFERENCES public.horses(id)  ON DELETE RESTRICT,
  connection_id    uuid NOT NULL REFERENCES public.connections(id) ON DELETE RESTRICT,
  connection_horse_access_id uuid REFERENCES public.connection_horse_access(id) ON DELETE SET NULL,
  client_id        uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  plan_id          uuid REFERENCES public.stable_service_plans(id) ON DELETE SET NULL,
  plan_snapshot    jsonb,
  terms_metadata   jsonb,
  status           text NOT NULL DEFAULT 'pending_stable',
  version          int  NOT NULL DEFAULT 1,
  start_date       date,
  end_date         date,
  credit_limit     numeric,
  prepaid_balance_enabled boolean NOT NULL DEFAULT false,
  substitution_requires_owner_approval boolean NOT NULL DEFAULT true,
  provider_rules   jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_approved_at  timestamptz,
  stable_approved_at timestamptz,
  activated_at       timestamptz,
  cancelled_at       timestamptz,
  ended_at           timestamptz,
  created_by         uuid REFERENCES auth.users(id),
  created_by_role    text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT boarding_contracts_status_check
    CHECK (status IN ('pending_stable','pending_owner','active','cancelled','ended')),
  CONSTRAINT boarding_contracts_plan_required_for_active
    CHECK (status NOT IN ('pending_owner','active','ended')
           OR (plan_id IS NOT NULL AND plan_snapshot IS NOT NULL)),
  CONSTRAINT boarding_contracts_tenants_distinct
    CHECK (stable_tenant_id <> owner_tenant_id)
);

GRANT SELECT ON public.boarding_contracts TO authenticated;
GRANT ALL    ON public.boarding_contracts TO service_role;

CREATE INDEX IF NOT EXISTS idx_boarding_contracts_stable ON public.boarding_contracts(stable_tenant_id);
CREATE INDEX IF NOT EXISTS idx_boarding_contracts_owner  ON public.boarding_contracts(owner_tenant_id);
CREATE INDEX IF NOT EXISTS idx_boarding_contracts_horse  ON public.boarding_contracts(horse_id);
CREATE INDEX IF NOT EXISTS idx_boarding_contracts_status ON public.boarding_contracts(status);
CREATE INDEX IF NOT EXISTS idx_boarding_contracts_connection ON public.boarding_contracts(connection_id);

-- Duplicate-open prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_boarding_contract
  ON public.boarding_contracts (stable_tenant_id, owner_tenant_id, horse_id)
  WHERE status IN ('pending_stable','pending_owner','active');

-- 3. updated_at + immutability trigger
CREATE OR REPLACE FUNCTION public.fn_boarding_contracts_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Immutable identity columns after creation
  IF NEW.stable_tenant_id IS DISTINCT FROM OLD.stable_tenant_id
     OR NEW.owner_tenant_id IS DISTINCT FROM OLD.owner_tenant_id
     OR NEW.horse_id IS DISTINCT FROM OLD.horse_id
     OR NEW.connection_id IS DISTINCT FROM OLD.connection_id THEN
    RAISE EXCEPTION 'Identity fields (stable_tenant_id, owner_tenant_id, horse_id, connection_id) are immutable on boarding_contracts';
  END IF;

  -- plan_snapshot: may go null -> value once, then immutable
  IF OLD.plan_snapshot IS NOT NULL
     AND NEW.plan_snapshot IS DISTINCT FROM OLD.plan_snapshot THEN
    RAISE EXCEPTION 'plan_snapshot is immutable once set on boarding_contracts';
  END IF;

  -- terms_metadata: immutable after activation
  IF OLD.status = 'active'
     AND NEW.terms_metadata IS DISTINCT FROM OLD.terms_metadata THEN
    RAISE EXCEPTION 'terms_metadata is immutable after the contract is active';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boarding_contracts_before_update ON public.boarding_contracts;
CREATE TRIGGER trg_boarding_contracts_before_update
  BEFORE UPDATE ON public.boarding_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fn_boarding_contracts_before_update();

-- 4. RLS
ALTER TABLE public.boarding_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boarding_contracts_select ON public.boarding_contracts;
CREATE POLICY boarding_contracts_select ON public.boarding_contracts
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(auth.uid(), stable_tenant_id)
    OR public.is_tenant_member(auth.uid(), owner_tenant_id)
  );

-- Direct INSERT/UPDATE/DELETE blocked; mutations go through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS boarding_contracts_no_direct_write ON public.boarding_contracts;
CREATE POLICY boarding_contracts_no_direct_write ON public.boarding_contracts
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 5. Admission FK
ALTER TABLE public.boarding_admissions
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.boarding_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_boarding_admissions_contract ON public.boarding_admissions(contract_id);

-- 6. Plan snapshot builder
CREATE OR REPLACE FUNCTION public.build_boarding_plan_snapshot(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  s RECORD;
  snap jsonb;
BEGIN
  SELECT * INTO p FROM public.stable_service_plans WHERE id = _plan_id;
  IF p IS NULL THEN
    RAISE EXCEPTION 'Plan % not found', _plan_id;
  END IF;

  SELECT id, name, name_ar, is_taxable INTO s
  FROM public.tenant_services
  WHERE id = p.service_id;

  snap := jsonb_build_object(
    'plan_id', p.id,
    'name', p.name,
    'name_ar', p.name_ar,
    'plan_type', p.plan_type,
    'billing_cycle', p.billing_cycle,
    'base_price', p.base_price,
    'currency', p.currency,
    'service_id', p.service_id,
    'service_name', COALESCE(s.name, NULL),
    'service_name_ar', COALESCE(s.name_ar, NULL),
    'is_taxable', COALESCE(s.is_taxable, false),
    'includes', COALESCE(p.includes, '{}'::jsonb),
    'snapshot_taken_at', to_jsonb(now()),
    'snapshot_source_version', 1
  );
  RETURN snap;
END;
$$;

-- 7. Create RPC
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
  v_cha_id uuid;
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
    -- horse_owner initiator
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

  -- Build snapshot now if stable-initiated
  IF v_status = 'pending_owner' THEN
    v_snapshot := public.build_boarding_plan_snapshot(_plan_id);
  END IF;

  -- Lock existing open contracts to prevent races
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

  -- Find or create b2c boarding connection between the two tenants
  SELECT id INTO v_connection_id
    FROM public.connections
   WHERE connection_type = 'b2c'
     AND status IN ('pending','accepted')
     AND ((initiator_tenant_id = v_stable_id AND recipient_tenant_id = v_owner_id)
       OR (initiator_tenant_id = v_owner_id  AND recipient_tenant_id = v_stable_id))
   ORDER BY (status = 'accepted') DESC, created_at DESC
   LIMIT 1;

  IF v_connection_id IS NULL THEN
    INSERT INTO public.connections (
      connection_type, initiator_tenant_id, initiator_user_id, recipient_tenant_id,
      status, accepted_at, accepted_by, metadata
    ) VALUES (
      'b2c',
      _initiator_tenant_id,
      v_user,
      _counterparty_tenant_id,
      'accepted',
      now(),
      v_user,
      jsonb_build_object('purpose','boarding','created_via','boarding_contract')
    )
    RETURNING id INTO v_connection_id;
  ELSE
    -- Ensure purpose metadata reflects boarding
    UPDATE public.connections
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('purpose','boarding'),
           updated_at = now()
     WHERE id = v_connection_id
       AND COALESCE(metadata->>'purpose','') <> 'boarding';
  END IF;

  -- Ensure connection_horse_access readwrite
  SELECT id INTO v_cha_id
    FROM public.connection_horse_access
   WHERE connection_id = v_connection_id AND horse_id = _horse_id;
  IF v_cha_id IS NULL THEN
    INSERT INTO public.connection_horse_access (connection_id, horse_id, access_level, granted_by)
    VALUES (v_connection_id, _horse_id, 'readwrite', v_user)
    RETURNING id INTO v_cha_id;
  ELSE
    UPDATE public.connection_horse_access
       SET access_level = 'readwrite'
     WHERE id = v_cha_id AND access_level <> 'readwrite';
  END IF;

  INSERT INTO public.boarding_contracts (
    stable_tenant_id, owner_tenant_id, horse_id, connection_id, connection_horse_access_id,
    client_id, plan_id, plan_snapshot, terms_metadata, status,
    stable_approved_at, created_by, created_by_role
  ) VALUES (
    v_stable_id, v_owner_id, _horse_id, v_connection_id, v_cha_id,
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

REVOKE ALL ON FUNCTION public.create_boarding_contract_with_connection(uuid,text,uuid,uuid,uuid,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.create_boarding_contract_with_connection(uuid,text,uuid,uuid,uuid,uuid,jsonb) TO authenticated;

-- 8. Transition RPCs

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
REVOKE ALL ON FUNCTION public.approve_boarding_contract_as_stable(uuid,uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_boarding_contract_as_stable(uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_boarding_contract_as_owner(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
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

  UPDATE public.boarding_contracts
     SET status = 'active',
         owner_approved_at = now(),
         activated_at = now()
   WHERE id = _contract_id;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'active');
END;
$$;
REVOKE ALL ON FUNCTION public.approve_boarding_contract_as_owner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_boarding_contract_as_owner(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_boarding_contract(_contract_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
  v_is_stable boolean;
  v_is_owner  boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _contract_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_c.status NOT IN ('pending_stable','pending_owner','active') THEN
    RAISE EXCEPTION 'Contract cannot be cancelled in status %', v_c.status;
  END IF;
  v_is_stable := public.is_tenant_member(v_user, v_c.stable_tenant_id);
  v_is_owner  := public.is_tenant_member(v_user, v_c.owner_tenant_id);
  IF NOT (v_is_stable OR v_is_owner) THEN
    RAISE EXCEPTION 'Caller is not part of either tenant';
  END IF;
  IF v_c.status = 'active' AND v_is_stable AND NOT v_is_owner THEN
    IF NOT public.has_permission(v_user, v_c.stable_tenant_id, 'boarding.contracts.cancel') THEN
      RAISE EXCEPTION 'Missing permission boarding.contracts.cancel';
    END IF;
  END IF;

  UPDATE public.boarding_contracts
     SET status = 'cancelled',
         cancelled_at = now(),
         metadata = COALESCE(metadata,'{}'::jsonb)
           || jsonb_build_object('cancel_reason', _reason, 'cancelled_by', v_user)
   WHERE id = _contract_id;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_boarding_contract(uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_boarding_contract(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_boarding_contract(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _contract_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_c.status <> 'active' THEN
    RAISE EXCEPTION 'Only active contracts can be ended (current: %)', v_c.status;
  END IF;
  IF NOT (public.has_permission(v_user, v_c.stable_tenant_id, 'boarding.contracts.end')
          OR public.is_tenant_member(v_user, v_c.owner_tenant_id)) THEN
    RAISE EXCEPTION 'Caller lacks permission to end this contract';
  END IF;

  UPDATE public.boarding_contracts
     SET status = 'ended', ended_at = now()
   WHERE id = _contract_id;

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'ended');
END;
$$;
REVOKE ALL ON FUNCTION public.end_boarding_contract(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.end_boarding_contract(uuid) TO authenticated;
