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
    'horse_name', v_horse.name
  );
END;
$function$;