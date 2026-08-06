# Prompt 55 — Continuation A2 — Part 1 — Evidence Reconciliation (read-only)

RM-DH-004 / Phase 2 / WS-DH-2026-0006 / Stage 1. Repository writes: ZERO. Database writes: ZERO. Storage writes: ZERO. No contract design, no slices, no recommendation.

## A. Primary evidence verdict

All four evidence areas are resolved from live database and repository state, with two exceptions that remain gaps and cannot be closed from inside this environment: (1) whether Lovable supports a second isolated environment for this project, and (2) the authoritative PostgREST exposed-schema configuration (`db_schemas`), which is not readable from SQL. One prior A1 claim is materially corrected: browser-role direct DML on Finance tables is **not** universally revoked.

## B. Run identity and live boundary

| Item | Value |
|---|---|
| Branch | `edit/edt-89994f7b-ac29-44b2-89ab-c73094c31a73` |
| HEAD (40 char) | `308a0e8aca12733b2ac31486ac7f63a31ae79580` |
| Parent 1 | `2571abd82241ba7288a7c4b277a2f07bc2ead9b6` |
| Parent 2 | `ff014a9045c7800dfe83862485afeebb28e32c6d` |
| Working tree | clean — zero staged, zero unstaged, zero untracked paths |
| Lovable project ID | `64c79edd-f667-42bb-b896-147c63e0ff12` |
| Database/project ref | `vhxglsvxwwpmoqjabfmj` |
| Evidence time | 2026-08-06 00:00 UTC / 03:00 Asia/Riyadh |
| Drift since A1 | HEAD is the platform merge whose first parent `2571abd8…` is the A1-era verified commit; no governance or code path changed; database unchanged |

## C. Public relation-count reconciliation

SQL executed:

```sql
select relkind, count(*) from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' group by 1 order by 1;
```

Result:

| relkind | meaning | count |
|---|---|---|
| `r` | ordinary base tables | **158** |
| `v` | views | **6** |
| `m` | materialized views | 0 (absent) |
| `p` | partitioned tables | 0 (absent) |
| `f` | foreign tables | 0 (absent) |
| `i` | indexes | 627 |

1. Authoritative current result: **158 base tables**, 6 views, 0 materialized/partitioned/foreign tables.
2. Yes — earlier counts mixed relation types. 158 + 6 = 164, which exactly reproduces the earlier "164 tables" figure.
3. Precise reason: the 164 figure counted views alongside base tables (or used an `information_schema.tables` style query that returns `BASE TABLE` and `VIEW` together); the 158 figure filtered `relkind='r'`.
4. Effect on Historical Import scope: **none**. No import-control relation exists under either count, and no view participates in Finance write paths.

## D. Environment-isolation evidence

**Facts (live):**
- Exactly one Postgres project is reachable from this session: ref `vhxglsvxwwpmoqjabfmj`, bound to Lovable project `64c79edd-f667-42bb-b896-147c63e0ff12`.
- No second database, no staging schema, and no import/staging namespace exists. Non-system schemas present: `public`, `auth`, `storage`, `realtime`, `graphql`, `graphql_public`, `extensions`, `net`, `cron`, `vault`, `supabase_migrations`.
- The current session is on a Lovable edit branch (`edit/edt-89994f7b…`) while reading and writing the same single database ref; branch state and database state are independent.
- Storage contains 2 private buckets only (`horse-media`, `database_export_20_07_26`); no import bucket.

**Lovable claims (platform documentation/product level, not verifiable from SQL):** one managed Cloud Postgres project is provisioned per Lovable project; there is no self-serve provisioning surface for a second database within the same project.

**Inferences:** because migrations, Grants, RLS and Storage objects are applied to the single ref regardless of Git branch, a Git branch provides **no** database, Storage, permission or migration isolation.

**Gaps:** whether Lovable offers a proven supported path to a second isolated environment for this project (for example a separate Lovable project acting as staging, with schema and permission lineage kept in sync) is **unresolved** and cannot be established from this environment. No option is selected in this Part.

## E. Finance reversal capability matrix

All rows verified from `pg_proc` (`prosecdef`, `proconfig`) and `proacl`. Every listed function is `plpgsql`, `SECURITY DEFINER`, `SET search_path = ''`.

