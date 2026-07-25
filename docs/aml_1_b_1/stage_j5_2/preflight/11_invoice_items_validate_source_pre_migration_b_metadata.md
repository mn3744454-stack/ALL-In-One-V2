# File 11 — `_invoice_items_validate_source` Pre-Migration-B Metadata

Captured: 2026-07-25 06:56 UTC
Database: postgres
Project ref: vhxglsvxwwpmoqjabfmj

## Function identity

- Schema/name: `public._invoice_items_validate_source()`
- Owner: `postgres`
- Language: `plpgsql`
- Volatility: `VOLATILE` (`v`)
- SECURITY DEFINER: `true` (`prosecdef=t`)
- `proconfig`: `{search_path=public}`
- ACL: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres,sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,sandbox_exec=X/postgres}`

## Fingerprints

- Raw DB SHA-256 (via `sha256(convert_to(pg_get_functiondef(oid),'UTF8'))`):
  `53e6278d74f25fbbbd8d2b254c44164fe0b1e3c329dc2f89c1dd50c8954832d8`
- Byte-for-byte identical to
  `docs/aml_1_b_1/stage_j5_2/preflight/03_invoice_items_validate_source_live_baseline.sql`
  (`cmp` and `diff` both return zero differences; size = 5216 bytes).

## Trigger binding

- Trigger `trg_invoice_items_validate_source` bound to `public.invoice_items`,
  exactly one binding, present in `pg_trigger` (see File `03b_invoice_items_triggers.txt`).

## Related table shape

- `public.party_horse_links` columns: `id, tenant_id, client_id, lab_horse_id,
  relationship_type, is_primary, created_at, created_by`.
- No `is_active`, `status`, `archived_at`, or `effective_date` column exists — no
  lifecycle field to gate on.

## Live relationship census (lab_horse-scoped)

| Metric | Value |
|---|---|
| party_horse_links rows w/ lab_horse_id | 22 |
| ...of which relationship_type='lab_customer' | 22 |
| lab_horses rows with client_id NOT NULL | 0 |

Matches the census pinned in the Turn-3 authorization.

## Semantic scope of change (planned)

Only the branch beginning `IF NEW.lab_horse_id IS NOT NULL THEN` is to be replaced;
every other validation branch (tenant_services, lab_services, categories, horses,
boarding/ownership, packages, snapshots, tenant isolation, SQLSTATE classes) is
preserved verbatim.
