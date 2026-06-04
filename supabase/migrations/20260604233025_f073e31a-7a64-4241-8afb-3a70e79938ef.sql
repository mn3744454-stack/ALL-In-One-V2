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

  IF _preferred_branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.branches
       WHERE id = _preferred_branch_id AND tenant_id = v_c.stable_tenant_id
    ) THEN
      RAISE EXCEPTION 'Preferred branch does not belong to this stable';
    END IF;
  END IF;

  SELECT name, name_ar, avatar_url INTO v_horse
    FROM public.horses WHERE id = v_c.horse_id;

  SELECT COALESCE(name, '') INTO v_sender_name
    FROM public.tenants WHERE id = v_c.owner_tenant_id;

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
      v_c.horse_id, COALESCE(v_horse.name,'Horse'), v_horse.name_ar, v_horse.avatar_url,
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