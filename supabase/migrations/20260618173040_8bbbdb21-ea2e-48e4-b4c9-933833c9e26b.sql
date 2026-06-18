CREATE OR REPLACE FUNCTION public.dispatch_horse_movement(p_movement_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_movement record;
  v_horse record;
  v_incoming_id uuid;
  v_sender_name text;
  v_admission_id uuid;
  v_admission_from_status text;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF v_movement.movement_status != 'scheduled' THEN
    RAISE EXCEPTION 'Movement is not in scheduled status (got %)', v_movement.movement_status;
  END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_horse FROM horses
    WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Horse not found'; END IF;

  IF v_movement.movement_type IN ('out','transfer') THEN
    UPDATE housing_unit_occupants
       SET until = now()
     WHERE horse_id = v_horse.id
       AND tenant_id = v_movement.tenant_id
       AND until IS NULL;

    UPDATE horses
       SET current_location_id = NULL,
           current_area_id     = NULL,
           housing_unit_id     = NULL,
           updated_at          = now()
     WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;
  END IF;

  IF v_movement.destination_type = 'connected' AND v_movement.connected_tenant_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(name_ar,''), NULLIF(name,''), 'Unknown')
      INTO v_sender_name
      FROM tenants WHERE id = v_movement.tenant_id;
    INSERT INTO incoming_horse_movements (
      tenant_id, sender_tenant_id, sender_movement_id,
      horse_id, horse_name, horse_name_ar, horse_avatar_url,
      sender_tenant_name, movement_type, status, reason, notes, scheduled_at
    ) VALUES (
      v_movement.connected_tenant_id, v_movement.tenant_id, v_movement.id,
      v_horse.id, v_horse.name, v_horse.name_ar, v_horse.avatar_url,
      v_sender_name, 'in', 'pending', v_movement.reason,
      COALESCE(p_notes, v_movement.notes), now()
    ) RETURNING id INTO v_incoming_id;
    UPDATE horse_movements SET connected_movement_id = v_incoming_id WHERE id = p_movement_id;
  END IF;

  -- Phase 1.e.f.6: close sender-side active boarding admission on connected dispatch.
  -- Mirrors the normal checkout path used by useBoardingAdmissions.confirmCheckout:
  --   status → 'checked_out', checked_out_at, checked_out_by, checkout_movement_id,
  --   checkout_notes marker, plus a boarding_status_history row.
  -- Scoped to connected outbound dispatches (out/transfer) only. Recipient admission,
  -- invoices, ledger entries, and billing links are intentionally untouched.
  IF v_movement.destination_type = 'connected'
     AND v_movement.connected_tenant_id IS NOT NULL
     AND v_movement.movement_type IN ('out','transfer') THEN
    SELECT id, status
      INTO v_admission_id, v_admission_from_status
      FROM public.boarding_admissions
     WHERE tenant_id = v_movement.tenant_id
       AND horse_id  = v_horse.id
       AND status IN ('active','checkout_pending','draft')
     ORDER BY admitted_at DESC
     LIMIT 1;

    IF v_admission_id IS NOT NULL THEN
      UPDATE public.boarding_admissions
         SET status               = 'checked_out',
             checked_out_at       = now(),
             checked_out_by       = auth.uid(),
             checkout_movement_id = COALESCE(checkout_movement_id, p_movement_id),
             checkout_notes       = COALESCE(
                                      NULLIF(checkout_notes, ''),
                                      'transferred_out (connected dispatch)'
                                    ),
             updated_at           = now()
       WHERE id = v_admission_id;

      INSERT INTO public.boarding_status_history (
        admission_id, tenant_id, from_status, to_status, changed_by, reason
      ) VALUES (
        v_admission_id, v_movement.tenant_id,
        v_admission_from_status, 'checked_out', auth.uid(),
        'transferred_out (connected dispatch)'
      );
    END IF;
  END IF;

  UPDATE horse_movements SET
    movement_status = 'dispatched',
    dispatched_at   = now(),
    dispatched_by   = auth.uid(),
    notes           = COALESCE(p_notes, notes),
    updated_at      = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'dispatched',
    'incoming_id', v_incoming_id,
    'horse_name', v_horse.name,
    'sender_admission_id', v_admission_id,
    'sender_admission_closed', v_admission_id IS NOT NULL
  );
END;
$function$;