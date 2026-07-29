<!--
id: DHB-ARCH-COMMERCIAL-MONETIZATION
title: Dayli Horse — Commercial Architecture, Multi-Module Workspaces, Services, Customer Packages, Entitlements, Platform Billing, Usage Metering, Marketplace Economics & Monetization Readiness
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-29
last-verified: 2026-07-29
supersedes: []
superseded-by: null
source: Round 5 canonical documentation execution — authored from current repository source and live database metadata, the accepted Round 1–4 canonical documents, the completed Round 5 Master Investigative Audit, and the closed Round 5 Owner Alignment (ten final rulings). Pricing workbooks used as reference-only commercial intent.
source-sha256: n/a
-->

# Dayli Horse — Commercial Architecture, Entitlements, Platform Billing & Monetization Readiness

**Dayli Horse — ديلي هورس**

---

## 1. Document Control

| Field | Value |
|---|---|
| Document ID | `DHB-ARCH-COMMERCIAL-MONETIZATION` |
| Version | 1.0.0 |
| Status | current |
| Category | architecture-current-truth + approved-target |
| Audience | internal + external (developer handover) |
| Source round | Round 5 (R5) — canonical documentation execution |
| Controlling baseline | Closed Round 5 Owner Alignment — ten final rulings (§27) |
| Extends | `DHB-ARCH-ACCOUNT-MODULE-REALITY`, `DHB-ARCH-CORE-FLOWS-LIFECYCLES`, `DHB-ARCH-CROSS-ACCOUNT-INTEGRATIONS` |
| Rewrites | nothing — Rounds 1–4 remain accepted, closed and untouched |
| Change class | documentation-only; no source, schema, data, or configuration change |

### 1.1 Relationship to accepted Rounds 1–4

Rounds 1, 2, 3 and 4 are accepted and closed. Their conclusions on platform foundation, identity, tenancy, security, account-type reality, module maturity, core operational lifecycles, ecosystem-wide connections, consent, shared access, ownership, custody, horse-access governance and many-to-many ecosystem relationships are preserved here without modification.

Where current Round 5 evidence differs from an accepted historical claim, the difference is recorded in §33 as **current drift** or a **new Round 5 finding**. No earlier canonical file is edited.

---

## 2. Executive Summary

Dayli Horse today is an operationally mature multi-tenant equine platform with a **deep tenant-side operational finance stack** and **no platform-side SaaS commercial engine**.

Five statements summarise the current position:

1. **Operational finance is mature.** Invoices, invoice items with frozen tax snapshots, payment sessions, allocations, ledger entries, statements, POS, customer credit and tenant customer billing are implemented, atomic and backend-authoritative. This is money that a subscriber Workspace collects from *its own* customers.
2. **Platform billing does not exist.** There is no canonical Plan Catalog, no Subscription lifecycle, no Entitlement registry, no platform checkout, no recurring billing engine and no Founder Console.
3. **Capability control is configuration, not commerce.** `tenant_capabilities` is Workspace Configuration. Frontend module guards are UX. Neither is a commercial grant and neither is sufficient commercial enforcement.
4. **The approved target is a full SaaS commercial architecture** (catalog → plans → entitlements → limits → meters → subscriptions → platform billing → commissions → settlements → Founder Console), delivered incrementally.
5. **Phase 1 is commercial truth and enforcement**, not billing automation: canonical Module/Feature Catalog, stable keys, evidence-scoped lifecycle status, Plan Registry foundation, Entitlement Registry, auditable manual grants, capacity limits, three governed meters, backend-authoritative `has_entitlement()`, strict deny-wins, platform-staff authority, grandfather migration, bounded shadow mode, then enforcement. Money may continue to be collected manually or off-platform during Phase 1.

Nothing in this document authorises implementation. It is the controlling architecture and handover contract for the work that follows.

---

## 3. Purpose, Scope, and Non-Goals

### 3.1 Purpose

Provide one canonical, developer-ready reference for how Dayli Horse **is** commercially structured today, what the owner has **approved** as the target commercial architecture, and which values are only **commercial planning inputs**.

### 3.2 Scope

Commercial architecture; multi-module Workspaces; Modules and Features; Services and Customer Packages; Entitlements; compliance, configuration and permission layering; backend enforcement; platform billing boundary; usage metering; marketplace economics; account-type commercial archetypes; tax; lifecycle and safe closure; grandfathering and cutover; monetization readiness.

### 3.3 Non-Goals

- Not an investigative audit (Round 5 investigation is complete).
- Not an implementation, migration, seed, backfill or refactor.
- Not a pricing launch and not an approval of any price.
- Not Round 6.
- Does not produce the external developer/company Word document or the private Arabic owner-governance Word document. Both are produced only after this repository documentation passes acceptance re-audit.

---

## 4. Evidence and Claim Classification

Every material claim in this document carries one of four classes. Future architecture is never written in the present tense.

| Class | Meaning | Marker |
|---|---|---|
| **CURRENT IMPLEMENTATION** | Exists now in source, schema or live data. | `CURRENT` |
| **APPROVED TARGET** | Owner-approved future architecture. Not implemented. | `TARGET` |
| **COMMERCIAL_PLANNING_VALUE** | Exists only in workbooks, projections or illustrative examples. Not final. | `PLANNING` |
| **MISSING / BLOCKED** | Absent, incomplete, or not safe to sell. | `MISSING` / `BLOCKED` |

Evidence precedence used throughout: (1) repository source and live database metadata; (2) accepted canonical Round 1–4 documents; (3) the completed Round 5 Master Investigative Audit; (4) the closed Round 5 Owner Alignment; (5) pricing workbooks as reference-only intent; (6) screenshots as non-load-bearing corroboration.

Documentation 01–13 and the Skills series are **not** current authority and are not used as implementation evidence.

---

## 5. Canonical Vocabulary

| Term | Definition |
|---|---|
| **Person Identity** | One human identity across Dayli Horse. |
| **Personal Mode** | The person acting as an individual. Personal Mode is *not* automatically a legal supplier or establishment. |
| **Workspace / Establishment** | An independent organizational, operational, data, permission, legal and commercial context. |
| **Establishment Mode** | The user acting inside the selected Workspace under membership, role and permission. |
| **Workspace Switching** | Switching among independent Workspaces accessible to one Person Identity. |
| **Module** | A primary domain activity operated by a Workspace (Stable, Laboratory, Veterinary Facility, Academy, Pharmacy, Transport, Auction). |
| **Module Switching** | Switching among activated Modules inside one Workspace. This is **not** Workspace Switching. |
| **Feature** | A function inside a Module. |
| **Feature Group** | A related collection of Features. |
| **Integration Mode** | Using an external provider without operating the full internal Module. |
| **Entitlement** | The Workspace's commercial and operational right to use a Module, Feature, Add-on, Bundle, Capacity Plan, Consumption Pack, storage allocation, or other Dayli Horse commercial product. |
| **Compliance Gate** | Country, licensing, legal, regulatory, professional, branch or operational eligibility. |
| **Workspace Configuration** | The owner/manager's configuration of an already entitled capability. |
| **Permission** | An individual member's authorization inside the Workspace. |
| **Access Resolution** | Entitlement → Compliance Gate → Workspace Configuration → User Permission. Strict deny-wins. |
| **Service** | A customer-facing offer sold by a Workspace. |
| **Customer Package** | A customer-facing bundle of Services sold by a Workspace. |
| **Dayli Horse Plan / Pack** | A platform commercial product sold by Dayli Horse to a subscriber or Workspace. |
| **Platform Marketplace** | Dayli Horse sells Modules, Features, Add-ons, Bundles, Capacity Plans, Consumption Packs, storage and platform-level commercial rights. |
| **Customer Marketplace** | Subscriber Workspaces sell Services, Products and Customer Packages to Horse Owners, customers or other Workspaces. |