| Operation | Creation / posting path | Callable by | Reversal / compensating path | Reversal semantics | Evidence | Import posting implication |
|---|---|---|---|---|---|---|
| Invoice creation | `create_invoice_with_items(uuid,uuid,jsonb)` | authenticated | `delete_draft_invoice(uuid,uuid,uuid)` (draft only) | deletion, pre-ledger only | pg_proc | safe: pre-posting undo exists |
| Invoice update | `update_invoice_with_items(uuid,uuid,uuid,jsonb)` | authenticated | same-path re-write while draft | mutation, not reversal | pg_proc | safe pre-approval |
| Invoice approval | `approve_invoice(uuid,uuid,uuid)`; server variant `_finance_invoice_approve_inline` (service_role only) | authenticated / service_role | `cancel_invoice(...)` | **canonical reversal** — inserts a compensating `adjustment` / `invoice_cancellation` ledger entry of `-amount`, sets status `cancelled`, never deletes | `prosrc` of `cancel_invoice` read this turn | reversible **only while unpaid** |
| Invoice cancellation | `cancel_invoice(uuid,uuid,uuid,date,text)` | authenticated | n/a (is itself the reversal) | compensating adjustment; idempotent; refuses if any payment ledger entry or pending/paid `payment_intents` exist | `prosrc` | **hard block**: a paid or partially paid imported invoice cannot be cancelled |
| Invoice items | `invoice_items` written inside the invoice RPCs, with `_invoice_items_fill_snapshots` / `_invoice_items_validate_source` triggers | via RPC | no item-level reversal function | none | pg_proc | reversal is document-level only |
| Payment | `post_payment(uuid,uuid,uuid,numeric,date,text,uuid,jsonb)` | authenticated / service_role | **none found** | **no reversal** | full `pg_proc` scan for `%revers%`, `%void%`, `%refund%`, `%cancel%`, `%payment%` returned no payment reversal function | **BLOCKING** for payment import |
| Invoice-payment allocation | `post_invoice_payments(uuid,uuid,uuid,uuid,date,jsonb)` writing `payment_allocations` | authenticated | **none found** | **no reversal** | pg_proc | **BLOCKING** |
| Payment session | `post_payment_session(uuid,uuid,jsonb)`; read via `get_payment_session` | authenticated / service_role | **none found** | **no reversal** | pg_proc | **BLOCKING** |
| Expense | `create_expense`, `post_expense_with_ledger`, `delete_expense` | authenticated / service_role | `reverse_expense(uuid,uuid,uuid,text,date)` | canonical reversal exists (name and signature confirmed; internal semantics not re-read this turn) | pg_proc | reversible, semantics to confirm before use |
| Manual ledger adjustment | `post_manual_ledger_adjustment(uuid,uuid,uuid,numeric,date,text)` | authenticated / service_role | itself (an opposite-sign adjustment) | compensating entry | pg_proc | **must not** be treated as a universal reversal path for other object types |
| Generated ledger entries | private `_finance_ledger_insert(...)` | **service_role only** (no authenticated EXECUTE) | no direct reversal; only via the owning document's reversal | none standalone | pg_proc `proacl` | ledger truth is append-only; correct |
| Billing links | private `_finance_billing_link_upsert(...)` | **no explicit grant** (owner/definer only) | no reversal function | none | pg_proc `proacl` | provenance of links needs its own contract |

Conclusion of E: canonical reversal is proven for **unpaid invoices** and (by name) **expenses**, and is **absent for payments, invoice-payment allocations, payment sessions and billing links**. No universal reversal path may be inferred from `post_manual_ledger_adjustment`.

## F. Schema and Data-API exposure evidence

- Application schemas: **`public` only**. All 158 application base tables and all 6 views are in `public`. No private or non-exposed application schema exists.
- Schema-level ACL (`pg_namespace.nspacl`): `public`, `auth`, `storage`, `realtime`, `graphql`, `graphql_public`, `extensions`, `net` grant `USAGE` to `anon`, `authenticated`, `service_role`. `vault` grants `USAGE` to `service_role` only. `cron` and `supabase_migrations` grant none.
- The authoritative PostgREST exposed-schema list is platform configuration and is **not readable from SQL** — that `public` is the exposed application schema is a Lovable-platform default (claim) corroborated by the client code reading `public` tables directly (fact).
- Table ACL / RLS patterns observed (`pg_class.relacl`, `pg_policies`), all with RLS enabled:
  - **Browser-readable + browser-writable (RLS-gated):** `invoices`, `expenses`, `billing_links`, `payment_sessions`, `horses`, `permission_definitions` still carry **full INSERT/UPDATE/DELETE grants to `anon` and `authenticated`**; access is constrained only by RLS policies (`is_tenant_member`, `has_permission(...)`, e.g. `finance.invoice.create` / `.edit` / `.delete`). Most policies target role `public`, not `authenticated`.
  - **Read-only to browser roles:** `ledger_entries` — `anon:SELECT`, `authenticated:SELECT`, full grants to `service_role`; SELECT policies only, no write policy.
  - **Server-only:** `finance_request_idempotency` — `service_role` only, RLS enabled, no browser grant.
  - **RPC-only mutation pattern:** every canonical Finance writer is `SECURITY DEFINER`, `search_path=''`, re-checks `is_active_tenant_member()` and `has_permission()`, and uses `_finance_idempotency_begin/_complete` plus `pg_advisory_xact_lock(_finance_source_lock_key(...))`.
  - **Private helper pattern:** `_finance_ledger_insert`, `_finance_invoice_approve_inline` → `service_role` EXECUTE only; `_finance_billing_link_upsert` → no explicit grantee.
