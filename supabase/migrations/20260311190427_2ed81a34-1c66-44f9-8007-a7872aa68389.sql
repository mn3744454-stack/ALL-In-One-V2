-- Create external_locations table
CREATE TABLE public.external_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  address text,
  city text,
  location_type text NOT NULL DEFAULT 'other',
  contact_name text,
  contact_phone text,
  usage_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view external locations"
  ON public.external_locations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = external_locations.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true
  ));

CREATE POLICY "Managers can insert external locations"
  ON public.external_locations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = external_locations.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can update external locations"
  ON public.external_locations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = external_locations.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can delete external locations"
  ON public.external_locations FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = external_locations.tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('owner', 'manager')
  ));

-- Extend horse_movements
ALTER TABLE public.horse_movements
  ADD COLUMN IF NOT EXISTS destination_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS from_external_location_id uuid REFERENCES public.external_locations(id),
  ADD COLUMN IF NOT EXISTS to_external_location_id uuid REFERENCES public.external_locations(id);

-- Update RPC
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
  p_to_external_location_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movement_id uuid; v_unit_occupancy occupancy_mode; v_unit_capacity int;
  v_current_occupants int; v_horse_current_unit_id uuid; v_horse_current_location_id uuid;
  v_area_branch_id uuid; v_area_tenant_id uuid; v_unit_area_id uuid;
  v_unit_branch_id uuid; v_unit_tenant_id uuid;
  v_should_clear_housing boolean; v_should_update_housing boolean;
  v_is_cross_branch_transfer boolean; v_updated_horse record; v_movement_record record;
BEGIN
  IF NOT can_manage_movement(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'transfer') THEN
    RAISE EXCEPTION 'Invalid movement type: must be in, out, or transfer';
  END IF;

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

  v_should_clear_housing := (p_movement_type = 'out') OR p_clear_housing 
    OR (v_is_cross_branch_transfer AND p_to_area_id IS NULL AND p_to_unit_id IS NULL);
  v_should_update_housing := (p_to_area_id IS NOT NULL OR p_to_unit_id IS NOT NULL) AND NOT v_should_clear_housing;

  IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
    SELECT occupancy, capacity INTO v_unit_occupancy, v_unit_capacity FROM housing_units WHERE id = p_to_unit_id;
    SELECT COUNT(*) INTO v_current_occupants FROM housing_unit_occupants WHERE unit_id = p_to_unit_id AND until IS NULL AND horse_id != p_horse_id;
    IF v_unit_occupancy = 'single' AND v_current_occupants >= 1 THEN RAISE EXCEPTION 'Unit is single-occupancy and already occupied'; END IF;
    IF v_unit_occupancy = 'group' AND v_current_occupants >= v_unit_capacity THEN RAISE EXCEPTION 'Unit has reached maximum capacity'; END IF;
  END IF;

  IF v_horse_current_unit_id IS NOT NULL THEN
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
    movement_at, recorded_by, reason, notes, internal_location_note, is_demo
  ) VALUES (
    p_tenant_id, p_horse_id, p_movement_type::movement_type,
    p_from_location_id, p_to_location_id, p_from_area_id, p_to_area_id,
    p_from_unit_id, p_to_unit_id,
    p_destination_type, p_from_external_location_id, p_to_external_location_id,
    COALESCE(p_movement_at, now()), auth.uid(), p_reason, p_notes,
    p_internal_location_note, p_is_demo
  ) RETURNING * INTO v_movement_record;
  v_movement_id := v_movement_record.id;

  IF p_to_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_to_external_location_id;
  END IF;
  IF p_from_external_location_id IS NOT NULL THEN
    UPDATE external_locations SET usage_count = usage_count + 1 WHERE id = p_from_external_location_id;
  END IF;

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

  RETURN jsonb_build_object(
    'movement', jsonb_build_object(
      'id', v_movement_record.id, 'tenant_id', v_movement_record.tenant_id,
      'horse_id', v_movement_record.horse_id, 'movement_type', v_movement_record.movement_type,
      'destination_type', v_movement_record.destination_type,
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