Platform Marketplace and Customer Marketplace are never merged.

---

## 6. Person Identity, Personal Mode, Establishment Mode, Workspace, and Switching

`CURRENT` — One authenticated Person Identity may hold membership in multiple Workspaces. `tenants.id` is the Workspace boundary. Membership, role and permission are resolved per Workspace; the backend permission model exposes granular permission keys resolved through `has_permission()`. The live permission registry is the authority for the key set; no fixed count is asserted here.

`CURRENT` — Workspace Switching exists. Module Switching **inside** a Workspace does not exist as a first-class concept: a Workspace carries a scalar `tenant_type`, and the surfaces a user sees are derived from that scalar plus `tenant_capabilities` plus navigation configuration.

`CURRENT` — Personal Mode exists as an identity state (a person with no active Establishment context, or acting on personally owned horses). Personal Mode confers no supplier or establishment status.

`TARGET` — Person Identity remains single. A Workspace may activate several Modules and expose explicit Module Switching. Commercial rights attach to the Workspace, never to the Person Identity, and never to a horse record.

---

## 7. Current Account-Type Roster and Target Roster

### 7.1 Current technical types (`CURRENT` — `tenant_type` enum is authoritative)

| # | Type | Enum value |
|---|---|---|
| 1 | Stable | `stable` |
| 2 | Veterinary Clinic | `clinic` |
| 3 | Laboratory | `lab` |
| 4 | Training Academy | `academy` |
| 5 | Equine Pharmacy | `pharmacy` |
| 6 | Horse Transport | `transport` |
| 7 | Horse Auction | `auction` |
| 8 | Horse Owner | `horse_owner` |
| 9 | Independent Trainer | `trainer` |
| 10 | Independent Veterinarian | `doctor` |

### 7.2 Approved planned types (`TARGET` — not implemented)

| # | Type | Status |
|---|---|---|
| 11 | Farrier | Planned Account Type — not in the enum |
| 12 | Professional Rider | Planned Account Type — not in the enum |
| 13 | Jockey | Planned Account Type — not in the enum |

**Target roster: 10 current technical types + 3 approved planned types = 13 target account types.**

Preserved relationship: **every Jockey is a Professional Rider; not every Professional Rider is a Jockey.**

Farrier, Professional Rider and Jockey remain in the Planned Account Types Register until their minimum technical identity, routes, permissions, onboarding and operational contracts are ready for enum activation. They must never be described as implemented.

### 7.3 Priority clarification (binding)

Planned status is **not** a roadmap-priority statement. Three axes are kept separate:

1. **Technical enum status** — does the database accept the value today.
2. **Implementation maturity** — how deep the Module/Feature evidence is.
3. **Owner roadmap priority** — what the owner chooses to build next.

Farrier, Professional Rider or Jockey may be designed, implemented, added to the enum and launched **before** any currently enumerated placeholder or lower-priority type, including Auction, Pharmacy, Transport, Academy or Independent Trainer. No currently enumerated type must be completed before work begins on the three planned types.

---

## 8. Current Commercial and Platform-Billing Reality

### 8.1 What does not exist (`MISSING`)

- Complete Platform SaaS subscription engine.
- Canonical Plan Catalog, Plan versions, Plan Registry.
- Subscription lifecycle (trial, renewal, upgrade, downgrade, grace, suspension, reactivation).
- Entitlement registry and Entitlement Grants.
- Platform checkout, recurring billing engine, platform invoices, platform payments.
- Commissions, settlements, platform refunds.
- Founder Console and platform-staff identity model.
- Usage meters and immutable usage events.

### 8.2 What does exist (`CURRENT`)

Tenant operational finance is mature and backend-authoritative:

- `invoices` with an enforced status constraint and tenant-scoped numbering.
- `invoice_items` with frozen line snapshots (`line_pretax_amount`, `line_tax_amount`, `line_gross_amount`, `taxable_snapshot`, `tax_rate_snapshot`) and source-validation triggers.
- Atomic invoice creation, approval and source-checkout RPCs with idempotency helpers and advisory locking.
- Payment sessions, payment allocations and horse-level allocations; posted payment sessions are terminal and non-reversible.
- Ledger entries, customer balances, client statements, POS sessions and sales, customer credit.

**This is not Dayli Horse Platform Billing.** It is the subscriber's own customer billing. The two must never be conflated (§18).

### 8.3 Capability and enforcement reality (`CURRENT`)

- `tenant_capabilities` is **Workspace Configuration**, covering a small number of seeded categories across the live tenants. It is not a commercial Entitlement registry and must never be described as one.
- Frontend module guards, hidden navigation and route filtering are **UX only**. They are not commercial enforcement.
- Existing payment/commission-like primitives (`payment_intents`, `payment_splits`) are **partial, dormant, frozen or superseded**. They carry platform-flavoured enum values but no live commercial function, and they must not be presented as a platform billing engine (§15).

### 8.4 Multi-module reality (`CURRENT`)

- `tenants.id` is the Workspace boundary.
- `tenant_type` is scalar — one type per Workspace.
- Module/capability logic is fragmented across database defaults, hooks and navigation configuration.
- No complete canonical Module/Feature Catalog exists.
- The approved future direction is **additive multi-module composition** (§10).

### 8.5 Services and Customer Packages reality (`CURRENT`)

- Services and domain catalogs exist in fragmented forms (tenant service catalog, laboratory catalog, and a separate doctor-side catalog).
- Customer Packages exist in partial forms.
- A Customer Package is **not** a Dayli Horse Plan.
- Current package structures do **not** prove complete allowances, usage balances, multi-executor fulfillment, or platform Entitlement.
- Seller and Executor are **not** consistently separated in all flows.

### 8.6 Pricing reality (`PLANNING`)

All workbook amounts, quantities, rates, discounts, validity periods and projections are **COMMERCIAL_PLANNING_VALUES** unless separately proven as both owner-approved final values *and* active implementation.

Illustrative planning values include 115 SAR, 575 SAR, 460 SAR, 100 SAR, 25 SAR, 5%, horse limits, sample limits and operation limits. None is final production truth.

Saudi VAT at 15% is a **current-country planning example**, not a globally immutable rule.

---

## 9. Current Workspace / Module / Capability Reality

| Layer | Current mechanism | Classification |
|---|---|---|
| Workspace boundary | `tenants.id` | `CURRENT` |
| Workspace type | scalar `tenant_type` enum (10 values) | `CURRENT` |
| Capability activation | `tenant_capabilities` rows (seeded categories) + frontend fallback | `CURRENT` — configuration only |
| Module registry | none | `MISSING` |
| Feature registry | none | `MISSING` |
| Commercial grant | none | `MISSING` |
| Enforcement | frontend guards + `has_permission()` for member authorization | `CURRENT` — no commercial layer |

Consequence: today a Workspace's visible surface is a function of its scalar type, seeded configuration rows and navigation code. There is no commercial statement anywhere in the system about what the Workspace has *bought*.

---

## 10. Approved Multi-Module Workspace Target

`TARGET` — approved direction, not universal current implementation.

- One Workspace may activate one or several eligible Modules.
- One Workspace has one primary legal/organizational identity.
- Modules may operate across one or several Branches.
- An embedded Module need not be physically in the same building.
- A Workspace may execute internally or use external connected providers.
- The architecture must not model every Module as a Stable extension.

