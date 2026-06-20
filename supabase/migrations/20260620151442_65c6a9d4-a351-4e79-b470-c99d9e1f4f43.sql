
-- 1) Snapshot columns on housing_unit_occupants
ALTER TABLE public.housing_unit_occupants
  ADD COLUMN IF NOT EXISTS horse_name_snapshot text,
  ADD COLUMN IF NOT EXISTS horse_name_ar_snapshot text,
  ADD COLUMN IF NOT EXISTS horse_avatar_url_snapshot text;

COMMENT ON COLUMN public.housing_unit_occupants.horse_name_snapshot IS
  'Display snapshot for current/historical occupancy. Lets Room History render identity even when the canonical horses row is RLS-blocked (connected/B2B horses) or the admission is later removed.';
COMMENT ON COLUMN public.housing_unit_occupants.horse_name_ar_snapshot IS
  'Arabic display snapshot for current/historical occupancy. Same purpose as horse_name_snapshot.';
COMMENT ON COLUMN public.housing_unit_occupants.horse_avatar_url_snapshot IS
  'Avatar display snapshot for current/historical occupancy. Same purpose as horse_name_snapshot.';

-- 2) RPC body patch — preserve signature/return shape, add snapshot population on the new occupant insert.
CREATE OR REPLACE FUNCTION public.record_horse_movement_with_housing(
  p_tenant_id uuid, p_horse_id uuid, p_movement_type text,
  p_from_location_id uuid DEFAULT NULL::uuid, p_to_location_id uuid DEFAULT NULL::uuid,
  p_from_area_id uuid DEFAULT NULL::uuid, p_from_unit_id uuid DEFAULT NULL::uuid,
  p_to_area_id uuid DEFAULT NULL::uuid, p_to_unit_id uuid DEFAULT NULL::uuid,
  p_movement_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text,
  p_internal_location_note text DEFAULT NULL::text, p_is_demo boolean DEFAULT false,
  p_clear_housing boolean DEFAULT false, p_destination_type text DEFAULT 'internal'::text,
  p_from_external_location_id uuid DEFAULT NULL::uuid, p_to_external_location_id uuid DEFAULT NULL::uuid,
  p_movement_status text DEFAULT 'dispatched'::text, p_movement_subtype text DEFAULT NULL::text)
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
  v_snap_name text; v_snap_name_ar text; v_snap_avatar text;
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

  IF p_to_area_id IS NOT NULL THEN
    SELECT branch_id, tenant_id INTO v_area_branch_id, v_area_tenant_id FROM facility_areas WHERE id = p_to_area_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid area'; END IF;
    IF v_area_tenant_id != p_tenant_id THEN RAISE EXCEPTION 'Invalid area: wrong tenant'; END IF;
    IF p_to_location_id IS NOT NULL AND v_area_branch_id != p_to_location_id THEN RAISE EXCEPTION 'Invalid area: wrong branch'; END IF;
  END IF;

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
    SELECT COUNT(*) INTO v_current_occupants FROM housing_unit_occupants
      WHERE unit_id = p_to_unit_id AND until IS NULL AND horse_id != p_horse_id;
    IF v_unit_occupancy = 'single' AND v_current_occupants >= 1 THEN
      RAISE EXCEPTION 'Unit is single-occupancy and already occupied';
    END IF;
    IF v_unit_occupancy = 'group' AND v_current_occupants >= v_unit_capacity THEN
      RAISE EXCEPTION 'Unit has reached maximum capacity';
    END IF;
  END IF;

  IF NOT v_is_scheduled THEN
    IF v_should_clear_housing THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id AND horse_id  = p_horse_id AND until IS NULL;
    ELSIF v_should_update_housing AND p_to_unit_id IS NOT NULL THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id AND horse_id  = p_horse_id AND until IS NULL
        AND unit_id IS DISTINCT FROM p_to_unit_id;
    ELSIF v_should_update_housing AND p_to_area_id IS NOT NULL AND p_to_unit_id IS NULL THEN
      UPDATE housing_unit_occupants
      SET until = v_close_ts
      WHERE tenant_id = p_tenant_id AND horse_id  = p_horse_id AND until IS NULL
        AND unit_id IS NOT NULL;
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

    IF p_to_unit_id IS NOT NULL AND v_should_update_housing THEN
      IF NOT EXISTS (
        SELECT 1 FROM housing_unit_occupants
        WHERE tenant_id = p_tenant_id AND horse_id  = p_horse_id
          AND unit_id   = p_to_unit_id AND until IS NULL
      ) THEN
        -- Resolve durable display snapshot. Prefer the active boarding
        -- admission snapshot (already populated for connected/B2B horses),
        -- then fall back to the canonical horses row when visible.
        SELECT ba.horse_name_snapshot, ba.horse_name_ar_snapshot, ba.horse_avatar_url_snapshot
          INTO v_snap_name, v_snap_name_ar, v_snap_avatar
        FROM boarding_admissions ba
        WHERE ba.tenant_id = p_tenant_id
          AND ba.horse_id  = p_horse_id
          AND ba.checked_out_at IS NULL
        ORDER BY ba.admitted_at DESC NULLS LAST
        LIMIT 1;

        IF v_snap_name IS NULL AND v_snap_name_ar IS NULL THEN
          SELECT h.name, h.name_ar, h.avatar_url
            INTO v_snap_name, v_snap_name_ar, v_snap_avatar
          FROM horses h
          WHERE h.id = p_horse_id;
        END IF;

        INSERT INTO housing_unit_occupants (
          tenant_id, unit_id, horse_id, since, is_demo,
          horse_name_snapshot, horse_name_ar_snapshot, horse_avatar_url_snapshot
        )
        VALUES (
          p_tenant_id, p_to_unit_id, p_horse_id, COALESCE(p_movement_at, now()), p_is_demo,
          v_snap_name, v_snap_name_ar, v_snap_avatar
        );
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

