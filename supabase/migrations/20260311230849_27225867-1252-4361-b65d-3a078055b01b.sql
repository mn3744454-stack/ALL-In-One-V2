
-- Phase A: Add facility_type to facility_areas
ALTER TABLE public.facility_areas ADD COLUMN IF NOT EXISTS facility_type text NOT NULL DEFAULT 'barn';

-- Phase B: No schema changes needed (code-only fix)

-- Phase C: Movement lifecycle columns
ALTER TABLE public.horse_movements ADD COLUMN IF NOT EXISTS movement_status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.horse_movements ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.horse_movements ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
ALTER TABLE public.horse_movements ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_horse_movements_status ON public.horse_movements(tenant_id, movement_status);

-- Phase G: Services future-proofing
ALTER TABLE public.tenant_services ADD COLUMN IF NOT EXISTS service_kind text NOT NULL DEFAULT 'service';

-- Phase C.9: Add dispatch permission
INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('movement.dispatch.confirm', 'movement', 'dispatch', 'confirm', 'Confirm Horse Dispatch', 'تأكيد إرسال الحصان', 'Can confirm physical dispatch of scheduled movements', 'يمكنه تأكيد الإرسال الفعلي للحركات المجدولة', true)
ON CONFLICT (key) DO NOTHING;

-- Wire dispatch permission to owner/manager roles
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, 'movement.dispatch.confirm', true
FROM public.tenant_roles tr
WHERE tr.name IN ('owner', 'manager')
ON CONFLICT DO NOTHING;