Approved composition examples (`TARGET`): Stable + Laboratory; Clinic + Laboratory; Clinic + Pharmacy; Stable + Transport; Stable + Academy; Auction + Transport; Laboratory at a remote Branch; a Service sold by one Workspace and executed by another.

---

## 11. Module and Feature Catalog Architecture

`TARGET` — two-tier hierarchy: **Module → Feature**.

| Object | Purpose | Key rules |
|---|---|---|
| Module | Primary domain activity offered by the platform | stable immutable key; account-type availability; lifecycle status |
| Feature | Function inside a Module | stable immutable key; belongs to exactly one Module; own lifecycle status |
| Feature Group | Presentation/packaging grouping of Features | non-authoritative for entitlement resolution |
| Account-type availability | Which of the 13 target types may be offered a Module/Feature | availability ≠ entitlement |

A Plan may grant a full Module, selected Features, Add-ons, capacity limits or usage allocations.

The catalog is a **new commercial registry above `tenant_capabilities`**. `tenant_capabilities` remains Workspace Configuration and must not be extended into the commercial Entitlement registry.

### 11.1 Core, Optional and Integration classification (`TARGET`)

For each Module the catalog must classify every Feature:

| Class | Definition |
|---|---|
| **Core Required** | Without it, the Module cannot perform its primary function. |
| **Core Included but Hideable** | Included operational capability the Workspace may configure off. |
| **Optional / Premium** | Requires separate Feature or Add-on Entitlement. |
| **Integration Mode** | External-provider operation without the full internal Module. |

Preserved distinctions (binding, never collapsed):

- External Laboratory Requests ≠ Full Internal Laboratory.
- Basic Veterinary & Health ≠ Veterinary Facility Module.
- Medication Management ≠ Full Pharmacy.
- Movement ≠ commercial Transport.
- Employee veterinarian ≠ Independent Veterinarian Workspace.
- Trainer role ≠ Independent Trainer Workspace.
- Farrier HR classification ≠ Farrier Workspace.

---

## 12. Catalog Lifecycle, Stable Keys, and Verification Backlog

`TARGET` — catalog status is **evidence-scoped at Module and Feature level**. Blanket account-type maturity must never be applied where Module- or Feature-level evidence differs.

### 12.1 Lifecycle statuses

`Active` · `Draft` · `Blocked` · `Coming Soon` · `Planned` · `Deprecated`

### 12.2 Rules

1. Every catalog key is **stable and immutable**. Renaming requires controlled deprecation of the old key and creation of a replacement key. Keys are never silently mutated.
2. **No Plan, Entitlement, price or paid mapping may reference a non-Active Module or Feature.**
3. Every non-Active item must carry a **named verification backlog entry** (§35) stating what evidence promotes it to Active.
4. Promotion to Active requires end-to-end proof: implementation, routes, contracts, permissions, RLS, and complete workflow.

### 12.3 Current maturity baseline (`CURRENT`, account-type level only — Feature-level status overrides it)

| Account type | Baseline maturity |
|---|---|
| Stable | deepest implementation |
| Laboratory | deepest implementation |
| Independent Veterinarian | real but partial |
| Horse Owner | real but partial |
| Veterinary Clinic | domain-partial |
| Training Academy | domain-partial |
| Equine Pharmacy | mainly reuses shared foundations |
| Horse Transport | mainly reuses shared foundations |
| Horse Auction | onboarding placeholder |
| Independent Trainer | onboarding placeholder |
| Farrier / Professional Rider / Jockey | planned |

---

## 13. Entitlement Architecture

`TARGET`.

An **Entitlement** is the Workspace's commercial right, granted by Dayli Horse, to use a catalog Module, Feature, Add-on, Bundle, Capacity Plan, Consumption Pack or storage allocation.

| Concept | Question it answers | Owner |
|---|---|---|
| Entitlement | What did Dayli Horse commercially grant? | Platform |
| Compliance Gate | Is the Workspace legally and operationally eligible? | Platform + regulator |
| Workspace Configuration | How does the entitled Workspace choose to operate? | Workspace owner/manager |
| Permission | Which member may use it? | Workspace owner/manager |

Entitlement sources (`TARGET`): Plan grant, Add-on purchase, Consumption Pack, trial, bundle (including Owner Companion), and **explicit manual Entitlement Grant**. Every manual commercial exception is an auditable Entitlement Grant — never an undocumented configuration toggle.

`tenant_capabilities` must **never** override a denied Entitlement.

---

## 14. Compliance, Configuration, Permission, and Strict Deny-Wins

`TARGET` — the resolution order is fixed:

```text
1. Entitlement           (commercial right)
2. Compliance Gate       (legal / licensing / country / branch eligibility)
3. Workspace Configuration (owner/manager operational choice)
4. User Permission       (member authorization)
```

**Strict deny-wins.** A later layer can never re-grant access denied by an earlier layer. Configuration cannot restore a lapsed Entitlement. Permission cannot bypass a Compliance denial.

---

## 15. Backend Enforcement Contract

`TARGET` — enforcement is backend-authoritative.

Conceptual contract:

```text
has_entitlement(workspace_id, module_or_feature_key, optional_context) -> boolean / typed decision
```

The final implementation contract must require:

- backend validation for every commercially gated action;
- RLS integration where appropriate;
- write-RPC integration for every commercial write path;
- **typed denial reasons** (not entitled / compliance blocked / configuration off / permission denied / capacity exceeded / allowance exhausted / lapsed);
- frontend guards treated as UX only;
- no reliance on hidden navigation as security;
- no client-only commercial enforcement.

`CURRENT` — the backend already has `has_permission()` for member authorization. There is **no** `has_entitlement()`. Commercial enforcement today is frontend-only, which is the single largest monetization-readiness gap.

---

## 16. Services, Customer Packages, Seller, Executor, and Fulfillment

These concerns are strictly separated:

`Module activation` · `Service publication` · `Customer Package definition` · `fulfillment` · `invoice issuance` · `platform monetization`

A Workspace may sell a standalone **Service** or a **Customer Package** containing several Services.

Fulfillment modes (`TARGET`): **Internal**, **External**, **Hybrid**.

Roles kept distinct at all times:

| Role | Meaning |
|---|---|
| Seller / Provider-of-Record | The Workspace that sells and is commercially responsible |
| Operational Executor | The Workspace or person that performs the work |
| Customer | The paying party |
| Horse | The subject of the work |
| Branch | Organizational sub-unit of the Seller |
| Operational Location | Where work is physically performed |
| Service | The atomic offer |
| Package Line | A Service instance inside a Customer Package |
| Invoice issuer | Who issues the document |
| Payee | Who receives the money |
| Payer | Who pays |
| Subcontractor | External Executor engaged by the Seller |

**Seller does not automatically equal Executor.** A Package may include Services executed internally or by connected external providers.

`CURRENT` — current implementation does **not** fully support this contract. Seller/Executor separation is inconsistent, package allowances and usage balances are unproven, and multi-executor fulfillment is not modelled end to end. These are recorded as gaps in §33 and backlog items in §35.

---

## 17. Platform Marketplace vs Customer Marketplace

| Dimension | Platform Marketplace | Customer Marketplace |
|---|---|---|
| Seller | Dayli Horse | Subscriber Workspace |
| Buyer | Subscriber / Workspace | Horse Owner, customer, or another Workspace |
| Products | Modules, Features, Add-ons, Bundles, Capacity Plans, Consumption Packs, storage, platform rights | Services, Products, Customer Packages |
| Documents | Platform invoices (`TARGET`) | Tenant operational invoices (`CURRENT`) |
| Money | Platform revenue, commissions, settlements (`TARGET`) | Tenant revenue, customer payments, POS (`CURRENT`) |
| Schema home | dedicated platform billing boundary (`TARGET`) | `public` operational finance (`CURRENT`) |

