
-- =========================================================
-- B2.3: Boarding Contract → Arrival / Admission / Housing Handoff
-- =========================================================

-- 1) Operational phase + arrival fields on boarding_contracts
ALTER TABLE public.boarding_contracts
  ADD COLUMN IF NOT EXISTS operational_phase text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS expected_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrival_notes text,
  ADD COLUMN IF NOT EXISTS branch_preference text,
  ADD COLUMN IF NOT EXISTS preferred_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arrival_incoming_id uuid;

ALTER TABLE public.boarding_contracts
  DROP CONSTRAINT IF EXISTS boarding_contracts_operational_phase_check;
ALTER TABLE public.boarding_contracts
  ADD CONSTRAINT boarding_contracts_operational_phase_check
  CHECK (operational_phase IN (
    'not_started',
    'awaiting_arrival',
    'arrival_scheduled',
    'arrived_pending_placement',
    'admitted',
    'ended'
  ));

CREATE INDEX IF NOT EXISTS idx_boarding_contracts_operational_phase
  ON public.boarding_contracts(operational_phase);

-- Backfill: any currently active contract becomes awaiting_arrival
UPDATE public.boarding_contracts
   SET operational_phase = 'awaiting_arrival'
 WHERE status = 'active' AND operational_phase = 'not_started';

UPDATE public.boarding_contracts
   SET operational_phase = 'ended'
 WHERE status IN ('ended','cancelled') AND operational_phase = 'not_started';

-- 2) Allow contract-derived expected arrivals in incoming_horse_movements
ALTER TABLE public.incoming_horse_movements
  ALTER COLUMN sender_movement_id DROP NOT NULL;

ALTER TABLE public.incoming_horse_movements
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'movement',
  ADD COLUMN IF NOT EXISTS boarding_contract_id uuid REFERENCES public.boarding_contracts(id) ON DELETE SET NULL;

ALTER TABLE public.incoming_horse_movements
  DROP CONSTRAINT IF EXISTS incoming_horse_movements_source_type_check;
ALTER TABLE public.incoming_horse_movements
  ADD CONSTRAINT incoming_horse_movements_source_type_check
  CHECK (source_type IN ('movement','boarding_contract'));

-- Invariant: movement-sourced rows must have a sender_movement_id; contract-sourced rows must have a boarding_contract_id.
ALTER TABLE public.incoming_horse_movements
  DROP CONSTRAINT IF EXISTS incoming_horse_movements_source_payload_check;
ALTER TABLE public.incoming_horse_movements
  ADD CONSTRAINT incoming_horse_movements_source_payload_check
  CHECK (
    (source_type = 'movement'         AND sender_movement_id IS NOT NULL) OR
    (source_type = 'boarding_contract' AND boarding_contract_id IS NOT NULL)
  );

-- Idempotency: at most one open (pending) contract-derived expected arrival per contract.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_contract_incoming
  ON public.incoming_horse_movements(boarding_contract_id)
  WHERE status = 'pending' AND boarding_contract_id IS NOT NULL;

-- 3) Permission key
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('boarding.contracts.schedule_arrival', 'boarding', 'contracts', 'schedule_arrival',
   'Schedule boarding arrival', 'جدولة وصول الإيواء',
   'Allows scheduling the expected arrival for a boarding contract.',
   'يسمح بجدولة الوصول المتوقع لعقد الإيواء.', true)
ON CONFLICT (key) DO NOTHING;

-- Grant to any role bundle that already has boarding.contracts.approve
INSERT INTO public.bundle_permissions (bundle_id, permission_key)
SELECT DISTINCT bp.bundle_id, 'boarding.contracts.schedule_arrival'
  FROM public.bundle_permissions bp
 WHERE bp.permission_key = 'boarding.contracts.approve'
ON CONFLICT DO NOTHING;

