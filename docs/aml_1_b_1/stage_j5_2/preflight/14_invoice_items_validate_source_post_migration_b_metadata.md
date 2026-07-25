# File 14 — `_invoice_items_validate_source` Post-Migration-B Metadata

Captured: 2026-07-25 06:58 UTC (immediately after Migration B).
Database: postgres · Project ref: vhxglsvxwwpmoqjabfmj

## Applied migration paths

- Migration A: `supabase/migrations/20260725064150_e3db1031-25ab-4087-9be2-3d02f1bdfbe2.sql`
- Migration B: `supabase/migrations/20260725065803_6fdd63fa-d8e0-43dd-893d-609b492394eb.sql`

## Function identity

- `public._invoice_items_validate_source()`
- Owner: `postgres`
- Language: `plpgsql`
- Volatility: `VOLATILE` (`v`) — preserved
- SECURITY DEFINER: `true` — preserved
- `proconfig`: `{search_path=public}` — preserved
- ACL: unchanged (`CREATE OR REPLACE` does not reset ACL)
- Trigger binding: `trg_invoice_items_validate_source` on `public.invoice_items`, unchanged

## Fingerprints (post-Migration-B)

- Raw DB SHA-256 (`sha256(pg_get_functiondef(oid))`):
  `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- Canonical POSIX SHA-256 (LF-normalized, single trailing LF):
  `8ee852ec40fd2ac678b2cdf4af454e61646609d06d09c6a0a4e9f2b9a93bf772`
- Raw-of-dump file SHA-256:
  `fec188c8a01f0882fb6048cc8da3b6012343e894da450c26026d62a19c12f3ed`
- Definition size: 5824 bytes (baseline was 5216; delta = new lab_horse branch).

## Semantic change (only branch modified)

`IF NEW.lab_horse_id IS NOT NULL THEN` now:

1. Still resolves `lh_tenant, lh_client` from `public.lab_horses`.
2. Still raises `23503` when the lab horse is missing.
3. Still raises `42501` on cross-tenant.
4. When `invoices.client_id IS NOT NULL` and the legacy `lab_horses.client_id`
   does not equal it, checks `party_horse_links` for a row where
   `tenant_id = invoices.tenant_id`, `client_id = invoices.client_id`,
   `lab_horse_id = NEW.lab_horse_id`, and
   `relationship_type IN ('lab_customer','payer')`.
5. Raises the existing `42501` message
   (`'Lab horse % is not linked to invoice client %'`) when neither authority path holds.
6. Walk-in / `invoices.client_id IS NULL` behavior preserved (tenant validation only).

No lifecycle field (`is_active`, `status`, `archived_at`, `effective_date`) is required
or referenced — none exist on `party_horse_links`.

Relationships `owner`, `trainer`, `stable` do NOT authorize billing on their own.

Every other branch (service_source, tenant_services, lab_services, inactive service,
categories, horses, boarding/ownership, package_id, package_source, snapshot type,
tenant isolation, SQLSTATE classes) is preserved verbatim.

## Rollback

Run `docs/aml_1_b_1/stage_j5_2/preflight/12_migration_b_rollback.sql` — it replays the
pre-Migration-B body (raw fingerprint `53e6278d…4832d8`, byte-identical to File 03).
