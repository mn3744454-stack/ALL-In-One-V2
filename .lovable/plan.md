# PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-CRITICAL-EVIDENCE-COMPLETION-MINI-AUDIT-02

Operation: Critical Evidence Completion Mini Investigative Audit
Mode: Plan/Chat — Read-Only. No source file was created, edited, or deleted. No migration was proposed or run.
Scope: close the critical evidence gaps that blocked owner alignment at the end of Audit 01.

---

## 0. Evidence basis

All statements below are backed by a read performed in this turn: live database catalog queries (`pg_class.relacl`, `pg_policies`, `pg_get_functiondef`, `permission_definitions`), live financial row inspection (`ledger_entries`, `invoices`, `invoice_items`, `customer_balances`, `lab_horses`), and repository reads (`usePOSCore.ts`, `useStatementEnrichment.ts`, `StatementPrintUtils.ts`).

Where Audit 01 asserted something this turn's evidence contradicts, the correction is stated explicitly.

---

## WP7.1 — Financial write-authority surface (CLOSED)

Table privileges on the finance substrate (`pg_class.relacl`, authoritative — the earlier empty `information_schema.role_table_grants` result was a visibility artifact of the querying role, not an absence of grants):

| Table | anon | authenticated | service_role | RLS |
|---|---|---|---|---|
| `ledger_entries` | ALL | ALL | ALL | enabled |
| `customer_balances` | ALL | ALL | ALL | enabled |
| `invoices`, `invoice_items` | ALL | ALL | ALL | enabled |
| `payment_sessions`, `payment_allocations`, `payment_horse_allocations` | ALL | ALL | ALL | enabled |
| `financial_entries`, `billing_links`, `lab_credit_wallets` | ALL | ALL | ALL | enabled |
| `finance_request_idempotency` | none | none | ALL | enabled |

Table-level grants therefore provide **no** protection anywhere except `finance_request_idempotency`. RLS is the sole gate. Actual RLS posture:

- `ledger_entries` — SELECT for tenant members (two overlapping duplicate SELECT policies); **INSERT permitted directly from the browser** to any holder of `finance.invoice.edit`; no UPDATE and no DELETE policy (fail-closed, correct and intended).
- `customer_balances` — SELECT for tenant members; **INSERT, UPDATE and DELETE all permitted directly from the browser** to any holder of `finance.invoice.edit`.
- `payment_sessions` / `payment_allocations` / `payment_horse_allocations` — SELECT only, gated on `is_active_tenant_member` + `finance.payment.view`. No client-side write path at all; writes are RPC-only.

**Finding F-1 (Financial Authority Asymmetry).** The Phase N+2 payment substrate is correctly RPC-only, but the older ledger substrate is not. A user holding `finance.invoice.edit` — a *document-editing* permission — can today insert arbitrary `ledger_entries` rows and freely insert, update or delete `customer_balances` rows straight from the browser, with no RPC, no idempotency key, no double-entry validation and no audit actor. `customer_balances` being directly writable is the more severe half: the client-visible balance can be set to any value independently of the ledger that is supposed to derive it. This contradicts the standing project invariant that payment status and balances are derived from the ledger and never set manually.

**Finding F-2 (Permission granularity mismatch).** `permission_definitions` contains a finance vocabulary of 19 keys, including `finance.ledger.view` and `finance.adjustment.create`. Neither is used by any ledger or balance RLS policy — both tables key off `finance.invoice.edit` instead. The precise permission required to authorise a ledger movement already exists and is simply not wired.

Confirmed application-layer writers that exploit the open surface (all browser-side, non-atomic): `src/hooks/pos/usePOSCore.ts`, `src/lib/finance/postLedgerForInvoice.ts`, `src/lib/finance/postLedgerForExpense.ts`, `src/lib/finance/recordAsStableCost.ts`, `src/hooks/finance/useSupplierPayables.ts`, `src/hooks/finance/useFinancialEntries.ts`, `src/hooks/laboratory/useLabCredits.ts`, `src/hooks/billing/useBillingLinks.ts`.

