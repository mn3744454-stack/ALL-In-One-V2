<!--
id: DHB-ARCH-CORE-FLOWS-LIFECYCLES
title: Dayli Horse — Core User Flows, End-to-End Operational Lifecycles & Post-Onboarding Experience Reality
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored from the accepted Round 3 (R3) investigative audit — Pass A (closed with non-blocking unknowns) and Pass B (final completion audit, all unknowns resolved); evidence collected in strict read-only mode from live database catalog and data distributions, Edge Function sources, and repository source files
source-sha256: n/a
-->

# Dayli Horse — Core User Flows, End-to-End Operational Lifecycles & Post-Onboarding Experience Reality

## 1. Purpose, scope and provenance

This document is the canonical current-truth reference for **what a user can actually do end to end** in Dayli Horse today: how identity becomes a workspace, what each of the 10 current account types can complete after onboarding, how each operational lifecycle terminates, and where a lifecycle stops short.

It is the Round 3 (R3) counterpart to:

- `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` — who the account types are.
- `DHB-ARCH-ACCOUNT-MODULE-REALITY` — which modules each type has.
- **This document** — what each type can actually complete, and how it ends.

Scope boundary: this document describes lifecycles and flows. It does not restate the platform foundation (Round 1) or the module inventory (Round 2), and it does not propose remediation.

Provenance: authored from the accepted R3 Pass A and Pass B investigative audits. All evidence was gathered read-only from the live catalog (`pg_proc`, `pg_trigger`, `pg_constraint`, function ACLs, `storage.buckets`), live data distributions, Edge Function sources under `supabase/functions/`, and repository source under `src/`. Round 1 and Round 2 documents are unaffected.

## 2. Workflow completeness taxonomy

Every lifecycle in this document is classified with exactly one value from this taxonomy. This taxonomy is **separate from and must not be mixed with** account-type maturity, module status, risk severity, or commercial readiness.

| Value | Meaning |
|---|---|
| `end-to-end-substantive` | The workflow starts, validates, mutates the backend, persists, updates downstream surfaces, and terminates truthfully. |
| `end-to-end-partial` | The workflow completes its core path but one required phase (downstream, notification, terminal action, or recovery) is incomplete. |
| `frontend-guided-backend-partial` | The UI presents a complete journey; the backend does not fully complete or fully report it. |
| `backend-foundation-ui-partial` | Schema and/or RPCs exist; the user-facing journey is incomplete or absent. |
| `shared-foundation-only` | The type has no dedicated lifecycle; it only reuses shared platform workflows. |
| `initiation-only` | The user can start the action; completion requires a separate, unlinked manual action. |
| `view-only` | The surface reads data but performs no lifecycle mutation. |
| `placeholder` | Named in the product surface with no functional lifecycle behind it. |
| `legacy` | Reachable but superseded; retained only for historical access. |
| `contradictory` | Frontend and backend disagree about what is permitted or what happened. |
| `planned` | Approved for a future round; no current implementation. |
| `not-applicable` | The concept does not apply to this entity or type. |

## 3. Identity, onboarding and workspace activation

### 3.1 Matrix — Identity → Onboarding → Workspace Activation

| Stage | Route | Component / hook | Backend | Guard | Error / empty behavior | Next state | Recovery | Classification |
|---|---|---|---|---|---|---|---|---|
| Registration | `/auth` | `AuthContext` | `auth.users`, `profiles` | none | inline toast | profile created | re-submit | `end-to-end-substantive` |
| Sign-in | `/auth` | `AuthContext` | auth | none | toast | session established | retry | `end-to-end-substantive` |
| Sign-out | any | `LogoutConfirmDialog` | auth | none | — | signed out, context reset | re-auth | `end-to-end-substantive` |
| Password recovery | `/forgot-password` → `/reset-password` | recovery pages | auth email | token | toast | signed in | resend | `end-to-end-substantive` |
| Session persistence | all | `AuthContext` | auth token | — | spinner | hydrated session | re-auth | `end-to-end-substantive` |
| Role/type selection | `/select-role` | `SelectRole.tsx` | client-side choice | auth | — | onboarding | back | `end-to-end-partial` |
| Workspace creation | per type | creation flow | `tenants`, `tenant_members`, `initialize_tenant_defaults` | auth | **initialization failure is swallowed** | dashboard | none automatic | `frontend-guided-backend-partial` |
| No workspace | `/dashboard` | `TenantContext` | — | — | empty shell | prompt to create | create workspace | `end-to-end-partial` |
| One workspace | `/dashboard` | `TenantContext` | `tenant_members` | — | spinner | active workspace | — | `end-to-end-substantive` |
| Multiple workspaces | switcher | `TenantSwitcher` | `tenant_members` | — | list | re-hydration | switch | `end-to-end-substantive` |
| Inactive / removed membership | any | `TenantContext` | RLS denial | route guards | redirect | personal mode | switch workspace | `end-to-end-partial` |
| Personal ↔ Establishment mode | toggle | `WorkspaceModeToggle` | `workspaceMode` in context | — | — | mode change | toggle back | `end-to-end-substantive` |
| Invalid / inaccessible active workspace | any | `TenantContext` | — | `WorkspaceRouteGuard` | spinner then redirect | dashboard | switch | `end-to-end-partial` |

### 3.2 Guards

Two guard families protect post-onboarding routes:

- `WorkspaceRouteGuard` — waits for `tenantHydrated && !tenantLoading && !permLoading`, then enforces `requiredMode` (personal/organization), presence of an active tenant, and `hasPermission(requiredPermission)`.
- `ModuleGuard` — enforces module availability (`laboratory`, `vet`, `housing`, `movement`, `breeding`) from `useModuleAccess`, redirecting to `/dashboard` with a toast.

Both render a spinner rather than a false negative while hydration is pending. This is the correct fail-closed posture.

## 4. Workspace creation and capability initialization

`initialize_tenant_defaults(p_tenant_id, p_tenant_type)` is a `SECURITY DEFINER` function with `SET search_path = public` that first validates the caller is the tenant owner, then seeds **exactly five capability rows**, all with `ON CONFLICT (tenant_id, category) DO NOTHING`:

| Category | `has_internal` true for | Seeded config |
|---|---|---|
| `laboratory` | `lab` | `lab` → `{"lab_mode":"full"}`; `stable`, `clinic` → `{"lab_mode":"requests"}`; else `{"lab_mode":"none"}` |
| `vet` | `clinic`, `vet` | `clinic`/`vet` → enabled; all others (including `doctor`) → disabled |
| `housing` | `stable`, `clinic` | enabled for those two; else disabled |
| `movement` | `stable`, `clinic`, `transport` | enabled for those three; else disabled |
| `breeding` | `stable` | **enabled for `stable`**; else disabled |

