CREATE OR REPLACE FUNCTION public.confirm_incoming_movement(p_incoming_id uuid, p_notes text DEFAULT NULL::text, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_incoming record;
  v_local_movement_id uuid;
  v_contract public.boarding_contracts;
  v_admission_id uuid;
  v_branch_id uuid;
  v_branch_valid boolean;
  v_snapshot jsonb;
  v_base_price numeric;
  v_currency text;
  v_cycle text;
  v_monthly numeric;
  v_daily numeric;
BEGIN
  SELECT * INTO v_incoming FROM public.incoming_horse_movements WHERE id = p_incoming_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incoming movement not found'; END IF;
  IF v_incoming.status <> 'pending' THEN RAISE EXCEPTION 'Incoming movement is not pending'; END IF;
  IF NOT public.can_manage_movement(auth.uid(), v_incoming.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_incoming.source_type = 'boarding_contract' THEN
    SELECT * INTO v_contract FROM public.boarding_contracts WHERE id = v_incoming.boarding_contract_id FOR UPDATE;
    IF v_contract.id IS NULL THEN RAISE EXCEPTION 'Linked boarding contract not found'; END IF;
    IF v_contract.status <> 'active' THEN RAISE EXCEPTION 'Boarding contract is no longer active'; END IF;

    IF p_branch_id IS NULL THEN
      RAISE EXCEPTION 'Receiving branch is required to confirm arrival';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.branches
       WHERE id = p_branch_id
         AND tenant_id = v_incoming.tenant_id
         AND is_active = true
         AND is_archived = false
    ) INTO v_branch_valid;

    IF NOT v_branch_valid THEN
      RAISE EXCEPTION 'Receiving branch is invalid for this stable';
    END IF;

    v_branch_id := p_branch_id;

    v_snapshot := COALESCE(v_contract.plan_snapshot, '{}'::jsonb);
    v_base_price := NULLIF(v_snapshot->>'base_price', '')::numeric;
    v_currency := COALESCE(NULLIF(v_snapshot->>'currency', ''), 'SAR');
    v_cycle := COALESCE(NULLIF(v_snapshot->>'billing_cycle', ''), 'monthly');
    IF v_cycle = 'monthly' THEN v_monthly := v_base_price; END IF;
    IF v_cycle = 'daily' THEN v_daily := v_base_price; END IF;

    INSERT INTO public.horse_movements (
      tenant_id, horse_id, movement_type, destination_type, connected_tenant_id,
      to_location_id,
      movement_at, recorded_by, reason, notes, is_demo,
      movement_status, dispatched_at
    ) VALUES (
      v_incoming.tenant_id, v_incoming.horse_id, 'in'::movement_type, 'connected',
      v_incoming.sender_tenant_id,
      v_branch_id,
      now(), auth.uid(), 'boarding_contract',
      COALESCE(p_notes, v_incoming.notes), false,
      'completed', now()
    ) RETURNING id INTO v_local_movement_id;

    SELECT id INTO v_admission_id
      FROM public.boarding_admissions
     WHERE contract_id = v_contract.id AND status = 'active'
     LIMIT 1;

    IF v_admission_id IS NULL THEN
      INSERT INTO public.boarding_admissions (
        tenant_id, horse_id, client_id, branch_id, area_id, unit_id,
        plan_id, status, admitted_at, billing_cycle, rate_currency,
        monthly_rate, daily_rate,
        admitted_by, checkin_movement_id, contract_id
      ) VALUES (
        v_incoming.tenant_id, v_contract.horse_id, v_contract.client_id, v_branch_id, NULL, NULL,
        v_contract.plan_id, 'active', now(), v_cycle, v_currency,
        v_monthly, v_daily,
        auth.uid(), v_local_movement_id, v_contract.id
      )
      RETURNING id INTO v_admission_id;
    ELSE
      UPDATE public.boarding_admissions
         SET checkin_movement_id = COALESCE(checkin_movement_id, v_local_movement_id),
             branch_id = COALESCE(branch_id, v_branch_id),
             billing_cycle = COALESCE(billing_cycle, v_cycle),
             rate_currency = COALESCE(rate_currency, v_currency),
             monthly_rate = COALESCE(monthly_rate, v_monthly),
             daily_rate = COALESCE(daily_rate, v_daily),
             updated_at = now()
       WHERE id = v_admission_id;
    END IF;

    UPDATE public.incoming_horse_movements
       SET status = 'completed', completed_at = now(), completed_by = auth.uid(),
           local_movement_id = v_local_movement_id,
           notes = COALESCE(p_notes, notes), updated_at = now()
     WHERE id = p_incoming_id;

    UPDATE public.boarding_contracts
       SET operational_phase = CASE WHEN EXISTS (
                                          SELECT 1 FROM public.boarding_admissions a
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
      'branch_id', v_branch_id,
      'source_type', 'boarding_contract'
    );
  END IF;

  -- Connected (non-contract) path: require + validate branch, write to_location_id,
  -- and create a Needs Placement admission so receiving is operationally complete.
  IF p_branch_id IS NULL THEN
    RAISE EXCEPTION 'Receiving branch is required to confirm arrival';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.branches
     WHERE id = p_branch_id
       AND tenant_id = v_incoming.tenant_id
       AND is_active = true
       AND is_archived = false
  ) INTO v_branch_valid;

  IF NOT v_branch_valid THEN
    RAISE EXCEPTION 'Receiving branch is invalid for this stable';
  END IF;

  v_branch_id := p_branch_id;

  INSERT INTO public.horse_movements (
    tenant_id, horse_id, movement_type, destination_type, connected_tenant_id,
    to_location_id,
    movement_at, recorded_by, reason, notes, is_demo,
    movement_status, dispatched_at
  ) VALUES (
    v_incoming.tenant_id, v_incoming.horse_id, 'in'::movement_type, 'connected',
    v_incoming.sender_tenant_id,
    v_branch_id,
    now(), auth.uid(), v_incoming.reason,
    COALESCE(p_notes, v_incoming.notes), false,
    'completed', now()
  ) RETURNING id INTO v_local_movement_id;

  INSERT INTO public.boarding_admissions (
    tenant_id, horse_id, branch_id, area_id, unit_id,
    status, admitted_at, admitted_by, checkin_movement_id
  ) VALUES (
    v_incoming.tenant_id, v_incoming.horse_id, v_branch_id, NULL, NULL,
    'active', now(), auth.uid(), v_local_movement_id
  )
  RETURNING id INTO v_admission_id;

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
    'admission_id', v_admission_id,
    'branch_id', v_branch_id,
    'source_type', 'movement'
  );
END;
$function$;