CREATE OR REPLACE VIEW public.vw_horse_lifecycle_state AS
WITH latest_mv AS (
  SELECT DISTINCT ON (horse_movements.horse_id)
    horse_movements.horse_id,
    horse_movements.tenant_id,
    horse_movements.movement_status,
    horse_movements.movement_subtype,
    horse_movements.movement_type,
    horse_movements.movement_at,
    horse_movements.id AS movement_id
  FROM horse_movements
  WHERE horse_movements.movement_status IS DISTINCT FROM 'cancelled'
  ORDER BY horse_movements.horse_id, horse_movements.movement_at DESC, horse_movements.created_at DESC
), open_adm AS (
  SELECT boarding_admissions.horse_id,
         boarding_admissions.tenant_id,
         boarding_admissions.id AS admission_id,
         boarding_admissions.status,
         boarding_admissions.unit_id
  FROM boarding_admissions
  WHERE boarding_admissions.status = ANY (ARRAY['draft'::text, 'active'::text, 'checkout_pending'::text])
)
SELECT h.id AS horse_id,
       h.tenant_id,
       oa.admission_id AS open_admission_id,
       oa.status AS open_admission_status,
       oa.admission_id IS NULL AS needs_admission,
       oa.admission_id IS NOT NULL AND oa.unit_id IS NULL AS needs_placement,
       lm.movement_subtype = 'temporary_out'::text AND (lm.movement_status = ANY (ARRAY['dispatched'::text, 'completed'::text])) AS is_temporarily_out,
       lm.movement_status AS latest_movement_status,
       lm.movement_subtype AS latest_movement_subtype,
       lm.movement_id AS latest_movement_id
FROM horses h
LEFT JOIN open_adm oa ON oa.horse_id = h.id AND oa.tenant_id = h.tenant_id
LEFT JOIN latest_mv lm ON lm.horse_id = h.id AND lm.tenant_id = h.tenant_id;