---

## WP7.2 — Canonical RPC behaviour (CLOSED) — corrects Audit 01

`approve_invoice` (live body) authenticates the actor, enforces tenant access, requires `finance.invoice.approve`, reads the invoice's `issue_date`, and posts the ledger entry with `'effective_date', v_inv.issue_date`.

**Correction to Audit 01.** Audit 01 left open whether the platform still produces `effective_date`-less ledger rows. It does not. The canonical approval path is chronology-correct today and has been since the J5/N+1B cutover. The 28 NULL rows are a bounded legacy residue from the pre-RPC direct-insert era, not an ongoing leak. This materially downgrades the urgency of the write-path half of the effective-date defect and upgrades the priority of the read-path half.

`get_client_first_financial_activity` (live body) is correctly hardened — authentication, `is_tenant_member`, `clients.statement.view`, and tenant-scoped client validation — and correctly excludes draft/cancelled invoices and `invoice_cancellation` adjustments. But it computes `MIN(le.created_at)`.

**Finding F-3 (First-movement anchor uses the wrong clock).** The opening-balance anchor for every client statement is the row-creation timestamp, not the economic effective date. For any client whose earliest genuine economic event was backdated at entry, the statement's "first activity" marker, and therefore the opening-balance cut, lands on the wrong date. This is the single highest-impact read-path consequence of the effective-date architecture and it is independent of the 28 legacy NULLs — it misfires on correctly-populated rows too.

---

## WP7.3 — The 28 NULL `effective_date` rows: fully classified (CLOSED)

Complete classification of every NULL row:

| Class | Rows | Reference resolves? | Entry types |
|---|---|---|---|
| `reference_type = 'invoice'` | 27 | 27 / 27 to a live invoice | `payment`, `adjustment` |
| `reference_type = 'invoice_cancellation'` | 1 | 1 / 1 to a live invoice | `adjustment` |
| **Total** | **28** | **28 / 28** | — |

Every one of the 28 rows carries a resolvable invoice reference, and every referenced invoice has a non-null `issue_date`, spanning 2026-01-31 to 2026-07-18.

**Finding F-4 (The backfill is deterministic, and it is not cosmetic).** There is no ambiguous subset. `effective_date := referenced invoice.issue_date` is a total, single-valued rule over all 28 rows — no heuristics, no owner adjudication, no unresolvable remainder. Critically, **16 of the 28 rows have an invoice `issue_date` that differs from the row's Riyadh-local `created_at` date.** So the widespread fallback of treating `created_at` as the effective date is not merely imprecise: it currently misdates 16 real historical movements. Any migration that recovers them by falling back to `created_at` would silently freeze the wrong chronology into the record.

---

## WP7.4 — Case C1 reconciled to the row (CLOSED)

The client behind the reported 3,330 / 560 / 2,770 scenario:

Ledger:
- 6 `invoice` debits, total **3,330.00**, all with `effective_date` populated
- 9 `payment` credits, total **-560.00**, of which **7 carry a NULL `effective_date`**
- Net **2,770.00**, matching `customer_balances.balance` exactly.

Invoice population for the same client:

| Status | Count | Total |
|---|---|---|
| approved | 3 | 2,855.00 |
| paid | 3 | 475.00 |
| draft | 6 | 3,234.50 |
| **All** | **12** | **6,564.50** |

approved + paid = 2,855.00 + 475.00 = **3,330.00** — exactly the ledger debit total.

**Finding F-5 (No drift; the exposure is presentational).** Ledger, balance and posted-invoice population agree to the cent. There is no reconciliation defect in C1. The real exposure is that 3,234.50 of drafts sits alongside a 2,770.00 balance, i.e. **more than half of this client's invoice value by count (6 of 12) is unposted**. Nothing in the current statement surface tells a user that a near-equal shadow population exists outside the balance. The risk here is a truthful number read as a complete number.

