
CREATE OR REPLACE FUNCTION public.fn_populate_lrs_service_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_lab_tenant_id uuid;
  v_name text;
  v_name_ar text;
  v_code text;
  v_template_ids uuid[];
  v_sum_base_price numeric := 0;
  v_unit_price numeric;
  v_currency text;
  v_pricing_mode text;
  v_override_price numeric;
  v_discount_type text;
  v_discount_value numeric;
  v_legacy_price numeric;
  v_svc_currency text;
BEGIN
  -- Early exit only if ALL snapshot fields (name + pricing) are non-NULL
  IF NEW.service_name_snapshot IS NOT NULL
     AND NEW.service_code_snapshot IS NOT NULL
     AND NEW.service_name_ar_snapshot IS NOT NULL
     AND NEW.template_ids_snapshot IS NOT NULL
     AND NEW.unit_price_snapshot IS NOT NULL
     AND NEW.currency_snapshot IS NOT NULL
     AND NEW.pricing_rule_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve lab_tenant_id from parent request
  SELECT r.lab_tenant_id
    INTO v_lab_tenant_id
  FROM public.lab_requests r
  WHERE r.id = NEW.lab_request_id
  LIMIT 1;

  IF v_lab_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot resolve lab_tenant_id for lab_request %', NEW.lab_request_id;
  END IF;

  -- Fetch service details (name + pricing config)
  SELECT ls.name, ls.name_ar, ls.code,
         ls.pricing_mode, ls.override_price, ls.discount_type, ls.discount_value,
         ls.currency, ls.price
    INTO v_name, v_name_ar, v_code,
         v_pricing_mode, v_override_price, v_discount_type, v_discount_value,
         v_svc_currency, v_legacy_price
  FROM public.lab_services ls
  WHERE ls.id = NEW.service_id
    AND ls.tenant_id = v_lab_tenant_id
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Service % not found for lab tenant %', NEW.service_id, v_lab_tenant_id;
  END IF;

  -- Populate name snapshots
  NEW.service_name_snapshot := COALESCE(NEW.service_name_snapshot, v_name);
  NEW.service_name_ar_snapshot := COALESCE(NEW.service_name_ar_snapshot, v_name_ar);
  NEW.service_code_snapshot := COALESCE(NEW.service_code_snapshot, v_code);

  -- Skip pricing computation if all pricing fields already provided
  IF NEW.template_ids_snapshot IS NOT NULL
     AND NEW.unit_price_snapshot IS NOT NULL
     AND NEW.currency_snapshot IS NOT NULL
     AND NEW.pricing_rule_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve template IDs for this service (scoped to lab tenant)
  SELECT array_agg(st.template_id ORDER BY st.created_at)
    INTO v_template_ids
  FROM public.lab_service_templates st
  WHERE st.service_id = NEW.service_id
    AND st.tenant_id = v_lab_tenant_id;

  IF v_template_ids IS NULL THEN
    v_template_ids := ARRAY[]::uuid[];
  END IF;

  -- Compute base price sum from templates (scoped to lab tenant)
  SELECT COALESCE(SUM((lt.pricing->>'base_price')::numeric), 0)
    INTO v_sum_base_price
  FROM public.lab_templates lt
  WHERE lt.id = ANY(v_template_ids)
    AND lt.tenant_id = v_lab_tenant_id
    AND (lt.pricing->>'base_price') IS NOT NULL;

  -- Compute unit price
  IF COALESCE(v_pricing_mode, 'sum_templates') = 'override' AND v_override_price IS NOT NULL THEN
    v_unit_price := v_override_price;
  ELSE
    v_unit_price := v_sum_base_price;
    -- Fallback to legacy price field if templates yielded 0
    IF (v_unit_price IS NULL OR v_unit_price = 0) AND v_legacy_price IS NOT NULL THEN
      v_unit_price := v_legacy_price;
    END IF;
    -- Apply discount ONLY for sum_templates unless your business rules say otherwise
    IF v_unit_price IS NOT NULL AND v_discount_type IS NOT NULL AND v_discount_value IS NOT NULL THEN
      IF v_discount_type = 'percentage' THEN
        v_unit_price := GREATEST(0, v_unit_price * (1 - v_discount_value / 100));
      ELSIF v_discount_type = 'fixed' THEN
        v_unit_price := GREATEST(0, v_unit_price - v_discount_value);
      END IF;
    END IF;
  END IF;

  -- Determine currency (prefer service currency)
  v_currency := COALESCE(v_svc_currency, 'SAR');

  -- Write pricing snapshots via COALESCE
  NEW.template_ids_snapshot := COALESCE(NEW.template_ids_snapshot, v_template_ids);
  NEW.unit_price_snapshot := COALESCE(NEW.unit_price_snapshot, v_unit_price);
  NEW.currency_snapshot := COALESCE(NEW.currency_snapshot, v_currency);
  NEW.pricing_rule_snapshot := COALESCE(NEW.pricing_rule_snapshot, jsonb_build_object(
    'mode', COALESCE(v_pricing_mode, 'sum_templates'),
    'override_price', v_override_price,
    'discount_type', v_discount_type,
    'discount_value', v_discount_value,
    'template_ids', v_template_ids,
    'sum_base_price', v_sum_base_price,
    'computed_unit_price', v_unit_price,
    'currency', v_currency,
    'computed_at', now()
  ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_populate_lrs_service_snapshots() FROM PUBLIC;
