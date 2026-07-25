# 08 — `public._finance_source_checkout_apply_trace(uuid,uuid,text,uuid)` — Post-Migration-A Metadata

Capture timestamp (UTC): 2026-07-25T06:42Z
Database identity: `postgres` (cluster `main`)
Project ref: `vhxglsvxwwpmoqjabfmj`

## Signature
`public._finance_source_checkout_apply_trace(uuid, uuid, text, uuid) RETURNS void`

## Catalog metadata
| Field | Value |
|---|---|
| `prosecdef` | `t` (SECURITY DEFINER) |
| `provolatile` | `v` (VOLATILE) |
| Owner | `postgres` |
| `proconfig` | `{search_path=""}` |
| Language | `plpgsql` |

## ACL (`proacl`)
```
{postgres=X/postgres,
 service_role=X/postgres,
 sandbox_exec_vhxglsvxwwpmoqjabfmj=X/postgres,
 sandbox_exec=X/postgres}
```

- PUBLIC: revoked
- anon: revoked (not present)
- authenticated: revoked (not present)
- service_role: preserved (platform administration)
- sandbox_exec*: platform-managed, out of scope

## Fingerprints
| Method | SHA-256 |
|---|---|
| Raw `pg_get_functiondef` UTF-8 | `8653bd79116b2502c229e5b1971adeb88cdbacb4e6684eb41719e662ee9fe7d9` |
| Canonical POSIX (CRLF→LF, `[[:space:]]+`→' ', btrim) | `7cecabbd5b7e9b11d9fc1074bf50044642d1cbd24ceefb2ffc4cc16f1044692f` |

## Contract summary
- Rejects any NULL argument with `FIN_TRACE_BAD_ARGS`.
- Allows only `p_source_type ∈ {'lab_sample','horse_order'}`; otherwise `FIN_TRACE_SOURCE_TYPE_INVALID`.
- Requires the target invoice to exist, belong to `p_tenant_id`, and be `status='draft'`; otherwise `FIN_TRACE_INVOICE_NOT_APPLICABLE`.
- Updates only `entity_type` and `entity_id` on `public.invoice_items` filtered by `invoice_id = p_invoice_id`.
- Requires at least one updated row; otherwise `FIN_TRACE_NO_ITEMS_UPDATED`.
- Does not update horse identity, lab-horse identity, client identity, pricing, tax, frozen snapshots, service identity, or package identity.
- Does not disable or bypass `trg_invoice_items_validate_source`.