**Finding F-6 (Chronology risk is concentrated in credits).** 7 of the 9 payment credits — the entries that most directly determine how a client perceives their settlement history — are exactly the entries missing an effective date. Combined with F-3, C1's statement ordering and opening cut are both driven by row-creation time for the majority of its payment history.

---

## WP7.5 — Horse attribution matrix for C1 (CLOSED) — corrects Audit 01

All 15 invoice items for C1, by attribution capability:

| Attribution shape | Items | Resolvable to a canonical horse today? |
|---|---|---|
| `horse_id` set | 0 | — |
| `entity_type = 'lab_sample'` + `entity_id` | 4 | yes, via the multi-hop sample path |
| `lab_horse_id` set | 4 | **no — but the bridge exists** |
| No attribution of any kind | 7 | no |

**Finding F-7 (A live, closed, ignored identity bridge).** For **all four** items carrying a `lab_horse_id`, the referenced `lab_horses` row has a non-null `linked_horse_id`. The lab-local identity is already reconciled to the canonical horse registry in the database. But `useStatementEnrichment.ts` has no `lab_horse_id` branch at all: Path A keys only off `item.horse_id`, and Path B keys only off `entity_type`. These four items therefore fall through to the unattributed bucket despite the platform holding a complete, closed identity chain for them.

This refines Audit 01, which described these items as resolving into a separate local identity space. The stronger and more actionable truth is that they resolve into the *canonical* space and the resolution is simply never attempted. Recovering them requires no data migration and no owner decision — only a read-path branch.

**Finding F-8 (Grouping-key inconsistency, previously unreported).** Path A composes its map key as `${domain}_${horseId}`, while the `lab_sample` branch of Path B uses the bare `horseId`. The same horse reached by the two paths produces two distinct keys and therefore two separate horse groups on one statement. The `boarding` branch uses the composed form, so the defect is isolated to the `lab_sample` branch.

Net for C1: 4 of 15 items are attributed today, 4 more are recoverable purely in the read path, and 7 are genuinely unattributable without new data.

---

## WP7.6 — Export parity (CLOSED)

`StatementPrintUtils.ts` exposes `printStatement`, `exportCSV`, `exportPDF`, `printLedgerEntries` and `exportLedgerCSV`. All five read the same `e.date` field from the same prepared entry model; the statement family renders it via `formatDateForPrint` and the ledger family via `formatTimeForPrint`.

**Finding F-9 (Parity holds, and that is the problem).** There is no divergence between screen, print, PDF and CSV — they are all faithful projections of one upstream value. Consequently every defect in F-3, F-4 and F-6 propagates identically into every exported artefact. Fixing the upstream date semantics fixes all five surfaces at once; conversely, no export-layer change can mitigate any of them.

---

## WP7.7 — POS write path (CLOSED)

`usePOSCore.ts` completes a sale through four sequential, independently-failing client-side operations: a count query for the sale index, a direct `insert` into `invoices`, a direct bulk `insert` into `invoice_items`, and a call to `postLedgerForInvoice` when a client is attached.

**Finding F-10 (POS is a non-atomic financial writer).** There is no transaction and no idempotency key. A failure after the invoice insert leaves a header with no lines; a failure after the items insert leaves a complete unposted invoice with the ledger never written and the balance never moved. Both partial states are silent and neither is self-healing. This is the only remaining first-class revenue-capture path that bypasses the canonical RPC layer established in Phase N+1B.

**Finding F-11 (POS status vocabulary divergence).** POS writes `status: "issued"`. The C1 population — and the approval RPC's own lifecycle — uses `draft`, `approved`, `paid` and `cancelled`. `issued` is outside the vocabulary every downstream consumer filters on, so POS invoices are at risk of being counted as neither posted nor draft by statement and reporting logic.

**Finding F-12 (POS attribution is structurally blind).** POS items are written with `entity_type: "pos_sale"` and `entity_id` set to the POS session id. No `horse_id`, no `lab_horse_id`, no `domain`. POS revenue can therefore never be horse-attributed on a client statement, by construction rather than by omission.

---

## WP7.8 — Cross-account applicability (CLOSED)

