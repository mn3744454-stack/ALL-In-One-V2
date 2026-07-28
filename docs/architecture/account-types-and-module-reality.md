<!--
id: DHB-ARCH-ACCOUNT-MODULE-REALITY
title: Dayli Horse — Account Types, Complete Module Inventory, Current Implementation Reality & Planned-Type Readiness
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during R2 canonical architecture authoring (Round 2); built from the R2 Investigative Audit and the R2 Final Evidence Alignment Audit; aligned to accepted architecture reference DHB-ARCH-ACCOUNT-TYPES-IDENTITY v1.0.0 and to the first documentation package accepted at commit b153fb4c.
source-sha256: n/a
-->

# Dayli Horse — Account Types, Complete Module Inventory, Current Implementation Reality & Planned-Type Readiness

> Current-truth architecture reference. Where this document conflicts with historical documentation, source code, migrations, and live database state remain authoritative. Where this document conflicts with older non-canonical text, this document wins.

---

## 1. Document Identity and Authority

| Field | Value |
|---|---|
| Document ID | `DHB-ARCH-ACCOUNT-MODULE-REALITY` |
| Version | 1.0.0 |
| Status | Current / Accepted Architecture Reference |
| Audience | Authorized development partners, maintainers, auditors, project owner |
| Authoring round | Round 2 (R2) |
| Authoring basis | R2 Investigative Audit + R2 Final Evidence Alignment Audit |
| Aligned to | `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` v1.0.0 (`docs/architecture/account-types-and-identity-model.md`) |
| First-package baseline | commit `b153fb4c` (Round 1 remains closed) |
| Verification date | 2026-07-28 |

This document is authored under `docs/CONVENTIONS.md`. It is **additive**: it does not modify the accepted Round 1 package, does not modify historical evidence, and does not modify application source, database objects, or configuration.

---

## 2. Purpose and Scope

This document establishes canonical current truth for:

- the **10** current implemented account/workspace types;
- the **3** planned account/workspace types;
- the **13** approved target total;
- implementation depth of each current type;
- the complete shared and domain-specific module inventory;
- current frontend/backend reality per module and per account type;
- post-onboarding usability;
- module activation and capability truth;
- planned-type readiness;
- contradictions, gaps, risks, and rescinded findings;
- future-topic destinations.

The document explicitly separates:

1. Workspace-type existence (enum + onboarding).
2. Dedicated domain implementation.
3. Shared-module availability.
4. Backend foundation depth.
5. Post-onboarding usability.
6. Commercial readiness.
7. Launch readiness.

**Enum existence and onboarding-route existence are never treated as proof of production readiness.** A `tenant_type` value plus a `SelectRole` entry plus a `create-profile/<slug>` route is an onboarding shell; it does not guarantee dedicated domain workflows, capability defaults, or user-visible depth.

---

## 3. Evidence Hierarchy and Verification Date

Evidence precedence (highest first):

1. Live database state (`pg_catalog`, `information_schema`, live rows).
2. Migrations (`supabase/migrations/**`) and generated types (`src/integrations/supabase/types.ts`).
3. Application source (`src/**`), including `TenantContext`, `useTenantCapabilities`, `useModuleAccess`, `App.tsx`, `SelectRole.tsx`, `CreateStableProfile.tsx`, and `src/navigation/**`.
4. Accepted current-truth architecture references (`DHB-ARCH-ACCOUNT-TYPES-IDENTITY`).
5. Accepted Round 1 canonical handoff artifacts (`DHB-R01-DEV`, `DHB-R01-INT`, `DHB-R01-ACC`).
6. Historical evidence in `docs/historical/**` (retained but subordinate).

Verification date: **2026-07-28**. Point-in-time counts (167 non-internal `public`-schema triggers, 20-parameter Movement RPC, capability rows for live Stable tenants, and the classification of the seven fail-closed RPC-only tables) reflect this date and this repository state.

---

## 4. Identity and Account-Type Model Reference

The identity, workspace, role, profession, capability, permission and scope model is defined authoritatively in:

- **`docs/architecture/account-types-and-identity-model.md`** — `DHB-ARCH-ACCOUNT-TYPES-IDENTITY` v1.0.0.

Key concepts reused throughout this document without redefinition:

- **Personal Mode** — the individual person's identity (community, personal bookings, personal payments, contracts, personal profile). Independent of any workspace tenant.
- **Establishment / Workspace Mode** — an active tenant of a specific `tenant_type` with tenant-scoped modules and permissions.
- **`tenant_role`** — membership role inside a tenant (`owner`, `admin`, `foreman`, `vet`, `trainer`, `employee`, `manager`).
- **`hr_employee_type`** — HR profession label (includes `trainer`, `farrier`, `groom`, `vet_tech`, etc.). **Not** a workspace type.
- **Capability** (`tenant_capabilities.category`) — per-tenant activation for `breeding`, `housing`, `laboratory`, `movement`, `vet`.
- **Permission** (`permission_definitions.key`, 104 keys) — granular authorization checked via `has_permission()` server-side and `hasPermission()` client-side.
- **Community Publishing Identity Principle** — publishing identity is the active workspace context; personal identity is used only when no workspace is active.

Naming collisions to avoid throughout:

- `trainer` as **workspace `tenant_type`** ≠ `trainer` as **`tenant_role`** ≠ `trainer` as **`hr_employee_type`**.
- `farrier` as an **HR profession label** ≠ a Farrier **workspace type** (there is no Farrier workspace type today).

---

## 5. Current / Planned / Target Count Contract

Use exactly this contract throughout the platform documentation.

- **Current implemented account/workspace types: 10.**
- **Planned account/workspace types: 3.**
- **Approved target total: 13.**

Current implemented (`tenant_type` enum values, verified live):

1. Stable — `stable`
2. Veterinary Clinic — `clinic`
3. Laboratory — `lab`
4. Training Academy — `academy`
5. Equine Pharmacy — `pharmacy`
6. Horse Transport — `transport`
7. Horse Auction — `auction`
8. Horse Owner — `horse_owner`
9. Independent Trainer — `trainer`
10. Independent Veterinarian — `doctor`

Planned (not present in `tenant_type` enum; no onboarding; no dedicated modules; no capability defaults; no dedicated schema; no workflows):

11. Farrier
12. Professional Rider
13. Jockey

**Never** state or imply that Farrier, Professional Rider, or Jockey currently have a `tenant_type` value, a `SelectRole` entry, a `create-profile/<slug>` route, dedicated modules, dedicated schema, or production-ready workflows.

---

## 6. Workspace-Type Existence vs Domain Maturity

Two independent axes must be distinguished on every account type:

- **Workspace-type existence** — is the type present in `tenant_type`, wired into `SelectRole`, and has an onboarding shell?
- **Domain maturity** — is there dedicated UI + backend + meaningful workflows for the domain that type represents?

Existence is binary (enum present or not). Maturity is graded by the taxonomy in §7. An `onboarding-placeholder` type has full workspace existence but zero (or negligible) domain maturity. A `shared-foundation-only` type has full workspace existence and reuses substantive shared modules but has no dedicated domain module.

---

## 7. Canonical Account-Type Classification Taxonomy

Exactly seven classes are permitted; each is a single axis (account-type maturity), never mixed with module status.

1. **`domain-substantive`** — dedicated domain UI + backend + meaningful end-to-end workflows.
2. **`domain-partial`** — dedicated domain UI and backend exist, but lifecycle depth is incomplete.
3. **`shared-foundation-only`** — the account type uses shared modules but has no dedicated domain workflow.
4. **`backend-foundation-partial`** — material domain backend exists, but user-facing workflow is incomplete.
5. **`onboarding-placeholder`** — enum + `SelectRole` + onboarding route exist; no meaningful domain implementation.
6. **`planned-no-workspace-foundation`** — not a current `tenant_type`; no onboarding or workspace implementation.
7. **`planned-role-reference-only`** — not a workspace type; only HR, `tenant_role`, or profession-name references exist.

Rules:

- Never use `frontend-only` where shared backend is reused.
- Never use `backend-only` where meaningful shared UI is reused.
- Live tenant count is evidence of current use only and is not a maturity signal.

---

## 8. Canonical Module Status Taxonomy

Module-status classes (a separate axis from account-type maturity):

- `active-substantive` — deep implementation, end-to-end.
- `active-partial` — real workflows with known gaps.
- `shared-generic` — cross-type generic surface reused by many account types.
- `backend-foundation` — meaningful backend without matching UI depth.
- `schema-only` — tables exist without workflow.
- `placeholder` — name/route/shell only.
- `legacy` — retained but superseded.
- `contradictory` — duplicated or drifting surfaces.
- `planned` — target module without current surface.
- `not-applicable` — module not available to a given account-type axis.

Decoupling example:

- Horse Transport account type = `shared-foundation-only`.
- Movement module = `active-substantive`.
- Transport dispatch/fleet domain = `planned` (not implemented).

---

## 9. Current 10-Type Census