-- 4) Contract activation now sets operational_phase = 'awaiting_arrival'
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

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'active', 'operational_phase', 'awaiting_arrival');
END;
$$;
REVOKE ALL ON FUNCTION public.approve_boarding_contract_as_owner(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_boarding_contract_as_owner(uuid) TO authenticated;

-- 5) Schedule Arrival RPC (stable-side, idempotent)
CREATE OR REPLACE FUNCTION public.schedule_boarding_contract_arrival(
  _contract_id uuid,
  _expected_arrival_at timestamptz,
  _branch_preference text DEFAULT NULL,
  _preferred_branch_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_c public.boarding_contracts;
  v_horse record;
  v_sender_name text;
  v_incoming_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _expected_arrival_at IS NULL THEN RAISE EXCEPTION 'Expected arrival time is required'; END IF;

  SELECT * INTO v_c FROM public.boarding_contracts WHERE id = _contract_id FOR UPDATE;
  IF v_c.id IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_c.status <> 'active' THEN
    RAISE EXCEPTION 'Contract must be active to schedule arrival (current: %)', v_c.status;
  END IF;
  IF v_c.operational_phase NOT IN ('awaiting_arrival','arrival_scheduled') THEN
    RAISE EXCEPTION 'Contract is past the arrival scheduling phase (%)', v_c.operational_phase;
  END IF;
  IF NOT public.is_tenant_member(v_user, v_c.stable_tenant_id) THEN
    RAISE EXCEPTION 'Only stable members can schedule arrival';
  END IF;
  IF NOT public.has_permission(v_user, v_c.stable_tenant_id, 'boarding.contracts.schedule_arrival') THEN
    RAISE EXCEPTION 'Missing permission boarding.contracts.schedule_arrival';
  END IF;

  -- Validate preferred branch belongs to the stable tenant (if provided)
  IF _preferred_branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.branches
       WHERE id = _preferred_branch_id AND tenant_id = v_c.stable_tenant_id
    ) THEN
      RAISE EXCEPTION 'Preferred branch does not belong to this stable';
    END IF;
  END IF;

  SELECT name, name_ar, profile_image_url INTO v_horse
    FROM public.horses WHERE id = v_c.horse_id;

  SELECT COALESCE(name, '') INTO v_sender_name
    FROM public.tenants WHERE id = v_c.owner_tenant_id;

  -- Upsert the contract-derived expected arrival (idempotent via partial unique index)
  SELECT id INTO v_incoming_id
    FROM public.incoming_horse_movements
   WHERE boarding_contract_id = _contract_id AND status = 'pending'
   LIMIT 1;

  IF v_incoming_id IS NULL THEN
    INSERT INTO public.incoming_horse_movements (
      tenant_id, sender_tenant_id, sender_movement_id,
      horse_id, horse_name, horse_name_ar, horse_avatar_url,
      sender_tenant_name, movement_type, status, reason, notes,
      scheduled_at, source_type, boarding_contract_id
    ) VALUES (
      v_c.stable_tenant_id, v_c.owner_tenant_id, NULL,
      v_c.horse_id, COALESCE(v_horse.name,'Horse'), v_horse.name_ar, v_horse.profile_image_url,
      v_sender_name, 'in', 'pending', 'boarding_contract', _notes,
      _expected_arrival_at, 'boarding_contract', _contract_id
    )
    RETURNING id INTO v_incoming_id;
  ELSE
    UPDATE public.incoming_horse_movements
       SET scheduled_at = _expected_arrival_at,
           notes = COALESCE(_notes, notes),
           updated_at = now()
     WHERE id = v_incoming_id;
  END IF;

  UPDATE public.boarding_contracts
     SET operational_phase = 'arrival_scheduled',
         expected_arrival_at = _expected_arrival_at,
         arrival_notes = COALESCE(_notes, arrival_notes),
         branch_preference = COALESCE(_branch_preference, branch_preference),
         preferred_branch_id = COALESCE(_preferred_branch_id, preferred_branch_id),
         arrival_incoming_id = v_incoming_id,
         updated_at = now()
   WHERE id = _contract_id;

  RETURN jsonb_build_object(
    'contract_id', _contract_id,
    'incoming_id', v_incoming_id,
    'operational_phase', 'arrival_scheduled'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_boarding_contract_arrival(uuid, timestamptz, text, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.schedule_boarding_contract_arrival(uuid, timestamptz, text, uuid, text) TO authenticated;

-- 6) Confirm Incoming: extend for source_type='boarding_contract'
CREATE OR REPLACE FUNCTION public.confirm_incoming_movement(p_incoming_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_incoming record;
  v_local_movement_id uuid;
  v_contract public.boarding_contracts;
  v_admission_id uuid;
  v_branch_id uuid;
BEGIN
  SELECT * INTO v_incoming FROM public.incoming_horse_movements WHERE id = p_incoming_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incoming movement not found'; END IF;
  IF v_incoming.status <> 'pending' THEN RAISE EXCEPTION 'Incoming movement is not pending'; END IF;
  IF NOT public.can_manage_movement(auth.uid(), v_incoming.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_incoming.source_type = 'boarding_contract' THEN
    -- Contract-derived arrival: no sender movement to complete.
    SELECT * INTO v_contract FROM public.boarding_contracts WHERE id = v_incoming.boarding_contract_id FOR UPDATE;
    IF v_contract.id IS NULL THEN RAISE EXCEPTION 'Linked boarding contract not found'; END IF;
    IF v_contract.status <> 'active' THEN RAISE EXCEPTION 'Boarding contract is no longer active'; END IF;

    -- Local arrival movement
    INSERT INTO public.horse_movements (
      tenant_id, horse_id, movement_type, destination_type, connected_tenant_id,
      movement_at, recorded_by, reason, notes, is_demo,
      movement_status, dispatched_at
    ) VALUES (
      v_incoming.tenant_id, v_incoming.horse_id, 'in'::movement_type, 'connected',
      v_incoming.sender_tenant_id,
      now(), auth.uid(), 'boarding_contract',
      COALESCE(p_notes, v_incoming.notes), false,
      'completed', now()
    ) RETURNING id INTO v_local_movement_id;

    -- Pick branch: preferred branch on contract, else first active branch of stable.
    v_branch_id := v_contract.preferred_branch_id;
    IF v_branch_id IS NULL THEN
      SELECT id INTO v_branch_id
        FROM public.branches
       WHERE tenant_id = v_incoming.tenant_id
         AND is_active = true AND is_archived = false
       ORDER BY created_at ASC
       LIMIT 1;
    END IF;
    IF v_branch_id IS NULL THEN
      RAISE EXCEPTION 'Stable has no active branch to admit the horse into';
    END IF;

    -- Re-use existing active admission for this contract if present; else create one (no unit → Needs Placement).
    SELECT id INTO v_admission_id
      FROM public.boarding_admissions
     WHERE contract_id = v_contract.id AND status = 'active'
     LIMIT 1;

    IF v_admission_id IS NULL THEN
      INSERT INTO public.boarding_admissions (
        tenant_id, horse_id, client_id, branch_id, area_id, unit_id,
        plan_id, status, admitted_at, billing_cycle, rate_currency,
        admitted_by, checkin_movement_id, contract_id
      ) VALUES (
        v_incoming.tenant_id, v_contract.horse_id, v_contract.client_id, v_branch_id, NULL, NULL,
        v_contract.plan_id, 'active', now(), 'monthly', 'SAR',
        auth.uid(), v_local_movement_id, v_contract.id
      )
      RETURNING id INTO v_admission_id;
    ELSE
      UPDATE public.boarding_admissions
         SET checkin_movement_id = COALESCE(checkin_movement_id, v_local_movement_id),
             updated_at = now()
       WHERE id = v_admission_id;
    END IF;

    UPDATE public.incoming_horse_movements
       SET status = 'completed', completed_at = now(), completed_by = auth.uid(),
           local_movement_id = v_local_movement_id,
           notes = COALESCE(p_notes, notes), updated_at = now()
     WHERE id = p_incoming_id;

    UPDATE public.boarding_contracts
       SET operational_phase = CASE WHEN v_branch_id IS NOT NULL AND
                                         EXISTS (SELECT 1 FROM public.boarding_admissions a
                                                  WHERE a.id = v_admission_id AND a.unit_id IS NOT NULL)
                                    THEN 'admitted'
                                    ELSE 'arrived_pending_placement' END,
           updated_at = now()
     WHERE id = v_contract.id;

    RETURN jsonb_build_object(
      'incoming_id', v_incoming.id,
      'status', 'completed',
      'horse_id', v_incoming.horse_id,
      'horse_name', v_incoming.horse_name,
      'local_movement_id', v_local_movement_id,
      'admission_id', v_admission_id,
      'contract_id', v_contract.id,
      'source_type', 'boarding_contract'
    );
  END IF;

  -- Default (movement-sourced) path — unchanged behaviour.
  INSERT INTO public.horse_movements (
    tenant_id, horse_id, movement_type, destination_type, connected_tenant_id,
    movement_at, recorded_by, reason, notes, is_demo,
    movement_status, dispatched_at
  ) VALUES (
    v_incoming.tenant_id, v_incoming.horse_id, 'in'::movement_type, 'connected',
    v_incoming.sender_tenant_id,
    now(), auth.uid(), v_incoming.reason,
    COALESCE(p_notes, v_incoming.notes), false,
    'completed', now()
  ) RETURNING id INTO v_local_movement_id;

  UPDATE public.incoming_horse_movements SET
    status = 'completed', completed_at = now(), completed_by = auth.uid(),
    local_movement_id = v_local_movement_id,
    notes = COALESCE(p_notes, notes), updated_at = now()
  WHERE id = p_incoming_id;

  UPDATE public.horse_movements SET
    movement_status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = v_incoming.sender_movement_id;

  RETURN jsonb_build_object(
    'incoming_id', v_incoming.id,
    'status', 'completed',
    'horse_id', v_incoming.horse_id,
    'horse_name', v_incoming.horse_name,
    'local_movement_id', v_local_movement_id,
    'source_type', 'movement'
  );
END;
$$;

-- 7) Cancel boarding contract → also cancel its open expected arrival.
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
         operational_phase = 'ended',
         metadata = COALESCE(metadata,'{}'::jsonb)
           || jsonb_build_object('cancel_reason', _reason, 'cancelled_by', v_user)
   WHERE id = _contract_id;

  -- Cancel any open contract-derived expected arrival.
  UPDATE public.incoming_horse_movements
     SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_user, updated_at = now()
   WHERE boarding_contract_id = _contract_id AND status = 'pending';

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'cancelled');
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_boarding_contract(uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_boarding_contract(uuid,text) TO authenticated;

-- 8) End boarding contract → mark operational phase ended too.
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
  IF NOT public.is_tenant_member(v_user, v_c.stable_tenant_id) THEN
    RAISE EXCEPTION 'Only stable members can end the contract';
  END IF;
  IF NOT public.has_permission(v_user, v_c.stable_tenant_id, 'boarding.contracts.end') THEN
    RAISE EXCEPTION 'Missing permission boarding.contracts.end';
  END IF;

  UPDATE public.boarding_contracts
     SET status = 'ended', ended_at = now(), operational_phase = 'ended', updated_at = now()
   WHERE id = _contract_id;

  UPDATE public.incoming_horse_movements
     SET status = 'cancelled', cancelled_at = now(), cancelled_by = v_user, updated_at = now()
   WHERE boarding_contract_id = _contract_id AND status = 'pending';

  RETURN jsonb_build_object('contract_id', _contract_id, 'status', 'ended');
END;
$$;
REVOKE ALL ON FUNCTION public.end_boarding_contract(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.end_boarding_contract(uuid) TO authenticated;
