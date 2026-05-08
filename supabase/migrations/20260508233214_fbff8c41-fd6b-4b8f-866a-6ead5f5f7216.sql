-- AD-1 Pass 2-C.0: extend record_horse_movement_with_housing with optional p_movement_subtype.
-- Drop the exact existing 19-arg signature so we replace (not overload) the function.
DROP FUNCTION public.record_horse_movement_with_housing(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid,
  timestamptz, text, text, text, boolean, boolean, text,
  uuid, uuid, text
);

CREATE FUNCTION public.record_horse_movement_with_housing(
  p_tenant_id uuid,
  p_horse_id uuid,
  p_movement_type text,
  p_from_location_id uuid DEFAULT NULL,
  p_to_location_id uuid DEFAULT NULL,
  p_from_area_id uuid DEFAULT NULL,
  p_from_unit_id uuid DEFAULT NULL,
  p_to_area_id uuid DEFAULT NULL,
  p_to_unit_id uuid DEFAULT NULL,
  p_movement_at timestamptz DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_internal_location_note text DEFAULT NULL,
  p_is_demo boolean DEFAULT false,
  p_clear_housing boolean DEFAULT false,
  p_destination_type text DEFAULT 'internal',
  p_from_external_location_id uuid DEFAULT NULL,
  p_to_external_location_id uuid DEFAULT NULL,
  p_movement_status text DEFAULT 'dispatched',
  p_movement_subtype text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- AD-1 Pass 2-C.0: validate explicit subtype if provided.
  IF p_movement_subtype IS NOT NULL THEN
    IF p_movement_subtype NOT IN (
      'arrival','return_from_temporary_out',
      'checkout_departure','temporary_out','internal_transfer'
    ) THEN
      RAISE EXCEPTION 'Invalid movement_subtype: %', p_movement_subtype;
    END IF;
    IF (p_movement_subtype IN ('arrival','return_from_temporary_out') AND p_movement_type <> 'in')
       OR (p_movement_subtype IN ('checkout_departure','temporary_out') AND p_movement_type <> 'out')
       OR (p_movement_subtype = 'internal_transfer' AND p_movement_type <> 'transfer') THEN
      RAISE EXCEPTION 'movement_subtype % does not match movement_type %',
        p_movement_subtype, p_movement_type;
    END IF;
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
    movement_status, scheduled_at, dispatched_at, movement_subtype
  ) VALUES (
    p_tenant_id, p_horse_id, p_movement_type::movement_type,
    p_from_location_id, p_to_location_id, p_from_area_id, p_to_area_id,
    p_from_unit_id, p_to_unit_id,
    p_destination_type, p_from_external_location_id, p_to_external_location_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes,
    p_internal_location_note, p_is_demo,
    COALESCE(p_movement_status, 'dispatched'),
    CASE WHEN p_movement_status = 'scheduled' THEN COALESCE(p_movement_at, now()) ELSE NULL END,
    CASE WHEN p_movement_status != 'scheduled' THEN now() ELSE NULL END,
    p_movement_subtype  -- NULL → BEFORE INSERT trigger fills the default
  ) RETURNING * INTO v_movement_record;
  v_movement_id := v_movement_record.id;

  IF p_to_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_to_external_location_id;
  END IF;
  IF p_from_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_from_external_location_id;
  END IF;

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
    SELECT * INTO v_updated_horse FROM horses WHERE id = p_horse_id AND tenant_id = p_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_movement_record.id, 'tenant_id', v_movement_record.tenant_id,
      'horse_id', v_movement_record.horse_id, 'movement_type', v_movement_record.movement_type,
      'destination_type', v_movement_record.destination_type,
      'movement_status', v_movement_record.movement_status,
      'movement_subtype', v_movement_record.movement_subtype,
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
$function$;

GRANT EXECUTE ON FUNCTION public.record_horse_movement_with_housing(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid,
  timestamptz, text, text, text, boolean, boolean, text,
  uuid, uuid, text, text
) TO authenticated;