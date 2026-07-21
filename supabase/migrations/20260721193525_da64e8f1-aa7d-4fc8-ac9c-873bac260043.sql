BEGIN;

CREATE TABLE public.finance_invoice_number_config (
  tenant_id       uuid   NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain          text   NOT NULL,
  prefix          text   NOT NULL,
  reset_policy    text   NOT NULL CHECK (reset_policy IN ('never','monthly')),
  padding_width   int    NOT NULL CHECK (padding_width BETWEEN 1 AND 12),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain),
  CHECK (domain IN ('manual','pos','housing','lab','doctor','vet','vaccination','breeding'))
);

GRANT SELECT ON public.finance_invoice_number_config TO authenticated;
GRANT ALL    ON public.finance_invoice_number_config TO service_role;

ALTER TABLE public.finance_invoice_number_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_invoice_number_config_read
  ON public.finance_invoice_number_config FOR SELECT
  TO authenticated
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE TABLE public.finance_invoice_number_counters (
  tenant_id   uuid   NOT NULL,
  domain      text   NOT NULL,
  period_key  text   NOT NULL,
  next_value  bigint NOT NULL CHECK (next_value >= 1),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, domain, period_key),
  FOREIGN KEY (tenant_id, domain)
    REFERENCES public.finance_invoice_number_config (tenant_id, domain)
    ON DELETE CASCADE
);

GRANT SELECT ON public.finance_invoice_number_counters TO authenticated;
GRANT ALL    ON public.finance_invoice_number_counters TO service_role;

ALTER TABLE public.finance_invoice_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_invoice_number_counters_read
  ON public.finance_invoice_number_counters FOR SELECT
  TO authenticated
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

COMMIT;