`tenant_type` is an enum of exactly **10** values: `stable`, `clinic`, `lab`, `academy`, `pharmacy`, `transport`, `auction`, `horse_owner`, `trainer`, `doctor`. This confirms the current roster and is consistent with the 10-current position established in the Skill Network audit.

All of the finance substrate examined — `invoices`, `invoice_items`, `ledger_entries`, `customer_balances`, the payment-session family — is scoped by `tenant_id` and `client_id` with no tenant-type discrimination anywhere in the schema or in any policy read this turn. Shared tenant operational finance is therefore already structurally account-type-agnostic, and every finding above applies uniformly to all 10 types. The apparent lab-specificity of F-7 is an artefact of which tenant generated the sample data, not of the model.

---

## Consolidated findings register

| ID | Finding | Class | Owner decision needed? |
|---|---|---|---|
| F-1 | Ledger and balances are directly client-writable under `finance.invoice.edit`; balances also updatable and deletable | Authority | No — remediation is determined |
| F-2 | `finance.ledger.view` / `finance.adjustment.create` exist but are unwired | Authority | No |
| F-3 | First-financial-activity anchor uses `created_at`, not `effective_date` | Chronology | No |
| F-4 | All 28 NULL `effective_date` rows deterministically backfillable; 16 would be misdated by a `created_at` fallback | Chronology | No |
| F-5 | C1 reconciles exactly; 6 draft invoices worth 3,234.50 sit invisibly outside the balance | Disclosure | **Yes** — disclosure policy |
| F-6 | 7 of 9 C1 payment credits are the NULL-dated ones | Chronology | No |
| F-7 | `lab_horse_id` → `linked_horse_id` bridge is closed in data but never traversed in the read path | Attribution | No |
| F-8 | `lab_sample` grouping key omits the domain prefix, splitting one horse into two groups | Attribution | No |
| F-9 | All five export surfaces share one date field; upstream defects propagate everywhere | Export | No |
| F-10 | POS sale is four non-atomic client writes with no idempotency | Atomicity | No |
| F-11 | POS writes `status: "issued"`, outside the lifecycle vocabulary | Lifecycle | **Yes** — confirm intended status |
| F-12 | POS items carry no horse attribution by construction | Attribution | **Yes** — is POS horse-attribution in scope? |

---

## Status of the Audit 01 blocking gaps

| Audit 01 gap | Now |
|---|---|
| Are effective-date NULLs still being produced? | **Closed** — no. `approve_invoice` posts `issue_date`. Residue is bounded at 28 legacy rows. |
| Are the NULLs recoverable, and how ambiguous? | **Closed** — 28/28 deterministic. Zero ambiguity. |
| Does C1 actually reconcile? | **Closed** — to the cent. |
| Is the lab identity gap a data gap or a code gap? | **Closed** — code gap. The bridge is already closed in data. |
| What is the true financial write-authority surface? | **Closed** — RLS-only, and permissive on ledger and balances. |
| Do exports diverge from screen? | **Closed** — no divergence. |
| Is POS atomic? | **Closed** — no. |
| Does any of this vary by account type? | **Closed** — no. Uniform across all 10. |

---

## Three residual owner decisions

1. **Draft-invoice disclosure (F-5).** Should a client statement surface the existence and value of unposted draft invoices — and if so, as a non-balance advisory line, a count-only badge, or not at all? This is a truthfulness-of-presentation policy call, not a technical one.
2. **POS invoice status (F-11).** Is `issued` an intentional fourth lifecycle state that downstream consumers must learn, or a drift that should be normalised onto `approved`?
3. **POS horse attribution (F-12).** Is horse-level attribution of point-of-sale revenue a requirement, or is POS accepted as permanently client-level only?

Everything else in the register is determinable from evidence and needs no owner adjudication before a remediation plan can be drafted.

**Verdict: EVIDENCE COMPLETE — OWNER ALIGNMENT UNBLOCKED on all technical questions; three presentation/scope decisions outstanding.**