The two marketplaces are never merged, never share document numbering, and never share ledgers.

---

## 18. Operational Finance vs Platform Billing

| Aspect | Operational finance (`CURRENT`) | Platform billing (`TARGET`) |
|---|---|---|
| Who charges whom | Workspace → its customers | Dayli Horse → Workspace/subscriber |
| Invoice objects | `invoices`, `invoice_items` | platform invoices in the billing boundary |
| Payment objects | payment sessions, allocations, ledger entries, POS | platform payments, provider billing |
| Tax | tenant tax configuration, frozen per-line snapshots | platform tax identity, jurisdictional tax evidence |
| Numbering | tenant-scoped numbering RPC | separate platform numbering |
| Enforcement | permissions + RLS | entitlement + platform-staff authority |
| Status today | mature, atomic, backend-authoritative | not implemented |

A tenant operational invoice is never a platform invoice.

---

## 19. Dedicated Platform Billing Boundary

`TARGET` — the commercial substrate lives in a **dedicated billing schema or equivalent strongly separated platform-commercial boundary**.

The boundary may contain: platform staff; catalog modules; catalog features; Plan products; Plan versions; Plan grants; Entitlements; subscriptions; meters; usage events; commercial contexts; platform pricing; platform tax; platform invoices; platform payments; commissions; settlements; audit events.

These must **not** be mixed into tenant operational invoices, ledger entries, payment sessions, customer payments, POS or tenant service plans.

**Commercial-context records belong in the platform billing boundary, not on horse identity records.**

### 19.1 Dormant payment primitives

`CURRENT` — `payment_intents` and `payment_splits` exist with zero rows and platform-flavoured enum values (for example platform fee / commission / subscription). `payment_intents` is a live dependency of the `cancel_invoice` guard.

Approved treatment (`TARGET`):

- **frozen and superseded** — not extended as the new SaaS foundation;
- **not deleted casually** — live dependencies, including the `cancel_invoice` guard, are preserved;
- classified as **frozen legacy/dormant foundations** until a separately verified deprecation path exists;
- deletion is never recommended without negative proof.

---

## 20. Platform Authority and Audit

`TARGET` — dedicated platform-staff identity and roles, entirely separate from all tenant roles.

Target concepts: `platform_staff`; stable platform role keys; `has_platform_role()`; backend-authoritative platform RPCs; billing-schema RLS; immutable audit.

Every platform commercial action records: **actor · action · target · reason · before · after · expiry · timestamp.**

Platform authority must **never** be derived from tenant owner, tenant manager, tenant admin, or Workspace membership.

The live permission registry is the evidence for the tenant permission key set; no outdated permission count is hard-coded here.

Before a Founder Console exists, approved platform operations may occur **only** through narrowly scoped audited RPCs, controlled migrations for initial seed, and explicit platform authority. **No unrestricted client writes.**

---

## 21. Meter Registry and Phase 1 Meter Definitions

`TARGET` — Phase 1 establishes exactly **three** governed meter foundations.

| Meter | Type | Unit | Billable point |
|---|---|---|---|
| Horse Capacity | stock | horse under valid active custody/hosting or active ownership | evaluated at commercial action time |
| Active Member Seats | stock | enabled human member with current Workspace access | evaluated at commercial action time |
| Laboratory Sample Consumption | flow | immutable usage event | reliable backend billable lifecycle point |

Rules:

- No storage, invoice-volume, media, API, booking, transport, academy or marketplace meters in Phase 1.
- The registry must be designed so future meters are added **without schema redesign**.
- Every consumption meter writes **immutable usage events**; corrections are compensating events, never mutations.

### 21.1 Active Member Seats

Count enabled human members with current Workspace access. Exclude pending invitations, revoked access, suspended/deactivated memberships, system identities and non-human identities.

The meter foundation exists in Phase 1, but **not every initial Plan must charge by seats**.

---

## 22. Horse Capacity and Commercial Context

### 22.1 Stable horse capacity (`TARGET`)

Do **not** count raw horse rows. Count horses currently under **valid active operational custody or hosting**, using authoritative admission/custody truth.

Exclude: intake drafts; incomplete records; archived horses; ended admissions; transferred-out horses; historical records.

### 22.2 Horse Owner capacity (`TARGET`)

Count **actively owned** horses using authoritative ownership.

Prevent duplicate commercial charging where an approved Owner Companion or bundle covers the same owner context.

The same horse may be counted in **different legitimate commercial contexts** only when the contracts differ — for example ownership capacity for the Horse Owner and active hosting capacity for the Stable. This must be **explicit and auditable**, and must never be inferred from duplicate horse records.

### 22.3 Horse status prerequisite

`CURRENT` — horse status is a free-form text value (values such as `active` and `intake_draft` are observed in live data); there is no governed value set and no boolean active/archived flag.

`TARGET` — **horse status must become a governed value set before it is used as a billing input.** This is recorded as a Phase 1 **prerequisite only**; it is not implemented by this document.

---

## 23. Laboratory Consumption and Retest Policy Boundary

`TARGET`:

- Use **immutable usage events** at a reliable backend billable lifecycle point.
- Creating a **draft** sample does **not** consume allowance.
- Cancellation **before** the billable event does **not** consume allowance.
- Post-consumption correction uses an **auditable compensating event**, never a silent decrement.
- **Retest treatment remains configurable** until final owner policy is approved. No retest rule is fixed by this document.
- **Do not meter Laboratory horses** as a pricing dimension. The separate laboratory horse register is an identity register, not a commercial dimension.

---

## 24. Existing Tenant Grandfathering, Shadow Mode, and Cutover

`TARGET` — approved transition for the existing live tenants:

1. Issue **auditable grandfather Entitlement Grants** covering proven current use.
2. Make grants **time-bound and reviewable**.
3. Run `has_entitlement()` in **bounded shadow / log-only** mode.
4. Define **exit criteria** for shadow mode.
5. **Correct false denials** surfaced during shadow mode.
6. **Enable enforcement.**
7. **Preserve read access** to existing finance and audit history.

Prohibited: hard cutover; empty-table enforcement; permanent default-allow; reactive grants issued only after an outage.

A lapsed Entitlement may block **new** commercial actions according to policy. It must **never** make existing financial or audit history unreadable.

---

## 25. Subscription Lifecycle, Safe Closure, and Fallbacks

`TARGET` lifecycle states (illustrative target set, not implemented):

`Draft` · `Offered` · `Trial` · `Pending Payment` · `Active` · `Grace` · `Restricted` · `Read-only` · `Suspended` · `Expired` · `Cancelled` · `Reactivated`

**Immediate deletion is never used.**

### 25.1 Safe Closure principles

- Block new operations according to policy.
- Permit safe completion of already-authorized work where required.
- Preserve legal, financial, medical, laboratory, movement and audit history.
- Retain read-only history.
- Allow reactivation without data loss.
- Avoid orphaning in-flight samples, bookings, admissions, trips, contracts or requests.

### 25.2 Fallback examples (`TARGET` unless current evidence proves implementation)

| Expiring entitlement | Retained fallback |
|---|---|
| Full Laboratory | External Laboratory Requests |
| Veterinary Facility | Basic Veterinary & Health |
| Academy | Stable |
| Transport | External-provider Transport integration |
| Premium Feature | Core Module |