**Seed vs frontend fallback parity.** `useModuleAccess` resolves each module from the capability row when present, and otherwise falls back to a tenant-type default that is **value-identical to the seed**. Consequently a tenant whose defaults failed to initialize still resolves the same module set at runtime.

**Live state.** All 9 live tenants have all 5 capability categories present — no tenant is currently missing defaults.

**Known weakness.** The initialization call site catches and swallows failure and still reports onboarding success. Because of fallback parity the tenant remains fully operational; the observable consequences are (a) capability/settings surfaces render as unconfigured, and (b) there is no explicit repair path — rows are only created incidentally when an owner toggles a module (`upsertCapability`). Recorded as **R3-04**.

**Type note.** For `doctor` (Independent Veterinarian) the `vet` capability is disabled in both the seed and the fallback, because neither branch matches the `doctor` literal. This is consistent, not divergent, but it means the shared Vet module is not the Independent Veterinarian's surface — the `doctor_*` tables are.

## 5. Membership, invitations, roles and access

| Path | Backend object | Classification |
|---|---|---|
| Invite creation | `invitations` (owner-role escalation restricted at RLS) | `end-to-end-substantive` |
| Email delivery | `send-invitation-email` Edge Function | `end-to-end-substantive` (channel: **email-only**) |
| Invitation landing | `/invite/:token` → `InviteLandingPage` | `end-to-end-substantive` |
| Preaccept | `preaccept_invitation` (SD, token-scoped) | `end-to-end-substantive` |
| Finalize acceptance | `finalize_invitation_acceptance` (verifies email/phone) | `end-to-end-substantive` |
| Rejection / expiry / revoke | `invitation_status` enum: `pending, accepted, rejected, preaccepted, expired, revoked` | `end-to-end-substantive` |
| Duplicate invitation | no uniqueness guard observed | `end-to-end-partial` |
| Role assignment, custom roles, bundles, member overrides | `tenant_roles`, `tenant_role_permissions`, `permission_bundles`, `member_permissions` | `end-to-end-substantive` |
| Delegation scopes | `delegation_scopes`, `delegation_audit_log` | `backend-foundation-ui-partial` |
| Owner role change / last-owner protection | UI blocks owner reassignment; the backend permits sole-owner demotion or removal | **`contradictory`** (R3-06) |
| Deactivation, removal, self-removal | direct `tenant_members` writes | `end-to-end-partial` |
| Cross-workspace membership | `tenant_members` | `end-to-end-substantive` |
| Audit logging | `role_audit_log`, `delegation_audit_log` | `end-to-end-substantive` |
| Membership notifications | no trigger on `tenant_members` | **missing** |

Authorization vocabulary throughout is the 104-key granular permission model (`hasPermission()` in the UI, `has_permission()` in RLS). No hardcoded role checks govern routing.

## 6. Horse identity, ownership, custody and access

### 6.1 Matrix — Horse Creation / Ownership / Custody

| Dimension | Object | Path | Classification |
|---|---|---|---|
| Identity (canonical) | `horses` | Stable- or Owner-created via the horse wizard | `end-to-end-substantive` |
| Identity (laboratory-local) | `lab_horses` | lightweight lab record, microchip-linked to canonical | `end-to-end-substantive` |
| Governed identity edit | `update_horse_identity` (SD; `authenticated` only, `anon` denied) | restricted identity-field RPC | `end-to-end-substantive` |
| Ownership | `horse_ownership` (percentages, primary flag) | `useHorseOwnership` direct writes | `end-to-end-partial` |
| Ownership history | `horse_ownership_history` | append | `end-to-end-substantive` |
| Ownership transfer notification | `send-ownership-notification` | **email-only** | `end-to-end-partial` |
| Owner claim | `owner_claim_requests`, `owner_claim_events`, `client_claim_tokens` | claim flow | `backend-foundation-ui-partial` |
| Custody / hosting | `boarding_contracts` → `boarding_admissions` → `housing_unit_occupants` | boarding chain | `end-to-end-substantive` |
| Customer relationship | `clients`, `materialize_owner_as_client` (internal-only ACL) | client registry | `end-to-end-substantive` |
| Consent | `consent_grants` | grant/revoke | `backend-foundation-ui-partial` |
| Access grants | `horse_owner_access_grants`, `owner_delegations`, `connection_horse_access`, `member_horse_access` | scoped access | `end-to-end-partial` |
| Public share | `horse_shares`, `horse_share_packs`, `get_horse_share_view` | tokenized read | `end-to-end-substantive` |
| Role links | `party_horse_links` | M:N roles | `backend-foundation-ui-partial` |
| Archive / deactivate | `is_archived`, `is_active` cascade | lifecycle chips | `end-to-end-substantive` |
| Hard delete | blocked when history exists | by design | `not-applicable` |

These ten dimensions are deliberately distinct. Identity is not ownership; ownership is not custody; custody is not a customer relationship; a consent grant is not a public share; and a `lab_horses` row is not a canonical horse.

## 7. Horse Owner and hosted-horse lifecycle

| Phase | State | Actor | Backend write | Notification | Financial effect | Classification |
|---|---|---|---|---|---|---|
| 1–3 | workspace → owner-created horse → unhosted | Owner | `tenants`, `horses` | none | none | `end-to-end-substantive` |
| 4–6 | stable selection → Boarding Contract request → `pending_stable` | Owner | `create_boarding_contract_with_connection` | **missing** | none | `end-to-end-substantive` |
| 7–9 | stable review → `pending_owner` → owner approval → `active` | Both | `approve_boarding_contract_as_stable`, `approve_boarding_contract_as_owner` | missing | plan snapshot frozen | `end-to-end-substantive` |
| 10–13 | arrival scheduling → confirmation → `arrived_pending_placement` | Stable | `incoming_horse_movements`, `confirm_incoming_movement` | in-app-record-and-push | none | `end-to-end-substantive` |
| 14–16 | admission → housing placement → hosted-horse visibility | Stable | `boarding_admissions`, `housing_unit_occupants` | in-app-record-and-push | accrual begins | `end-to-end-substantive` |
| 17 | owner sees hosted horse list | Owner | `get_owner_hosted_horses` | — | — | **defective ordering (R3-01)** |
| 18–21 | Service Request → stable response → fulfillment | Both | `create_service_request`, `service_request_events` | missing | conditional invoice | `end-to-end-partial` |
| 22–23 | internal Stable movement → owner exposure | Stable | `record_horse_movement_with_housing` | in-app-record-and-push | none | `end-to-end-substantive` |
| 24–27 | checkout → departure → housing release → contract end/cancel | Stable | admission `checked_out`, `cancel_boarding_contract` | missing | unbilled accruals block checkout | `end-to-end-substantive` |
| 28–30 | hosted → unhosted, historical visibility, final financial state | System | contract `ended` | missing | statement retains full history | `end-to-end-substantive` |

