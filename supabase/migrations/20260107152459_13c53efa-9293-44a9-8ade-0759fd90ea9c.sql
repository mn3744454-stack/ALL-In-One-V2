-- ============================================
-- HOUSING ↔ MOVEMENT INTEGRATION RPC
-- ============================================

-- First, revoke INSERT privilege on horse_movements to force RPC usage
REVOKE INSERT ON public.horse_movements FROM authenticated;

-- Drop the existing trigger that may conflict
DROP TRIGGER IF EXISTS on_movement_update_location ON public.horse_movements;
DROP FUNCTION IF EXISTS public.update_horse_location_on_movement();

-- Create the new RPC function
CREATE OR REPLACE FUNCTION public.record_horse_movement_with_housing(
  p_tenant_id uuid,
  p_horse_id uuid,
  p_movement_type text,
  p_from_location_id uuid DEFAULT NULL,
  p_to_location_id uuid DEFAULT NULL,
  p_from_area_id uuid DEFAULT NULL,
  p_from_unit_id uuid DEFAULT NULL,
  p_to_area_id uuid DEFAULT NULL,
  p_to_unit_id uuid DEFAULT NULL,
  p_movement_at timestamptz DEFAULT now(),
  p_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_internal_location_note text DEFAULT NULL,
  p_is_demo boolean DEFAULT false,
  p_clear_housing boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id uuid;
  v_unit_occupancy occupancy_mode;
  v_unit_capacity int;
  v_current_occupants int;
  v_horse_current_unit_id uuid;
  v_horse_current_location_id uuid;
  v_area_branch_id uuid;
  v_area_tenant_id uuid;
  v_unit_area_id uuid;
  v_unit_branch_id uuid;
  v_unit_tenant_id uuid;
  v_should_clear_housing boolean;
  v_should_update_housing boolean;
  v_is_cross_branch_transfer boolean;
  v_updated_horse record;
  v_movement_record record;
BEGIN
  -- 1) Validate permissions using existing helper
  IF NOT can_manage_movement(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  -- 2) Strict movement type validations
  IF p_movement_type NOT IN ('in', 'out', 'transfer') THEN
    RAISE EXCEPTION 'Invalid movement type: must be in, out, or transfer';
  END IF;

  IF p_movement_type IN ('in', 'transfer') AND p_to_location_id IS NULL THEN
    RAISE EXCEPTION 'Destination location is required for entry/transfer movements';
  END IF;

  IF p_movement_type = 'out' AND p_from_location_id IS NULL THEN
    RAISE EXCEPTION 'Origin location is required for exit movements';
  END IF;

  IF p_movement_type = 'transfer' AND p_from_location_id IS NULL THEN
    RAISE EXCEPTION 'Origin location is required for transfer movements';
  END IF;

  -- 3) Validate area belongs to correct branch + tenant
  IF p_to_area_id IS NOT NULL THEN
    SELECT branch_id, tenant_id INTO v_area_branch_id, v_area_tenant_id
    FROM facility_areas 
    WHERE id = p_to_area_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid area: area does not exist';
    END IF;
    
    IF v_area_tenant_id != p_tenant_id THEN
      RAISE EXCEPTION 'Invalid area: area belongs to different tenant';
    END IF;
    
    IF v_area_branch_id != p_to_location_id THEN
      RAISE EXCEPTION 'Invalid area: area belongs to different branch';
    END IF;
  END IF;

  -- 4) Validate unit belongs to correct area + branch + tenant
  IF p_to_unit_id IS NOT NULL THEN
    SELECT area_id, branch_id, tenant_id INTO v_unit_area_id, v_unit_branch_id, v_unit_tenant_id
    FROM housing_units 
    WHERE id = p_to_unit_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid unit: unit does not exist';
    END IF;
    
    IF v_unit_tenant_id != p_tenant_id THEN
      RAISE EXCEPTION 'Invalid unit: unit belongs to different tenant';
    END IF;
    
    IF v_unit_branch_id != p_to_location_id THEN
      RAISE EXCEPTION 'Invalid unit: unit belongs to different branch';
    END IF;
    
    IF p_to_area_id IS NOT NULL AND v_unit_area_id != p_to_area_id THEN
      RAISE EXCEPTION 'Invalid unit: unit belongs to different area';
    END IF;
  END IF;

  -- 5) Get horse's current location and unit
  SELECT housing_unit_id, current_location_id 
  INTO v_horse_current_unit_id, v_horse_current_location_id
  FROM horses WHERE id = p_horse_id AND tenant_id = p_tenant_id;

  -- 6) Determine if this is a cross-branch transfer
  v_is_cross_branch_transfer := (p_movement_type = 'transfer' 
    AND p_to_location_id IS NOT NULL 
    AND v_horse_current_location_id IS NOT NULL 
    AND v_horse_current_location_id != p_to_location_id);

  -- 7) Determine housing update behavior
  -- OUT: always clear
  -- p_clear_housing = true: always clear
  -- Cross-branch transfer with no housing provided: auto-clear
  -- Otherwise check if housing is provided
  v_should_clear_housing := (p_movement_type = 'out') 
    OR p_clear_housing 
    OR (v_is_cross_branch_transfer AND p_to_area_id IS NULL AND p_to_unit_id IS NULL);
  
  v_should_update_housing := (p_to_area_id IS NOT NULL OR p_to_unit_id IS NOT NULL) AND NOT v_should_clear_housing;

  -- 8) If new unit provided, validate capacity
  IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
    SELECT occupancy, capacity INTO v_unit_occupancy, v_unit_capacity
    FROM housing_units WHERE id = p_to_unit_id;

    SELECT COUNT(*) INTO v_current_occupants
    FROM housing_unit_occupants
    WHERE unit_id = p_to_unit_id 
      AND until IS NULL
      AND horse_id != p_horse_id;

    IF v_unit_occupancy = 'single' AND v_current_occupants >= 1 THEN
      RAISE EXCEPTION 'Unit is single-occupancy and already occupied';
    END IF;

    IF v_unit_occupancy = 'group' AND v_current_occupants >= v_unit_capacity THEN
      RAISE EXCEPTION 'Unit has reached maximum capacity';
    END IF;
  END IF;

  -- 9) Close existing occupant record if:
  --    - We're clearing housing
  --    - OR unit is explicitly changing to a different unit
  --    - OR area-only is provided (clear unit but keep area)
  IF v_horse_current_unit_id IS NOT NULL THEN
    IF v_should_clear_housing 
       OR (v_should_update_housing AND p_to_unit_id IS NOT NULL AND v_horse_current_unit_id != p_to_unit_id)
       OR (v_should_update_housing AND p_to_area_id IS NOT NULL AND p_to_unit_id IS NULL) THEN
      UPDATE housing_unit_occupants
      SET until = COALESCE(p_movement_at, now())
      WHERE horse_id = p_horse_id 
        AND tenant_id = p_tenant_id
        AND until IS NULL;
    END IF;
  END IF;

  -- 10) Insert movement record (using auth.uid() for recorded_by)
  INSERT INTO horse_movements (
    tenant_id, horse_id, movement_type,
    from_location_id, to_location_id,
    from_area_id, to_area_id,
    from_unit_id, to_unit_id,
    movement_at, recorded_by, reason, notes,
    internal_location_note, is_demo
  ) VALUES (
    p_tenant_id, p_horse_id, p_movement_type::movement_type,
    p_from_location_id, p_to_location_id,
    p_from_area_id, p_to_area_id,
    p_from_unit_id, p_to_unit_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes,
    p_internal_location_note, p_is_demo
  )
  RETURNING * INTO v_movement_record;

  v_movement_id := v_movement_record.id;

  -- 11) Update horse record based on rules
  IF v_should_clear_housing THEN
    -- OUT or explicit clear or cross-branch skip: nullify housing
    UPDATE horses
    SET current_location_id = CASE WHEN p_movement_type = 'out' THEN NULL ELSE p_to_location_id END,
        current_area_id = NULL,
        housing_unit_id = NULL,
        updated_at = now()
    WHERE id = p_horse_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_updated_horse;
    
  ELSIF v_should_update_housing THEN
    -- Housing explicitly provided
    IF p_to_unit_id IS NOT NULL THEN
      -- Full housing update (area + unit)
      UPDATE horses
      SET current_location_id = COALESCE(p_to_location_id, current_location_id),
          current_area_id = COALESCE(p_to_area_id, (SELECT area_id FROM housing_units WHERE id = p_to_unit_id)),
          housing_unit_id = p_to_unit_id,
          updated_at = now()
      WHERE id = p_horse_id AND tenant_id = p_tenant_id
      RETURNING * INTO v_updated_horse;
    ELSE
      -- Area-only: set area, clear unit
      UPDATE horses
      SET current_location_id = COALESCE(p_to_location_id, current_location_id),
          current_area_id = p_to_area_id,
          housing_unit_id = NULL,
          updated_at = now()
      WHERE id = p_horse_id AND tenant_id = p_tenant_id
      RETURNING * INTO v_updated_horse;
    END IF;
    
  ELSE
    -- Skip housing: only update location, leave housing unchanged
    UPDATE horses
    SET current_location_id = COALESCE(p_to_location_id, current_location_id),
        updated_at = now()
    WHERE id = p_horse_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_updated_horse;
  END IF;

  -- 12) Create new occupant record if unit provided and updating housing
  IF p_to_unit_id IS NOT NULL AND v_should_update_housing 
     AND (v_horse_current_unit_id IS NULL OR v_horse_current_unit_id != p_to_unit_id) THEN
    INSERT INTO housing_unit_occupants (
      tenant_id, unit_id, horse_id, since, is_demo
    ) VALUES (
      p_tenant_id, p_to_unit_id, p_horse_id, 
      COALESCE(p_movement_at, now()), p_is_demo
    );
  END IF;

  -- 13) Return complete movement + horse snapshot
  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_movement_record.id,
      'tenant_id', v_movement_record.tenant_id,
      'horse_id', v_movement_record.horse_id,
      'movement_type', v_movement_record.movement_type,
      'from_location_id', v_movement_record.from_location_id,
      'to_location_id', v_movement_record.to_location_id,
      'from_area_id', v_movement_record.from_area_id,
      'to_area_id', v_movement_record.to_area_id,
      'from_unit_id', v_movement_record.from_unit_id,
      'to_unit_id', v_movement_record.to_unit_id,
      'movement_at', v_movement_record.movement_at,
      'recorded_by', v_movement_record.recorded_by,
      'reason', v_movement_record.reason,
      'notes', v_movement_record.notes,
      'internal_location_note', v_movement_record.internal_location_note,
      'is_demo', v_movement_record.is_demo,
      'created_at', v_movement_record.created_at
    ),
    'horse', jsonb_build_object(
      'id', v_updated_horse.id,
      'name', v_updated_horse.name,
      'name_ar', v_updated_horse.name_ar,
      'current_location_id', v_updated_horse.current_location_id,
      'current_area_id', v_updated_horse.current_area_id,
      'housing_unit_id', v_updated_horse.housing_unit_id
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_horse_movement_with_housing TO authenticated;