-- Phase 5.2 — Migration 1b: recompute functions (no triggers attached)

-- Request-level recompute: derives lab_requests.lab_decision from
-- the union of lab_request_services.service_decision values.
-- Idempotent and safe to rerun.
CREATE OR REPLACE FUNCTION public.fn_recompute_request_decision(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_accepted int;
  v_rejected int;
  v_pending int;
  v_new public.lab_request_decision;
  v_current public.lab_request_decision;
BEGIN
  IF p_request_id IS NULL THEN RETURN; END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE service_decision = 'accepted'),
    count(*) FILTER (WHERE service_decision = 'rejected'),
    count(*) FILTER (WHERE service_decision = 'pending' OR service_decision IS NULL)
  INTO v_total, v_accepted, v_rejected, v_pending
  FROM public.lab_request_services
  WHERE lab_request_id = p_request_id;

  -- If there are no service rows, do not override the request decision —
  -- the horse-level macro flow (Phase 5) is authoritative.
  IF v_total = 0 THEN
    RETURN;
  END IF;

  SELECT lab_decision INTO v_current
  FROM public.lab_requests
  WHERE id = p_request_id;

  -- Any service still pending → request stays pending_review (unless macro-rejected by operator)
  IF v_pending > 0 THEN
    -- Don't override an explicit operator macro rejection
    IF v_current = 'rejected' THEN RETURN; END IF;
    v_new := 'pending_review';
  ELSIF v_accepted = v_total THEN
    v_new := 'accepted';
  ELSIF v_rejected = v_total THEN
    v_new := 'rejected';
  ELSE
    v_new := 'partial';
  END IF;

  UPDATE public.lab_requests
  SET lab_decision = v_new,
      decided_at = COALESCE(decided_at, now()),
      updated_at = now()
  WHERE id = p_request_id
    AND lab_decision IS DISTINCT FROM v_new;

  -- Cascade: parent submission rollup (existing fn already handles 'partial' children
  -- since we are about to extend it in this same migration).
  PERFORM public.fn_recompute_submission_decision(
    (SELECT submission_id FROM public.lab_requests WHERE id = p_request_id)
  );
END;
$$;

-- Extend submission recompute: recognise 'partial' child requests.
CREATE OR REPLACE FUNCTION public.fn_recompute_submission_decision(p_submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_accepted int;
  v_rejected int;
  v_pending int;
  v_partial int;
  v_new public.lab_submission_decision;
BEGIN
  IF p_submission_id IS NULL THEN RETURN; END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE lab_decision = 'accepted'),
    count(*) FILTER (WHERE lab_decision = 'rejected'),
    count(*) FILTER (WHERE lab_decision = 'pending_review'),
    count(*) FILTER (WHERE lab_decision = 'partial')
  INTO v_total, v_accepted, v_rejected, v_pending, v_partial
  FROM public.lab_requests
  WHERE submission_id = p_submission_id;

  IF v_total = 0 THEN
    v_new := 'pending_review';
  ELSIF v_accepted = v_total THEN
    v_new := 'accepted';
  ELSIF v_rejected = v_total THEN
    v_new := 'rejected';
  ELSIF v_pending = v_total THEN
    v_new := 'pending_review';
  ELSE
    -- Any partial child, or a mix of accepted/rejected/pending → partial
    v_new := 'partial';
  END IF;

  UPDATE public.lab_submissions
  SET lab_decision = v_new, updated_at = now()
  WHERE id = p_submission_id AND lab_decision IS DISTINCT FROM v_new;
END;
$$;