**Resolved question — owner exposure of internal Stable movements.** Internal movements are exposed to the owner automatically: `trg_notify_horse_movement` fires on `horse_movements`, and the movement is reflected in the owner's hosted-horse projection. No separate owner-publication step exists or is required.

## 8. Boarding Contract lifecycle

Four distinct concepts are kept separate throughout this document and must remain separate in the product surface:

1. **Boarding Contract request** — the initial request represented by `boarding_contracts.status ∈ {pending_stable, pending_owner}`.
2. **Hosted-horse Service Request** — an operational request on an already-hosted horse, stored in `service_requests`.
3. **Arrival scheduling** — `boarding_contracts.operational_phase` plus `incoming_horse_movements`.
4. **Admission** — `boarding_admissions`, the authoritative custody record.

The phrase "boarding request" is ambiguous and is not used.

**Contract status domain (live):** `pending_stable`, `pending_owner`, `active`, `cancelled`, `ended`.

**Known defect.** `get_owner_hosted_horses` ranks on the literal `'pending'`, which is not a member of that domain. Both `pending_stable` and `pending_owner` therefore fall into the terminated-status ranking group, so contracts awaiting action can be ordered below contracts that are already finished. Recorded as **R3-01**.

## 9. Arrival, admission, housing and movement

### 9.1 Authoritative arrival state machine

```text
contract.status = active
  └─ operational_phase = pending_arrival
       └─ schedule arrival ──────────> operational_phase = arrival_scheduled
             (incoming_horse_movements row, status = pending)
             ├─ reschedule ──────────> same phase, movement row updated
             ├─ cancel_incoming_movement ─> movement cancelled, phase reverts
             └─ confirm_incoming_movement ─> movement completed
                   └─ operational_phase = arrived_pending_placement
                         └─ boarding_admissions insert (status = active)
                               └─ operational_phase = admitted
                                     └─ housing_unit_occupants placement
                                           └─ checkout ─> admission = checked_out
                                                 └─ operational_phase = ended
```

Arrival is represented by `operational_phase` **plus** `incoming_horse_movements`. There is no separate arrival table, and arrival state is never held only in UI-local state. Invalid transitions are rejected inside the RPCs (fail-closed) and surfaced as mapped error messages.

### 9.2 Matrix — Boarding Contract Request → Contract → Arrival → Admission → Housing → Checkout

| Stage | Authoritative table | Synchronized objects | RPC | Classification |
|---|---|---|---|---|
| Request | `boarding_contracts` | — | `create_boarding_contract_with_connection` | `end-to-end-substantive` |
| Approval | `boarding_contracts` | frozen plan snapshot | `approve_boarding_contract_as_stable` / `_as_owner` | `end-to-end-substantive` |
| Arrival | `incoming_horse_movements` | `boarding_contracts.operational_phase` | `confirm_incoming_movement`, `cancel_incoming_movement` | `end-to-end-substantive` |
| Admission | `boarding_admissions` | contract, horse location fields | admission flow | `end-to-end-substantive` |
| Housing placement | `housing_unit_occupants` | `boarding_admissions` (authoritative) | placement flows | `end-to-end-substantive` |
| Internal transfer (same or cross branch) | `horse_movements` | occupants, `horses.current_*` | `record_horse_movement_with_housing` | `end-to-end-substantive` |
| External movement, isolation, temporary placement, return | `horse_movements`, `external_locations` | occupants | same RPC (subtypes) | `end-to-end-partial` |
| Correction / cancellation | `horse_movements` | occupants | `cancel_horse_movement` | `end-to-end-partial` |
| Checkout, release, ended history | `boarding_admissions` → contract | statement | checkout flow | `end-to-end-substantive` |

**Movement RPC contract (re-confirmed live).** `record_horse_movement_with_housing` has exactly one overload with `pronargs = 20`:
`(uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text, text, text, boolean, boolean, text, uuid, uuid, text, text)`.

**Synchronization rule.** `boarding_admissions` is the truth surface for custody. Direct inserts into `housing_unit_occupants` are prohibited; occupancy is always derived from an admission.

## 10. Hosted-horse Service Requests

| Request type | Backend gating | Fulfillment side effect | Notification | Classification |
|---|---|---|---|---|
| `extra_lab` | hosted + active contract, `_service_request_initial_fulfillment` | intended lab request | missing | `end-to-end-partial` |
| `extra_vet_visit` | same | intended vet visit | missing | `end-to-end-partial` |
| `extra_supplement` | same | informational | missing | `initiation-only` |
| `movement` | same | requires a separate Stable movement action | missing | `initiation-only` |
| `feeding_change` | same | informational | missing | `initiation-only` |
| `package_change` | same | requires a separate Stable commercial action | missing | `initiation-only` |
| `provider_preference` | same | informational | missing | `initiation-only` |
| `other` | same | informational | missing | `initiation-only` |

Lifecycle: create → pending → approve / reject / respond → cancel (`cancel_service_request`) → fulfill, with history in `service_request_events`.

**Product truth:** most Service Request types are **informational**. They record intent and notify no one automatically; the Stable must perform a separate operational action to satisfy them.

## 11. Laboratory

Each laboratory object has its own lifecycle and its own terminal action. They are never combined.

| Object | Live states | Terminal action | Reversible | Classification |
|---|---|---|---|---|
| `lab_requests` | `pending`, `received`, `processing`, `ready` | decision (`accepted` / `rejected` / `partial`) via `fn_recompute_request_decision` | no | `end-to-end-substantive` |
| `lab_submissions` | `pending` | submission decision via `fn_recompute_submission_decision` | no | `end-to-end-substantive` |
| `lab_samples` | `draft`, `accessioned`, `processing`, `completed`, `cancelled` | **cancel** | partially | `end-to-end-substantive` |
| `lab_results` | `draft`, `reviewed`, `final` | **final is immutable** — correction requires a new result, not a cancellation | no | `end-to-end-substantive` |
| `lab_report_shares` / `lab_result_shares` | active / revoked | **revoke** (`revoke_lab_report_share`) | yes | `end-to-end-substantive` |

Two workflows run over these objects:

- **A — internal LIMS:** catalog (`lab_services`, `lab_test_types`, `lab_templates`) → sample → accession → processing → result → review → final → report.
- **B — cross-account:** requester (Stable/Clinic) creates a request against a selected laboratory → submission container → per-horse child requests → decision → results and shares back to the requester.

Supporting lifecycles: credits (`lab_credit_wallets`, `lab_credit_transactions`), invoicing via the shared atomic finance RPCs, and tokenized public report/result access.

## 12. Veterinary Clinic

`vet_visits` → `vet_treatments` → `vet_medications` / `vet_followups`, with `horse_vaccinations` and `vaccination_programs` alongside. Clients come from `clients`; commercial rates come from `tenant_services`; invoicing uses the shared finance RPCs.

