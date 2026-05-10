
CREATE OR REPLACE VIEW public.vw_horse_lifecycle_state AS
WITH open_adm AS (
  SELECT DISTINCT ON (horse_id)
    horse_id,
    tenant_id,
    id AS admission_id,
    status,
    unit_id,
    admitted_at,
    checked_out_at
  FROM boarding_admissions
  WHERE status = ANY (ARRAY['draft','active','checkout_pending'])
  ORDER BY horse_id,
    CASE status WHEN 'active' THEN 1 WHEN 'checkout_pending' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END,
    admitted_at DESC NULLS LAST,
    created_at DESC
),
latest_mv AS (
  SELECT DISTINCT ON (horse_id)
    horse_id, tenant_id, movement_status, movement_subtype, movement_type, movement_at,
    id AS movement_id
  FROM horse_movements
  WHERE movement_status IS DISTINCT FROM 'cancelled'
  ORDER BY horse_id, movement_at DESC, created_at DESC
),
active_mv AS (
  SELECT DISTINCT ON (horse_id)
    horse_id, tenant_id, id AS movement_id, movement_status, movement_subtype
  FROM horse_movements
  WHERE movement_status = 'dispatched'
  ORDER BY horse_id, dispatched_at DESC NULLS LAST, movement_at DESC, created_at DESC
),
latest_completed_mv AS (
  SELECT DISTINCT ON (horse_id)
    horse_id, tenant_id, id AS movement_id, movement_status, movement_subtype, completed_at
  FROM horse_movements
  WHERE movement_status = 'completed'
  ORDER BY horse_id, completed_at DESC NULLS LAST, movement_at DESC, created_at DESC
),
next_sched AS (
  SELECT DISTINCT ON (horse_id)
    horse_id, tenant_id, id AS movement_id, movement_at
  FROM horse_movements
  WHERE movement_status = 'scheduled' AND movement_at >= now()
  ORDER BY horse_id, movement_at ASC, created_at ASC
)
SELECT
  h.id AS horse_id,
  h.tenant_id,
  oa.admission_id AS open_admission_id,
  oa.status AS open_admission_status,
  -- Existing booleans (corrected)
  (
    oa.admission_id IS NULL
    AND h.current_location_id IS NOT NULL
    AND COALESCE(h.status,'') NOT IN ('archived','sold','deceased','transferred','inactive')
    AND NOT (
      oa.admission_id IS NULL
      AND h.current_location_id IS NULL
      AND lcm.movement_subtype = 'checkout_departure'
    )
    AND NOT (am.movement_id IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM horse_movements m
      WHERE m.horse_id = h.id AND m.tenant_id = h.tenant_id
        AND m.movement_subtype = 'temporary_out'
        AND m.movement_status IN ('dispatched','completed')
        AND NOT EXISTS (
          SELECT 1 FROM horse_movements m2
          WHERE m2.horse_id = h.id AND m2.tenant_id = h.tenant_id
            AND m2.movement_status = 'completed'
            AND m2.movement_subtype IN ('return_from_temporary_out','checkout_departure')
            AND COALESCE(m2.completed_at, m2.movement_at, m2.created_at)
                > COALESCE(m.completed_at, m.movement_at, m.created_at)
        )
    )
  ) AS needs_admission,
  (
    oa.status IN ('active','checkout_pending')
    AND oa.unit_id IS NULL
    AND NOT (am.movement_id IS NOT NULL)
    AND NOT EXISTS (
      SELECT 1 FROM horse_movements m
      WHERE m.horse_id = h.id AND m.tenant_id = h.tenant_id
        AND m.movement_subtype = 'temporary_out'
        AND m.movement_status IN ('dispatched','completed')
        AND NOT EXISTS (
          SELECT 1 FROM horse_movements m2
          WHERE m2.horse_id = h.id AND m2.tenant_id = h.tenant_id
            AND m2.movement_status = 'completed'
            AND m2.movement_subtype IN ('return_from_temporary_out','checkout_departure')
            AND COALESCE(m2.completed_at, m2.movement_at, m2.created_at)
                > COALESCE(m.completed_at, m.movement_at, m.created_at)
        )
    )
  ) AS needs_placement,
  EXISTS (
    SELECT 1 FROM horse_movements m
    WHERE m.horse_id = h.id AND m.tenant_id = h.tenant_id
      AND m.movement_subtype = 'temporary_out'
      AND m.movement_status IN ('dispatched','completed')
      AND NOT EXISTS (
        SELECT 1 FROM horse_movements m2
        WHERE m2.horse_id = h.id AND m2.tenant_id = h.tenant_id
          AND m2.movement_status = 'completed'
          AND m2.movement_subtype IN ('return_from_temporary_out','checkout_departure')
          AND COALESCE(m2.completed_at, m2.movement_at, m2.created_at)
              > COALESCE(m.completed_at, m.movement_at, m.created_at)
      )
  ) AS is_temporarily_out,
  -- Legacy latest_movement_* preserved
  lm.movement_status AS latest_movement_status,
  lm.movement_subtype AS latest_movement_subtype,
  lm.movement_id AS latest_movement_id,
  -- New additive flags
  (oa.status IN ('active','checkout_pending') AND oa.unit_id IS NOT NULL) AS is_housed,
  (am.movement_id IS NOT NULL) AS is_in_transit,
  (
    oa.admission_id IS NULL
    AND h.current_location_id IS NULL
    AND lcm.movement_subtype = 'checkout_departure'
  ) AS is_departed,
  CASE
    WHEN oa.admission_id IS NULL
      AND h.current_location_id IS NULL
      AND lcm.movement_subtype = 'checkout_departure'
    THEN lcm.completed_at
    ELSE NULL
  END AS departed_at,
  am.movement_id AS active_movement_id,
  am.movement_status AS active_movement_status,
  am.movement_subtype AS active_movement_subtype,
  lcm.movement_id AS latest_completed_movement_id,
  lcm.movement_status AS latest_completed_movement_status,
  lcm.movement_subtype AS latest_completed_movement_subtype,
  ns.movement_id AS next_scheduled_movement_id,
  ns.movement_at AS next_scheduled_movement_at,
  (oa.status = 'draft') AS is_admission_draft
FROM horses h
LEFT JOIN open_adm oa ON oa.horse_id = h.id AND oa.tenant_id = h.tenant_id
LEFT JOIN latest_mv lm ON lm.horse_id = h.id AND lm.tenant_id = h.tenant_id
LEFT JOIN active_mv am ON am.horse_id = h.id AND am.tenant_id = h.tenant_id
LEFT JOIN latest_completed_mv lcm ON lcm.horse_id = h.id AND lcm.tenant_id = h.tenant_id
LEFT JOIN next_sched ns ON ns.horse_id = h.id AND ns.tenant_id = h.tenant_id;
