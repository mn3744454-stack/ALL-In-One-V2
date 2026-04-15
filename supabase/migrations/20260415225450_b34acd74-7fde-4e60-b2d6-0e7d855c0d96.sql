
-- ============================================================
-- Phase 1: lab_submissions parent-child architecture
-- ============================================================

-- 1) Create lab_submissions table
CREATE TABLE public.lab_submissions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES public.tenants(id),
  initiator_tenant_id         uuid REFERENCES public.tenants(id),
  lab_tenant_id               uuid REFERENCES public.tenants(id),
  external_lab_name           text,
  priority                    text NOT NULL DEFAULT 'normal',
  notes                       text,
  description                 text,
  status                      text NOT NULL DEFAULT 'pending',
  requested_at                timestamptz NOT NULL DEFAULT now(),
  expected_by                 date,
  created_by                  uuid NOT NULL,
  initiator_tenant_name_snapshot text,
  is_demo                     boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lab_submissions_tenant ON public.lab_submissions(tenant_id);
CREATE INDEX idx_lab_submissions_initiator ON public.lab_submissions(initiator_tenant_id) WHERE initiator_tenant_id IS NOT NULL;
CREATE INDEX idx_lab_submissions_lab ON public.lab_submissions(lab_tenant_id) WHERE lab_tenant_id IS NOT NULL;
CREATE INDEX idx_lab_submissions_status ON public.lab_submissions(status);

-- RLS
ALTER TABLE public.lab_submissions ENABLE ROW LEVEL SECURITY;

-- Initiator tenant can view own submissions
CREATE POLICY "Initiator tenant can view own submissions"
  ON public.lab_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Initiator tenant can create submissions
CREATE POLICY "Initiator tenant can create submissions"
  ON public.lab_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Lab tenant can view incoming submissions
CREATE POLICY "Lab tenant can view incoming submissions"
  ON public.lab_submissions FOR SELECT
  USING (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Lab tenant can update incoming submissions
CREATE POLICY "Lab tenant can update incoming submissions"
  ON public.lab_submissions FOR UPDATE
  USING (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Initiator tenant can delete own submissions (only pending)
CREATE POLICY "Initiator tenant can delete own submissions"
  ON public.lab_submissions FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_submissions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Grants
REVOKE ALL ON TABLE public.lab_submissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lab_submissions TO authenticated;

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_lab_submissions_updated_at
  BEFORE UPDATE ON public.lab_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Immutable guard for lab_submissions
CREATE OR REPLACE FUNCTION public.lab_submissions_immutable_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id on lab_submissions';
  END IF;
  IF NEW.initiator_tenant_id IS DISTINCT FROM OLD.initiator_tenant_id THEN
    RAISE EXCEPTION 'Cannot change initiator_tenant_id on lab_submissions';
  END IF;
  IF NEW.lab_tenant_id IS DISTINCT FROM OLD.lab_tenant_id THEN
    RAISE EXCEPTION 'Cannot change lab_tenant_id on lab_submissions';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot change created_by on lab_submissions';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot change created_at on lab_submissions';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lab_submissions_immutable_guard
  BEFORE UPDATE ON public.lab_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.lab_submissions_immutable_guard();

-- 2) Add submission_id FK to lab_requests
ALTER TABLE public.lab_requests
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.lab_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_requests_submission
  ON public.lab_requests(submission_id) WHERE submission_id IS NOT NULL;

-- 3) Add submission_id FK to lab_request_messages
ALTER TABLE public.lab_request_messages
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.lab_submissions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lab_request_messages_submission
  ON public.lab_request_messages(submission_id, created_at ASC) WHERE submission_id IS NOT NULL;

-- 4) Update get_lab_request_threads RPC to support submission-level threads
DROP FUNCTION IF EXISTS public.get_lab_request_threads();

