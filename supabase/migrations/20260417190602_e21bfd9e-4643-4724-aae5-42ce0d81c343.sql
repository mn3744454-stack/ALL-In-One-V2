-- Phase 7 — Results Coherence: Schema, gates, backfill, and progress view

-- 7.A.1: Add authoritative FK from result to the accepted template-decision row
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS lab_request_service_template_id uuid;

-- 7.A.2: Backfill via sample.lab_request_id + template_id (subquery form)
UPDATE public.lab_results r
SET lab_request_service_template_id = sub.lrst_id
FROM (
  SELECT
    res.id AS result_id,
    lrst.id AS lrst_id
  FROM public.lab_results res
  JOIN public.lab_samples s ON s.id = res.sample_id
  JOIN public.lab_request_service_templates lrst
    ON lrst.lab_request_id = s.lab_request_id
   AND lrst.template_id = res.template_id
  WHERE res.lab_request_service_template_id IS NULL
) sub
WHERE r.id = sub.result_id;

-- 7.A.3: Add the FK constraint (nullable so legacy orphans survive)
ALTER TABLE public.lab_results
  DROP CONSTRAINT IF EXISTS lab_results_lab_request_service_template_id_fkey;
ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_lab_request_service_template_id_fkey
  FOREIGN KEY (lab_request_service_template_id)
  REFERENCES public.lab_request_service_templates(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_lrst
  ON public.lab_results(lab_request_service_template_id);

-- 7.A.4: Uniqueness — prevent duplicate results for same (sample_id, template_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_lab_results_sample_template
  ON public.lab_results(sample_id, template_id);

-- 7.A.5: Eligibility gate — block result insert if matching template-decision is not 'accepted'
CREATE OR REPLACE FUNCTION public.validate_lab_result_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
  v_lrst_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.sample_id = OLD.sample_id
     AND NEW.template_id = OLD.template_id THEN
    RETURN NEW;
  END IF;

  SELECT lrst.id, lrst.template_decision::text
    INTO v_lrst_id, v_decision
  FROM public.lab_samples s
  JOIN public.lab_request_service_templates lrst
    ON lrst.lab_request_id = s.lab_request_id
   AND lrst.template_id = NEW.template_id
  WHERE s.id = NEW.sample_id
  LIMIT 1;

  IF v_lrst_id IS NOT NULL THEN
    IF v_decision <> 'accepted' THEN
      RAISE EXCEPTION 'Cannot create result: template not accepted (decision=%)', v_decision
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.lab_request_service_template_id IS NULL THEN
      NEW.lab_request_service_template_id := v_lrst_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lab_result_eligibility ON public.lab_results;
CREATE TRIGGER trg_validate_lab_result_eligibility
BEFORE INSERT OR UPDATE OF sample_id, template_id ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_result_eligibility();

-- 7.A.6: Publication gate — only allow published_to_stable=true when status='final'
CREATE OR REPLACE FUNCTION public.validate_lab_result_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published_to_stable = true
     AND (TG_OP = 'INSERT' OR OLD.published_to_stable = false) THEN
    IF NEW.status <> 'final' THEN
      RAISE EXCEPTION 'Cannot publish result: status must be final (current=%)', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lab_result_publish ON public.lab_results;
CREATE TRIGGER trg_validate_lab_result_publish
BEFORE INSERT OR UPDATE OF published_to_stable, status ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_result_publish();

-- 7.A.7: Progress derivation view — per request
CREATE OR REPLACE VIEW public.vw_lab_result_progress AS
WITH per_request AS (
  SELECT
    lrst.lab_request_id,
    lrst.tenant_id,
    COUNT(*) FILTER (WHERE lrst.template_decision = 'accepted') AS accepted_templates_count,
    COUNT(DISTINCT r.id) FILTER (WHERE lrst.template_decision = 'accepted' AND r.id IS NOT NULL) AS results_count,
    COUNT(DISTINCT r.id) FILTER (WHERE lrst.template_decision = 'accepted' AND r.status = 'final') AS final_results_count,
    COUNT(DISTINCT r.id) FILTER (WHERE lrst.template_decision = 'accepted' AND r.published_to_stable = true) AS published_results_count
  FROM public.lab_request_service_templates lrst
  LEFT JOIN public.lab_samples s
    ON s.lab_request_id = lrst.lab_request_id
  LEFT JOIN public.lab_results r
    ON r.sample_id = s.id
   AND r.template_id = lrst.template_id
  GROUP BY lrst.lab_request_id, lrst.tenant_id
)
SELECT
  pr.lab_request_id,
  pr.tenant_id,
  pr.accepted_templates_count,
  pr.results_count,
  pr.final_results_count,
  pr.published_results_count,
  CASE
    WHEN pr.accepted_templates_count = 0 THEN 'no_accepted'
    WHEN pr.published_results_count = 0 AND pr.results_count = 0 THEN 'none'
    WHEN pr.published_results_count >= pr.accepted_templates_count THEN 'all_published'
    WHEN pr.published_results_count > 0 THEN 'partial_published'
    WHEN pr.results_count >= pr.accepted_templates_count THEN 'all_resulted'
    ELSE 'partial_resulted'
  END AS progress_state
FROM per_request pr;

GRANT SELECT ON public.vw_lab_result_progress TO authenticated;