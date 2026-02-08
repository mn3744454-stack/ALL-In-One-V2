-- ============================================================
-- Ledger-derived balances + Lab horses linkage
-- ============================================================

-- ============================================================
-- PHASE 1: Ledger-derived balances (VIEW)
-- Using SUM(amount) approach for balance calculation
-- security_invoker ensures RLS is applied on ledger_entries
-- ============================================================

CREATE OR REPLACE VIEW public.v_customer_ledger_balances
WITH (security_invoker = on) AS
SELECT
  le.tenant_id,
  le.client_id,
  COALESCE(SUM(le.amount), 0) AS balance,
  MAX(le.created_at) AS last_entry_at
FROM public.ledger_entries le
WHERE le.client_id IS NOT NULL
GROUP BY le.tenant_id, le.client_id;

-- Grant access (view honors RLS due to security_invoker)
GRANT SELECT ON public.v_customer_ledger_balances TO authenticated;

-- Index for better query performance on the view
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_client_created
  ON public.ledger_entries(tenant_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

-- ============================================================
-- PHASE 2: Lab horses linkage (10.1 + 7.3)
-- - client_id for filtering lab horses by client
-- - owner_email for Owner Quick View enhancement
-- ============================================================

ALTER TABLE public.lab_horses
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_email text;

-- Index for efficient filtering by client within tenant
CREATE INDEX IF NOT EXISTS idx_lab_horses_tenant_client
  ON public.lab_horses(tenant_id, client_id)
  WHERE client_id IS NOT NULL;