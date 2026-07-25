-- File 16 — Payment Account Provisioning Rollback (Turn 3B)
-- Reverses the auto-provisioning trigger + backfill inserts from
-- migration 20260725_j5_2_payment_account_provisioning.sql.
--
-- Ordering:
--   1. Drop the AFTER INSERT trigger on public.tenants.
--   2. Drop the private trigger function.
--   3. For each backfilled Payment Account UUID captured in File 19,
--      inspect payment_intents.payee_account_id and payment_splits.receiver_account_id.
--      Delete the row ONLY if no reference exists. Otherwise abort.
--   4. Never CASCADE. Never issue a broad DELETE WHERE owner_type='tenant'.
--   5. Never touch a Platform account.
--
-- Business-data safety fingerprint (pre-Turn-3B):
--   invoices=56, invoice_items=134, ledger_entries=66, billing_links=18,
--   customer_balances=7, finance_request_idempotency=1.
-- These must remain unchanged after rollback.

BEGIN;

DROP TRIGGER IF EXISTS trg_tenants_provision_payment_account ON public.tenants;
DROP FUNCTION IF EXISTS public._finance_provision_tenant_payment_account();

-- Per-row guarded deletion. Populate the id list from File 19 before running.
-- Example (repeat per backfilled id):
--
--   DO $$
--   DECLARE
--     v_id uuid := '<BACKFILLED_PAYMENT_ACCOUNT_UUID>';
--     v_refs int;
--   BEGIN
--     SELECT
--       (SELECT COUNT(*) FROM public.payment_intents WHERE payee_account_id = v_id)
--     + (SELECT COUNT(*) FROM public.payment_splits  WHERE receiver_account_id = v_id)
--       INTO v_refs;
--     IF v_refs > 0 THEN
--       RAISE EXCEPTION 'ROLLBACK_ABORT: payment_account % is referenced (% refs)', v_id, v_refs;
--     END IF;
--     DELETE FROM public.payment_accounts
--      WHERE id = v_id AND owner_type = 'tenant';
--   END $$;

COMMIT;
