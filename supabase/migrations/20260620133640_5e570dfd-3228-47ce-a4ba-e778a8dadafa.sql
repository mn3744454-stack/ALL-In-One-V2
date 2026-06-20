-- Phase 1.e.f.7.e.1 — Internal Unit Transfer Atomic Occupancy Correction
-- Replace body of record_horse_movement_with_housing. Signature, return shape,
-- SECURITY DEFINER, search_path, and permission gate are preserved.
--
-- Fix: previously the "close existing active occupant" step was gated on
-- horses.housing_unit_id being non-null. For connected/B2B horses or any flow
-- that updated occupants/admissions without going through this RPC, that
-- column could be NULL/stale, so the close silently skipped and a new
-- occupant row was inserted on top of the old one (duplicate active rows).
--
-- New behavior: close stale active housing_unit_occupants rows based on
-- actual occupancy rows, scoped to rows whose unit_id is DISTINCT FROM the
-- new target unit. For checkout/clear-housing, close all active rows.

CREATE OR REPLACE FUNCTION public.record_horse_movement_with_housing(
  p_tenant_id uuid,
  p_horse_id uuid,
  p_movement_type text,
  p_from_location_id uuid DEFAULT NULL::uuid,
  p_to_location_id uuid DEFAULT NULL::uuid,
  p_from_area_id uuid DEFAULT NULL::uuid,
  p_from_unit_id uuid DEFAULT NULL::uuid,
  p_to_area_id uuid DEFAULT NULL::uuid,
  p_to_unit_id uuid DEFAULT NULL::uuid,
  p_movement_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_reason text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_internal_location_note text DEFAULT NULL::text,
  p_is_demo boolean DEFAULT false,
  p_clear_housing boolean DEFAULT false,
  p_destination_type text DEFAULT 'internal'::text,
  p_from_external_location_id uuid DEFAULT NULL::uuid,
  p_to_external_location_id uuid DEFAULT NULL::uuid,
  p_movement_status text DEFAULT 'dispatched'::text,
  p_movement_subtype text DEFAULT NULL::text
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
  v_close_ts timestamptz;
  v_has_other_active_unit boolean;
BEGIN
  IF NOT can_manage_movement(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient privileges to record movements';
  END IF;

  IF p_movement_type NOT IN ('in', 'out', 'transfer') THEN
    RAISE EXCEPTION 'Invalid movement type: must be in, out, or transfer';
  END IF;

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
  v_close_ts := COALESCE(p_movement_at, now());

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

  -- Validate destination area
  IF p_to_area_id IS NOT NULL THEN
    SELECT branch_id, tenant_id INTO v_area_branch_id, v_area_tenant_id FROM facility_areas WHERE id = p_to_area_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid area'; END IF;
    IF v_area_tenant_id != p_tenant_id THEN RAISE EXCEPTION 'Invalid area: wrong tenant'; END IF;
    IF p_to_location_id IS NOT NULL AND v_area_branch_id != p_to_location_id THEN RAISE EXCEPTION 'Invalid area: wrong branch'; END IF;
  END IF;

  -- Validate destination unit
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

  -- Capacity / single-occupancy guard for the new target unit.
  -- Counts only OTHER horses' active rows so a stale row for the same horse
  -- (which we will close below) does not falsely trip the guard.
  IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
    SELECT occupancy, capacity INTO v_unit_occupancy, v_unit_capacity FROM housing_units WHERE id = p_to_unit_id;
    SELECT COUNT(*) INTO v_current_occupants FROM housing_unit_occupants
      WHERE unit_id = p_to_unit_id AND until IS NULL AND horse_id != p_horse_id;
    IF v_unit_occupancy = 'single' AND v_current_occupants >= 1 THEN
      RAISE EXCEPTION 'Unit is single-occupancy and already occupied';
    END IF;
    IF v_unit_occupancy = 'group' AND v_current_occupants >= v_unit_capacity THEN
      RAISE EXCEPTION 'Unit has reached maximum capacity';
    END IF;
  END IF;

  ------------------------------------------------------------------
  -- Phase 1.e.f.7.e.1 — close stale active occupant rows based on
  -- ACTUAL occupancy rows, not on the (possibly stale) horses pointer.
  --
  -- Rules:
  --   * For checkout / clear-housing → close ALL active rows for this
  --     horse (no new target row will be inserted below).
  --   * For a placement or unit-to-unit move with a target unit → close
  --     any active rows whose unit_id IS DISTINCT FROM the target unit
  --     (so a pre-existing row for the same target unit is preserved
  --     and the new insert below is gated by the existence check).
  --   * For area-only moves (no target unit) → close any active rows
  --     whose unit_id is not NULL (the horse is leaving a unit).
  ------------------------------------------------------------------
  IF NOT v_is_scheduled THEN
    IF v_should_clear_housing THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id
        AND horse_id  = p_horse_id
        AND until IS NULL;
    ELSIF v_should_update_housing AND p_to_unit_id IS NOT NULL THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id
        AND horse_id  = p_horse_id
        AND until IS NULL
        AND unit_id IS DISTINCT FROM p_to_unit_id;
    ELSIF v_should_update_housing AND p_to_area_id IS NOT NULL AND p_to_unit_id IS NULL THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id
        AND horse_id  = p_horse_id
        AND until IS NULL
        AND unit_id IS NOT NULL;
    END IF;
  END IF;

  -- Insert movement record. Honors caller-provided from-unit/from-area.
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
    p_movement_subtype
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

    -- Insert new active occupant row for the target unit IFF there isn't
    -- already an active row for that exact (horse, unit). The close step
    -- above scoped its UPDATE with `unit_id IS DISTINCT FROM p_to_unit_id`,
    -- so a pre-existing row for the same target unit survives intact.
    IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
      IF NOT EXISTS (
        SELECT 1 FROM housing_unit_occupants
        WHERE tenant_id = p_tenant_id
          AND horse_id  = p_horse_id
          AND unit_id   = p_to_unit_id
          AND until IS NULL
      ) THEN
        INSERT INTO housing_unit_occupants (tenant_id, unit_id, horse_id, since, is_demo)
        VALUES (p_tenant_id, p_to_unit_id, p_horse_id, COALESCE(p_movement_at, now()), p_is_demo);
      END IF;
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

-- ────────────────────────────────────────────────────────────────────
-- One-shot backfill — repair duplicate-active housing_unit_occupants rows
-- left over from the previous behavior. For every (tenant_id, horse_id)
-- with more than one row where `until IS NULL`, keep the most recent row
-- open (max since, then max created_at, then max id as tiebreaker) and
-- close the older rows with until = now(). No rows are deleted; rows
-- already closed (until IS NOT NULL) are untouched.
-- ────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, horse_id
           ORDER BY since DESC NULLS LAST, created_at DESC, id DESC
         ) AS rn
  FROM housing_unit_occupants
  WHERE until IS NULL
)
UPDATE housing_unit_occupants o
SET until = now()
FROM ranked r
WHERE o.id = r.id
  AND r.rn > 1;
