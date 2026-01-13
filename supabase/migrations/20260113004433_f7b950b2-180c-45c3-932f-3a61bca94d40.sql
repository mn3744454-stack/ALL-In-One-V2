-- =============================================
-- POS Phase 1-2: Sessions + Invoice Extensions + RLS
-- =============================================

-- 1.1) Create pos_sessions table
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    opened_by UUID NOT NULL REFERENCES auth.users(id),
    closed_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    cash_variance NUMERIC(12, 2),
    notes TEXT,
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for pos_sessions
CREATE INDEX IF NOT EXISTS idx_pos_sessions_tenant ON public.pos_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON public.pos_sessions(tenant_id, opened_at DESC);

-- Unique constraint: only one open session per tenant+branch
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_sessions_one_open_per_branch
ON public.pos_sessions(tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE status = 'open';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_pos_sessions_updated_at ON public.pos_sessions;
CREATE TRIGGER update_pos_sessions_updated_at
BEFORE UPDATE ON public.pos_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2) RLS for pos_sessions
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view POS sessions" ON public.pos_sessions;
CREATE POLICY "Tenant members can view POS sessions"
ON public.pos_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = pos_sessions.tenant_id
          AND tm.user_id = auth.uid()
          AND tm.is_active = true
    )
);

DROP POLICY IF EXISTS "Managers can create POS sessions" ON public.pos_sessions;
CREATE POLICY "Managers can create POS sessions"
ON public.pos_sessions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = pos_sessions.tenant_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'manager')
          AND tm.is_active = true
    )
);

DROP POLICY IF EXISTS "Managers can update POS sessions" ON public.pos_sessions;
CREATE POLICY "Managers can update POS sessions"
ON public.pos_sessions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = pos_sessions.tenant_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'manager')
          AND tm.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = pos_sessions.tenant_id
          AND tm.user_id = auth.uid()
          AND tm.role IN ('owner', 'manager')
          AND tm.is_active = true
    )
);

-- 1.3) Alter invoices for POS fields
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP WITH TIME ZONE;

-- Index for POS session invoices
CREATE INDEX IF NOT EXISTS idx_invoices_pos_session
ON public.invoices(pos_session_id)
WHERE pos_session_id IS NOT NULL;

-- 1.4) Add unit_price and name_ar to tenant_services
ALTER TABLE public.tenant_services 
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Backfill unit_price from price_display if numeric
UPDATE public.tenant_services
SET unit_price = NULLIF(regexp_replace(price_display, '[^0-9.]', '', 'g'), '')::numeric
WHERE unit_price IS NULL
  AND price_display IS NOT NULL
  AND regexp_replace(price_display, '[^0-9.]', '', 'g') ~ '^[0-9]+\.?[0-9]*$';

-- 1.5) RLS for ledger_entries (ensure proper policies exist)
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view ledger entries" ON public.ledger_entries;
CREATE POLICY "Tenant members can view ledger entries"
ON public.ledger_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = ledger_entries.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

DROP POLICY IF EXISTS "Managers can create ledger entries" ON public.ledger_entries;
CREATE POLICY "Managers can create ledger entries"
ON public.ledger_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = ledger_entries.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'manager')
      AND tm.is_active = true
  )
);