Terminal action: **complete** (soft), with history preserved. Owner visibility flows through the hosted-horse projection.

Classification: `end-to-end-substantive`.

## 13. Independent Veterinarian (Doctor)

| Dimension | Veterinary Clinic | Independent Veterinarian |
|---|---|---|
| Horse access | canonical `horses` plus housing context | `doctor_patients` linkage |
| Encounter record | `vet_visits` | `doctor_consultations` |
| Clinical detail | treatments, medications, vaccinations | `doctor_prescriptions` |
| Follow-up | `vet_followups` | `doctor_followups` |
| Commercial catalog | `tenant_services` | **`doctor_services` (divergent)** |
| Invoicing | shared finance RPCs | shared finance RPCs, but catalog mismatch |
| Write path | RPC-governed | **direct table writes** |
| Terminal action | complete (soft) | **hard delete** |
| Owner visibility | via hosted-horse projection | none confirmed |
| Classification | `end-to-end-substantive` | `end-to-end-partial` / `contradictory` |

**Terminal-action truth.** `doctor_consultations` has no completion or cancellation lifecycle in the UI layer: consultations are created, updated and **hard-deleted** directly, with no status guard and no history preservation. The supported terminal action is deletion. Recorded as **R3-08**. The catalog divergence between `doctor_services` and `tenant_services` remains known architectural debt.

## 14. Training Academy

| Stage | Present | Classification |
|---|---|---|
| Service / session setup, session creation, instructor assignment | `academy_sessions` (no status column) | `end-to-end-partial` |
| Horse / client association | columns present | `end-to-end-partial` |
| Booking, confirm, reject, cancel | `academy_bookings` (no live rows) | `backend-foundation-ui-partial` |
| Schedule view | `ScheduleCalendarView` | `view-only` |
| Attendance | absent | `not-applicable` |
| Payment, package usage | shared finance only | `shared-foundation-only` |
| Curriculum, training plan, progress | absent | `planned` |
| Completion / history | **no session status field → no terminal state** | terminal-path gap (R3-09) |

## 15. Services, products, inventory and POS

| Layer | Object | Stable | Clinic | Lab | Academy | Doctor | Pharmacy |
|---|---|---|---|---|---|---|---|
| Category | `tenant_service_categories` | yes | yes | yes | yes | separate | shared |
| Service | `tenant_services` (+ `lab_services`) | yes | yes | yes | yes | **`doctor_services`** | shared |
| Package | `stable_service_plans` | yes | partial | no | no | no | shared |
| Products | `products`, `product_categories` | shared | shared | shared | shared | shared | `shared-foundation-only` |
| Inventory | `warehouses`, `stock_levels`, `inventory_items`, `inventory_movements`, `inventory_transactions` | yes | yes | yes | — | — | `shared-foundation-only` |
| Suppliers | `suppliers`, `supplier_payables` | yes | yes | yes | — | — | shared |
| POS session | `pos_sessions` | yes | yes | yes | — | — | shared |
| POS sale | `pos_sales` (no live rows) with `create_pos_sale` | **`contradictory`** — hardened live RPC with zero repository migrations and zero frontend callers (R3-02) | | | | | |
| Source checkout | `create_source_checkout_invoice` + `EmbeddedCheckout` | `end-to-end-substantive` | | | | | |

**No Pharmacy-specific lifecycle exists.** Equine Pharmacy operates entirely on the shared product/inventory/POS/finance foundation: `shared-foundation-only`.

## 16. Finance lifecycles

### 16.1 Invoice status truth

Live invoice statuses in use: `draft`, `approved`, `shared`, `partial`, `paid`, `overdue`, `cancelled`.

The `invoices_status_check` constraint additionally permits `reviewed`, `issued` and `sent`. These three have **no live rows and no writer** anywhere in the RPC layer or the frontend.

**Canonical lifecycle:**

```text
draft ──> approved ──> shared ──> (partial | overdue) ──> paid
   │           │            │              │
   └──delete───┘            └──────────────┴────────────> cancelled (adjustment/reversal entry)
```

`reviewed`, `issued` and `sent` are **permitted-but-unused constraint members**. They are not lifecycle states and must not be documented, displayed, or relied upon. Recorded as **R3-10**.

### 16.2 Matrix — Invoice → Approval → Ledger → Payment → Balance

| Step | Writer | Guarantees | Terminal action | Classification |
|---|---|---|---|---|
| Draft create / update | `create_invoice_with_items`, `update_invoice_with_items` | atomic, backend-authoritative totals | delete (draft only) | `end-to-end-substantive` |
| Approval | `approve_invoice` → `_finance_invoice_approve_inline` | totals frozen, ledger posted in the same transaction | — | `end-to-end-substantive` |
| Ledger | `_finance_ledger_insert` (no `anon`/`authenticated` EXECUTE) | append-only, internal-only | — | `end-to-end-substantive` |
| Payment session | `post_payment_session` with `_finance_idempotency_begin` / `_complete` | advisory-locked, idempotent | `posted` (immutable) | `end-to-end-substantive` |
| Allocations | `payment_allocations`, `payment_horse_allocations` | in-session, immutable | — | `end-to-end-substantive` |
| Balance | `customer_balances`, derived from the ledger | derived, never manually set | — | `end-to-end-substantive` |
| Cancellation | `cancel_invoice` | adjustment/reversal entry, never a silent status flip | `cancelled` | `end-to-end-substantive` |
| Refund / credit note / chargeback | **absent** | — | — | **missing** |
| Expenses | create → approve → `post_expense_with_ledger` → `delete_expense` | ledger-posting | delete / reverse | `end-to-end-substantive` |
| Supplier payables | `supplier_payables` (no live rows) | — | unproven | `backend-foundation-ui-partial` |
| Statements | client statement surfaces, effective-date semantics, PDF/CSV/print | opening balance, in-range, customer-wide | — | `end-to-end-substantive` |

### 16.3 Payment reversibility — authoritative statement

`payment_sessions.status` is constrained to `{posted, voided}`. However:

- there are **zero voided sessions** live;
- **no function in the public schema references `voided`** — no RPC, no trigger;
- no frontend action or scheduled process sets it.

`voided` is therefore an **unreachable enum value**. Voiding does not reverse ledger entries, does not adjust allocations, and does not adjust balances, because voiding cannot occur. No refund, credit-note or chargeback workflow exists anywhere in the platform.

**Canonical rule: a posted payment session is terminal and immutable. Payment is NOT reversible.** The presence of the `voided` constraint member must never be cited as evidence of a reversal capability. Recorded as **R3-11**.

### 16.4 Overdue invoices

`mark-overdue-invoices` is a `CRON_SECRET`-guarded, service-role Edge Function. It performs a bulk update setting `status = 'overdue'` for invoices in `approved`, `shared` or `partial` with a past `due_date`. It is idempotent by construction (its own filter excludes already-overdue rows).

