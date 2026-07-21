BEGIN;

INSERT INTO public.finance_invoice_number_config (tenant_id, domain, prefix, reset_policy, padding_width)
SELECT tenant_id,
       'manual',
       COALESCE( (SELECT substr(invoice_number, 1, 4)
                    FROM public.invoices i2
                   WHERE i2.tenant_id = t.tenant_id
                   GROUP BY substr(invoice_number, 1, 4)
                   ORDER BY count(*) DESC
                   LIMIT 1),
                 'INV-'),
       'never',
       4
  FROM (SELECT DISTINCT tenant_id FROM public.invoices) t
ON CONFLICT (tenant_id, domain) DO NOTHING;

WITH parsed AS (
  SELECT i.tenant_id,
         'manual'::text AS domain,
         CASE WHEN cfg.reset_policy = 'monthly'
              THEN COALESCE(
                     substring(i.invoice_number
                               FROM length(cfg.prefix) + 1 FOR 6),
                     '')
              ELSE ''
         END AS period_key,
         NULLIF(regexp_replace(
                  substr(i.invoice_number, length(cfg.prefix) + 1),
                  '[^0-9]', '', 'g'), '')::bigint AS parsed_num
    FROM public.invoices i
    JOIN public.finance_invoice_number_config cfg
      ON cfg.tenant_id = i.tenant_id AND cfg.domain = 'manual'
   WHERE i.invoice_number LIKE cfg.prefix || '%'
),
maxes AS (
  SELECT tenant_id, domain, period_key,
         COALESCE(max(parsed_num), 0) AS verified_max
    FROM parsed
   GROUP BY tenant_id, domain, period_key
)
INSERT INTO public.finance_invoice_number_counters
  (tenant_id, domain, period_key, next_value, updated_at)
SELECT tenant_id, domain, period_key, verified_max + 1, now()
  FROM maxes
ON CONFLICT (tenant_id, domain, period_key) DO NOTHING;

COMMIT;