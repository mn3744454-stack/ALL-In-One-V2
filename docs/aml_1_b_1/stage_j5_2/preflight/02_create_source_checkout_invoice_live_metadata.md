# 02 — `public.create_source_checkout_invoice(uuid,uuid,jsonb)` — Live Rollback Baseline Metadata

Capture timestamp (UTC): `2026-07-25T01:11:02Z`
Database identity: `postgres` (cluster `main`)
Project ref: `vhxglsvxwwpmoqjabfmj`

## Signature
`public.create_source_checkout_invoice(uuid, uuid, jsonb)`

## Catalog metadata
| Field | Value |
|---|---|
| OID | 159316 |
| `prosecdef` | `t` (SECURITY DEFINER) |
| `provolatile` | `v` (VOLATILE) |
| Owner | `postgres` |
| `proconfig` | `{search_path=""}` |
| Byte length of `pg_get_functiondef` (raw, no trailing newline) | 11155 |
| Line count | 270 |

## ACL (`proacl`)
```
{postgres=X/postgres,
 anon=X/postgres,
 authenticated=X/postgres,
 service_role=X/postgres,
 sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,
 sandbox_exec=X/postgres}
```

## Fingerprints (canonical protocol locked by J5.2-FINGERPRINT-RECONCILIATION)
| Method | SHA-256 |
|---|---|
| Canonical POSIX (CRLF→LF, `[[:space:]]+`→' ', btrim) | `fe638fed78baf0d63dfb24d2c6319662bb8a7f834dc5db4eef37b4b42078064a` |
| Raw DB-side `pg_get_functiondef` UTF-8 | `b6c7f67991e12f2ad667967f4bf118d1f15ba8246c72028cf3a4bb0e58ecb803` |

Reproduction SQL — see `docs/aml_1_b_1/stage_j5_1/preflight/16_cancel_invoice_contract.md` §5.2 pattern; also encoded in Slice 01 §4.1.

## Live semantic contract (frozen at capture time)
- Accepts only `lab_sample`, `horse_order` source types.
- Does NOT accept `link_kind` as a root payload key.
- Hard-codes source billing link kind to `final`.
- Performs direct Invoice + Item persistence internally (does not delegate to `create_invoice_with_items`).
- Approves every created Invoice inline.
- Posts payment for non-debt methods.
- Directly inserts the source billing link (no `_finance_billing_link_upsert` composition).
- No Draft behavior.
- No active same-kind source-link conflict guard.

## Rollback / restoration procedure
Restoration SQL is the exact `pg_get_functiondef` capture in `01_create_source_checkout_invoice_live_baseline.sql`.

To restore the pre-Slice-01 baseline exactly:

```sql
BEGIN;
-- (1) Drop the replacement
DROP FUNCTION IF EXISTS public.create_source_checkout_invoice(uuid, uuid, jsonb);

-- (2) Recreate the baseline from the captured file (paste the entire body of
--     01_create_source_checkout_invoice_live_baseline.sql here).
--     The captured statement is already a complete `CREATE OR REPLACE FUNCTION ... $function$;`.

-- (3) Reassert baseline metadata (SECURITY DEFINER, search_path, owner)
ALTER FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) OWNER TO postgres;
-- SECURITY DEFINER, search_path='', and volatility are already encoded in the captured DDL.

-- (4) Restore ACL exactly as captured above
REVOKE ALL ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_source_checkout_invoice(uuid, uuid, jsonb) TO service_role;
-- Note: the `sandbox_exec*` grants are managed by the platform and re-appear on their own.

-- (5) Verify fingerprints match the pinned canonical + raw values above.
COMMIT;
```

## Baseline verification checklist (post-restore)
Fingerprint canonical POSIX must equal `fe638fed78baf0d63dfb24d2c6319662bb8a7f834dc5db4eef37b4b42078064a`.
Fingerprint raw must equal `b6c7f67991e12f2ad667967f4bf118d1f15ba8246c72028cf3a4bb0e58ecb803`.
`prosecdef=t`, `provolatile=v`, `proconfig` contains `search_path=""`, owner `postgres`.

Do NOT delete historical `public.invoices`, `public.invoice_items`, `public.ledger_entries`, or `public.billing_links` rows as part of rollback.
