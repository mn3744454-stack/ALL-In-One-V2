-- ============================================================
-- Phase 5: Laboratory Intake Decision Foundation
-- ============================================================

-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.lab_request_decision AS ENUM ('pending_review', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lab_submission_decision AS ENUM ('pending_review', 'accepted', 'rejected', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lab_service_decision AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) lab_requests intake fields
ALTER TABLE public.lab_requests
  ADD COLUMN IF NOT EXISTS lab_decision public.lab_request_decision NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS specimen_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS specimen_received_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_lab_requests_lab_decision ON public.lab_requests(lab_decision);
CREATE INDEX IF NOT EXISTS idx_lab_requests_specimen_received ON public.lab_requests(specimen_received_at) WHERE specimen_received_at IS NOT NULL;

-- 3) Relax status check to allow new operational states (additive)
ALTER TABLE public.lab_requests DROP CONSTRAINT IF EXISTS lab_requests_status_check;
ALTER TABLE public.lab_requests ADD CONSTRAINT lab_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text, 'sent'::text, 'processing'::text, 'ready'::text, 'received'::text, 'cancelled'::text,
    'accepted'::text, 'rejected'::text, 'awaiting_specimen'::text, 'specimen_received'::text, 'result_published'::text
  ]));

-- 4) lab_request_services seeded service-level decision (no UI in Phase 5)
ALTER TABLE public.lab_request_services
  ADD COLUMN IF NOT EXISTS service_decision public.lab_service_decision NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS service_rejection_reason text;

-- 5) lab_submissions derived parent decision
ALTER TABLE public.lab_submissions
  ADD COLUMN IF NOT EXISTS lab_decision public.lab_submission_decision NOT NULL DEFAULT 'pending_review';

CREATE INDEX IF NOT EXISTS idx_lab_submissions_lab_decision ON public.lab_submissions(lab_decision);

-- 6) Derivation function — recomputes parent from children
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
  v_new public.lab_submission_decision;
BEGIN
  IF p_submission_id IS NULL THEN RETURN; END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE lab_decision = 'accepted'),
    count(*) FILTER (WHERE lab_decision = 'rejected'),
    count(*) FILTER (WHERE lab_decision = 'pending_review')
  INTO v_total, v_accepted, v_rejected, v_pending
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
    v_new := 'partial';
  END IF;

  UPDATE public.lab_submissions
  SET lab_decision = v_new, updated_at = now()
  WHERE id = p_submission_id AND lab_decision IS DISTINCT FROM v_new;
END;
$$;

-- 7) Trigger on lab_requests to keep parent in sync
CREATE OR REPLACE FUNCTION public.fn_lab_requests_decision_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_recompute_submission_decision(OLD.submission_id);
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  IF TG_OP = 'UPDATE' AND OLD.submission_id IS DISTINCT FROM NEW.submission_id THEN
    PERFORM public.fn_recompute_submission_decision(OLD.submission_id);
  END IF;

  PERFORM public.fn_recompute_submission_decision(NEW.submission_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_requests_decision_sync ON public.lab_requests;
CREATE TRIGGER trg_lab_requests_decision_sync
AFTER INSERT OR UPDATE OF lab_decision, submission_id OR DELETE
ON public.lab_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_lab_requests_decision_sync();

-- 8) Stable-visible mapped view
CREATE OR REPLACE VIEW public.lab_requests_stable_view AS
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
  CASE
    WHEN r.result_url IS NOT NULL OR r.status IN ('ready', 'received', 'result_published') THEN 'result_available'
    WHEN r.lab_decision = 'rejected' THEN 'rejected'
    WHEN r.lab_decision = 'accepted' AND r.specimen_received_at IS NOT NULL THEN 'in_progress'
    WHEN r.lab_decision = 'accepted' THEN 'accepted'
    WHEN r.lab_decision = 'pending_review' THEN 'submitted'
    ELSE 'submitted'
  END AS stable_status
FROM public.lab_requests r;

GRANT SELECT ON public.lab_requests_stable_view TO authenticated;

-- 9) Backfill: recompute every existing submission's decision
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.lab_submissions LOOP
    PERFORM public.fn_recompute_submission_decision(r.id);
  END LOOP;
END $$;