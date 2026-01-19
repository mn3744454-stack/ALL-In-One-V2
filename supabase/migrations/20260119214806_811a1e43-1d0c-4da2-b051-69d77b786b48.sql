-- Fix validate_lab_sample trigger to allow NULL horse_id for walk-in samples
-- When horse_id IS NULL, we require horse_name to be present instead

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
    -- Internal horse: validate belongs to tenant
    SELECT tenant_id INTO horse_tenant FROM public.horses WHERE id = NEW.horse_id;
    IF horse_tenant IS NULL THEN
      RAISE EXCEPTION 'Horse not found';
    END IF;
    IF horse_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Horse does not belong to this tenant';
    END IF;
  ELSE
    -- Walk-in horse: require horse_name
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

  -- Validate client_id if provided
  IF NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO client_tenant FROM public.clients WHERE id = NEW.client_id;
    IF client_tenant IS NULL THEN
      RAISE EXCEPTION 'Client not found';
    END IF;
    IF client_tenant != NEW.tenant_id THEN
      RAISE EXCEPTION 'Client does not belong to this tenant';
    END IF;
  END IF;

  -- Track retest count (using trigger since computed column isn't available)
  IF NEW.retest_of_sample_id IS NOT NULL THEN
    -- Get the count of existing retests for the original sample
    SELECT retest_count INTO original_retest_count 
    FROM public.lab_samples 
    WHERE id = NEW.retest_of_sample_id;
    
    IF original_retest_count IS NOT NULL AND original_retest_count >= 3 THEN
      RAISE EXCEPTION 'Maximum retests (3) reached for this sample';
    END IF;
    
    -- Increment the retest count on the original sample
    UPDATE public.lab_samples 
    SET retest_count = retest_count + 1 
    WHERE id = NEW.retest_of_sample_id;
  END IF;

  RETURN NEW;
END;
$$;