It **inserts no notification row, sends no push, and sends no email**. Failures return HTTP 500 with no retry and no alerting. Recorded as **R3-12**.

## 17. Connections, consents and cross-tenant access

| Relationship | Mechanism | Notification channel | Classification |
|---|---|---|---|
| Stable ↔ Laboratory | `connections`, `connection_horse_access` | in-app-record-and-push | `end-to-end-substantive` |
| Stable ↔ Horse Owner | connections, boarding contracts, `horse_owner_access_grants` | in-app-record-and-push (connection events only) | `end-to-end-substantive` |
| Stable ↔ Veterinary Clinic | connections | in-app-record-and-push | `end-to-end-substantive` |
| Stable ↔ Independent Veterinarian | connections, `consent_grants` | in-app-record-and-push | `end-to-end-partial` |
| Stable ↔ Independent Trainer | connections | in-app-record-and-push | `backend-foundation-ui-partial` |
| Stable ↔ Transport | connections, movement | in-app-record-and-push | `end-to-end-partial` |
| Academy ↔ Client | `clients` only | none | `shared-foundation-only` |
| Farrier / Professional Rider / Jockey | none | none | `planned` |

Lifecycle: `create_connection_request` → accept (`accept_connection`) / reject / expire (`expire_stale_connections`) / revoke, with `connection_rate_limits`, `connection_messages`, `sharing_audit_log`, and `auto_revoke_grants_on_connection_change` cascading access revocation.

Live distribution confirms the full lifecycle is exercised: revoked, accepted and pending connections all exist.

## 18. Contracts and documents

`contract_templates` → `contract_template_versions` → `contract_documents`, with `contract_document_events` recording 12 event types.

Status domain: `draft → sent_for_review → approved | rejected | cancelled | archived`.

RPC surface: `create_contract_template`, `clone_contract_template`, `archive_contract_template`, `create_contract_document_from_template`, `create_contract_document_blank`, `approve_contract_document`, `archive_contract_document`.

Boarding integration exists (`linked_boarding` event type). Breeding integration is declared in the `contract_type` enum but has no traced user-facing flow. The prototype rich-editor route remains reachable and is classified `legacy`.

Classification: `end-to-end-substantive` for documents; `legacy` for the prototype route.

## 19. Notifications

### 19.1 Channel taxonomy

Notification coverage is classified with channel-aware values, never as a single "push" label:

`in-app-record-and-push` · `in-app-record-only` · `push-without-in-app-record` · `email-only` · `audit-only` · `missing` · `unknown` · `not-applicable`

### 19.2 Matrix — notification coverage

| Lifecycle | Source | Channel |
|---|---|---|
| Onboarding / workspace creation | — | missing |
| Invitations | `send-invitation-email` | **email-only** |
| Membership change or removal | — | missing |
| Connection created / status change | `trg_notify_connection_created`, `trg_notify_connection_status_change` | in-app-record-and-push |
| Consent grant / revoke | — | missing |
| Ownership transfer | `send-ownership-notification` | **email-only** |
| Boarding Contract request | — | missing |
| Boarding Contract approval / end | — | missing |
| Arrival (incoming movement) | `trg_notify_incoming_movement` | in-app-record-and-push |
| Admission | `trg_notify_boarding_admission` | in-app-record-and-push |
| Housing placement / release | — | missing |
| Movement | `trg_notify_horse_movement` | in-app-record-and-push |
| Hosted-horse Service Requests | — | missing |
| Lab request created / updated / message | `trg_notify_lab_request_created`, `trg_notify_lab_request_updated`, `trg_notify_lab_request_message` | in-app-record-and-push |
| Lab result finalized / report shared | — | missing |
| Vet, Doctor, Academy lifecycles | — | missing |
| Contract documents | — | missing |
| Invoices, payments, expenses | — | missing |
| Overdue invoices | `mark-overdue-invoices` | **missing** |
| Community | — | missing |
| Media / report share issue, expiry, revoke | `log_sharing_event` | **audit-only** |

### 19.3 Assessment

The delivery infrastructure is sound: `_notify_tenant_members`, `notification_preferences`, `tenant_notification_governance`, `push_subscriptions`, the `send-push-notification` Edge Function, an immutability guard, an actor-stamping trigger, a deduplication window, localized metadata, and route descriptors.

**Only eight real event triggers exist** (arrival, admission, movement, three laboratory events, two connection events). The gap is coverage, not plumbing.

## 20. Community and representation

Five facts, kept strictly separate:

1. **RLS capability** — `posts`, `post_comments` and `post_likes` all carry both personal (`tenant_id IS NULL`) and tenant-scoped policies.
2. **Author identity** — post creation always writes `author_id = user.id`. Authorship is **personal**, in every mode.
3. **Scope** — `tenant_id` **is** written when `workspaceMode === "organization"`, and the feed filters on it; personal mode filters on `tenant_id IS NULL`.
4. **Comments and likes** — same pattern: personal `user_id` with tenant scoping.
5. **Alternate establishment publishing surface** — none exists, through UI or RPC.

**Canonical rule.** Community posts are already **tenant-scoped** in Establishment Mode, but **authorship remains personal**. Organization publishing as *representation* is **not implemented**; what exists is scope, not identity. The approved future rule — establishment-attributed authorship — remains an architectural rule, not current behavior.

Classification: `backend-foundation-ui-partial`, with commercial-overclaim risk. Recorded as **R3-13**.

## 21. Files, media and public sharing

Both storage buckets (`horse-media`, `database_export_20_07_26`) are **private**. No public bucket exists.

| Surface | Reader | Returns | Signing | Behavior after revocation |
|---|---|---|---|---|
| SharedMedia | `get_media_share_info` → `shared-media-sign` Edge Function | bucket + path, then a service-role signed URL (TTL 3600s) | yes | RPC filters revoked and expired links, but **already-issued URLs remain valid for up to 3600 seconds** |
| SharedLabReport | `get_shared_lab_report` | JSON metadata only; raises on revoked or expired | no | **immediate** |
| SharedLabResult | `get_shared_lab_result` | tabular result metadata only | no | **immediate** |
| SharedHorseReport / horse share | `get_horse_share_view` | JSON including media `bucket` and `path`; returns a revoked error when revoked | no signer in the RPC — paths are inert against a private bucket | **immediate** |
| Unified horse file projection | `get_unified_horse_file_projection_by_share_token` | JSON projection | no | token-validated |

**Canonical rule: only SharedMedia has a bounded post-revocation window (≤ 3600 seconds). All other share surfaces revoke immediately.** Recorded as **R3-05**.

## 22. Cancellation, reversal, archive and deletion

