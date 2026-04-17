-- Phase 5.2.2 — Migration 3: Backfill existing request-services into template children

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT lab_request_id, service_id, service_decision
    FROM public.lab_request_services
  LOOP
    -- Create child rows
    PERFORM public.fn_expand_service_templates(rec.lab_request_id, rec.service_id);

    -- Propagate existing service decision down to children if accepted/rejected
    IF rec.service_decision IN ('accepted', 'rejected') THEN
      UPDATE public.lab_request_service_templates
      SET template_decision = rec.service_decision::text::public.lab_template_decision,
          decided_at = COALESCE(decided_at, now())
      WHERE lab_request_id = rec.lab_request_id
        AND service_id = rec.service_id
        AND template_decision = 'pending';
    END IF;
  END LOOP;
END $$;

-- Recompute service decisions to verify roll-up — idempotent
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT lab_request_id, service_id
    FROM public.lab_request_service_templates
  LOOP
    PERFORM public.fn_recompute_service_decision(rec.lab_request_id, rec.service_id);
  END LOOP;
END $$;