- Verdict on placement: proposing Historical Import objects in `public` is **proven repository convention** (there is no alternative application schema and no non-exposed convention to follow), but choosing to *deviate* from that convention — e.g. a non-exposed `import` schema reachable only through RPCs — remains an **open Owner/architecture decision**, not something the current repository settles.

## G. Facts confirmed

1. 158 public base tables, 6 views, no matviews/partitioned/foreign tables.
2. Zero Historical Import substrate of any kind.
3. Single database ref `vhxglsvxwwpmoqjabfmj`; no second environment reachable; Git branch gives no database isolation.
4. `cancel_invoice` performs a true compensating ledger reversal and refuses when payments exist.
5. No canonical reversal exists for payments, allocations, payment sessions or billing links.
6. `ledger_entries` is append-only to browser roles (SELECT only); `finance_request_idempotency` is service_role only.
7. `public` is the sole application schema, with `USAGE` to `anon` and `authenticated`.
8. Two private Storage buckets exist; neither is an import bucket.

## H. Prior claims withdrawn or superseded

1. **Withdrawn:** "164 tables" — superseded by 158 base tables + 6 views.
2. **Withdrawn (material):** A1's preserved statement "no browser-direct financial DML" is **overbroad**. It is true only for `ledger_entries` and `finance_request_idempotency`. `invoices`, `invoice_items`-adjacent tables, `expenses`, `billing_links` and `payment_sessions` retain full browser-role table grants, gated solely by RLS policies. Any future ACL baseline must state this accurately rather than assume a completed revocation.
3. **Narrowed:** A1's "canonical Finance RPCs provide reversal" — proven for unpaid invoices and (by name) expenses only.
4. **Superseded:** A1's placement rationale — `public` is convention by absence of any alternative, and deviation remains an open decision.

## I. Unresolved gaps

1. Supported path (if any) for a second isolated Dayli Horse environment.
2. Authoritative PostgREST exposed-schema configuration.
3. Internal semantics of `reverse_expense` (signature confirmed, body not re-read this turn).
4. Reversal strategy for payments, allocations, payment sessions and billing links.
5. Whether the residual browser-role DML grants on Finance tables are an intentional accepted posture or Stage-B residue.
6. No representative Excel/PDF specimens, file-size, row-count or batch-volume evidence.
7. Malware scanning capability.

## J. Contradictions

1. Governance narrative of RPC-mediated financial writes vs live table ACLs that still permit browser-role DML on `invoices`, `expenses`, `billing_links`, `payment_sessions` (RLS-gated). Recorded, not resolved here.
2. `ledger_entries` carries two overlapping SELECT policies expressing the same tenant-membership rule. Cosmetic; no security effect.
3. Prior 164 vs 158 count — resolved in section C.

## K. Evidence Part 2 may rely upon

158 base tables / 6 views / zero import substrate; `public` as sole application schema with `anon`+`authenticated` USAGE; the exact ACL posture per table listed in F; the RPC-only + `SECURITY DEFINER` + `search_path=''` + idempotency + advisory-lock writer pattern; `has_permission()` / `permission_definitions(key, module, resource, action, is_delegatable, …)` as the permission vocabulary; `ledger_entries.effective_date` NOT NULL.

## L. Evidence Part 3 may rely upon

The Finance reversal matrix in E verbatim, including the four BLOCKING rows; `cancel_invoice` compensating-entry semantics and its payment-existence refusal; append-only ledger posture; single-database boundary and absence of environment isolation; two private buckets, no import bucket; run identity in B.

## M. Cross-task contamination check

NO CROSS-TASK CONTAMINATION DETECTED

## N. Run metadata and exact stopping point

Parallel Task ID `PT-DH-RM004-WS0006-P55-A2-P1-EVIDENCE-RECONCILIATION-20260806-0253`. Evidence time 2026-08-06 00:00 UTC / 03:00 Asia/Riyadh. Read-only tools used: `git` inspection, `pg_class`/`pg_namespace`/`pg_proc`/`pg_policies`/`information_schema` reads, one `prosrc` read of `cancel_invoice`, one Storage bucket listing.

Stopped after: relation-count reconciliation, environment evidence boundary, Finance reversal matrix, schema/Data-API convention, bounded evidence report. No fixes proposed, no contract designed, no environment option selected, no implementation begun, no Prompt number consumed, no Stage-1 Acceptance, Workstream Closure or Roadmap Closure claimed. Repository, database and Storage writes: ZERO.

Next action: return this Part-1 report for reconciliation before Part 2 is issued.