-- 3) Backfill snapshots for existing rows lacking them.
WITH best_admission AS (
  SELECT DISTINCT ON (o.id)
    o.id AS occ_id,
    ba.horse_name_snapshot,
    ba.horse_name_ar_snapshot,
    ba.horse_avatar_url_snapshot
  FROM housing_unit_occupants o
  JOIN boarding_admissions ba
    ON ba.tenant_id = o.tenant_id
   AND ba.horse_id  = o.horse_id
   AND ba.admitted_at <= COALESCE(o.until, now())
   AND (ba.checked_out_at IS NULL OR ba.checked_out_at >= o.since)
  WHERE o.horse_name_snapshot IS NULL
    AND o.horse_name_ar_snapshot IS NULL
    AND (ba.horse_name_snapshot IS NOT NULL OR ba.horse_name_ar_snapshot IS NOT NULL)
  ORDER BY o.id, ba.admitted_at DESC NULLS LAST
)
UPDATE housing_unit_occupants o
SET horse_name_snapshot        = ba.horse_name_snapshot,
    horse_name_ar_snapshot     = ba.horse_name_ar_snapshot,
    horse_avatar_url_snapshot  = COALESCE(o.horse_avatar_url_snapshot, ba.horse_avatar_url_snapshot)
FROM best_admission ba
WHERE o.id = ba.occ_id;

-- Fallback: copy from canonical horses where still null
UPDATE housing_unit_occupants o
SET horse_name_snapshot        = COALESCE(o.horse_name_snapshot, h.name),
    horse_name_ar_snapshot     = COALESCE(o.horse_name_ar_snapshot, h.name_ar),
    horse_avatar_url_snapshot  = COALESCE(o.horse_avatar_url_snapshot, h.avatar_url)
FROM horses h
WHERE h.id = o.horse_id
  AND (o.horse_name_snapshot IS NULL AND o.horse_name_ar_snapshot IS NULL);