---

## 26. Account-Type Commercial Archetypes — all 13 types

Archetype patterns (`TARGET`, no final prices):

| Archetype | Description | Potential use |
|---|---|---|
| **Capacity Subscription** | Recurring price against a stock meter | Stable, Horse Owner, Independent Trainer, seats, Branches, storage |
| **Consumption Pack** | Prepaid allowance against a flow meter | Laboratory, Veterinary Facility, Independent Veterinarian, Academy, Transport |
| **Revenue Share** | Percentage of transacted value; may be tiered | standalone Pharmacy, selected Marketplace transactions |
| **Hybrid** | Combination of subscription, listing fee, transaction fee, closing fee, commission, paid visibility, service fee | Auction (primary future example) |
| **Add-ons** | Separately entitled extras | advanced reports, analytics, automation, storage, extra Branches, extra capacity, premium visibility |

Rates may be tiered. **5% is not final.**

Catalog configuration is always preferred over account-type hard-coding.

### 26.1 Per-type commercial archetype assignment (`TARGET` intent; `PLANNING` amounts)

| # | Account type | Current maturity | Primary archetype (target) | Secondary components (target) | Commercially sellable today |
|---|---|---|---|---|---|
| 1 | Stable | deepest | Capacity Subscription (horse capacity, seats) | Add-ons; Owner Companion bundle; Academy/Transport module add-on | No — no entitlement engine |
| 2 | Veterinary Clinic | domain-partial | Consumption Pack | Capacity for seats; Pharmacy/Laboratory module add-on | No |
| 3 | Laboratory | deepest | Consumption Pack (sample consumption) | Capacity for seats; Branch add-on | No |
| 4 | Training Academy | domain-partial | Consumption Pack (sessions/bookings) | Capacity for seats | No |
| 5 | Equine Pharmacy | shared foundations | Revenue Share (standalone) | Capacity when embedded in a Clinic Workspace | No |
| 6 | Horse Transport | shared foundations | Consumption Pack (trips) | Revenue Share on marketplace trips | No |
| 7 | Horse Auction | onboarding placeholder | Hybrid | subscription + listing + transaction + closing fee + commission + paid visibility | No |
| 8 | Horse Owner | real but partial | Capacity Subscription (owned horses) | Owner Companion bundling with Stable | No |
| 9 | Independent Trainer | onboarding placeholder | Capacity Subscription | Consumption for sessions | No |
| 10 | Independent Veterinarian | real but partial | Consumption Pack | Capacity for seats | No — Service Catalog → Invoice is Blocked (§33) |
| 11 | Farrier | planned | Capacity or Consumption (undetermined) | — | No — planned type |
| 12 | Professional Rider | planned | Capacity Subscription (undetermined) | — | No — planned type |
| 13 | Jockey | planned | Capacity Subscription (undetermined) | — | No — planned type; every Jockey is a Professional Rider |

### 26.2 Independent Veterinarian — evidence-scoped treatment (binding)

The Independent Veterinarian account type is **not** classified as Draft or Coming Soon as a whole. Status is applied at Module and Feature level:

- Proven operational capabilities may be **Active**.
- **Service Catalog → Invoice integration remains Draft/Blocked** until its invoice-source contract is corrected and verified end to end. `CURRENT` — the doctor-side service catalog is a separate store from the tenant service catalog that invoice items validate against; this mismatch is latent and blocks the paid claim.
- **No paid Plan or Entitlement may promise that blocked capability.**
- Promotion to Active requires proof of: service creation; persistence; invoice catalog resolution; invoice-item validation; invoice issuance; permissions; RLS; complete workflow.

Independent Veterinarian is preserved as a **current implemented account type with partial maturity**.

---

## 27. Embedded vs Standalone Module Treatment

`TARGET`.

| Situation | Treatment |
|---|---|
| Laboratory embedded inside a Clinic Workspace | Module entitlement inside the same Workspace; one legal identity; may sit at a different Branch |
| Standalone Laboratory Workspace | Own Workspace, own legal identity, own commercial contract |
| Pharmacy embedded inside a Clinic | Module entitlement; typically Capacity/Add-on rather than Revenue Share |
| Standalone Pharmacy | Revenue Share archetype |
| Transport embedded in a Stable | Module entitlement; internal fulfillment |
| Standalone Transport | Own Workspace; Consumption/Revenue Share |

An embedded Module need not be physically co-located. Embedding is an **organizational and commercial** statement, not a physical one.

Integration Mode is always distinguished from full internal Module operation (§11.1).

---

## 28. Branches, Operational Locations, Global Expansion, Currency, and Tax

### 28.1 Branches and locations

`CURRENT` — Branch structures exist inside operational modules (housing, POS, movement) and are tenant-scoped.

`TARGET` — Branch count and Operational Location count are catalogable capacity dimensions and Add-on candidates. A Module may operate across one or several Branches. Operational Location is distinct from Branch: a Branch is organizational; an Operational Location is where work is physically performed, including external sites.

### 28.2 Currency

`CURRENT` — currency defaults to tenant-level configuration for operational financial entities.

`TARGET` — platform pricing carries its own currency per Plan version, independent of tenant operational currency.

### 28.3 Tax model (`TARGET`)

The platform commercial tax model must carry:

`Base Price` · `Currency` · `Tax Jurisdiction` · `Tax Rate` · `Tax-Inclusive Flag` · `Tax Amount` · `Gross Total` · `Tax Evidence Snapshot` · `Effective Date` · `Seller tax identity` · `Platform tax identity` · `exemptions` · `refunds` · `commission tax treatment`

Saudi VAT at 15% is a **current-country / planning example only** and must not be made globally immutable.

---

## 29. Owner Companion

`TARGET` — future concept, not implemented.

- A Stable subscriber may receive a **bundled owner-context entitlement** for privately owned horses.
- Every Stable may also act as a Horse Owner.
- Not every Horse Owner operates a Stable.
- Ownership and hosting remain separate concerns.
- **Horse identity must not be duplicated** to create an owner context.
- Owner capacity and stable hosting capacity may be **separate commercial contexts**.
- **Duplicate charging must be prevented** where a bundle covers the same owner context.
- HR and organization administration must not be duplicated unnecessarily.

No final horse allowance and no price is invented here.

---

## 30. Pharmacy and Marketplace Revenue Share

`TARGET`.

- **Standalone Pharmacy** is the primary Revenue Share candidate.
- **Embedded Pharmacy** inside a Clinic or Stable Workspace is treated as a Module entitlement, not automatically a revenue-share relationship.
- Selected **Customer Marketplace** transactions may carry revenue share.
- Rates may be **tiered** by volume, category or account type.
- Revenue share requires: transacted-value evidence, commission calculation, commission tax treatment, settlement records and immutable audit — all inside the platform billing boundary.

`PLANNING` — the 5% figure appearing in workbooks is a planning value. It is not final.

---

## 31. Auction Hybrid Model

`TARGET` — Auction is the primary future Hybrid example.

Potential components: subscription; listing fee; transaction fee; closing fee; commission; paid visibility; service fee.

`CURRENT` — Auction is an onboarding placeholder. There is no auction lifecycle, no listing object, no bidding engine, no closing workflow and no commission capture. Nothing in the Auction archetype may be sold until the Module and its Features reach Active with named verification evidence.

---

## 32. Pricing Status and Commercial Planning Values

All amounts, quantities, limits, rates, discounts, validity periods and projections in the pricing workbooks are `PLANNING` values. They are reference-only commercial intent and carry no implementation authority.

