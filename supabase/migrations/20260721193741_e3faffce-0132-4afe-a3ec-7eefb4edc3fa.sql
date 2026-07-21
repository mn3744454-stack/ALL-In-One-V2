CREATE OR REPLACE FUNCTION public._finance_invoice_number_next(
  p_tenant_id uuid,
  p_domain    text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cfg          public.finance_invoice_number_config%ROWTYPE;
  v_business_dt  date;
  v_period       text;
  v_next         bigint;
  v_number       text;
  v_attempt      int := 0;
BEGIN
  IF p_tenant_id IS NULL OR p_domain IS NULL THEN
    RAISE EXCEPTION 'FIN_INVOICE_NUMBER_BAD_ARGS' USING ERRCODE = '22023';
  END IF;

  v_business_dt := (now() AT TIME ZONE 'Asia/Riyadh')::date;

  SELECT * INTO v_cfg
    FROM public.finance_invoice_number_config
   WHERE tenant_id = p_tenant_id AND domain = p_domain;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIN_INVOICE_NUMBER_CONFIG_MISSING' USING ERRCODE = 'P0002';
  END IF;

  v_period := CASE v_cfg.reset_policy
                WHEN 'monthly' THEN to_char(v_business_dt, 'YYYYMM')
                ELSE ''
              END;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::text || '|' || p_domain || '|' || v_period, 0)
  );

  INSERT INTO public.finance_invoice_number_counters
    (tenant_id, domain, period_key, next_value, updated_at)
  VALUES
    (p_tenant_id, p_domain, v_period, 1, now())
  ON CONFLICT (tenant_id, domain, period_key)
  DO UPDATE SET
    next_value = public.finance_invoice_number_counters.next_value + 1,
    updated_at = now()
  RETURNING next_value INTO v_next;

  v_number := v_cfg.prefix
           || CASE WHEN v_cfg.reset_policy = 'monthly' THEN v_period || '-' ELSE '' END
           || lpad(v_next::text, v_cfg.padding_width, '0');

  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
       WHERE tenant_id = p_tenant_id AND invoice_number = v_number
    ) THEN
      RETURN v_number;
    END IF;
    v_attempt := v_attempt + 1;
    IF v_attempt >= 5 THEN
      RAISE EXCEPTION 'FIN_INVOICE_NUMBER_COLLISION' USING ERRCODE = '23505';
    END IF;
    UPDATE public.finance_invoice_number_counters
       SET next_value = next_value + 1, updated_at = now()
     WHERE tenant_id = p_tenant_id AND domain = p_domain AND period_key = v_period
     RETURNING next_value INTO v_next;
    v_number := v_cfg.prefix
             || CASE WHEN v_cfg.reset_policy = 'monthly' THEN v_period || '-' ELSE '' END
             || lpad(v_next::text, v_cfg.padding_width, '0');
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION public._finance_invoice_number_next(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._finance_invoice_number_next(uuid, text) TO service_role;