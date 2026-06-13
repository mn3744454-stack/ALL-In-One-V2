CREATE OR REPLACE FUNCTION public.record_connected_movement(
  p_sender_tenant_id uuid,
  p_horse_id uuid,
  p_connected_tenant_id uuid,
  p_from_location_id uuid DEFAULT NULL::uuid,
  p_movement_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_reason text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_is_demo boolean DEFAULT false,
  p_movement_status text DEFAULT 'dispatched'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_movement_id uuid;
  v_incoming_id uuid;
  v_horse record;
  v_sender_name text;
  v_connection_exists boolean;
  v_movement_record record;
  v_is_scheduled boolean;
BEGIN
  IF NOT can_manage_movement(auth.uid(), p_sender_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  v_is_scheduled := (p_movement_status = 'scheduled');

  SELECT EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'accepted'
      AND c.connection_type = 'b2b'
      AND (
        (c.initiator_tenant_id = p_sender_tenant_id AND c.recipient_tenant_id = p_connected_tenant_id)
        OR (c.initiator_tenant_id = p_connected_tenant_id AND c.recipient_tenant_id = p_sender_tenant_id)
      )
  ) INTO v_connection_exists;

  IF NOT v_connection_exists THEN
    RAISE EXCEPTION 'No accepted connection exists with the destination entity';
  END IF;

  SELECT * INTO v_horse FROM horses WHERE id = p_horse_id AND tenant_id = p_sender_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Horse not found or does not belong to sender tenant';
  END IF;

  SELECT COALESCE(NULLIF(name_ar, ''), NULLIF(name, ''), 'Unknown')
    INTO v_sender_name
  FROM tenants WHERE id = p_sender_tenant_id;

  IF NOT v_is_scheduled AND v_horse.housing_unit_id IS NOT NULL THEN
    UPDATE housing_unit_occupants SET until = COALESCE(p_movement_at, now())
    WHERE horse_id = p_horse_id AND tenant_id = p_sender_tenant_id AND until IS NULL;
  END IF;

  INSERT INTO horse_movements (
    tenant_id, horse_id, movement_type,
    from_location_id, destination_type, connected_tenant_id,
    movement_at, recorded_by, reason, notes, is_demo,
    from_area_id, from_unit_id,
    movement_status, scheduled_at, dispatched_at
  ) VALUES (
    p_sender_tenant_id, p_horse_id, 'out'::movement_type,
    p_from_location_id, 'connected', p_connected_tenant_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes, p_is_demo,
    v_horse.current_area_id, v_horse.housing_unit_id,
    COALESCE(p_movement_status, 'dispatched'),
    CASE WHEN v_is_scheduled THEN COALESCE(p_movement_at, now()) ELSE NULL END,
    CASE WHEN NOT v_is_scheduled THEN now() ELSE NULL END
  ) RETURNING * INTO v_movement_record;
  v_movement_id := v_movement_record.id;

  IF NOT v_is_scheduled THEN
    UPDATE horses SET
      current_location_id = NULL, current_area_id = NULL, housing_unit_id = NULL, updated_at = now()
    WHERE id = p_horse_id AND tenant_id = p_sender_tenant_id;

    INSERT INTO incoming_horse_movements (
      tenant_id, sender_tenant_id, sender_movement_id,
      horse_id, horse_name, horse_name_ar, horse_avatar_url,
      sender_tenant_name, movement_type, status, reason, notes, scheduled_at
    ) VALUES (
      p_connected_tenant_id, p_sender_tenant_id, v_movement_id,
      p_horse_id, v_horse.name, v_horse.name_ar, v_horse.avatar_url,
      v_sender_name, 'in', 'pending', p_reason, p_notes,
      COALESCE(p_movement_at, now())
    ) RETURNING id INTO v_incoming_id;

    UPDATE horse_movements SET connected_movement_id = v_incoming_id WHERE id = v_movement_id;
  END IF;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'incoming_id', v_incoming_id,
    'horse_name', v_horse.name,
    'destination_tenant', p_connected_tenant_id
  );
END;
$function$;