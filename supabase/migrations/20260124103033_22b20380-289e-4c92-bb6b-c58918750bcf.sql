-- Walk-in Client Support for Lab Samples + Safe Retest Handling

-- 1) Add walk-in client fields to lab_samples (mirrors walk-in horse pattern)
ALTER TABLE public.lab_samples 
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Add index for client lookups (tenant_id + client_id)
CREATE INDEX IF NOT EXISTS idx_lab_samples_client 
  ON public.lab_samples(tenant_id, client_id) 
  WHERE client_id IS NOT NULL;

-- 3) Update validate_lab_sample to handle walk-in client fields + fix retest_count double-increment risk
CREATE OR REPLACE FUNCTION public.validate_lab_sample()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  horse_tenant uuid;
  order_tenant uuid;
  client_tenant uuid;
  original_retest_count integer;
BEGIN
  -- Prevent tenant_id change
  IF TG_OP = 'UPDATE' AND OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id after creation';
  END IF;

  -- Validate horse: either horse_id belongs to tenant OR horse_name is provided for walk-in
  IF NEW.horse_id IS NOT NULL THEN
    SELECT tenant_id INTO horse_tenant FROM public.horses WHERE id = NEW.horse_id;
    IF horse_tenant IS NULL THEN
      RAISE EXCEPTION 'Horse not found';
    END IF;
    IF horse_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Horse does not belong to this tenant';
    END IF;
  ELSE
    IF NEW.horse_name IS NULL OR trim(NEW.horse_name) = '' THEN
      RAISE EXCEPTION 'Horse name is required for walk-in samples';
    END IF;
  END IF;

  -- Validate related_order_id if provided
  IF NEW.related_order_id IS NOT NULL THEN
    SELECT tenant_id INTO order_tenant FROM public.horse_orders WHERE id = NEW.related_order_id;
    IF order_tenant IS NULL THEN
      RAISE EXCEPTION 'Related order not found';
    END IF;
    IF order_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Related order does not belong to this tenant';
    END IF;
  END IF;

  -- Validate client_id if provided (registered client)
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO client_tenant FROM public.clients WHERE id = NEW.client_id;
    IF client_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF client_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
    -- Clear inline walk-in client fields when client_id is set (prevents duplication)
    NEW.client_name := NULL;
    NEW.client_phone := NULL;
    NEW.client_email := NULL;
    NEW.client_metadata := '{}'::jsonb;
  END IF;

  -- Retest count handling (IMPORTANT: avoid double increment on updates)
  IF NEW.retest_of_sample_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR (TG_OP = 'UPDATE' AND OLD.retest_of_sample_id IS DISTINCT FROM NEW.retest_of_sample_id))
  THEN
    SELECT retest_count INTO original_retest_count
    FROM public.lab_samples
    WHERE id = NEW.retest_of_sample_id;

    IF original_retest_count IS NOT NULL AND original_retest_count >= 3 THEN
      RAISE EXCEPTION 'Maximum retests (3) reached for this sample';
    END IF;

    UPDATE public.lab_samples
    SET retest_count = retest_count + 1
    WHERE id = NEW.retest_of_sample_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Ensure the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'validate_lab_sample_trigger'
  ) THEN
    CREATE TRIGGER validate_lab_sample_trigger
    BEFORE INSERT OR UPDATE ON public.lab_samples
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_lab_sample();
  END IF;
END;
$$;

-- 5) Add comments for documentation
COMMENT ON COLUMN public.lab_samples.client_name IS 'Walk-in client name (used when client_id is NULL)';
COMMENT ON COLUMN public.lab_samples.client_phone IS 'Walk-in client phone (used when client_id is NULL)';
COMMENT ON COLUMN public.lab_samples.client_email IS 'Walk-in client email (used when client_id is NULL)';
COMMENT ON COLUMN public.lab_samples.client_metadata IS 'Walk-in client additional metadata (notes, etc.)';