-- Phase 5.2 — Migration 2: backfill → trigger → view (in this exact order)

-- STEP 1 — Backfill request decisions from existing service decisions.
-- Idempotent: only updates rows whose computed decision differs.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT lab_request_id
    FROM public.lab_request_services
    WHERE lab_request_id IS NOT NULL
  LOOP
    PERFORM public.fn_recompute_request_decision(r.lab_request_id);
  END LOOP;
END $$;

-- STEP 2 — Backfill submission decisions (now that requests reflect partial truth).
DO $$
DECLARE
  s record;
BEGIN
  FOR s IN
    SELECT id FROM public.lab_submissions
  LOOP
    PERFORM public.fn_recompute_submission_decision(s.id);
  END LOOP;
END $$;

-- STEP 3 — Attach the AFTER UPDATE trigger on lab_request_services.service_decision.
-- This is what wires the live derivation chain going forward.
CREATE OR REPLACE FUNCTION public.trg_lab_request_services_decision_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.service_decision IS DISTINCT FROM OLD.service_decision)
     OR (TG_OP = 'DELETE')
  THEN
    PERFORM public.fn_recompute_request_decision(
      COALESCE(NEW.lab_request_id, OLD.lab_request_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_request_services_decision_changed ON public.lab_request_services;
CREATE TRIGGER trg_lab_request_services_decision_changed
AFTER INSERT OR UPDATE OF service_decision OR DELETE
ON public.lab_request_services
FOR EACH ROW
EXECUTE FUNCTION public.trg_lab_request_services_decision_changed();

-- STEP 4 — Replace the stable-facing view to add the new outward state
-- 'partially_accepted' and lightweight service counts. Mapping rules:
--   partial + no specimen yet  → 'partially_accepted'   (NEW)
--   partial + specimen received → reuse 'in_progress'
--   partial + result published  → reuse 'result_available'
DROP VIEW IF EXISTS public.lab_requests_stable_view;
CREATE VIEW public.lab_requests_stable_view
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.tenant_id,
  r.initiator_tenant_id,
  r.lab_tenant_id,
  r.submission_id,
  r.horse_id,
  r.priority,
  r.requested_at,
  r.expected_by,
  r.received_at,
  r.result_url,
  r.rejection_reason,
  r.decided_at,
  r.specimen_received_at,
  r.lab_decision AS internal_decision,
  r.status AS internal_status,
  COALESCE(svc_counts.accepted_count, 0) AS accepted_service_count,
  COALESCE(svc_counts.rejected_count, 0) AS rejected_service_count,
  COALESCE(svc_counts.total_count, 0) AS total_service_count,
  CASE
    WHEN r.result_url IS NOT NULL
      OR r.status IN ('ready', 'received', 'result_published')
      THEN 'result_available'
    WHEN r.lab_decision = 'rejected' THEN 'rejected'
    WHEN r.lab_decision = 'partial' AND r.specimen_received_at IS NOT NULL THEN 'in_progress'
    WHEN r.lab_decision = 'partial' THEN 'partially_accepted'
    WHEN r.lab_decision = 'accepted' AND r.specimen_received_at IS NOT NULL THEN 'in_progress'
    WHEN r.lab_decision = 'accepted' THEN 'accepted'
    WHEN r.lab_decision = 'pending_review' THEN 'submitted'
    ELSE 'submitted'
  END AS stable_status
FROM public.lab_requests r
LEFT JOIN LATERAL (
  SELECT
    count(*) AS total_count,
    count(*) FILTER (WHERE service_decision = 'accepted') AS accepted_count,
    count(*) FILTER (WHERE service_decision = 'rejected') AS rejected_count
  FROM public.lab_request_services
  WHERE lab_request_id = r.id
) svc_counts ON true;