| Entity | Supported terminal action | Backend | History / audit | Hard-delete risk |
|---|---|---|---|---|
| Workspace | none | — | — | not-applicable |
| Membership | remove (direct delete) | table write | `role_audit_log` | **sole-owner orphan (R3-06)** |
| Invitation | reject / revoke / expire | status | yes | none |
| Connection | revoke / expire | `expire_stale_connections` | `sharing_audit_log` | none |
| Consent | revoke | consent RPC | yes | none |
| Horse | archive / deactivate | `is_archived` / `is_active` | yes | blocked when history exists |
| Ownership | transfer | `horse_ownership_history` | yes | none |
| Access grant | auto-revoke on connection change | trigger | audit | none |
| Boarding Contract request | cancel from `pending_*` | RPC | yes | none |
| Boarding Contract | cancel / end | `cancel_boarding_contract` | `boarding_status_history` | none |
| Admission | checkout | RPC | yes | blocked by unbilled accruals |
| Occupancy | released via admission | RPC | yes | direct insert prohibited |
| Movement | cancel | `cancel_horse_movement` | yes | none |
| Service Request | cancel | `cancel_service_request` | `service_request_events` | none |
| Lab request | decision | `fn_recompute_request_decision` | `lab_events` | none |
| Lab submission | decision | `fn_recompute_submission_decision` | `lab_events` | none |
| Lab sample | **cancel** | status | yes | none |
| Lab result | **final = immutable** | — | yes | none |
| Lab report / result share | revoke | `revoke_lab_report_share` | audit | none |
| Vet visit / treatment / follow-up | complete (soft) | status | yes | none |
| **Doctor consultation** | **hard delete** | direct delete | **none** | **HIGH (R3-08)** |
| **Doctor prescription / follow-up** | delete (unguarded) | direct writes | none | **HIGH** |
| Academy session | **none — no status column** | — | — | terminal-path gap (R3-09) |
| Academy booking | cancel (schema only) | table | — | unproven |
| Invoice | cancel (adjustment) / delete draft | `cancel_invoice`, `delete_draft_invoice` | ledger | none |
| Payment intent | status change | table | yes | none |
| **Payment session** | **`posted` is terminal and immutable; `voided` unreachable** | — | yes | none |
| Payment allocation | immutable | — | yes | none |
| Expense | delete / reverse | `delete_expense` | ledger | none |
| Supplier payable | unproven | — | — | unknown |
| Contract document | cancel / archive | RPCs | `contract_document_events` | none |
| Notification | immutable (guard trigger) | — | yes | none |
| Media share | revoke | `revoked_at` | audit | ≤ 3600s residual URL |
| Horse share | revoke | `revoke_horse_share` | `log_horse_share_change` | none |
| Community post | **hard delete** | direct delete | none | medium |
| Community comment | **hard delete** | direct delete | none | medium |

## 23. Post-onboarding dossiers — all 10 current types

### 23.1 Stable — domain-substantive

Seeded capabilities: laboratory (requests), housing, movement, breeding enabled; vet disabled. Landing: main dashboard. Navigation: Horses, Housing, Movement, Boarding, Breeding, Vet records, Services, Finance, Team, Community.
First meaningful action: create a branch and a facility. First complete end-to-end workflow: horse registration → admission → housing placement → invoice → payment. First incomplete workflow: hosted-horse Service Request fulfillment. First dead end: a `package_change` request with no linked follow-through action.
Shared modules: finance, inventory, POS, contracts. Dedicated modules: housing, boarding, breeding. Required connections: optional (Owner, Laboratory). Finance: full. Notification coverage: arrival, admission, movement, laboratory only. Terminal paths: complete.
Workflow maturity: `end-to-end-substantive`. Release warning: notification coverage gaps. Confidence: high.

### 23.2 Veterinary Clinic — domain-substantive

Seeded capabilities: vet, housing, movement, laboratory (requests) enabled; breeding disabled. First meaningful action: create a client and a service. First complete workflow: visit → treatment → invoice → payment. First incomplete workflow: vaccination-programme scheduling automation. First dead end: no owner-facing notification of clinical events.
Maturity: `end-to-end-substantive`. Confidence: high.

### 23.3 Laboratory — domain-substantive

Seeded capabilities: laboratory full only. Landing: laboratory dashboard, with lab-mode UI isolation enforced by redirects away from stable-mode service surfaces. First meaningful action: build the test catalog. First complete workflow: request → submission → sample → result → final → report share → invoice → payment. First incomplete workflow: amendment or correction of a finalized result. First dead end: no notification on result finalization.
Maturity: `end-to-end-substantive`. Confidence: high.

### 23.4 Training Academy — shell

Seeded capabilities: all five disabled. Landing: generic dashboard. First meaningful action: create a session. **First complete end-to-end workflow: none.** First incomplete workflow: booking. First dead end: sessions have no status field and therefore no terminal state; attendance, curriculum and progress do not exist. Finance: shared only. Notifications: none.
Maturity: `backend-foundation-ui-partial`. **Commercial-release warning: Academy must not be presented as operational.** Confidence: high.

### 23.5 Equine Pharmacy — shell

No pharmacy-specific tables, RPCs, routes or capability category. Operates purely on shared products, inventory, POS and finance. First complete workflow: a POS/source-checkout sale. First dead end: no dispensing, prescription-fulfillment or controlled-substance lifecycle.
Maturity: `shared-foundation-only`. **Commercial-release warning: high overclaim risk.** Confidence: high.

### 23.6 Horse Transport — shell

Seeded capabilities: movement only. Reuses `horse_movements` and `external_locations`. First complete workflow: record a movement. First dead end: no transport job, route, fleet, driver or transport pricing lifecycle.
Maturity: `shared-foundation-only`. Confidence: high.

### 23.7 Horse Auction — shell

No auction tables exist; the only trace is the `auction` member of `payment_reference_type`. No lots, bids, catalogues, reserves or settlement.
Maturity: `placeholder`. **Commercial-release warning: highest overclaim risk of any current type.** Confidence: high.

### 23.8 Horse Owner — domain-partial

Seeded capabilities: all five disabled (the owner workspace is a paid industry tenant workspace, not a module-bearing establishment). Landing: owner dashboard. First meaningful action: register a horse. First complete workflow: horse → Boarding Contract request → approval → hosted visibility → statement. First incomplete workflow: Service Request fulfillment. First dead end: hosted-horse pending ordering defect (R3-01). Finance: statement-oriented. Notifications: arrival, admission, movement only.
Maturity: `end-to-end-partial`. Confidence: high.

### 23.9 Independent Trainer — shell

No trainer-specific tables or lifecycle. Reuses connections, horses and finance. First dead end: no training assignment, session or progress lifecycle.
Maturity: `shared-foundation-only`. Confidence: medium.

### 23.10 Independent Veterinarian — domain-partial

