# 04 — `public._invoice_items_validate_source()` — Live Rollback Baseline Metadata

Capture timestamp (UTC): `2026-07-25T01:11:02Z`
Database identity: `postgres` (cluster `main`)
Project ref: `vhxglsvxwwpmoqjabfmj`

## Signature
`public._invoice_items_validate_source()` (trigger function returning `trigger`)

## Catalog metadata
| Field | Value |
|---|---|
| `prosecdef` | `t` (SECURITY DEFINER) |
| `provolatile` | `v` (VOLATILE) |
| Owner | `postgres` |
| `proconfig` | `{search_path=public}` |
| Line count | 145 |

## ACL (`proacl`)
```
{postgres=X/postgres,
 anon=X/postgres,
 authenticated=X/postgres,
 service_role=X/postgres,
 sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,
 sandbox_exec=X/postgres}
```

## Live semantic contract (Lab-Horse validation branch — frozen at capture time)
The Lab-Horse branch (activated when `NEW.lab_horse_id IS NOT NULL`) currently:

- Requires the `lab_horses` row to belong to the same tenant as the invoice (`lab_horses.tenant_id = invoices.tenant_id`).
- Requires the `lab_horses` row's `client_id` to equal `invoices.client_id`.
- Does NOT consult `public.party_horse_links` for a junction billing authority.

Effect: standalone Laboratory invoices cannot include Lab Horses billed through the shared client registry via `party_horse_links` when `lab_horses.client_id` is NULL (which is the current 22-of-22 primary lab_customer census condition).

## Rollback / restoration procedure
Restoration SQL is the exact `pg_get_functiondef` capture in `03_invoice_items_validate_source_live_baseline.sql`.

```sql
BEGIN;
CREATE OR REPLACE FUNCTION public._invoice_items_validate_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
-- ... paste the exact captured body from 03_invoice_items_validate_source_live_baseline.sql ...
$function$;

ALTER FUNCTION public._invoice_items_validate_source() OWNER TO postgres;

REVOKE ALL ON FUNCTION public._invoice_items_validate_source() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._invoice_items_validate_source() TO anon;
GRANT EXECUTE ON FUNCTION public._invoice_items_validate_source() TO authenticated;
GRANT EXECUTE ON FUNCTION public._invoice_items_validate_source() TO service_role;
COMMIT;
```

## Trigger binding preservation
The function is bound as a trigger on `public.invoice_items` (per J5 constraints work). Rollback does NOT drop or re-create the trigger — only the function body is replaced. The existing trigger continues to reference the function by name.

Do NOT delete historical `public.invoice_items` rows as part of rollback.