Pricing becomes production truth only when **both** conditions hold: (a) the owner approves the value as final, and (b) the value is implemented in the Plan Registry against an **Active** catalog entry.

See the Pricing Planning Value Register (Appendix F).

---

## 33. Current Gaps, Contradictions, and Blocked Capabilities

| # | Item | Class | Description |
|---|---|---|---|
| G-01 | No commercial enforcement layer | `MISSING` | No `has_entitlement()`; commercial gating is frontend-only. |
| G-02 | No Module/Feature Catalog | `MISSING` | Capability logic fragmented across DB defaults, hooks and navigation. |
| G-03 | No Plan Registry or Subscription lifecycle | `MISSING` | Nothing records what a Workspace bought. |
| G-04 | `tenant_capabilities` mis-readable as entitlement | `CURRENT` drift risk | Covers only a small seeded category set; must be documented as configuration. |
| G-05 | Scalar `tenant_type` blocks multi-module composition | `CURRENT` | One type per Workspace; target is additive Modules. |
| G-06 | Doctor Service Catalog → Invoice mismatch | `BLOCKED` | Doctor-side catalog is separate from the catalog invoice items validate against; latent, blocks paid claims. |
| G-07 | Laboratory credits are client-side only | `MISSING` | No immutable usage events; no backend allowance truth. |
| G-08 | Seller ≠ Executor not universally modelled | `MISSING` | Multi-executor fulfillment unproven. |
| G-09 | Customer Packages lack allowances/balances | `MISSING` | Partial structures only; not a Dayli Horse Plan. |
| G-10 | Horse status is ungoverned free text | `CURRENT` | Must become a governed value set before billing input use. |
| G-11 | Dormant platform payment primitives | `CURRENT` | `payment_intents`/`payment_splits` zero rows, platform-flavoured enums, live `cancel_invoice` dependency. |
| G-12 | No platform-staff identity | `MISSING` | Platform authority would otherwise be derived from tenant roles — prohibited. |
| G-13 | No Founder Console | `MISSING` | Interim platform operations require narrowly scoped audited RPCs only. |
| G-14 | Six account types have no live tenants | `CURRENT` | Maturity claims for those types cannot be evidenced from live use. |
| G-15 | Three approved account types absent from the enum | `TARGET` | Farrier, Professional Rider, Jockey remain planned; priority is independent of planned status. |

### 33.1 Recorded drift against accepted Rounds 1–4

No accepted Round 1–4 conclusion is contradicted by Round 5. Round 5 adds a commercial layer that those rounds did not cover. Where Round 5 evidence refines an earlier statement — notably that capability seeding is configuration rather than commercial grant — the refinement is recorded here and the earlier canonical files remain unedited.

---

## 34. Risk Register

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R5-01 | Selling a non-Active Module or Feature | Commercial overclaim; refund and reputational exposure | Medium | §12 rule: no Plan may reference non-Active items; verification backlog gates promotion |
| R5-02 | Treating `tenant_capabilities` as Entitlement | Unenforceable commercial rights; silent free access | High | New commercial registry above configuration; configuration can never re-grant |
| R5-03 | Frontend-only enforcement shipped as commercial gating | Revenue leakage; trivially bypassed | High | Backend-authoritative `has_entitlement()` before enforcement rollout |
| R5-04 | Hard cutover on empty entitlement tables | Mass false denials; live tenant outage | High | Grandfather grants → bounded shadow mode → exit criteria → enforcement |
| R5-05 | Lapsed entitlement hides financial/audit history | Legal and accounting exposure | Medium | History remains readable regardless of entitlement state |
| R5-06 | Duplicate charging across Owner Companion contexts | Billing disputes | Medium | Explicit auditable commercial contexts; no inference from duplicate horse records |
| R5-07 | Metering on ungoverned horse status | Incorrect invoices | Medium | Governed status value set as a Phase 1 prerequisite |
| R5-08 | Consuming lab allowance at draft creation | Customer overcharge | Medium | Billable point at a reliable backend lifecycle event; compensating events for correction |
| R5-09 | Extending dormant payment primitives as the SaaS foundation | Architectural debt; broken `cancel_invoice` guard | Medium | Freeze and supersede; preserve dependencies; no casual deletion |
| R5-10 | Platform authority derived from tenant owner/manager | Privilege escalation into platform commerce | High | Separate `platform_staff` identity and `has_platform_role()` |
| R5-11 | Mixing platform billing into tenant operational finance | Corrupted ledgers and numbering | High | Dedicated platform billing boundary |
| R5-12 | Publishing workbook prices as final | Commercial misrepresentation | Medium | All workbook values classified `PLANNING` |
| R5-13 | Catalog key renames breaking mappings | Entitlement and billing corruption | Medium | Stable immutable keys; controlled deprecate-and-replace |
| R5-14 | Promising the blocked Doctor invoice path in a paid Plan | Undeliverable paid capability | Medium | Feature stays Draft/Blocked until end-to-end proof |
| R5-15 | Describing planned account types as implemented | Public overclaim | Low | Planned Account Types Register; enum remains authoritative |

---

## 35. Named Verification and Remediation Backlog

Every non-Active catalog item requires a named backlog entry. The initial register:

| ID | Item | Required verification evidence | Blocks |
|---|---|---|---|
| VB-01 | Independent Veterinarian — Service Catalog → Invoice | service creation, persistence, invoice catalog resolution, invoice-item validation, invoice issuance, permissions, RLS, complete workflow | Any paid Doctor Plan |
| VB-02 | Laboratory consumption billable point | backend lifecycle point definition, immutable event write, cancellation semantics, compensating event | Laboratory Consumption Pack |
| VB-03 | Horse status governed value set | enumerated status domain, migration path, admission/custody authority | Horse Capacity meter |
| VB-04 | Stable horse-capacity custody truth | authoritative admission/custody query excluding drafts, archives, ended and transferred-out | Stable Capacity Subscription |
| VB-05 | Active member seat definition | enabled human member query excluding invitations, revoked, suspended, system identities | Seat-based pricing |
| VB-06 | Customer Package allowances and balances | allowance definition, balance tracking, consumption events | Package-based commercial claims |
| VB-07 | Seller vs Executor separation | provider-of-record, executor, payee/payer modelling across flows | Multi-executor fulfillment claims |
| VB-08 | Veterinary Clinic module depth | per-Feature route, contract, RLS and workflow proof | Clinic Plans |
| VB-09 | Training Academy module depth | per-Feature proof across sessions and bookings | Academy Plans |
| VB-10 | Pharmacy module depth | catalog, dispensing, stock, revenue-share evidence | Pharmacy Revenue Share |
| VB-11 | Transport module depth | trip lifecycle, pricing, fulfillment evidence | Transport Consumption |
| VB-12 | Auction module | listing, bidding, closing, commission capture | Auction Hybrid |
| VB-13 | Independent Trainer module depth | beyond onboarding placeholder | Trainer Plans |
| VB-14 | Horse Owner module depth | owner-context surfaces and ownership authority | Owner Capacity + Owner Companion |
| VB-15 | Farrier readiness | identity, routes, permissions, onboarding, operational contracts | Enum activation |
| VB-16 | Professional Rider readiness | as VB-15 | Enum activation |
| VB-17 | Jockey readiness | as VB-15, preserving Jockey ⊂ Professional Rider | Enum activation |
| VB-18 | Platform staff authority | `platform_staff`, role keys, `has_platform_role()`, billing RLS, immutable audit | All platform commercial operations |
| VB-19 | Dormant primitive deprecation path | negative-proof dependency analysis for `payment_intents`/`payment_splits` | Any removal |
| VB-20 | Shadow-mode exit criteria | false-denial thresholds, coverage, correction log | Enforcement rollout |