Seeded capabilities: all disabled, including `vet` (the `doctor_*` tables are the surface, not the shared Vet module). Tables: `doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_followups`, `doctor_services`. Writes are direct table mutations without RPC governance; the terminal action is hard delete. Billing uses `doctor_services`, divergent from `tenant_services`.
First complete workflow: patient → consultation → prescription (without invoice catalog parity). First dead end: the invoice catalog mismatch.
Maturity: `end-to-end-partial` / `contradictory`. **Commercial-release warning: clinical data loss on consultation delete.** Confidence: high.

### 23.11 Matrix — Account Type → First Meaningful Workflow

| Type | First meaningful action | First complete end-to-end workflow | Maturity |
|---|---|---|---|
| Stable | create branch and facility | admission → invoice → payment | domain-substantive |
| Veterinary Clinic | create client and service | visit → invoice → payment | domain-substantive |
| Laboratory | build test catalog | request → final result → invoice | domain-substantive |
| Training Academy | create session | **none** | shell |
| Equine Pharmacy | add product | POS sale | shell |
| Horse Transport | record movement | movement only | shell |
| Horse Auction | none | **none** | placeholder |
| Horse Owner | register horse | contract → hosted visibility | domain-partial |
| Independent Trainer | connect to a stable | none | shell |
| Independent Veterinarian | add patient | consultation (ungoverned) | domain-partial |

## 24. Planned-type flow readiness

| Requirement | Farrier | Professional Rider | Jockey |
|---|---|---|---|
| Reusable foundations | connections, consent, horses, `tenant_services`, finance, notification infrastructure | same | same |
| Required onboarding | specialist profile plus service catalog | rider profile plus discipline | licence and registration body |
| Required first workflow | shoeing visit record | ride/training assignment | race engagement |
| Horse / client relationship | `party_horse_links` role extension | `party_horse_links` | `party_horse_links` |
| Cross-account connection | Stable ↔ Farrier | Stable ↔ Rider | Owner/Trainer ↔ Jockey |
| Consent / access | `consent_grants`, `connection_horse_access` | same | same |
| Service lifecycle | visit → record → invoice | assignment → session → fee | engagement → result → fee |
| Scheduling | **absent** — no shared scheduler exists | absent | absent |
| Records / history | new domain tables required | required | required |
| Billing / payment | reusable finance RPCs | reusable | reusable |
| Notifications | none — must be authored | none | none |
| Community identity | blocked by personal-authorship limitation | blocked | blocked |
| Cancellation / closure | must be defined | must be defined | must be defined |
| Bilingual / mobile | shared i18n and mobile shell reusable | reusable | reusable |
| Blockers | no scheduler, no establishment representation, no notification coverage | same | same, plus external licence data |
| Classification | `planned` | `planned` | `planned` |

## 25. Frontend ↔ backend state-machine reconciliation

| Domain | Frontend state | Backend truth | Reconciled |
|---|---|---|---|
| Boarding contract | single status shown | two axes: `status` plus `operational_phase` | partial — UI collapses two axes |
| Hosted-horse ordering | ordered list | dead `'pending'` literal in the ranking branch | **no (R3-01)** |
| Owner role | UI blocks owner reassignment | backend permits sole-owner demotion | **no (R3-06)** |
| Tenant capabilities | type-based fallback | `tenant_capabilities` rows | coincidentally aligned; drift is invisible (R3-04) |
| Invoice status | 7 UI states | 10 constraint members | partial — 3 unused values (R3-10) |
| Payment session | treated as final | `voided` permitted but unreachable | contradictory enum (R3-11) |
| POS sale | no frontend caller | live hardened RPC and generated types | **no (R3-02)** |
| Doctor consultation | implies edit/delete | no status guard, hard delete | aligned but unsafe (R3-08) |
| Academy session | implies a lifecycle | no status column | **no (R3-09)** |
| Media share revocation | implies immediate | ≤ 3600s residual signed URL | **no (R3-05)** |

## 26. Failure, dead-end and recovery register

| ID | Type | Lifecycle | Route / component | Actual result | Persisted partial state | Recovery | Severity |
|---|---|---|---|---|---|---|---|
| F-01 | swallowed initialization | workspace creation | tenant context | apparent success | tenant without capability rows | incidental (module toggle) | medium |
| F-02 | sole-owner removal | membership | member role assignment | succeeds | ownerless workspace | none | high |
| F-03 | pending ordering | hosted horses | `get_owner_hosted_horses` | wrong sort order | none | none | medium |
| F-04 | shell onboarding dead end | onboarding | Academy, Pharmacy, Auction, Transport, Trainer | no first workflow | none | none | high (commercial) |
| F-05 | missing prerequisite | any | branch / client / connection / provider selectors | empty selector | none | mitigated by the in-context Creation Bridge | low |
| F-06 | invalid lifecycle transition | boarding, movement | RPCs | mapped error message | none | retry | low |
| F-07 | missing terminal action | academy | session surfaces | session never closes | open row | none | medium |
| F-08 | stale signed URL | sharing | `shared-media-sign` | access persists ≤ 3600s after revocation | none | wait out the TTL | medium |
| F-09 | silent status change | finance | `mark-overdue-invoices` | status flips with no notification | status changed | manual review | medium |
| F-10 | failed finance RPC | finance | finance dialogs | mapped `FIN_*` error | none (atomic) | retry | low |
| F-11 | legacy route | contracts | prototype rich editor | reachable prototype surface | none | avoid | low |
| F-12 | mobile placeholder | mobile shell | mobile module page | partial module surface | none | use desktop | low |
| F-13 | clinical data loss | doctor | consultation hook | hard delete with no history | record destroyed | **none** | high |

## 27. Test-coverage matrix

Inventory: 19 Vitest files, 5 SQL harnesses, 1 finance-scoped CI workflow, **no `test` script in `package.json`**, **no Playwright E2E specifications**.

| Workflow | Unit | Component | Integration | SQL | RLS / authz | E2E | Verdict |
|---|---|---|---|---|---|---|---|
| Onboarding | — | — | — | — | — | — | absent |
| Membership and invitations | — | — | — | — | — | — | absent |
| Horse ownership | — | — | — | — | — | — | absent |
| Boarding contracts | — | — | — | — | — | — | absent |
| Arrival and admission | — | — | — | — | — | — | absent |
| Housing and movement | — | — | — | — | — | — | absent |
| Service Requests | — | — | — | — | — | — | absent |
| Laboratory chain | — | — | — | partial | — | — | manual only |
| Vet, Doctor, Academy | — | — | — | — | — | — | absent |
| Inventory and POS | — | — | — | partial | — | — | partial |
| Invoices | yes | — | yes | yes | — | — | strongest |
| Payments | yes | — | yes | yes | — | — | strongest |
| Expenses and statements | partial | — | — | — | — | — | manual only |
| Connections and consent | — | — | — | — | — | — | absent |
| Documents | — | — | — | — | — | — | absent |
| Notifications | — | — | — | — | — | — | absent |
| Community | — | — | — | — | — | — | absent |
| Sharing | — | — | — | — | — | — | absent |