| # | Display name | `tenant_type` | Onboarding route | `SelectRole` entry | Live tenants observed | Notes |
|---|---|---|---|---|---|---|
| 1 | Stable | `stable` | `/create-profile/stable` | yes | 4 | Primary development focus |
| 2 | Veterinary Clinic | `clinic` | `/create-profile/clinic` | yes | 0 | Vet + shared coverage |
| 3 | Laboratory | `lab` | `/create-profile/lab` | yes | 2 | Second-most-mature; isolated LIMS |
| 4 | Training Academy | `academy` | `/create-profile/academy` | yes | 0 | Sessions/Bookings + shared |
| 5 | Equine Pharmacy | `pharmacy` | `/create-profile/pharmacy` | yes | 0 | Shared inventory/POS/services/finance |
| 6 | Horse Transport | `transport` | `/create-profile/transport` | yes | 0 | Shared movement/finance |
| 7 | Horse Auction | `auction` | `/create-profile/auction` | yes | 0 | Onboarding shell only |
| 8 | Horse Owner | `horse_owner` | `/create-profile/horse-owner` | yes | 2 | Dedicated owner surfaces |
| 9 | Independent Trainer | `trainer` | `/create-profile/trainer` | yes | 0 | Onboarding shell only |
| 10 | Independent Veterinarian | `doctor` | `/create-profile/doctor` | yes | 1 | Dedicated doctor surfaces |

Live tenant counts are point-in-time and are not a maturity signal.

---

## 10. Current Account-Type Executive Classification Matrix

| Account type | `tenant_type` | Canonical classification |
|---|---|---|
| Stable | `stable` | `domain-substantive` |
| Veterinary Clinic | `clinic` | `domain-partial` |
| Laboratory | `lab` | `domain-substantive` |
| Training Academy | `academy` | `domain-partial` |
| Equine Pharmacy | `pharmacy` | `shared-foundation-only` |
| Horse Transport | `transport` | `shared-foundation-only` |
| Horse Auction | `auction` | `onboarding-placeholder` |
| Horse Owner | `horse_owner` | `domain-partial` |
| Independent Trainer | `trainer` | `onboarding-placeholder` |
| Independent Veterinarian | `doctor` | `domain-substantive` |

Planned types (see §21–§23):

| Planned type | Canonical classification |
|---|---|
| Farrier | `planned-role-reference-only` |
| Professional Rider | `planned-no-workspace-foundation` |
| Jockey | `planned-no-workspace-foundation` |

---

## 11. Stable Dossier

**A. Identity and onboarding.** `tenant_type='stable'`. `SelectRole` → `/create-profile/stable` → `CreateStableProfile` seeds a `stable`-type tenant, `tenant_members` owner row, and defaults via `initialize_tenant_defaults`.

**B. Tenant creation / defaults.** `initialize_tenant_defaults` seeds `tenant_capabilities` rows for Stable including `breeding` enabled (`{"enabled": true}`), plus provisioning of local-record permissions via `_provision_stable_local_record_permissions`. Historical accepted residual: tenant creation is not fully atomic (see §36); not reopened here.

**C. Landing and navigation.** Lands on `/dashboard`. Navigation uses `ORG_NAV_MODULES`: Dashboard, Community, Horses (My Horses / Orders / Breeding / Vet / Laboratory), Schedule, Records, Contracts, HR (Team / Payroll), Housing, Services, Inventory, Clients, Finance (Overview / Invoices / Expenses / Payments / Revenue / Ledger / POS / Categories / Clients), Files, Public Profile, Settings.

**D. Dedicated modules.** Horses, Housing, Movement, Boarding (Contracts + Admissions), Breeding, Vet, HR, Services, Inventory, Clients, Finance/POS, Contracts, Records, Public Profile.

**E. Shared modules.** Community, Notifications, Team/Connections, Contract Editor, Schedule, Files, Push, Notifications governance.

**F. Main workflows.** Horse registration (multi-step wizard, classification governance), housing setup (facilities → units), boarding admission/checkout, movement (arrivals/departures with 20-parameter RPC — see §37), breeding attempts / pregnancies / foalings, vet visits / treatments / vaccinations, laboratory requests (`lab_mode='requests'`), HR / payroll, service catalog + packages, invoice + POS + payments (source-checkout + payment sessions), contracts (boarding + custom), public profile.

**G. Backend objects/RPCs.** Extensive: `horses`, `horse_owners`, `boarding_admissions`, `boarding_contracts`, `housing_units`, `facility_areas`, `horse_movements`, `incoming_horse_movements`, `vet_visits`, `vet_treatments`, `vet_medications`, `horse_vaccinations`, `breeding_attempts`, `pregnancies`, `foalings`, `hr_employees`, `hr_salary_payments`, `inventory_items`, `products`, `pos_sessions`, `pos_sales`, `invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `ledger_entries`, `tenant_services`, `stable_service_plans`. RPCs include `record_horse_movement_with_housing` (20 params), `create_source_checkout_invoice`, `post_payment_session`, `create_pos_sale`, `_finance_invoice_approve_inline`, `approve_boarding_contract_as_owner`, `approve_boarding_contract_as_stable`, `create_boarding_contract_with_connection`.

**H. Permission/capability model.** 104-key permission system enforced by `has_permission()`; capabilities `breeding` (enabled by seed), `housing`, `laboratory` (`lab_mode='requests'` by default), `movement`, `vet` (defaults per `useModuleAccess`).

**I. Personal vs Establishment behavior.** Workspace mode is dominant; owner may switch to Personal mode for personal community and personal payments.

**J. Cross-account integrations.** Connections (B2B/B2C/employment) with Labs, Doctors, Owners, Clinics; hosted-horse recognition for `horse_owner` counterparties.

**K. Empty-state / post-onboarding.** Lands in a fully populated dashboard with dedicated KPI cards and immediate action paths (add horse, add facility, add admission, add invoice).

**L. Known gaps.** Non-atomic tenant creation (accepted residual); sparse non-finance test coverage; mobile shell placeholder. **Doctor billing catalog split is not a Stable gap** — it is a shared-services residual documented on the Doctor dossier.

**M. Canonical classification.** `domain-substantive`.

**N. Confidence / evidence.** High. Verified via `pg_proc`, migrations, `useModuleAccess.ts`, `App.tsx`, `workspaceNavConfig.ts`, live `tenant_capabilities` rows (all four live Stable tenants have `breeding={"enabled": true}`).

---

## 12. Veterinary Clinic Dossier

**A. Identity and onboarding.** `tenant_type='clinic'`. `/create-profile/clinic` seeds a clinic-type tenant.

**B. Tenant creation / defaults.** Seeds capability rows with `vet` and `movement` defaults resolved as enabled for `clinic` in `useModuleAccess` (config values `null` → tenant-type default). Breeding is **disabled** for clinic (seed and fallback both).

**C. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`. Doctor-only entries are hidden (`tenantType==='doctor'`); Academy-only entries are hidden.

**D. Dedicated modules.** Vet (`DashboardVet`, `src/components/vet/**`, `vet_visits`, `vet_treatments`, `vet_medications`, `vet_followups`, `horse_vaccinations`).

**E. Shared modules (explicit list, not "everything a Stable can do").** Horses, Vet, Lab (requests), Housing, Movement, Boarding, Contracts, Services, Inventory, Clients, Finance/POS, HR, Files, Schedule, Records, Public Profile, Community, Notifications, Team/Connections, Settings.

**F. Main workflows.** Vet visit → treatment → medication → follow-up; laboratory request submission to partner Labs; boarding of clinic patients as short-stay hosts; invoicing; HR.

**G. Backend objects/RPCs.** `vet_*` schema, `lab_requests` (as requester), shared `horses`, `horse_movements`, `boarding_admissions`, `invoices`, `tenant_services`, `tenant_capabilities`.

**H. Permission/capability model.** 104-key system; `vet` enabled; `movement` enabled; `housing` enabled; `laboratory='requests'`.

**I. Personal vs Establishment.** Workspace-dominant.

**J. Cross-account integrations.** Requests to Labs (submissions); referrals to Doctors; owner recognition for hosted patients.

**K. Empty-state.** Similar shell to Stable but without clinic-specific curated first-action paths.

**L. Known gaps.** No clinic-specific wards / inpatient / admission lifecycle distinct from stable boarding; no dedicated clinic KPIs; no dedicated clinic patient record separate from `horses`.

**M. Canonical classification.** `domain-partial`.

**N. Confidence / evidence.** High for module presence; medium for depth (no live clinic tenants observed).

**Explicit exclusion:** Breeding is not enabled for `clinic` (seed and fallback both disabled).

---

## 13. Laboratory Dossier

**A. Identity and onboarding.** `tenant_type='lab'`. `/create-profile/lab`.

**B. Tenant creation / defaults.** `laboratory` capability defaults to `lab_mode='full'` for lab tenants (via `useModuleAccess` fallback when config absent). Breeding disabled for `lab` (live evidence: both live Lab tenants have `breeding={"enabled": false}`).

**C. Landing and navigation.** Isolated `labNavConfig` (see `src/navigation/labNavConfig.ts`); Lab-mode UI is separated from Stable-mode services (see project memory `laboratory/ui-isolation-boundary`).

