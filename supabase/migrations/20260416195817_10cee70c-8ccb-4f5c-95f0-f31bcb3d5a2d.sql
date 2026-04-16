-- Recreate view with security_invoker so RLS of caller applies
DROP VIEW IF EXISTS public.lab_requests_stable_view;
CREATE VIEW public.lab_requests_stable_view
WITH (security_invoker = true) AS
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

-- Functions already had SET search_path = public; the linter still flags them. Re-declare with ALTER for safety.
ALTER FUNCTION public.fn_recompute_submission_decision(uuid) SET search_path = public;
ALTER FUNCTION public.fn_lab_requests_decision_sync() SET search_path = public;