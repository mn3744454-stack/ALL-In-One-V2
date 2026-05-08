CREATE OR REPLACE FUNCTION public.complete_horse_movement(p_movement_id uuid, p_override_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_movement record;
  v_horse record;
  v_admission record;
  v_gate jsonb;
  v_inserted_occupant uuid;
  v_dest_area_id uuid;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF v_movement.movement_status != 'dispatched' THEN
    RAISE EXCEPTION 'Movement is not dispatched (got %)', v_movement.movement_status;
  END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_horse FROM horses
    WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;

  SELECT * INTO v_admission FROM boarding_admissions
    WHERE horse_id = v_movement.horse_id
      AND tenant_id = v_movement.tenant_id
      AND status IN ('active','checkout_pending')
    ORDER BY admitted_at DESC NULLS LAST LIMIT 1;

  IF v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL THEN
    v_gate := validate_boarding_checkout_gate(v_admission.id, auth.uid(), p_override_reason);
    IF (v_gate->>'status') = 'blocked' THEN
      RAISE EXCEPTION 'Checkout blocked: outstanding balance (admission=% client=%)',
        v_gate->>'admission_balance', v_gate->>'client_balance'
        USING ERRCODE = 'check_violation';
    ELSIF (v_gate->>'status') = 'needs_override' THEN
      RAISE EXCEPTION 'Checkout requires override reason'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF v_movement.movement_subtype IN ('arrival','return_from_temporary_out')
     OR (v_movement.movement_type = 'transfer') THEN
    v_dest_area_id := COALESCE(
      v_movement.to_area_id,
      (SELECT area_id FROM housing_units WHERE id = v_movement.to_unit_id)
    );
    UPDATE horses SET
      current_location_id = COALESCE(v_movement.to_location_id, current_location_id),
      current_area_id     = v_dest_area_id,
      housing_unit_id     = v_movement.to_unit_id,
      updated_at          = now()
    WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;

    IF v_movement.to_unit_id IS NOT NULL THEN
      INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
      VALUES (v_movement.tenant_id, v_movement.to_unit_id, v_horse.id, now(), v_movement.is_demo)
      RETURNING id INTO v_inserted_occupant;
    END IF;

    -- Sync admission destination on transfer
    IF v_movement.movement_type = 'transfer' AND v_admission.id IS NOT NULL THEN
      IF v_movement.to_unit_id IS NOT NULL THEN
        UPDATE boarding_admissions
           SET unit_id = v_movement.to_unit_id,
               area_id = v_dest_area_id,
               updated_at = now()
         WHERE id = v_admission.id;
      ELSE
        -- Transfer completed without destination unit:
        -- clear stale origin unit reference so the equine is Needs Placement.
        UPDATE boarding_admissions
           SET unit_id = NULL,
               area_id = v_movement.to_area_id,
               updated_at = now()
         WHERE id = v_admission.id;
      END IF;
    END IF;
  END IF;

  IF v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL THEN
    UPDATE boarding_admissions
       SET status = 'checked_out',
           checked_out_at = now(),
           checked_out_by = auth.uid(),
           checkout_movement_id = v_movement.id,
           updated_at = now()
     WHERE id = v_admission.id;
  END IF;

  UPDATE horse_movements SET
    movement_status = 'completed',
    completed_at    = now(),
    completed_by    = auth.uid(),
    notes           = COALESCE(p_notes, notes),
    updated_at      = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'completed',
    'subtype', v_movement.movement_subtype,
    'gate_result', v_gate,
    'admission_closed', (v_movement.movement_subtype = 'checkout_departure' AND v_admission.id IS NOT NULL)
  );
END;
$function$;