**D. Dedicated modules.** Full LIMS — `lab_requests`, `lab_submissions` (submission-parent → request-child model), `lab_samples`, `lab_results`, `lab_result_shares`, `lab_report_shares`, `lab_report_share_results`, `lab_services`, `lab_service_templates`, `lab_request_services`, `lab_request_service_templates`, `lab_sample_templates`, `lab_sample_test_types`, `lab_test_types`, `lab_templates`, `lab_horses`, `lab_credit_wallets`, `lab_credit_transactions`, `lab_submission_decision`, `lab_service_decision`, `lab_request_decision`.

**E. Shared modules.** Community, Notifications, Team/Connections, Files, Finance/POS (for lab-side invoicing), Public Profile, Settings.

**F. Main workflows.** Submission intake → sample logging → analysis → result recording (Draft → Reviewed → Final lifecycle) → result sharing (tokenized, `lab_result_shares` + `SharedLabReport` page) → billing → credit wallets.

**G. Backend objects/RPCs.** Full `lab_*` schema; `create_lab_report_share`; token-scoped share access.

**H. Permission/capability model.** Lab-specific permission gates; `laboratory` capability resolves `full`.

**I. Personal vs Establishment.** Workspace-dominant; lab mode fully isolated.

**J. Cross-account integrations.** Receives requests from Stables, Clinics, Doctors; shares results back via tokenized public share.

**K. Empty-state.** Lands in the isolated Lab shell with immediate submissions/requests entry.

**L. Known gaps.** Mobile parity; multi-lab federation.

**M. Canonical classification.** `domain-substantive`.

**N. Confidence / evidence.** High. Verified via schema, `labNavConfig`, `DashboardLaboratory`.

---

## 14. Training Academy Dossier

**A. Identity and onboarding.** `tenant_type='academy'`. `/create-profile/academy`.

**B. Tenant creation / defaults.** Standard defaults; no dedicated Academy capability category (capability categories are `breeding`, `housing`, `laboratory`, `movement`, `vet`). Academy uses `tenantType` gating on nav items instead.

**C. Landing and navigation.** Academy-specific nav entries: `sidebar.manageBookings` → `/dashboard/academy/bookings`, `sidebar.sessions` → `/dashboard/academy/sessions` (both `tenantType: "academy"` in `workspaceNavConfig.ts`).

**D. Dedicated modules.** Academy Sessions (`DashboardAcademySessions`, `academy_sessions` table), Academy Bookings (`DashboardAcademyBookings`, `academy_bookings` table), `can_manage_academy_sessions` RPC.

**E. Shared modules.** All standard org modules where relevant.

**F. Main workflows.** Session creation → booking → attendance/completion. Enrollment/curriculum progression is not implemented.

**G. Backend objects/RPCs.** `academy_sessions`, `academy_bookings`, `can_manage_academy_sessions`.

**H. Permission/capability model.** Permission keys `bookings.view`; tenant-type gate on nav items.

**I. Personal vs Establishment.** Workspace-dominant; students consume via Personal mode `/dashboard/my-bookings`.

**J. Cross-account integrations.** Consumers appear in Personal Bookings.

**K. Empty-state.** Lands in dashboard with Sessions/Bookings surfaces reachable but no curated onboarding first-actions.

**L. Known gaps.** No curriculum/enrollment progression; no attendance analytics; no instructor scheduling depth; no student-level billing history separate from generic finance.

**M. Canonical classification.** `domain-partial`.

**N. Confidence / evidence.** High.

---

## 15. Equine Pharmacy Dossier

**A. Identity and onboarding.** `tenant_type='pharmacy'`. `/create-profile/pharmacy`.

**B. Tenant creation / defaults.** Standard defaults. No dedicated pharmacy capability. `useModuleAccess.isPharmacy` flag exists but **has no consumer** anywhere in the codebase — orphan flag.

**C. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`; no pharmacy-specific nav entries.

**D. Dedicated modules.** **None.**

**E. Shared modules used as foundation.** Inventory (`inventory_items`, `stock_levels`), Products (`products`, `product_categories`), Warehouses (`warehouses`), Suppliers (`suppliers`, `supplier_payables`), POS (`pos_sessions`, `pos_sales`), Services (`tenant_services`, `tenant_service_categories`), Finance (`invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `ledger_entries`).

**F. Main workflows.** Pharmacy operates using shared inventory / POS / finance flows only.

**G. Backend objects/RPCs.** Shared only; no pharmacy-specific schema.

**H. Permission/capability model.** 104-key system; no pharmacy-specific permission keys.

**I. Personal vs Establishment.** Workspace-dominant.

**J. Cross-account integrations.** Would need cross-tenant bridge to `doctor_prescriptions` for prescription fulfillment — **not implemented**.

**K. Empty-state.** Lands in generic org dashboard.

**L. Known gaps (dedicated pharmacy domain absent).**

- Dispensing workflow.
- Prescription fulfillment (no bridge to `doctor_prescriptions`).
- Regulated medication catalog (controlled substances tracking).
- Pharmacy order intake (from stables / owners / clinics).
- Delivery lifecycle.
- Orphan `useModuleAccess.isPharmacy` flag with no consumer.

**M. Canonical classification.** `shared-foundation-only`.

**N. Confidence / evidence.** High.

---

## 16. Horse Transport Dossier

**A. Identity and onboarding.** `tenant_type='transport'`. `/create-profile/transport`.

**B. Tenant creation / defaults.** `movement` capability defaults enabled for `transport` (via `useModuleAccess` fallback).

**C. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`; no transport-specific nav entries.

**D. Dedicated modules.** **None.**

**E. Shared modules used as foundation.** Movement (`horse_movements`, `record_horse_movement_with_housing` 20-param RPC), Incoming Movements (`incoming_horse_movements`), External Locations (`external_locations`), Connections (`connections`), Finance.

**F. Main workflows.** Transport operates using shared Movement + Finance only.

**G. Backend objects/RPCs.** Shared only.

**H. Permission/capability model.** Movement permission keys; no transport-specific keys.

**I. Personal vs Establishment.** Workspace-dominant.

**J. Cross-account integrations.** Would need cross-tenant transport order intake — not implemented.

**K. Empty-state.** Generic org dashboard.

**L. Known gaps (dedicated transport domain absent).**

- Dispatch board.
- Vehicles / fleet roster.
- Drivers / driver assignment.
- Routes.
- Legs.
- ETA tracking.
- Order lifecycle (accept → pickup → in-transit → delivered).

**M. Canonical classification.** `shared-foundation-only`.

**N. Confidence / evidence.** High.

---

## 17. Horse Auction Dossier

**A. Identity and onboarding.** `tenant_type='auction'`. `/create-profile/auction`.

**B. Tenant creation / defaults.** Standard defaults; no auction-specific capability.

**C. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`; no auction-specific nav.

**D. Dedicated modules.** **None.**

**E. Shared modules.** Whatever a generic org can see.

**F. Main workflows.** **None** beyond generic org shell.

**G. Backend objects/RPCs.** No auction-specific schema, RPCs, or permission keys.

**H. Permission/capability model.** No auction permission keys.

**I. Personal vs Establishment.** Workspace-dominant.

**J. Cross-account integrations.** None specific.

**K. Empty-state.** Lands in a generic dashboard shell without meaningful next action.

**L. Known gaps.** Everything — no listings, no bidding, no lots, no consignment, no auction settlement.

**M. Canonical classification.** `onboarding-placeholder`.

**N. Confidence / evidence.** High.

---

## 18. Horse Owner Dossier

**A. Identity and onboarding.** `tenant_type='horse_owner'`. `/create-profile/horse-owner` creates a `horse_owner`-type tenant + `horse_owners` record.

**B. Tenant creation / defaults.** Standard defaults; breeding disabled (live evidence: both live `horse_owner` tenants have `breeding={"enabled": false}`).

