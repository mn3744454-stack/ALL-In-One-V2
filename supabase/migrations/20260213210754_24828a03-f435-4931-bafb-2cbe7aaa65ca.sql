
-- =======================================================
-- PHASE 1: Snapshot columns on lab_requests + bridge FK on lab_samples
-- =======================================================

-- 1.1 Snapshot columns on lab_requests
ALTER TABLE public.lab_requests
  ADD COLUMN IF NOT EXISTS horse_name_snapshot text,
  ADD COLUMN IF NOT EXISTS horse_name_ar_snapshot text,
  ADD COLUMN IF NOT EXISTS horse_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS initiator_tenant_name_snapshot text;

-- 1.2 Bridge FK: lab_samples.lab_request_id
ALTER TABLE public.lab_samples
  ADD COLUMN IF NOT EXISTS lab_request_id uuid
  REFERENCES public.lab_requests(id)
  ON DELETE SET NULL;

-- 1.3 Indexes
CREATE INDEX IF NOT EXISTS idx_lab_samples_lab_request_id
  ON public.lab_samples(lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_tenant_request
  ON public.lab_samples(tenant_id, lab_request_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_lab_tenant_created
  ON public.lab_requests(lab_tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lab_requests_tenant_created
  ON public.lab_requests(tenant_id, created_at);

-- =======================================================
-- PHASE 2: Daily numbering — number on accession only + deferred flag
-- =======================================================

ALTER TABLE public.lab_samples
  ADD COLUMN IF NOT EXISTS numbering_deferred boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lab_samples.numbering_deferred IS
'If true, daily_number assignment is deferred. When set to false and sample is already received/accessioned, trigger assigns daily_number on UPDATE.';

CREATE OR REPLACE FUNCTION public.set_daily_sample_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_effective_ts timestamptz;
  v_day date;
BEGIN
  IF NEW.daily_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.numbering_deferred, false) = true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT (
      NEW.status = 'accessioned'
      OR NEW.received_at IS NOT NULL
      OR NEW.received_by IS NOT NULL
    ) THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NOT (
      (NEW.status = 'accessioned' AND (OLD.status IS DISTINCT FROM 'accessioned'))
      OR (NEW.received_at IS NOT NULL AND OLD.received_at IS NULL)
      OR (NEW.received_by IS NOT NULL AND OLD.received_by IS NULL)
      OR (COALESCE(OLD.numbering_deferred, false) = true AND COALESCE(NEW.numbering_deferred, false) = false
          AND (NEW.status = 'accessioned' OR NEW.received_at IS NOT NULL OR NEW.received_by IS NOT NULL))
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  v_effective_ts := COALESCE(NEW.received_at, NEW.accessioned_at, NOW());
  v_day := DATE(v_effective_ts AT TIME ZONE '+03:00');

  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.tenant_id::text || ':' || v_day::text)
  );

  SELECT COALESCE(MAX(daily_number), 0) + 1
    INTO NEW.daily_number
  FROM public.lab_samples
  WHERE tenant_id = NEW.tenant_id
    AND DATE(COALESCE(received_at, accessioned_at, created_at) AT TIME ZONE '+03:00') = v_day;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_daily_sample_number ON public.lab_samples;
CREATE TRIGGER trg_set_daily_sample_number
  BEFORE INSERT OR UPDATE ON public.lab_samples
  FOR EACH ROW
  EXECUTE FUNCTION public.set_daily_sample_number();

-- 2.2 Lifecycle timestamps: also set completed_at
CREATE OR REPLACE FUNCTION public.set_sample_lifecycle_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accessioned'
     AND (OLD.status IS NULL OR OLD.status <> 'accessioned')
     AND NEW.accessioned_at IS NULL
  THEN
    NEW.accessioned_at := NOW();
  END IF;

  IF NEW.status = 'processing'
     AND (OLD.status IS NULL OR OLD.status <> 'processing')
     AND NEW.processing_started_at IS NULL
  THEN
    NEW.processing_started_at := NOW();
  END IF;

  IF NEW.status = 'completed'
     AND (OLD.status IS NULL OR OLD.status <> 'completed')
     AND NEW.completed_at IS NULL
  THEN
    NEW.completed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- =======================================================
-- PHASE 6: connection_messages table
-- =======================================================

CREATE TABLE IF NOT EXISTS public.connection_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id),
  sender_tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connection_messages_connection_created
  ON public.connection_messages(connection_id, created_at);

ALTER TABLE public.connection_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read connection messages"
  ON public.connection_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.connections c
      JOIN public.tenant_members tm
        ON tm.tenant_id IN (c.initiator_tenant_id, c.recipient_tenant_id)
      WHERE c.id = connection_messages.connection_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

CREATE POLICY "Users can send connection messages"
  ON public.connection_messages
  FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.connections c
      JOIN public.tenant_members tm
        ON tm.tenant_id IN (c.initiator_tenant_id, c.recipient_tenant_id)
      WHERE c.id = connection_messages.connection_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
        AND sender_tenant_id IN (c.initiator_tenant_id, c.recipient_tenant_id)
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'connection_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_messages';
  END IF;
END $$;