## 28. Arabic, English, RTL, mobile, time and number findings

Scope: lifecycle-impacting UI only.

| Aspect | Current truth |
|---|---|
| Arabic / English keys | centralized locale files, with i18n and RTL audit scripts and allowlists |
| RTL / LTR | RTL layout standard applied (flex-grow trailing balance); toolbars wrap-responsive |
| Mobile-first | mandatory standard applied; the mobile module shell remains partial |
| Drawers and dialogs | workspace-class contract — fixed header/footer, single scrollable body, no nested scroll traps |
| Long lists and tables | finance and laboratory lists paginate; long invoice PDFs use the unified paginator with localized footers |
| Loading, empty, error, retry | present across guards and finance; sparser in Academy and Doctor surfaces |
| Digits | Western 0–9 enforced in financial and date surfaces |
| Time | 12-hour, with صباحًا / مساءً in Arabic and AM / PM in English |
| Dates | standardized shared date field; effective-date semantics enforced in finance |
| Currency | tenant-level default currency applied universally |
| Desktop/mobile parity | some finance editors (multi-invoice allocation) are cramped on mobile — presentation-level residual |

No blocking localization defect exists.

## 29. Cross-flow dependency map

```text
Identity ──> Workspace ──> Capabilities ──┬──> Module routes  (ModuleGuard)
                        └──> Permissions ─┴──> Feature routes (WorkspaceRouteGuard)

Horse identity ──> Ownership ──> Connection ──> Boarding Contract
      │                                            └─> Arrival ──> Admission ──> Housing
      │                                                                  └─> Movement
      ├──> Lab request ──> Submission ──> Sample ──> Result ──> Share
      ├──> Vet visit  /  Doctor consultation
      └──> Hosted-horse Service Request ──> [separate manual Stable action]

Any billable event ──> tenant_services ──> invoice_items ──> Invoice
      ──> approve ──> ledger ──> payment_session ──> allocations ──> customer_balance ──> Statement

Notification coverage depends on 8 event triggers only:
   arrival · admission · movement · lab request created/updated/message · connection created/status

Sharing depends on token rows over private buckets;
only SharedMedia involves a signer, and therefore only SharedMedia has a post-revocation window.
```

## 30. Defect and risk register

| ID | Category | Lifecycle | Finding | Severity | Active blocker | Release blocker | Security | Finance |
|---|---|---|---|---|---|---|---|---|
| R3-01 | confirmed defect | hosted horses | `get_owner_hosted_horses` ranks on the dead literal `'pending'`, so pending contracts sort with terminated ones | medium | yes | no | no | no |
| R3-02 | schema drift | POS | `create_pos_sale` is a hardened live RPC with zero migrations, zero callers, zero rows, and an anomalous `anon` EXECUTE grant; not anonymously exploitable | medium | no | yes | yes | yes |
| R3-03 | future enhancement | payments | `post_payment` is an internal hardened primitive; `post_invoice_payments` is callable but superseded; neither is a dangerous parallel write path | low | no | no | yes | yes |
| R3-04 | incomplete lifecycle | onboarding | `initialize_tenant_defaults` failure is swallowed and reported as success, with no repair path; mitigated by fallback parity and currently unmaterialized | medium | no | no | no | no |
| R3-05 | security question | sharing | SharedMedia signed URLs remain valid up to 3600s after revocation; all other share surfaces revoke immediately | medium | yes | no | yes | no |
| R3-06 | security question | membership | no backend last-owner protection — sole-owner demotion or removal is reachable despite the UI block | high | no | **yes** | yes | no |
| R3-07 | test gap | all | non-finance workflow coverage is materially sparse; no `test` script and no E2E specifications | high | no | yes | yes | yes |
| R3-08 | terminal-path gap | doctor | consultations, prescriptions and follow-ups are hard-deleted with no history and no RPC governance | high | yes | **yes** | no | no |
| R3-09 | terminal-path gap | academy | `academy_sessions` has no status column, so sessions have no terminal state | medium | yes | yes | no | no |
| R3-10 | documentation gap | finance | `reviewed`, `issued` and `sent` are permitted invoice constraint members with no writer and no rows | low | no | no | no | yes |
| R3-11 | finance-integrity question | payments | `payment_sessions.voided` is an unreachable enum value that must not be read as reversal capability | low | no | no | no | yes |
| R3-12 | notification gap | finance | `mark-overdue-invoices` emits no notification on any channel | medium | yes | no | no | yes |
| R3-13 | commercial-overclaim risk | community | establishment representation is absent — posts are tenant-scoped but personally authored | medium | yes | yes | no | no |

## 31. Current end-to-end workflow verdicts

| Workflow | Verdict |
|---|---|
| Identity → workspace activation | `end-to-end-substantive` |
| Workspace creation and initialization | `frontend-guided-backend-partial` |
| Invitations and roles | `end-to-end-substantive` (owner guard `contradictory`) |
| Horse identity and ownership | `end-to-end-substantive` |
| Horse Owner hosted-horse lifecycle | `end-to-end-partial` |
| Boarding → arrival → admission → housing → checkout | `end-to-end-substantive` |
| Movement | `end-to-end-substantive` |
| Hosted-horse Service Requests | `initiation-only` |
| Laboratory | `end-to-end-substantive` |
| Veterinary Clinic | `end-to-end-substantive` |
| Independent Veterinarian | `end-to-end-partial` / `contradictory` |
| Training Academy | `backend-foundation-ui-partial` |
| Services, inventory and POS | `end-to-end-partial` (POS sale `contradictory`) |
| Invoice → ledger → payment → balance | `end-to-end-substantive` |
| Refund / reversal | `not-applicable` (absent) |
| Connections and consent | `end-to-end-substantive` |
| Contracts and documents | `end-to-end-substantive` (plus one `legacy` route) |
| Notifications | `end-to-end-partial` |
| Community | `backend-foundation-ui-partial` |
| Sharing | `end-to-end-substantive` (SharedMedia bounded residual) |

## 32. Maintenance

This document must be re-verified whenever any of the following change:

- the `tenant_type` enum, `initialize_tenant_defaults`, or `useModuleAccess`;
- `boarding_contracts.status` / `operational_phase`, `boarding_admissions`, or `record_horse_movement_with_housing`;
- the invoice status constraint, the finance RPC surface, or `payment_sessions`;
- notification triggers or Edge Function notification behavior;
- share token readers, storage bucket visibility, or the media signer;
- Community authorship or scoping logic;
- the doctor, academy, or laboratory terminal-action paths.