CREATE FUNCTION public.get_lab_request_threads()
RETURNS TABLE (
  request_id uuid,
  submission_id uuid,
  horse_name text,
  horse_name_ar text,
  test_description text,
  last_message_body text,
  last_message_at timestamptz,
  last_sender_tenant_id uuid,
  message_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Submission-level threads (new architecture)
  SELECT
    NULL::uuid AS request_id,
    ls.id AS submission_id,
    COALESCE(
      (SELECT string_agg(DISTINCT h.name, ', ' ORDER BY h.name)
       FROM lab_requests lr2
       JOIN horses h ON h.id = lr2.horse_id
       WHERE lr2.submission_id = ls.id),
      ls.description
    ) AS horse_name,
    (SELECT string_agg(DISTINCT h.name_ar, ', ' ORDER BY h.name_ar)
     FROM lab_requests lr2
     JOIN horses h ON h.id = lr2.horse_id
     WHERE lr2.submission_id = ls.id
       AND h.name_ar IS NOT NULL) AS horse_name_ar,
    COALESCE(ls.description, '') AS test_description,
    lm.body AS last_message_body,
    lm.created_at AS last_message_at,
    lm.sender_tenant_id AS last_sender_tenant_id,
    (SELECT count(*) FROM lab_request_messages WHERE submission_id = ls.id) AS message_count
  FROM lab_submissions ls
  JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_tenant_id
    FROM lab_request_messages m
    WHERE m.submission_id = ls.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.tenant_id = ls.tenant_id OR tm.tenant_id = ls.lab_tenant_id)
  )

  UNION ALL

  -- Legacy request-level threads (backward compatibility for messages without submission_id)
  SELECT
    lr.id AS request_id,
    NULL::uuid AS submission_id,
    h.name AS horse_name,
    h.name_ar AS horse_name_ar,
    lr.test_description,
    lm.body AS last_message_body,
    lm.created_at AS last_message_at,
    lm.sender_tenant_id AS last_sender_tenant_id,
    (SELECT count(*) FROM lab_request_messages WHERE request_id = lr.id AND submission_id IS NULL) AS message_count
  FROM lab_requests lr
  JOIN horses h ON h.id = lr.horse_id
  JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_tenant_id
    FROM lab_request_messages m
    WHERE m.request_id = lr.id AND m.submission_id IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  WHERE lr.submission_id IS NULL
    AND EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.is_active = true
        AND (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
    )

  ORDER BY last_message_at DESC
  LIMIT 50;
$$;

-- 5) Add RLS for messages with submission_id
-- Update existing SELECT policy to also allow access via submission membership
DROP POLICY IF EXISTS "Members of request tenants can view messages" ON public.lab_request_messages;
CREATE POLICY "Members of request tenants can view messages"
  ON public.lab_request_messages FOR SELECT
  USING (
    -- Legacy: via request tenant membership
    (request_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lab_requests lr
      JOIN public.tenant_members tm ON (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
      WHERE lr.id = lab_request_messages.request_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    ))
    OR
    -- New: via submission tenant membership
    (submission_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.lab_submissions ls
      JOIN public.tenant_members tm ON (tm.tenant_id = ls.tenant_id OR tm.tenant_id = ls.lab_tenant_id)
      WHERE ls.id = lab_request_messages.submission_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    ))
  );

DROP POLICY IF EXISTS "Members of request tenants can send messages" ON public.lab_request_messages;
CREATE POLICY "Members of request tenants can send messages"
  ON public.lab_request_messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      -- Legacy: via request
      (request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.lab_requests lr
        JOIN public.tenant_members tm ON (tm.tenant_id = lr.tenant_id OR tm.tenant_id = lr.lab_tenant_id)
        WHERE lr.id = lab_request_messages.request_id
          AND tm.user_id = auth.uid()
          AND tm.is_active = true
      ))
      OR
      -- New: via submission
      (submission_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.lab_submissions ls
        JOIN public.tenant_members tm ON (tm.tenant_id = ls.tenant_id OR tm.tenant_id = ls.lab_tenant_id)
        WHERE ls.id = lab_request_messages.submission_id
          AND tm.user_id = auth.uid()
          AND tm.is_active = true
      ))
    )
  );