**C. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`; behavior branches on `tenantType==='horse_owner'` inside pages rather than through dedicated nav entries.

**D. Dedicated modules and surfaces (frontend branches).**

- `Dashboard.tsx` — Horse-Owner branch (`isHorseOwnerTenant`; `Unhosted Horses` KPI card with `horseOwner.dashboard.unhostedHorses` labels).
- `DashboardHorses.tsx` — Horse-Owner branch (renders `Hosted Horses` view via `HostedHorsesTable` and `HostedHorseCard` fed by `useOwnerHostedHorses`; shows unhosted-count banner).
- `DashboardBoardingContracts.tsx` — Horse-Owner branch (offers `Request Boarding` for unhosted horses via `RequestBoardingDialog` + `CreateBoardingContractDialog`).
- `HostedHorsesTable`, `HostedHorseCard` — owner-safe fields fed by `get_owner_hosted_horses` RPC.
- Shared `HorseProfile` scoped by ownership.

**E. Shared modules used.** Community (`/community`), Personal Bookings (`/dashboard/my-bookings`), Personal Payments (`/dashboard/my-payments`), Contracts (`/dashboard/contracts`), Personal Profile (`/dashboard/my-profile`).

**F. Main workflows.**

- Create Horse Owner workspace via `/create-profile/horse-owner`.
- Register owner-created horse via wizard (`isHorseOwnerTenant` branch); horse persists as "unhosted".
- View **hosted horses** scoped by `get_owner_hosted_horses` (owner-safe fields only).
- **Request boarding** at a Stable via `RequestBoardingDialog` (`service_requests` + `boarding.requests.create`).
- Stable responds (`boarding.requests.respond`); draft contract created.
- Owner **approves boarding contract** via `approve_boarding_contract_as_owner`.
- Ownership transfers via `TransferOwnershipDialog` audited in `horse_ownership_history`.
- **Claim flow** via `claim_client_portal` for tokenized owner recognition.
- Delegation backend (`owner_delegations`, `delegation_scopes`, `delegation_audit_log`, `can_delegate_permission`, `log_delegation_action`, `fn_audit_delegation_scopes`).

**G. Backend objects.** `horse_owners`, `horse_owner_invites`, `horse_owner_access_grants`, `owner_claim_requests`, `owner_claim_events`, `owner_delegations`, `horse_ownership`, `horse_ownership_history`, `party_horse_links`, `boarding_contracts`, `boarding_admissions`, `service_requests`.

**G'. RPCs and foundations.** `get_owner_hosted_horses`, `claim_client_portal`, `generate_client_claim_token`, `revoke_client_claim_token`, `materialize_owner_as_client`, `_resolve_owner_authority`, `approve_boarding_contract_as_owner`, `is_tenant_owner`, `validate_ownership_percentage`, `log_ownership_change`, `can_delegate_permission`, `log_delegation_action`, `fn_audit_delegation_scopes`.

**H. Permission/capability model — boarding lifecycle permission keys.**

- `boarding.requests.view`
- `boarding.requests.create`
- `boarding.requests.cancel`
- `boarding.requests.respond`
- `boarding.contracts.view`
- `boarding.contracts.create`
- `boarding.contracts.approve`
- `boarding.contracts.end`
- `boarding.contracts.cancel`
- `boarding.contracts.schedule_arrival`

Additional permission keys for boarding admissions/checkout apply on the Stable side.

**I. Personal vs Establishment behavior.**

- **Personal Mode** — individual person's identity: community, personal bookings, personal payments, personal profile. Independent of any Horse Owner workspace.
- **Horse Owner workspace** — an owned `horse_owner`-type tenant with the surfaces enumerated above (hosted horses, unhosted banner, request boarding, contract approval).

**J. Cross-account integrations.**

- **Hosted-horse view** — owner-scoped read of horses currently boarded at partner Stables via `get_owner_hosted_horses` (owner-safe fields only).
- **Claim/delegation backend** — `horse_owner_invites`, `horse_owner_access_grants`, `owner_claim_*`, `owner_delegations`, `claim_client_portal`: token/claim machinery bridging owners to their horses' data.
- **Future external Client Portal concept** — **not in scope**; a separate future surface if introduced.

**K. Empty-state / post-onboarding.** Owner lands in `/dashboard` with the Unhosted Horses KPI card; first meaningful action is "add horse" → then "request boarding at a Stable".

**L. Known gaps / missing / thin areas.**

- Consolidated cross-stable owner dashboard (aggregate view across all hosting Stables).
- Richer owner billing / statement surface (beyond `/dashboard/my-payments`).
- Owner messaging / support module.
- Delegation UI depth relative to the substantial delegation backend.
- Clear separation from any future external Client Portal concept.

**M. Canonical classification.** `domain-partial`.

**N. Confidence / evidence.** High. Verified via `Dashboard.tsx`, `DashboardHorses.tsx`, `DashboardBoardingContracts.tsx`, `HostedHorsesTable`, `HostedHorseCard`, `useOwnerHostedHorses`, `get_owner_hosted_horses` (in `types.ts`), and live boarding permission keys in `permission_definitions`.

**Rescinded classification:** any prior label of "backend-only" is rescinded. The current classification is `domain-partial`.

---

## 19. Independent Trainer Dossier

**A. Identity and onboarding.** `tenant_type='trainer'`. `/create-profile/trainer`.

**B. Naming-collision distinction (mandatory).**

- **Trainer workspace type** — `tenant_type='trainer'` (this dossier).
- **`tenant_role='trainer'`** — a membership role inside any tenant.
- **`hr_employee_type='trainer'`** — an HR profession label.

These three concepts are separate and must never be conflated.

**C. Tenant creation / defaults.** Standard defaults; no trainer-specific capability.

**D. Landing and navigation.** `/dashboard` with `ORG_NAV_MODULES`; no trainer-specific nav.

**E. Dedicated modules.** **None.**

**F. Main workflows.** **None** beyond generic org shell.

**G. Backend objects/RPCs.** No trainer-workspace-specific schema, RPCs, or permission keys.

**H. Empty-state.** Generic dashboard shell.

**I. Known gaps.** Everything — no client rosters, no training plans, no session tracking, no progress reports, no billing tied to training programs.

**J. Canonical classification.** `onboarding-placeholder`.

**K. Confidence / evidence.** High.

---

## 20. Independent Veterinarian (Doctor) Dossier

**A. Identity and onboarding.** `tenant_type='doctor'`. `/create-profile/doctor`.

**B. Tenant creation / defaults.** Standard defaults; `useModuleAccess.isDoctor` and `isVetIndependent` gate the doctor UI paths.

**C. Landing and navigation.** Doctor-only nav entries in `ORG_NAV_MODULES` (`tenantType:"doctor"` gate): `/dashboard/doctor` (Overview), `/dashboard/doctor/patients`, `/dashboard/doctor/consultations`, `/dashboard/doctor/services`, `/dashboard/clients` (Doctor Clients label), `/dashboard/finance`.

**D. Dedicated modules.**

- 5 dedicated pages under `/dashboard/doctor/*` (`DashboardDoctorOverview`, `DashboardDoctorPatients`, `DashboardDoctorConsultations`, `DashboardDoctorConsultationDetail`, `DashboardDoctorServices`).
- 5 dedicated tables — `doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_services`, `doctor_followups`.
- 8 dedicated permission keys (Doctor scope), plus reused shared keys.

**E. Shared modules.** Community, Notifications, Team/Connections, Contracts, Files, Finance, Public Profile.

**F. Main workflows.** Doctor Overview → Patient intake → Consultation → Prescription → Follow-up → Clients → Finance/billing.

**G. Backend objects/RPCs.** `doctor_*` schema; doctor-specific create/read paths.

**H. Permission/capability model.** Doctor-scope permission keys; tenant-type navigation gate.

**I. Personal vs Establishment.** Workspace-dominant.

**J. Cross-account integrations.** Can receive referrals; can request lab work; owner-facing consultation records.

**K. Empty-state.** Lands in Doctor Overview.

**L. Known gaps (Doctor billing catalog split — moved here from Stable).** `doctor_services` remains separate from `tenant_services` — a shared-services residual. Downstream reporting/rollups treat doctor services as a distinct catalog. Not a Stable defect; documented on the Doctor dossier and in the risk register.

**M. Canonical classification.** `domain-substantive`.

**N. Confidence / evidence.** High.

---

## 21. Planned Farrier Readiness Dossier

**A. Intended workspace identity.** A Farrier workspace type would represent independent farriers running their own client rosters, appointments, hoof-care history, and invoicing.

**B. Distinction from membership/HR roles.** `hr_employee_type='farrier'` is an HR profession label used inside a hosting tenant (e.g. Stable), and a horse-assignment role reference exists in `useHorseAssignments.ts`. Neither is a workspace type.

**C. Current repository evidence.** Only `hr_employee_type='farrier'` and a role reference in `src/hooks/useHorseAssignments.ts` (~line 36). No `tenant_type` enum value, no `SelectRole` entry, no `create-profile/farrier` route, no dedicated tables, no permission keys, no RPCs.

**D. Existing reusable shared modules (available if the workspace were introduced).** Horses, Clients, Schedule, Contracts, Services, Finance/POS, Community, Notifications, Team/Connections, Files, Public Profile, Settings.

**E. Missing enum/onboarding foundation.** `tenant_type` enum extension; `SelectRole` entry; `CreateStableProfile`-style handler; onboarding route.

**F. Missing capability/default foundation.** No farrier capability category; no farrier capability seed in `initialize_tenant_defaults`; no `useModuleAccess` farrier fallback.

**G. Required dedicated domain workflows.** Client roster, patient (horse) hoof records, appointment scheduling, farriery visit log with hoof-care actions (trim, shoe, resection), materials consumed, follow-up scheduling.

**H. Required cross-account relationships.** Connection with Stables (as visiting farrier); connection with Horse Owners; visibility into hosted horses for scheduled work.

**I. Required permissions and RLS concepts.** Farrier scope keys (visit view/create/close), shared-horse access via `connection_horse_access`.

**J. Required backend objects.** `farrier_visits`, `farrier_actions`, `farrier_services` (or use of shared `tenant_services` with a farrier category), materials link into shared inventory.

**K. Commercial/billing reuse.** Reuse shared `invoices`, `invoice_items`, `payment_sessions`, `tenant_services` — no new billing plumbing needed.

**L. Personal vs Workspace identity.** Personal identity of the person remains independent of the Farrier workspace.

**M. Community representation principle.** Per the Community Publishing Identity Principle, a Farrier tenant would publish as the Farrier workspace when active.

**N. Arabic/English/mobile foundations.** Existing bilingual infrastructure applies; mobile shell inherits current placeholder status.

**O. Blockers.** Enum extension migration; onboarding shell wiring; dedicated schema; permission keys; navigation entries.

**P. Canonical planned classification.** `planned-role-reference-only`.

**Q. Confidence.** High evidence for absence.

---

## 22. Planned Professional Rider Readiness Dossier

**A. Intended workspace identity.** A Professional Rider workspace would represent independent riders offering services (schooling, exercise rides, competition prep) to Stables and Owners.

**B. Distinction from membership/HR roles.** `exercise_rider` role reference exists in `src/hooks/useHorseAssignments.ts` (~line 37). Not a workspace type.

**C. Current repository evidence.** Only the role reference above. No `tenant_type` enum value, no `SelectRole` entry, no onboarding route, no dedicated tables, no permission keys, no RPCs.

**D. Existing reusable shared modules.** Horses (as assigned rides), Schedule, Contracts, Services, Finance/POS, Community, Notifications, Files, Public Profile.

**E. Missing enum/onboarding foundation.** All of enum + `SelectRole` + onboarding route.

**F. Missing capability/default foundation.** No rider capability; no default seed; no `useModuleAccess` fallback.

**G. Required dedicated domain workflows.** Assignment intake, ride log (dressage/showjumping/exercise), performance notes, competition results, fee tracking.

**H. Required cross-account relationships.** Connections to Stables and Owners; access to specific horses via `connection_horse_access` or `party_horse_links`.

**I. Required permissions and RLS concepts.** Rider scope keys; horse-access-mode enforcement.

**J. Required backend objects.** `rider_assignments`, `ride_sessions`, `ride_notes` (or reuse of shared operational tables under a rider category).

**K. Commercial/billing reuse.** Shared invoicing.

**L. Personal vs Workspace identity.** Independent of person identity.

**M. Community representation principle.** Rider workspace identity when active.

**N. Arabic/English/mobile foundations.** Inherit existing.

**O. Blockers.** Same as Farrier plus dedicated ride-log schema.

**P. Canonical planned classification.** `planned-no-workspace-foundation`.

**Q. Confidence.** High.

---

## 23. Planned Jockey Readiness Dossier

**A. Intended workspace identity.** A Jockey workspace would represent competition-focused riders with race records, entries, weights, and licensing.

**B. Distinction from membership/HR roles.** No current HR label, `tenant_role`, or profession-name reference for jockey exists.

**C. Current repository evidence.** **Zero** repository references anywhere.

**D. Existing reusable shared modules.** Horses, Schedule, Community, Files, Public Profile, Finance.

**E. Missing enum/onboarding foundation.** All of enum + `SelectRole` + onboarding route.

**F. Missing capability/default foundation.** All.

**G. Required dedicated domain workflows.** Race calendar, entries, mount schedule, race results, weight/silks, licensing.

**H. Required cross-account relationships.** Connections to Owners, Trainers, Stables; race organizers (out-of-scope).

**I. Required permissions and RLS concepts.** Jockey scope keys; connection-based mount visibility.

**J. Required backend objects.** `race_events`, `race_entries`, `race_mounts`, `race_results`, `jockey_licenses`.

**K. Commercial/billing reuse.** Shared invoicing for mount fees.

**L. Personal vs Workspace identity.** Independent of person identity.

**M. Community representation principle.** Jockey workspace identity when active.

**N. Arabic/English/mobile foundations.** Inherit existing.

**O. Blockers.** No shared race infrastructure exists.

**P. Canonical planned classification.** `planned-no-workspace-foundation`.

**Q. Confidence.** High.

---

## 24. Complete Current Module Registry

| Module ID | Account types | Route(s) | Nav source | Main pages/components | Gate | Main backend | Status | Depth | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| dashboard | all | `/dashboard` | ORG + PERSONAL | `Dashboard.tsx` | auth | — | `active-substantive` | 4 | high |
| community | all | `/community` | ORG + PERSONAL | `CommunityFeed`, `posts`, `post_comments`, `post_likes` | `community.view` | `posts` | `active-substantive` | 4 | high |
| personalBookings | Personal | `/dashboard/my-bookings` | PERSONAL | `DashboardMyBookings` | auth | `academy_bookings` | `active-partial` | 3 | high |
| personalPayments | Personal | `/dashboard/my-payments` | PERSONAL | `DashboardPayments` | auth | `invoices`, `payment_*` | `active-partial` | 3 | high |
| contracts | Establishment + Personal | `/dashboard/contracts`, `/dashboard/contract-documents`, `/dashboard/contract-templates` | ORG + PERSONAL | `DashboardContracts`, editor/prototype | permission | `contract_documents`, `contract_templates` | `active-substantive` | 4 | high |
| horses | Stable, Clinic, Doctor, HorseOwner, Lab (light), Trainer, Auction, Transport (light) | `/dashboard/horses`, `/dashboard/horses/:id` | ORG | `DashboardHorses`, `HorseProfile`, `HorsesList`, wizard | `horses.*` | `horses`, `horse_ownership` | `active-substantive` | 5 | high |
| horseOrders | Stable | `/dashboard/horse-orders` | ORG | `DashboardHorseOrders` | `horse_orders.*` | `horse_orders`, `horse_order_types`, `horse_order_events` | `active-partial` | 3 | high |
| breeding | Stable | `/dashboard/breeding` | ORG (moduleKey) | breeding components | capability `breeding` | `breeding_attempts`, `pregnancies`, `foalings`, `semen_batches`, `semen_tanks`, `embryo_transfers` | `active-substantive` | 4 | high |
| vet | Stable, Clinic, Doctor | `/dashboard/vet` | ORG (moduleKey) | `DashboardVet`, `src/components/vet/**` | capability `vet` | `vet_visits`, `vet_treatments`, `vet_medications`, `vet_followups`, `horse_vaccinations` | `active-substantive` | 4 | high |
| laboratory | Lab (full), Stable (requests), Clinic (requests) | `/dashboard/laboratory` | ORG (moduleKey) + `labNavConfig` | `DashboardLaboratory` + Lab isolated shell | capability `laboratory` | `lab_*` schema | `active-substantive` | 5 | high |
| movement | Stable, Clinic, Transport | `/dashboard/movement`, `/dashboard/housing` | ORG (moduleKey via Housing) | `DashboardMovement`, movement components | capability `movement` | `horse_movements`, `incoming_horse_movements`, `external_locations`, `record_horse_movement_with_housing` (20 params) | `active-substantive` | 5 | high |
| housing | Stable, Clinic | `/dashboard/housing` | ORG (moduleKey) | `DashboardHousing` | capability `housing` | `facility_areas`, `housing_units`, `housing_unit_occupants`, `boarding_admissions`, `boarding_contracts`, `boarding_status_history` | `active-substantive` | 5 | high |
| boarding | Stable, HorseOwner, Clinic | `/dashboard/boarding-contracts` | ORG + tenant-type branches | `DashboardBoardingContracts`, `BoardingContractsTab` | `boarding.*` | `boarding_contracts`, `boarding_admissions` | `active-substantive` | 4 | high |
| schedule | Establishment | `/dashboard/schedule` | ORG | `ScheduleCalendarView` | permission | shared calendar | `active-partial` | 3 | medium |
| records | Establishment | `/dashboard/records` | ORG | `DashboardRecords` | permission | shared | `active-partial` | 2 | medium |
| hr | Stable, Clinic, Doctor, Academy | `/dashboard/hr`, `/dashboard/hr/payroll`, `/dashboard/hr-attendance`, `/dashboard/hr-settings` | ORG (roles owner/manager) | `DashboardHR`, `DashboardHRAttendance`, `DashboardHRSettings` | `hr.*` | `hr_employees`, `hr_assignments`, `hr_salary_payments`, `hr_employee_events`, `hr_settings` | `active-substantive` | 4 | high |
| teamPartners | Establishment | (embedded in HR / settings) | ORG | `PartnerConfigSheet`, `InvitePersonDialog`, `AddPartnerDialog` | `admin.*` | `connections`, `invitations`, `connection_horse_access` | `active-substantive` | 4 | high |
| rolesPermissions | Establishment | `/dashboard/roles-settings` | ORG (owner) | `DashboardRolesSettings`, `MemberRoleAssignment`, `RolesList` | `admin.permissions.*` | `tenant_roles`, `tenant_role_permissions`, `permission_definitions`, `member_permissions` | `active-substantive` | 5 | high |
| clients | Stable, Clinic, Doctor | `/dashboard/clients`, `/dashboard/finance/clients` | ORG | `DashboardClients`, `DashboardClientStatement` | permission | `clients`, `customer_balances` | `active-substantive` | 4 | high |
| services | Stable, Clinic, Academy | `/dashboard/services` | ORG (owner/manager) | `DashboardServices` | permission | `tenant_services`, `tenant_service_categories`, `stable_service_plans` | `active-substantive` | 4 | high |
| inventory | Stable, Clinic, Pharmacy | `/dashboard/inventory` | ORG (`inventory.view`) | `InventoryItemFormDialog`, `InventoryTransactionFormDialog` | `inventory.view` | `inventory_items`, `inventory_movements`, `inventory_transactions`, `stock_levels`, `products`, `product_categories`, `warehouses`, `suppliers`, `supplier_payables` | `active-substantive` | 4 | high |
| finance | Stable, Clinic, Doctor, Academy, Pharmacy, Transport | `/dashboard/finance/*` | ORG (`payments.view`) | Finance page tree | `payments.*` | `invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `ledger_entries`, `expenses`, `financial_entries` | `active-substantive` | 5 | high |
| pos | Stable, Clinic, Pharmacy | `/dashboard/finance/pos` | ORG | `DashboardFinancePOS`, `EmbeddedCheckout` | permission | `pos_sessions`, `pos_sales`, `create_pos_sale` RPC | `active-substantive` | 4 | high |
| files | Establishment | `/dashboard/files` | ORG (owner/manager) | files pages | permission | `media_assets`, `media_share_links` | `active-partial` | 3 | medium |
| academySessions | Academy | `/dashboard/academy/sessions` | ORG (tenantType) | `DashboardAcademySessions` | `bookings.view` | `academy_sessions` | `active-partial` | 3 | high |
| academyBookings | Academy | `/dashboard/academy/bookings` | ORG (tenantType) | `DashboardAcademyBookings` | `bookings.view` | `academy_bookings` | `active-partial` | 3 | high |
| doctorModule | Doctor | `/dashboard/doctor/*` | ORG (tenantType) | 5 doctor pages | permission + tenant-type | `doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_services`, `doctor_followups` | `active-substantive` | 4 | high |
| connections | all establishment | (embedded) | ORG | `AddPartnerDialog`, `PartnerConfigSheet`, `AcceptConnectionPage` | permission | `connections`, `invitations`, `connection_messages`, `connection_horse_access`, `connection_rate_limits` | `active-substantive` | 4 | high |
| notifications | all | (bell), `/dashboard/notifications-settings`, `/dashboard/notification-governance` | ORG + PERSONAL | notification components | permission | `notifications`, `notification_preferences`, `tenant_notification_governance`, `push_subscriptions` | `active-substantive` | 4 | high |
| publicProfile | Establishment (owner) | `/dashboard/public-profile`, `/p/:slug` | ORG (owner) | `DashboardPublicProfile`, `TenantPublicProfile`, `PublicProfile` | `admin.profile` | `tenants`, `public_profile_fields` | `active-partial` | 3 | high |
| publicShares | all (data) | `/shared/lab/:token`, `/shared/media/:token` | (none) | `SharedLabReport`, `SharedMedia` | signed token | `lab_report_shares`, `media_share_links`, `shared-media-sign` edge fn | `active-substantive` | 4 | high |
| mobileShell | all | `/m/*` | mobile nav | `DashboardMobileModule` | auth | shared | `placeholder` | 1 | medium |
| settings | Establishment (owner) | `/dashboard/settings`, `/dashboard/organization-settings` | ORG (owner) | `DashboardOrganizationSettings`, `TaxPricingCard` | `admin.*` | `tenants`, `app_settings` | `active-substantive` | 4 | high |
| revenue | Stable, Clinic, Doctor | `/dashboard/finance/revenue` | ORG | `DashboardRevenue` | `payments.view` | derived from ledger | `active-partial` | 3 | high |
| legacyPayments | (retained) | `/dashboard/payments` | (not in nav) | `DashboardPayments` | permission | shared | `legacy` | — | high |
| legacyBoarding | (retained) | legacy boarding routes | (not in nav) | boarding legacy pages | permission | shared | `legacy` | — | medium |
| contractEditorPrototype | (retained) | `/prototype/rich-contract-editor` | (not in nav) | `PrototypeRichContractEditor` | auth | — | `legacy` | — | high |
| debug | dev | `/debug-auth` | (not in nav) | `DebugAuth` | auth | — | `placeholder` | 0 | high |

Depth scale: 0 = shell only; 5 = deep end-to-end domain.

---

## 25. Account Type × Module Matrix

Legend: **P** = Primary (dedicated), **S** = Shared, **C** = Connected/cross-account, **VP** = Visible Partial, **BF** = Backend Foundation only, **PL** = Placeholder, **NA** = Not Applicable, **CX** = Contradictory, **LG** = Legacy, **PN** = Planned.

| Module \ Type | Stable | Clinic | Lab | Academy | Pharmacy | Transport | Auction | HorseOwner | Trainer | Doctor |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard | P | S | S (isolated) | S | S | S | S | P | S | P |
| Community | S | S | S | S | S | S | S | S | S | S |
| Personal Bookings | NA | NA | NA | S | NA | NA | NA | S | NA | NA |
| Personal Payments | NA | NA | NA | S | NA | NA | NA | S | NA | NA |
| Contracts | P | S | S | S | S | S | S | S | S | S |
| Horses | P | S | BF | NA | NA | S | NA | P | NA | P |
| Horse Orders | P | S | NA | NA | NA | NA | NA | NA | NA | NA |
| Breeding | P | NA | NA | NA | NA | NA | NA | NA | NA | NA |
| Vet | P | P | NA | NA | NA | NA | NA | NA | NA | P |
| Laboratory | S (requests) | S (requests) | P (full) | NA | NA | NA | NA | NA | NA | S (requests) |
| Movement | P | S | NA | NA | NA | S | NA | NA | NA | NA |
| Housing | P | S | NA | NA | NA | NA | NA | NA | NA | NA |
| Boarding | P | S | NA | NA | NA | NA | NA | C (as owner) | NA | NA |
| Schedule | S | S | S | S | S | S | S | S | S | S |
| Records | S | S | S | S | S | S | S | S | S | S |
| HR | S (owner) | S | NA | S | NA | NA | NA | NA | NA | S |
| Team/Partners | S | S | S | S | S | S | S | S | S | S |
| Roles/Permissions | S | S | S | S | S | S | S | S | S | S |
| Clients | S | S | NA | NA | S | S | NA | NA | NA | P |
| Services | S | S | P (lab_services) | S | S | S | NA | NA | NA | S (doctor_services split) |
| Inventory | S | S | NA | NA | S | NA | NA | NA | NA | NA |
| Finance | S | S | S | S | S | S | S | S | S | S |
| POS | S | S | NA | NA | S | NA | NA | NA | NA | S |
| Files | S | S | S | S | S | S | S | S | S | S |
| Academy Sessions | NA | NA | NA | P | NA | NA | NA | NA | NA | NA |
| Academy Bookings | NA | NA | NA | P | NA | NA | NA | NA | NA | NA |
| Doctor module | NA | NA | NA | NA | NA | NA | NA | NA | NA | P |
| Connections | S | S | S | S | S | S | S | S | S | S |
| Notifications | S | S | S | S | S | S | S | S | S | S |
| Public Profile | S | S | S | S | S | S | S | S | S | S |
| Public/Token Shares | S | S | S | S | S | S | S | S | S | S |
| Mobile shell | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL |
| Settings | S | S | S | S | S | S | S | S | S | S |
| Revenue | S | S | NA | NA | NA | NA | NA | NA | NA | S |
| Legacy payments route | LG | LG | LG | LG | LG | LG | LG | LG | LG | LG |
| Legacy boarding route | LG | LG | NA | NA | NA | NA | NA | LG | NA | NA |
| Contract editor prototype | LG | LG | LG | LG | LG | LG | LG | LG | LG | LG |
| Debug route | PL | PL | PL | PL | PL | PL | PL | PL | PL | PL |
| Pharmacy dispatch (`planned`) | PN | PN | PN | PN | PN | PN | PN | PN | PN | PN |
| Transport dispatch (`planned`) | PN | PN | PN | PN | PN | PN | PN | PN | PN | PN |
| Auction lifecycle (`planned`) | PN | PN | PN | PN | PN | PN | PN | PN | PN | PN |
| Trainer workspace domain (`planned`) | PN | PN | PN | PN | PN | PN | PN | PN | PN | PN |

---

## 26. Capability Registry and Seed Matrix

Capability categories present in `tenant_capabilities` (5 total):

- `breeding`
- `housing`
- `laboratory`
- `movement`
- `vet`

Doctor and Academy domain navigation use `tenantType` + permission gating, **not** capability categories.

Seed matrix from `initialize_tenant_defaults` (database seed truth):

| tenant_type | breeding | housing | laboratory | movement | vet |
|---|---|---|---|---|---|
| stable | enabled | enabled | requests | enabled | (fallback per useModuleAccess) |
| clinic | disabled | enabled | requests | enabled | enabled |
| lab | disabled | disabled | full | disabled | disabled |
| academy | disabled | disabled | none | disabled | disabled |
| pharmacy | disabled | disabled | none | disabled | disabled |
| transport | disabled | disabled | none | enabled | disabled |
| auction | disabled | disabled | none | disabled | disabled |
| horse_owner | disabled | disabled | none | disabled | disabled |
| trainer | disabled | disabled | none | disabled | disabled |
| doctor | disabled | disabled | requests | disabled | enabled |

Live verification (point-in-time): all 4 Stable tenants have `breeding={"enabled": true}` rows; both Lab tenants have `breeding={"enabled": false}`; both Horse Owner tenants have `breeding={"enabled": false}`; the Doctor tenant has `breeding={"enabled": false}`.

---

## 27. Capability Seed vs Frontend Fallback

`useModuleAccess` reads `tenant_capabilities.config` and, when a per-capability config value is `null` or absent, applies a **frontend fallback** based on `tenant_type`. The fallback mirrors the seed truth for all currently observed categories.

| Capability | Config-present value | Fallback (config null/absent) |
|---|---|---|
| `laboratory` `lab_mode` | `full` / `requests` / `none` | `full` if lab; `requests` if stable or clinic; else `none` |
| `vet.enabled` | boolean | `true` if clinic or doctor; else `false` |
| `housing.enabled` | boolean | `true` if stable or clinic; else `false` |
| `movement.enabled` | boolean | `true` if stable, clinic, or transport; else `false` |
| `breeding.enabled` | boolean | `true` if stable; else `false` |

**Breeding, verified specifically:**

- Database seed truth: Stable = enabled; all other current account types = disabled.
- Frontend fallback truth: `useModuleAccess` mirrors this behavior — Stable resolves breeding enabled when the row is absent; others resolve disabled.
- Live truth: all 4 current Stable tenants have breeding-enabled capability rows.

Non-Stable tenants therefore resolve breeding disabled whether the capability row is present or absent. This section explicitly supersedes any prior text stating that Stable breeding is seeded disabled.

Additional notes:

- Doctor and Academy domain navigation are gated by `tenantType` and permission — **not** by capability categories.
- Pharmacy has a `useModuleAccess.isPharmacy` flag that is **currently unused** anywhere in the codebase.
- Tenant creation non-atomicity is a pre-existing accepted residual (see §36); not reopened here.

---

## 28. Post-Onboarding Experience Matrix

| Type | First redirect | Landing page | Visible navigation | Empty-state quality | First meaningful action | First major blocker/gap | Lands in dedicated workflow? |
|---|---|---|---|---|---|---|---|
| Stable | `/dashboard` | Dashboard | full ORG nav | rich | Add horse / Add facility / Add admission | none | yes |
| Clinic | `/dashboard` | Dashboard | full ORG nav minus academy/doctor | generic | Log vet visit | no clinic-specific ward/inpatient shape | partially (vet workflow yes; clinic-specific no) |
| Lab | `/dashboard` | Dashboard (isolated Lab shell) | Lab isolated nav | rich | New submission / new request | none | yes |
| Academy | `/dashboard` | Dashboard | ORG + academy nav | thin | Create session | no curriculum/enrollment progression | partially |
| Pharmacy | `/dashboard` | Dashboard | ORG nav | generic | Add inventory item | no dispensing/prescription/order flows | no (shared shell only) |
| Transport | `/dashboard` | Dashboard | ORG nav | generic | Record movement | no dispatch/fleet/route flows | no (shared shell only) |
| Auction | `/dashboard` | Dashboard | ORG nav | thin | none meaningful | everything | no |
| Horse Owner | `/dashboard` | Dashboard (Horse-Owner branch) | ORG nav | dedicated KPI + unhosted banner | Add horse → Request boarding | consolidated cross-stable dashboard missing | yes (owner workflow) |
| Trainer | `/dashboard` | Dashboard | ORG nav | thin | none meaningful | everything | no |
| Doctor | `/dashboard/doctor` | Doctor Overview | ORG + doctor nav | rich | Intake patient / Start consultation | doctor billing catalog split from `tenant_services` | yes |

---

## 29. Route / Navigation / Guard Reconciliation

- **Route census.** All authenticated routes live under `/dashboard/**`, `/community`, `/create-profile/:type`, `/select-role`, `/shared/**` (public), `/p/:slug` (public), `/m/*` (mobile shell).
- **Navigation census.** Personal-mode nav (`PERSONAL_NAV_MODULES`) and Establishment-mode nav (`ORG_NAV_MODULES`) in `src/navigation/workspaceNavConfig.ts`.
- **Capability-gated routes.** Breeding, Vet, Laboratory, Movement (via Housing), Housing use `moduleKey` capability gates.
- **Permission-gated routes.** Community (`community.view`), Bookings (`bookings.view`), HR (owner/manager), Finance (`payments.view`), Services/Inventory/Files (owner/manager).
- **Authentication-only routes.** Dashboard root, personal bookings/payments.
- **Routes absent from navigation.** Legacy `/dashboard/payments` (`legacy`), `/prototype/rich-contract-editor` (`legacy`), `/debug-auth` (`placeholder`), plus token-share routes `/shared/**` and `/p/:slug` which are intentionally not in nav.
- **Legacy/duplicate routes.** `/dashboard/payments` (superseded by `/dashboard/finance/payments`); legacy boarding paths superseded by `/dashboard/boarding-contracts`.
- **Personal vs Establishment boundary.** `TenantContext` `workspaceMode` toggles the nav module list; page-level branches (`isHorseOwnerTenant`, `tenantType`) refine content.
- **Planned-type absence.** No `/create-profile/farrier`, `/create-profile/professional-rider`, or `/create-profile/jockey` route; no `SelectRole` entry for those types.

---

## 30. Frontend ↔ Backend Reality Matrix

| Layer bucket | Members |
|---|---|
| UI + backend active | Horses, Housing, Movement, Boarding, Breeding, Vet, Laboratory, HR, Clients, Services, Inventory, Finance, POS, Doctor module, Roles/Permissions, Team/Partners, Connections, Notifications, Contracts, Public Profile, Public/Token Shares |
| Backend foundation + incomplete UI | Horse Owner claim/delegation stack (`owner_delegations`, `owner_claim_*`, `horse_owner_access_grants`), Doctor `doctor_followups` UI density, Academy enrollment progression |
| Shared generic foundations | Community, Schedule, Records, Files, Settings |
| Schema-only | (none currently in scope — Auction lifecycle is not even schema-only) |
| Route/onboarding placeholder | Auction, Trainer |
| Duplicated/contradictory | Doctor services catalog split (`doctor_services` vs `tenant_services`); Pharmacy `isPharmacy` flag orphan |
| Legacy | `/dashboard/payments`, legacy boarding paths, `/prototype/rich-contract-editor` |
| Planned | Farrier workspace, Professional Rider workspace, Jockey workspace, Pharmacy dispensing domain, Transport dispatch/fleet domain, Auction lifecycle domain, Trainer workspace domain |

The seven zero-policy tables (`pos_sales`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `finance_request_idempotency`) are **not reported as unsafe** here — see §32 and §37.D.

---

## 31. Shared vs Account-Specific Modules

**Shared modules used across most or all establishment types:** Dashboard, Community, Contracts, Schedule, Records, Team/Partners, Roles/Permissions, Files, Connections, Notifications, Public Profile, Public/Token Shares, Settings, Finance, POS (where relevant), Inventory (where relevant), Services (where relevant), Clients (where relevant), HR (where relevant).

**Account-specific dedicated modules:**

- Stable: Horses, Horse Orders, Breeding, Vet, Housing, Movement, Boarding, HR, Services, Inventory, Clients, Finance/POS, Records.
- Clinic: Vet (dedicated).
- Lab: full LIMS.
- Academy: Sessions, Bookings.
- Doctor: Doctor module (5 pages + 5 tables + 8 keys).
- Horse Owner: Horse-Owner branches on Dashboard / Horses / Boarding Contracts; hosted-horses view; boarding request lifecycle.

**Account types with no dedicated module (rely on shared foundation):** Pharmacy, Transport.

**Account types with no meaningful implementation (shell only):** Auction, Trainer.

---

## 32. Cross-Account Connection Foundations

- `connections` (`b2b`, `b2c`, `employment`), `invitations`, `connection_messages`, `connection_horse_access`, `connection_rate_limits`, `connection_horse_access` scoping helpers.
- Fine-grained horse access via `connection_horse_access` and `party_horse_links`.
- Stable ↔ Lab: submissions/requests + result sharing.
- Stable ↔ Doctor: consultations / referrals.
- Stable ↔ Horse Owner: boarding request → contract approval → hosted-horse recognition.
- Owner claim/delegation stack (`horse_owner_invites`, `horse_owner_access_grants`, `owner_claim_requests`, `owner_claim_events`, `owner_delegations`, `claim_client_portal`, `generate_client_claim_token`, `revoke_client_claim_token`, `materialize_owner_as_client`).

---

## 33. Demo/Test Data Dependency

- Movement RPC accepts `p_is_demo boolean` to segregate demo movements.
- Live seed data is minimal; most flows have real production paths.
- Automated test coverage is concentrated in Finance (see §35); non-finance modules have sparse coverage.

---

## 34. Arabic / English / RTL / Mobile Findings

- Bilingual coverage (Arabic / English) is comprehensive at the label level (`src/i18n/locales/ar.ts` and `en.ts` include 7k+ label rows each).
- RTL layout standards are enforced via project rules (`ux/rtl-layout-quality-standard`).
- Mobile shell (`/m/*`, `DashboardMobileModule`) is a **placeholder**; native/PWA parity is not achieved for most account-type flows.

---

## 35. Module Test-Coverage Matrix

| Area | Test evidence |
|---|---|
| Finance | Extensive Vitest coverage: `allocationDistribution`, `financialAmountInputLogic`, `invoicePresentation`, `labInvoiceMarker`, `multiInvoiceDistribution`, `multiInvoiceKpi`, `multiInvoicePaymentFingerprint`, `n2_5InvoiceRpcRuntimeWiring`, `paymentRpcCutover`, `invoiceRpc.sourceCheckout` |
| Payment RPCs | `supabase/tests/database/n2_payment_session_rpc.test.sql`, `j5_2_source_checkout_atomicity.test.sql`, `n2_4_catalog_runtime.test.sql`, `n2_5_invoice_catalog_runtime.test.sql` |
| Other modules | Sparse — most non-finance workflows lack automated test coverage. Auditors should treat this as a residual risk. |

---

## 36. Risk and Contradiction Register

| # | Item | Type | Status |
|---|---|---|---|
| R2-01 | Equine Pharmacy lacks a dedicated domain workflow (dispensing, prescriptions, orders, delivery). Orphan `useModuleAccess.isPharmacy` flag. | gap | open |
| R2-02 | Horse Transport lacks a dispatch/fleet/driver/route/leg/ETA/order lifecycle. | gap | open |
| R2-03 | Horse Auction is `onboarding-placeholder`; no listings, bidding, lots, consignment, or settlement. | gap | open |
| R2-04 | Independent Trainer is `onboarding-placeholder`; no client rosters, plans, sessions, or progress tracking. | gap | open |
| R2-05 | Horse Owner remains `domain-partial` — missing consolidated cross-stable dashboard, richer billing/statement surface, messaging/support, deeper delegation UI, and a clear line to any future external Client Portal. | gap | open |
| R2-06 | Zero-policy exposure of `pos_sales`, `horse_owner_*`, `owner_*`, `finance_request_idempotency`. | (previously flagged) | **rescinded** — see §37.D |
| R2-07 | Zero-policy tables classified as OPEN_ENDPOINTS. | (previously flagged) | **rescinded** — see §37.D |
| R2-08 | Capability asymmetry (Doctor / Academy gated by `tenantType` + permission, not by capability categories; Pharmacy flag unused) is undocumented outside this document. | contradiction | open |
| R2-09 | Legacy `/dashboard/payments` route duplicates `/dashboard/finance/payments`. | duplication | open |
| R2-10 | Doctor services catalog split (`doctor_services` vs `tenant_services`). | contradiction | open |
| R2-11 | Farrier and Professional Rider naming collisions (HR label / role reference vs workspace type). | naming | open |
| R2-12 | Tenant creation non-atomicity — accepted residual, not reopened here. | pre-existing | accepted-residual |
| R2-13 | Sparse non-finance automated test coverage. | quality | open |
| R2-14 | Mobile shell remains a placeholder. | gap | open |
| R2-15 | Planned types (Farrier, Professional Rider, Jockey) have no workspace foundations (enum, onboarding, capabilities, schema). | planned | open |

---

## 37. Rescinded Findings and Evidence Corrections

### A. Trigger count

- **Rescinded:** the broader 174-trigger figure, which was a **cross-schema** count.
- **Canonical current-truth (public schema only):** **167** non-internal triggers in the `public` schema.
- Excludes Supabase-managed schemas: `storage` (4), `auth` (1), `cron` (1), `realtime` (1).

### B. Movement RPC

- **Rescinded:** any "19-parameter" statement.
- **Canonical current-truth:** `public.record_horse_movement_with_housing` has **20 parameters**. No overload exists.
- Parameter order:
  1. `p_tenant_id uuid`
  2. `p_horse_id uuid`
  3. `p_movement_type text`
  4. `p_from_location_id uuid`
  5. `p_to_location_id uuid`
  6. `p_from_area_id uuid`
  7. `p_from_unit_id uuid`
  8. `p_to_area_id uuid`
  9. `p_to_unit_id uuid`
  10. `p_movement_at timestamptz`
  11. `p_reason text`
  12. `p_notes text`
  13. `p_internal_location_note text`
  14. `p_is_demo boolean`
  15. `p_clear_housing boolean`
  16. `p_destination_type text`
  17. `p_from_external_location_id uuid`
  18. `p_to_external_location_id uuid`
  19. `p_movement_status text`
  20. `p_movement_subtype text`

### C. Breeding capability truth

- **Rescinded:** any statement that Stable breeding is seeded disabled.
- **Canonical current-truth:**
  - Database seed truth — Stable = breeding enabled; all other current account types = breeding disabled.
  - Frontend fallback truth — `useModuleAccess` mirrors this; Stable resolves breeding enabled when the row is absent; others resolve disabled.
  - Live truth — all four current Stable tenants have breeding-enabled capability rows.

### D. Zero-policy tables

- **Rescinded:** R2-06 and R2-07 (zero-policy = unsafe).
- **Canonical current-truth:** the following tables are classified as `verified-safe-fail-closed-RPC-only`:
  - `pos_sales`
  - `horse_owner_access_grants`
  - `horse_owner_invites`
  - `owner_claim_events`
  - `owner_claim_requests`
  - `owner_delegations`
  - `finance_request_idempotency`
- Supporting evidence:
  - RLS enabled on each table.
  - Zero client policies on each table.
  - No client-facing `GRANT`s to `anon` or `authenticated` on any of these tables.
  - No frontend direct `.from(...)` callsites on any of these tables anywhere in `src/**`.
  - Intended write/read access is via SECURITY DEFINER RPC or internal helper paths only.
- **Future Skill 05 verification topic (separate audit, not performed here):** confirm that each SECURITY DEFINER function body that mutates these tables validates authenticated actor, correct tenant scope, valid token/scope, and target integrity.

### E. Horse Owner classification

- **Rescinded:** any prior "backend-only" or "active-partial (backend-heavy)" classification for Horse Owner.
- **Canonical current-truth:** Horse Owner is `domain-partial` (see §18).

---

## 38. Current Implementation Verdict

- **10** current implemented account/workspace types.
- **3** = `domain-substantive` (Stable, Laboratory, Independent Veterinarian).
- **3** = `domain-partial` (Veterinary Clinic, Training Academy, Horse Owner).
- **2** = `shared-foundation-only` (Equine Pharmacy, Horse Transport).
- **2** = `onboarding-placeholder` (Horse Auction, Independent Trainer).
- **0** = `backend-foundation-partial`.
- Backend depth is materially ahead of frontend depth in several cross-account foundations (owner claim/delegation stack; some doctor followup surfaces).
- No account type currently qualifies as launch-ready across all dimensions per §35 test coverage and §34 mobile parity.

---

## 39. Planned-Type Readiness Verdict

- **3** planned account/workspace types.
- Farrier: `planned-role-reference-only` — only HR profession label and one role reference exist.
- Professional Rider: `planned-no-workspace-foundation` — only one HR role reference exists.
- Jockey: `planned-no-workspace-foundation` — zero repository references.
- **None** of the three planned types has: `tenant_type` enum value, onboarding route, `SelectRole` entry, dedicated module, capability default, dedicated database object, or production-ready workflow.

---

## 40. Future Topic Destinations

- **Skill 05 (RLS Policy Safety)** — SECURITY DEFINER function-body validation for the seven fail-closed RPC-only tables in §37.D.
- **Round 3+ candidates** — Pharmacy dispensing domain, Transport dispatch/fleet domain, Auction lifecycle, Trainer workspace domain, Farrier/Professional Rider/Jockey workspace enablement, consolidated Horse Owner cross-stable dashboard, delegation UI depth, mobile parity, non-finance test coverage.
- **Doctor billing catalog unification** — `doctor_services` vs `tenant_services` consolidation.

---

## 41. Scope Boundaries

This document does not:

- Modify application source, migrations, database objects, RLS, RPCs, triggers, onboarding, `SelectRole`, routes, navigation, capabilities, permissions, community behavior, finance behavior, Horse Owner behavior, dependencies, or configuration.
- Reopen the first documentation package accepted at commit `b153fb4c`.
- Modify `docs/handoff/rounds/round-01/**`, `docs/architecture/account-types-and-identity-model.md`, `docs/historical/**`, or raw evidence files.
- Create Round 2 acceptance files, Round 2 package README, or a separate planned-type-readiness document.
- Publish, deploy, or promote.

---

## 42. Final Canonical Statement

The Dayli Horse platform currently implements **10** account/workspace types, has **3** planned types (Farrier, Professional Rider, Jockey), and an approved target total of **13**. Classification per §10 stands. Rescinded findings in §37 supersede any prior contradictory text. Planned types remain absent from `tenant_type`, onboarding, dedicated modules, capability defaults, and dedicated schema. Enum existence is never sufficient evidence of production readiness. Zero policies alone are not evidence of exposure when RLS is enabled, no client-facing GRANTs exist, no direct frontend callsites exist, and all mutation paths go through SECURITY DEFINER RPCs.