---

## 36. Phased Incremental Implementation Roadmap

Incremental migration only. No rebuild from scratch. Historical records are always preserved.

### 36.1 Phase 1 — Commercial truth and enforcement (`TARGET`)

Establishes: canonical Module Catalog; canonical Feature Catalog; stable keys; account-type availability; lifecycle status; verification backlog; Plan Registry foundation; Entitlement Registry; auditable manual grants; capacity limits; meter registry; usage-event foundation; backend-authoritative `has_entitlement()`; strict deny-wins resolution; platform staff authority; grandfather migration; bounded shadow mode; enforcement rollout.

Manual or off-platform money collection may remain temporarily. **Phase 1 does not deliver recurring billing, online checkout, or public self-service subscription billing.**

Status-quo capability hardening is explicitly **not** the approved target.

### 36.2 Later phases (`TARGET`)

Recurring subscriptions; provider billing; online checkout; trials; proration; coupons; offers; add-ons; commissions; settlements; refunds; lifecycle automation; public pricing; Founder Console.

### 36.3 Suggested sequencing within Phase 1

| Step | Deliverable | Gate |
|---|---|---|
| 1 | Platform billing boundary + platform staff authority + audit | No client writes; audited RPCs only |
| 2 | Module + Feature Catalog with stable keys and lifecycle status | Every non-Active item has a backlog entry |
| 3 | Entitlement Registry + manual auditable grants | Grants are time-bound and reviewable |
| 4 | Plan Registry foundation (no public pricing) | No Plan references a non-Active item |
| 5 | Meter registry + usage-event foundation (3 meters) | Governed horse status prerequisite satisfied for the horse meter |
| 6 | `has_entitlement()` in shadow / log-only mode | Named exit criteria defined before start |
| 7 | Grandfather grants for existing live tenants | Coverage proven against current use |
| 8 | False-denial correction | Shadow-mode exit criteria met |
| 9 | Enforcement enabled | History remains readable regardless of entitlement state |

---

## 37. Developer Handover Rules

1. Do not extend `tenant_capabilities` into the commercial registry. It stays Workspace Configuration.
2. Do not implement commercial gating in the frontend only. Frontend guards are UX.
3. Do not put platform commercial records in `public` operational finance tables.
4. Do not attach commercial-context records to horse identity records.
5. Do not extend `payment_intents` / `payment_splits`; do not delete them either.
6. Do not derive platform authority from any tenant role.
7. Do not rename a catalog key; deprecate and replace.
8. Do not map a price, Plan or Entitlement to a non-Active Module or Feature.
9. Do not consume a usage allowance before the defined backend billable point; correct only with compensating events.
10. Do not perform hard cutover; grandfather → shadow → enforce.
11. Do not make finance or audit history unreadable for any entitlement state.
12. Do not treat a Customer Package as a Dayli Horse Plan.
13. Do not assume Seller equals Executor.
14. Do not hard-code account-type behaviour where catalog configuration can express it.
15. Do not present any workbook value, or the 15% VAT rate, as final or global.
16. Prefer incremental migration; preserve historical records.

---

## 38. Documentation Acceptance Criteria

This document is acceptance-ready when all of the following hold:

1. Exactly two files changed: this document and `docs/README.md`.
2. Document ID is `DHB-ARCH-COMMERCIAL-MONETIZATION`; version `1.0.0`.
3. `docs/README.md` links the exact path.
4. All ten owner rulings are covered (§39.1 mapping).
5. Ruling 4 carries the priority clarification.
6. Current and target are separated everywhere.
7. All 13 target account types are represented, with the three planned types never described as implemented.
8. No final pricing is invented; VAT is not globalised.
9. No current SaaS billing engine is claimed.
10. `tenant_capabilities` is never described as Entitlement.
11. Strict backend deny-wins is documented.
12. The three Phase 1 meters are documented.
13. The dedicated platform billing boundary is documented.
14. Platform authority is separate from tenant roles.
15. Grandfather grants + shadow mode + enforcement are documented.
16. Finance and audit history remain readable.
17. Independent Veterinarian is Feature-scoped.
18. No implementation was performed and Rounds 1–4 were not modified.

---

## 39. Glossary

Beyond §5:

| Term | Definition |
|---|---|
| **Add-on** | A separately entitled capability purchased on top of a Plan. |
| **Bundle** | A commercial grouping of Modules/Features/Add-ons sold as one platform product. |
| **Capacity Plan** | A Plan priced against a stock meter (horses, seats, Branches, storage). |
| **Consumption Pack** | A prepaid allowance priced against a flow meter (samples, sessions, trips). |
| **Commercial Context** | The auditable commercial relationship under which a metered unit is counted (e.g. ownership vs hosting). |
| **Compensating Event** | An auditable usage event that offsets an earlier consumption event; never a mutation. |
| **Entitlement Grant** | An auditable record granting a Workspace a commercial right, including manual and grandfather grants. |
| **Grandfather Grant** | A time-bound Entitlement Grant covering an existing tenant's proven current use during cutover. |
| **Meter** | A governed countable dimension (stock or flow) used for commercial limits and pricing. |
| **Plan Registry** | The platform store of Plan products and Plan versions. |
| **Provider-of-Record** | The Seller commercially responsible for a Service, regardless of who executes it. |
| **Shadow Mode** | Bounded log-only evaluation of `has_entitlement()` prior to enforcement. |
| **Stable Key** | An immutable catalog identifier for a Module or Feature. |
| **Usage Event** | An immutable record of metered consumption. |
| **Verification Backlog Entry** | The named evidence requirement that promotes a non-Active catalog item to Active. |

---

## 40. Appendices

### Appendix A — Account-Type Commercial Readiness Matrix

| # | Account type | Enum today | Maturity | Catalog status (target seed) | Commercially sellable today | Blocking backlog |
|---|---|---|---|---|---|---|
| 1 | Stable | yes | deepest | Active (per-Feature) | No — no engine | VB-03, VB-04 |
| 2 | Veterinary Clinic | yes | domain-partial | Draft / Coming Soon | No | VB-08 |
| 3 | Laboratory | yes | deepest | Active (per-Feature) | No — no engine | VB-02 |
| 4 | Training Academy | yes | domain-partial | Draft / Coming Soon | No | VB-09 |
| 5 | Equine Pharmacy | yes | shared foundations | Draft | No | VB-10 |
| 6 | Horse Transport | yes | shared foundations | Draft | No | VB-11 |
| 7 | Horse Auction | yes | placeholder | Coming Soon | No | VB-12 |
| 8 | Horse Owner | yes | partial | Draft (per-Feature) | No | VB-14 |
| 9 | Independent Trainer | yes | placeholder | Coming Soon | No | VB-13 |
| 10 | Independent Veterinarian | yes | partial | Mixed — Active + Blocked | No | VB-01 |
| 11 | Farrier | no | planned | Planned | No | VB-15 |
| 12 | Professional Rider | no | planned | Planned | No | VB-16 |
| 13 | Jockey | no | planned | Planned | No | VB-17 |

### Appendix B — Module / Feature / Integration Matrix