-- Phase C.3: dispatch_horse_movement RPC
CREATE OR REPLACE FUNCTION public.dispatch_horse_movement(
  p_movement_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movement record;
  v_horse record;
  v_incoming_id uuid;
  v_sender_name text;
BEGIN
  SELECT * INTO v_movement FROM horse_movements WHERE id = p_movement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movement not found'; END IF;
  IF v_movement.movement_status != 'scheduled' THEN RAISE EXCEPTION 'Movement is not in scheduled status'; END IF;
  IF NOT can_manage_movement(auth.uid(), v_movement.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT * INTO v_horse FROM horses WHERE id = v_movement.horse_id AND tenant_id = v_movement.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Horse not found'; END IF;

  -- Clear housing occupancy
  IF v_horse.housing_unit_id IS NOT NULL THEN
    UPDATE housing_unit_occupants SET until = now()
    WHERE horse_id = v_horse.id AND tenant_id = v_movement.tenant_id AND until IS NULL;
  END IF;

  -- Clear horse location for OUT movements
  IF v_movement.movement_type = 'out' THEN
    UPDATE horses SET
      current_location_id = NULL, current_area_id = NULL, housing_unit_id = NULL, updated_at = now()
    WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;
  ELSIF v_movement.movement_type = 'transfer' AND v_movement.to_location_id IS NOT NULL THEN
    UPDATE horses SET
      current_location_id = v_movement.to_location_id,
      current_area_id = v_movement.to_area_id,
      housing_unit_id = v_movement.to_unit_id,
      updated_at = now()
    WHERE id = v_horse.id AND tenant_id = v_movement.tenant_id;
    -- Add new occupant if transferring to a unit
    IF v_movement.to_unit_id IS NOT NULL THEN
      INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
      VALUES (v_movement.tenant_id, v_movement.to_unit_id, v_horse.id, now(), v_movement.is_demo);
    END IF;
  END IF;

  -- For connected movements, create incoming record at dispatch time
  IF v_movement.destination_type = 'connected' AND v_movement.connected_tenant_id IS NOT NULL THEN
    SELECT display_name INTO v_sender_name FROM tenants WHERE id = v_movement.tenant_id;

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

  -- Update movement status
  UPDATE horse_movements SET
    movement_status = 'dispatched',
    dispatched_at = now(),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_movement_id;

  RETURN jsonb_build_object(
    'movement_id', p_movement_id,
    'status', 'dispatched',
    'incoming_id', v_incoming_id,
    'horse_name', v_horse.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_horse_movement TO authenticated;

-- Phase C.2: Update record_horse_movement_with_housing to support movement_status
CREATE OR REPLACE FUNCTION public.record_horse_movement_with_housing(
  p_tenant_id uuid, p_horse_id uuid, p_movement_type text,
  p_from_location_id uuid DEFAULT NULL, p_to_location_id uuid DEFAULT NULL,
  p_from_area_id uuid DEFAULT NULL, p_from_unit_id uuid DEFAULT NULL,
  p_to_area_id uuid DEFAULT NULL, p_to_unit_id uuid DEFAULT NULL,
  p_movement_at timestamptz DEFAULT NULL, p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL, p_internal_location_note text DEFAULT NULL,
  p_is_demo boolean DEFAULT false, p_clear_housing boolean DEFAULT false,
  p_destination_type text DEFAULT 'internal',
  p_from_external_location_id uuid DEFAULT NULL,
  p_to_external_location_id uuid DEFAULT NULL,
  p_movement_status text DEFAULT 'dispatched'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movement_id uuid; v_unit_occupancy occupancy_mode; v_unit_capacity int;
  v_current_occupants int; v_horse_current_unit_id uuid; v_horse_current_location_id uuid;
  v_area_branch_id uuid; v_area_tenant_id uuid; v_unit_area_id uuid;
  v_unit_branch_id uuid; v_unit_tenant_id uuid;
  v_should_clear_housing boolean; v_should_update_housing boolean;
  v_is_cross_branch_transfer boolean; v_updated_horse record; v_movement_record record;
  v_is_scheduled boolean;
BEGIN
  IF NOT can_manage_movement(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'transfer') THEN
    RAISE EXCEPTION 'Invalid movement type: must be in, out, or transfer';
  END IF;

  v_is_scheduled := (p_movement_status = 'scheduled');

  -- Location validations depend on destination_type
  IF p_destination_type = 'internal' THEN
    IF p_movement_type IN ('in', 'transfer') AND p_to_location_id IS NULL THEN
      RAISE EXCEPTION 'Destination location is required for entry/transfer movements';
    END IF;
    IF p_movement_type IN ('out', 'transfer') AND p_from_location_id IS NULL THEN
      RAISE EXCEPTION 'Origin location is required for exit/transfer movements';
    END IF;
  ELSIF p_destination_type = 'external' THEN
    IF p_movement_type = 'out' AND p_from_location_id IS NULL THEN
      RAISE EXCEPTION 'Origin location is required for exit movements';
    END IF;
  END IF;

  -- Validate area
  IF p_to_area_id IS NOT NULL THEN
    SELECT branch_id, tenant_id INTO v_area_branch_id, v_area_tenant_id FROM facility_areas WHERE id = p_to_area_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid area'; END IF;
    IF v_area_tenant_id != p_tenant_id THEN RAISE EXCEPTION 'Invalid area: wrong tenant'; END IF;
    IF p_to_location_id IS NOT NULL AND v_area_branch_id != p_to_location_id THEN RAISE EXCEPTION 'Invalid area: wrong branch'; END IF;
  END IF;

  -- Validate unit
  IF p_to_unit_id IS NOT NULL THEN
    SELECT area_id, branch_id, tenant_id INTO v_unit_area_id, v_unit_branch_id, v_unit_tenant_id FROM housing_units WHERE id = p_to_unit_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid unit'; END IF;
    IF v_unit_tenant_id != p_tenant_id THEN RAISE EXCEPTION 'Invalid unit: wrong tenant'; END IF;
    IF p_to_location_id IS NOT NULL AND v_unit_branch_id != p_to_location_id THEN RAISE EXCEPTION 'Invalid unit: wrong branch'; END IF;
    IF p_to_area_id IS NOT NULL AND v_unit_area_id != p_to_area_id THEN RAISE EXCEPTION 'Invalid unit: wrong area'; END IF;
  END IF;

  SELECT housing_unit_id, current_location_id INTO v_horse_current_unit_id, v_horse_current_location_id
  FROM horses WHERE id = p_horse_id AND tenant_id = p_tenant_id;

  v_is_cross_branch_transfer := (p_movement_type = 'transfer' AND p_to_location_id IS NOT NULL 
    AND v_horse_current_location_id IS NOT NULL AND v_horse_current_location_id != p_to_location_id);

  -- If scheduled, skip all housing changes
  IF v_is_scheduled THEN
    v_should_clear_housing := false;
    v_should_update_housing := false;
  ELSE
    v_should_clear_housing := (p_movement_type = 'out') OR p_clear_housing 
      OR (v_is_cross_branch_transfer AND p_to_area_id IS NULL AND p_to_unit_id IS NULL);
    v_should_update_housing := (p_to_area_id IS NOT NULL OR p_to_unit_id IS NOT NULL) AND NOT v_should_clear_housing;
  END IF;

  IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
    SELECT occupancy, capacity INTO v_unit_occupancy, v_unit_capacity FROM housing_units WHERE id = p_to_unit_id;
    SELECT COUNT(*) INTO v_current_occupants FROM housing_unit_occupants WHERE unit_id = p_to_unit_id AND until IS NULL AND horse_id != p_horse_id;
    IF v_unit_occupancy = 'single' AND v_current_occupants >= 1 THEN RAISE EXCEPTION 'Unit is single-occupancy and already occupied'; END IF;
    IF v_unit_occupancy = 'group' AND v_current_occupants >= v_unit_capacity THEN RAISE EXCEPTION 'Unit has reached maximum capacity'; END IF;
  END IF;

  IF v_horse_current_unit_id IS NOT NULL AND NOT v_is_scheduled THEN
    IF v_should_clear_housing OR (v_should_update_housing AND p_to_unit_id IS NOT NULL AND v_horse_current_unit_id != p_to_unit_id)
       OR (v_should_update_housing AND p_to_area_id IS NOT NULL AND p_to_unit_id IS NULL) THEN
      UPDATE housing_unit_occupants SET until = COALESCE(p_movement_at, now())
      WHERE horse_id = p_horse_id AND tenant_id = p_tenant_id AND until IS NULL;
    END IF;
  END IF;

  INSERT INTO horse_movements (
    tenant_id, horse_id, movement_type, from_location_id, to_location_id,
    from_area_id, to_area_id, from_unit_id, to_unit_id,
    destination_type, from_external_location_id, to_external_location_id,
    movement_at, recorded_by, reason, notes, internal_location_note, is_demo,
    movement_status, scheduled_at, dispatched_at
  ) VALUES (
    p_tenant_id, p_horse_id, p_movement_type::movement_type,
    p_from_location_id, p_to_location_id, p_from_area_id, p_to_area_id,
    p_from_unit_id, p_to_unit_id,
    p_destination_type, p_from_external_location_id, p_to_external_location_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes,
    p_internal_location_note, p_is_demo,
    COALESCE(p_movement_status, 'dispatched'),
    CASE WHEN p_movement_status = 'scheduled' THEN COALESCE(p_movement_at, now()) ELSE NULL END,
    CASE WHEN p_movement_status != 'scheduled' THEN now() ELSE NULL END
  ) RETURNING * INTO v_movement_record;
  v_movement_id := v_movement_record.id;

  IF p_to_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_to_external_location_id;
  END IF;
  IF p_from_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_from_external_location_id;
  END IF;

  -- Only update horse/housing if NOT scheduled
  IF NOT v_is_scheduled THEN
    IF v_should_clear_housing THEN
      UPDATE horses SET current_location_id = CASE WHEN p_movement_type = 'out' THEN NULL ELSE p_to_location_id END,
        current_area_id = NULL, housing_unit_id = NULL, updated_at = now()
      WHERE id = p_horse_id AND tenant_id = p_tenant_id RETURNING * INTO v_updated_horse;
    ELSIF v_should_update_housing THEN
      IF p_to_unit_id IS NOT NULL THEN
        UPDATE horses SET current_location_id = COALESCE(p_to_location_id, current_location_id),
          current_area_id = COALESCE(p_to_area_id, (SELECT area_id FROM housing_units WHERE id = p_to_unit_id)),
          housing_unit_id = p_to_unit_id, updated_at = now()
        WHERE id = p_horse_id AND tenant_id = p_tenant_id RETURNING * INTO v_updated_horse;
      ELSE
        UPDATE horses SET current_location_id = COALESCE(p_to_location_id, current_location_id),
          current_area_id = p_to_area_id, housing_unit_id = NULL, updated_at = now()
        WHERE id = p_horse_id AND tenant_id = p_tenant_id RETURNING * INTO v_updated_horse;
      END IF;
    ELSE
      UPDATE horses SET current_location_id = COALESCE(p_to_location_id, current_location_id), updated_at = now()
      WHERE id = p_horse_id AND tenant_id = p_tenant_id RETURNING * INTO v_updated_horse;
    END IF;

    IF p_to_unit_id IS NOT NULL AND v_should_update_housing 
       AND (v_horse_current_unit_id IS NULL OR v_horse_current_unit_id != p_to_unit_id) THEN
      INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
      VALUES (p_tenant_id, p_to_unit_id, p_horse_id, COALESCE(p_movement_at, now()), p_is_demo);
    END IF;
  ELSE
    -- For scheduled, still return current horse state
    SELECT * INTO v_updated_horse FROM horses WHERE id = p_horse_id AND tenant_id = p_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_movement_record.id, 'tenant_id', v_movement_record.tenant_id,
      'horse_id', v_movement_record.horse_id, 'movement_type', v_movement_record.movement_type,
      'destination_type', v_movement_record.destination_type,
      'movement_status', v_movement_record.movement_status,
      'movement_at', v_movement_record.movement_at, 'is_demo', v_movement_record.is_demo
    ),
    'horse', jsonb_build_object(
      'id', v_updated_horse.id, 'name', v_updated_horse.name,
      'current_location_id', v_updated_horse.current_location_id,
      'current_area_id', v_updated_horse.current_area_id,
      'housing_unit_id', v_updated_horse.housing_unit_id
    )
  );
END;
$$;

-- Phase C.4: Update record_connected_movement to support scheduling
CREATE OR REPLACE FUNCTION public.record_connected_movement(
  p_sender_tenant_id uuid,
  p_horse_id uuid,
  p_connected_tenant_id uuid,
  p_from_location_id uuid DEFAULT NULL,
  p_movement_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_demo boolean DEFAULT false,
  p_movement_status text DEFAULT 'dispatched'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  SELECT display_name INTO v_sender_name FROM tenants WHERE id = p_sender_tenant_id;

  -- Only clear housing if not scheduled
  IF NOT v_is_scheduled AND v_horse.housing_unit_id IS NOT NULL THEN
    UPDATE housing_unit_occupants SET until = COALESCE(p_movement_at, now())
    WHERE horse_id = p_horse_id AND tenant_id = p_sender_tenant_id AND until IS NULL;
  END IF;

  -- Sender movement
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

  -- Only clear horse location and create incoming if not scheduled
  IF NOT v_is_scheduled THEN
    UPDATE horses SET
      current_location_id = NULL, current_area_id = NULL, housing_unit_id = NULL, updated_at = now()
    WHERE id = p_horse_id AND tenant_id = p_sender_tenant_id;

    -- Receiver incoming record (created at dispatch, not at scheduling)
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
$$;

-- Phase C.5: Update confirm_incoming_movement to create local movement
CREATE OR REPLACE FUNCTION public.confirm_incoming_movement(
  p_incoming_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_incoming record;
  v_local_movement_id uuid;
BEGIN
  SELECT * INTO v_incoming FROM incoming_horse_movements WHERE id = p_incoming_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incoming movement not found'; END IF;
  IF v_incoming.status != 'pending' THEN RAISE EXCEPTION 'Incoming movement is not pending'; END IF;
  IF NOT can_manage_movement(auth.uid(), v_incoming.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create local arrival movement on receiver's tenant
  INSERT INTO horse_movements (
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

  -- Update incoming record
  UPDATE incoming_horse_movements SET
    status = 'completed', completed_at = now(), completed_by = auth.uid(),
    local_movement_id = v_local_movement_id,
    notes = COALESCE(p_notes, notes), updated_at = now()
  WHERE id = p_incoming_id;

  -- Update sender's movement to completed
  UPDATE horse_movements SET
    movement_status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = v_incoming.sender_movement_id;

  RETURN jsonb_build_object(
    'incoming_id', v_incoming.id,
    'status', 'completed',
    'horse_id', v_incoming.horse_id,
    'horse_name', v_incoming.horse_name,
    'local_movement_id', v_local_movement_id
  );
END;
$$;
