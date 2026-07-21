
-- Phase 1 · AML.1.b.1 · Invoice-integrity effective-date backfill (safe additive)
-- Scope: ledger_entries where entry_type='invoice' AND reference_type='invoice' AND effective_date IS NULL.
-- Source of truth: invoices.issue_date.
-- Idempotent: WHERE clause prevents re-application; no destructive change; column already exists (Stage 3).

UPDATE public.ledger_entries le
SET effective_date = i.issue_date
FROM public.invoices i
WHERE le.reference_id = i.id
  AND le.reference_type = 'invoice'
  AND le.entry_type     = 'invoice'
  AND le.effective_date IS NULL
  AND le.tenant_id      = i.tenant_id;

-- Supporting index for statement chronology (idempotent).
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant_effective_date
  ON public.ledger_entries (tenant_id, effective_date)
  WHERE effective_date IS NOT NULL;