| Module | Core Required (examples) | Core Included but Hideable | Optional / Premium | Integration Mode alternative |
|---|---|---|---|---|
| Stable | horse registry, admissions, housing, boarding | movement, breeding, basic vet & health | advanced reports, analytics, extra Branches | — |
| Laboratory | sample intake, request lifecycle, results | catalog categories | premium visibility, advanced analytics | External Laboratory Requests |
| Veterinary Facility | consultations, clinical records | medication management | advanced reporting | Basic Veterinary & Health |
| Pharmacy | product catalog, dispensing, stock | POS surface | marketplace visibility | Medication Management |
| Transport | trip lifecycle | movement linkage | route analytics | External-provider Transport integration |
| Academy | sessions, bookings | attendance | analytics | — |
| Auction | listings, bidding, closing | catalogue visibility | paid visibility, featured placement | — |

Integration Mode never equals full internal Module operation.

### Appendix C — Entitlement Resolution Matrix

| Scenario | Entitlement | Compliance | Configuration | Permission | Result |
|---|---|---|---|---|---|
| Fully granted, eligible, enabled, authorized | allow | allow | allow | allow | **Allow** |
| Plan lapsed | deny | — | — | — | **Deny — not entitled** (history remains readable) |
| Entitled but unlicensed jurisdiction | allow | deny | — | — | **Deny — compliance blocked** |
| Entitled, eligible, Workspace turned it off | allow | allow | deny | — | **Deny — configuration off** |
| Entitled, eligible, enabled, member lacks permission | allow | allow | allow | deny | **Deny — permission denied** |
| Configuration on but entitlement denied | deny | — | allow | allow | **Deny** — configuration can never re-grant |
| Capacity meter exceeded | allow (with limit) | allow | allow | allow | **Deny — capacity exceeded** |
| Consumption allowance exhausted | allow (with allowance) | allow | allow | allow | **Deny — allowance exhausted** |

### Appendix D — Meter Definition Matrix

| Meter | Type | Counted | Excluded | Billable point | Correction |
|---|---|---|---|---|---|
| Horse Capacity — Stable | stock | horses under valid active custody/hosting via authoritative admission truth | intake drafts, incomplete records, archived horses, ended admissions, transferred-out horses, historical records | evaluated at commercial action time | re-evaluation |
| Horse Capacity — Horse Owner | stock | actively owned horses via authoritative ownership | non-owned, archived, historical | evaluated at commercial action time | re-evaluation; duplicate-charge prevention where a bundle covers the same owner context |
| Active Member Seats | stock | enabled human members with current Workspace access | pending invitations, revoked access, suspended/deactivated memberships, system identities, non-human identities | evaluated at commercial action time | re-evaluation |
| Laboratory Sample Consumption | flow | immutable usage events at the backend billable lifecycle point | draft creation, cancellation before the billable event, laboratory horses | defined backend billable lifecycle point | auditable compensating event |

Out of Phase 1 scope: storage, invoice volume, media, API, bookings, transport, academy, marketplace. The registry must accept them later without schema redesign.

### Appendix E — Operational Finance vs Platform Billing Matrix

| Object class | Operational finance (`CURRENT`) | Platform billing (`TARGET`) | Mixing allowed |
|---|---|---|---|
| Invoice | `invoices` / `invoice_items` | platform invoice | No |
| Payment | payment sessions, allocations | platform payment / provider billing | No |
| Ledger | `ledger_entries`, customer balances | platform revenue records | No |
| Numbering | tenant-scoped numbering RPC | separate platform numbering | No |
| Tax | tenant tax config + frozen line snapshots | platform tax identity + jurisdiction evidence | No |
| Catalog | tenant services / packages | Module & Feature catalog, Plans | No |
| Enforcement | permissions + RLS | entitlement + platform authority | No |
| Schema | `public` | dedicated billing boundary | No |

### Appendix F — Pricing Planning Value Register

| Value | Appears as | Class | Status |
|---|---|---|---|
| 115 SAR | workbook plan amount | `PLANNING` | not final, not implemented |
| 575 SAR | workbook plan amount | `PLANNING` | not final, not implemented |
| 460 SAR | workbook plan amount | `PLANNING` | not final, not implemented |
| 100 SAR | workbook amount | `PLANNING` | not final, not implemented |
| 25 SAR | workbook amount | `PLANNING` | not final, not implemented |
| 5% | revenue-share rate | `PLANNING` | not final; rates may be tiered |
| Horse limits | capacity allowance | `PLANNING` | not final |
| Sample limits | consumption allowance | `PLANNING` | not final |
| Operation limits | usage allowance | `PLANNING` | not final |
| 15% VAT | Saudi tax rate | `PLANNING` (current-country example) | not globally immutable |
| Validity periods | trial/plan durations | `PLANNING` | not final |
| Discounts | workbook discounts | `PLANNING` | not final |
| Projections | revenue forecasts | `PLANNING` | not architecture input |

### Appendix G — Current vs Target Matrix

| Dimension | Current | Target |
|---|---|---|
| Workspace type | scalar `tenant_type` | additive multi-module composition |
| Capability control | `tenant_capabilities` configuration + frontend fallback | Module/Feature Catalog + Entitlement Registry above configuration |
| Commercial right | none recorded | Entitlement Grants, Plans, Add-ons, Packs |
| Enforcement | frontend guards + `has_permission()` | backend `has_entitlement()` with strict deny-wins and typed denials |
| Metering | none | Horse Capacity, Active Member Seats, Laboratory Sample Consumption |
| Platform money | none | platform invoices, payments, commissions, settlements |
| Schema boundary | `public` only | dedicated platform billing boundary |
| Platform authority | none (tenant roles only) | `platform_staff` + `has_platform_role()` + immutable audit |
| Console | none | Founder Console (later phase) |
| Cutover | n/a | grandfather grants → bounded shadow mode → enforcement |
| Account types | 10 enum | 13 target (10 + 3 planned) |
| Pricing | workbooks only | Plan Registry against Active catalog entries |

### Appendix H — Owner Alignment Decision Register (final rulings only)

| # | Final ruling | Where documented |
|---|---|---|
| 1 | Full SaaS commercial architecture is the long-term target. Entitlement / catalog / plan / limits / metering / backend enforcement is Phase 1. Manual collection may remain temporarily. | §2, §8, §9 target, §36.1 |
| 2 | Entitlements use a Module → Feature hierarchy in a new registry. `tenant_capabilities` remains operational configuration. | §11, §13 |
| 3 | Catalog status is evidence-scoped per Module and Feature. Stable keys. Non-Active items cannot be sold. Every non-Active item has a verification backlog. | §12, §35 |
| 4 | The enum is authoritative for the ten current technical types. Farrier, Professional Rider and Jockey remain approved planned types until minimum readiness. **Planned status does not determine roadmap priority.** | §7.1, §7.2, §7.3 |
| 5 | Enforcement is backend-authoritative. Strict deny-wins: Entitlement → Compliance → Configuration → Permission. Manual exceptions use auditable grants. | §14, §15, Appendix C |
| 6 | Phase 1 meters: Horse Capacity; Active Member Seats; Laboratory Sample Consumption — governed semantics and immutable events. | §21, §22, §23, Appendix D |
| 7 | Use a dedicated platform billing boundary. Freeze and supersede dormant payment primitives without deleting live dependencies. | §19, §19.1 |
| 8 | Use a dedicated platform-staff authority model, separate from tenant roles. Audit all platform commercial actions. | §20 |
| 9 | Existing live tenants receive time-bound grandfather grants, then bounded shadow mode, then enforcement. Existing finance and audit records remain readable. | §24 |
| 10 | Independent Veterinarian uses evidence-scoped Feature status. Proven capabilities may be Active. Service Catalog → Invoice integration remains Draft/Blocked until verified correction. | §26.2, VB-01 |

---

**End of `DHB-ARCH-COMMERCIAL-MONETIZATION` v1.0.0.**
