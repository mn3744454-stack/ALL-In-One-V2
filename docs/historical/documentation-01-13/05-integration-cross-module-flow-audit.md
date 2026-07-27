<!--
id: DHB-DOC05
title: Documentation 5 — Integration & Cross-Module Flow Audit
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`05-integration-cross-module-flow-audit.md`)
source-sha256: daf36589a7f28039e53ba1b5cac6b3176b8ff1689cadc545726b19a160faaccc
-->

# Documentation 5 — Integration & Cross-Module Flow Audit

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/05-integration-cross-module-flow-audit.md`](../documentation-01-13/raw/05-integration-cross-module-flow-audit.md)
> **Source SHA-256:** `daf36589a7f28039e53ba1b5cac6b3176b8ff1689cadc545726b19a160faaccc`



# 22 — Integration & Cross-Module Flow Audit

---

## 22.1 Audit Scope and Method

### 22.1.1 Surfaces Inspected
`useLabRequests.ts` (286 lines), `useStableLabResults.ts` (158 lines), `useConnectedMovement.ts` (64 lines), `useIncomingMovements.ts` (112 lines), `useConsultations.ts` (doctor), `usePatients.ts` (doctor), `CreateInvoiceFromConsultation.tsx`, `CreateInvoiceFromBreedingEvent.tsx`, `useBillingLinks.ts`, `useStatementEnrichment.ts` (293 lines), `useScheduleItems.ts` (221 lines), `useActivityLog.ts` (126 lines), `useAdmissionFinancials.ts`, `useBoardingAdmissions.ts` (billing_links usage), `useLabHorses.ts`, `usePartyHorseLinks.ts`, `PublishToStableAction.tsx`, `ResultPreviewDialog.tsx`, `ResultsList.tsx`, `ClientStatementTab.tsx` (DomainBadge), `useLabCredits.ts`, `useLabInvoiceDraft.ts`, `useSampleInvoiceMap.ts`. Supabase types.ts for schema cross-references.

### 22.1.2 Integration Categories Assessed
22.1.2.1 **Operational** — workflow handoffs across module boundaries
22.1.2.2 **Data-model** — FK references, bridge tables, join patterns
22.1.2.3 **Billing/commercial** — billing_links, invoice creation, ledger posting
22.1.2.4 **Navigation/UI** — cross-module links, drill-through, shared surfaces
22.1.2.5 **Event/activity** — event tables feeding shared timelines/records
22.1.2.6 **Privacy/access** — RLS, SECURITY DEFINER, snapshot contracts
22.1.2.7 **Snapshot-based** — immutable identity/pricing captures at creation
22.1.2.8 **Live-reference** — direct FK joins to source tables

### 22.1.3 Confidence: High — all hooks/components inspected in full source.

---

## 22.2 Cross-Module Integration Map

### 22.2.1 Platform-Wide Integration Edges

```text
Stable ──────── Lab          [Production-grade, bidirectional, cross-tenant]
Stable ──────── Finance      [Production-grade, same-tenant]
Lab ────────── Finance       [Production-grade, same-tenant]
Doctor ─────── Finance       [Functional, same-tenant]
Stable ──────── Movement     [Production-grade, cross-tenant capable]
Stable ──────── Breeding     [Production-grade, same-tenant]
Doctor ─────── Stable        [Bridge-table only, no operational flow]
Doctor ─────── Schedule      [MISSING — gap]
Doctor ─────── Records       [MISSING — gap]
Vet ───────── Finance        [MISSING — gap]
Academy ────── Finance       [MISSING — gap]
```

### 22.2.2 Classification

22.2.2.1 **Production-grade**: Stable↔Lab (request→sample→result→publish→stable consumption), Stable↔Finance (boarding+breeding billing_links), Lab↔Finance (credits + invoicing), Stable↔Movement (connected movement + incoming arrivals via RPCs)

22.2.2.2 **Functional but incomplete**: Doctor↔Finance (consultation→invoice works, but doctor_services pricing not consumed)

22.2.2.3 **One-way only**: Lab→Stable result delivery (publish gate, SECURITY DEFINER RPC). No stable→lab data push beyond initial request.

22.2.2.4 **Commercially disconnected**: Vet module (has `actual_cost` fields but no billing_links, no invoice creation). Academy (sessions/bookings exist but no `billing_links` source type).

22.2.2.5 **Merely implied but not real**: Doctor↔Stable (consultation has `stable_tenant_id`, `published_to_stable`, `published_at`, `published_by` fields — schema supports publish-back but NO publish UI or RPC exists for doctor consultations; these fields are never set in any frontend code)

### 22.2.3 Integration Types

22.2.3.1 **Same-tenant**: Stable↔Finance, Stable↔Breeding, Stable↔Vet, Lab↔Finance, Doctor↔Finance, Academy↔Schedule

22.2.3.2 **Cross-tenant**: Stable↔Lab (dual-tenant model: `initiator_tenant_id` + `lab_tenant_id`), Connected movements (`record_connected_movement` RPC), Connections/consent grants

22.2.3.3 **Shared-surface aggregation**: Schedule (`useScheduleItems` aggregates 7 sources), Records (`useActivityLog` aggregates 3 event tables), Statement enrichment (`useStatementEnrichment` resolves lab_sample + boarding + breeding)

22.2.3.4 **Bridge-table**: `lab_horses.linked_horse_id` → `horses`, `doctor_patients.linked_horse_id` → `horses`, `party_horse_links` (client↔lab_horse junction)

22.2.3.5 **Snapshot handoff**: Lab requests snapshot horse identity + tenant name + service pricing at creation via DB triggers. Doctor consultations snapshot patient identity via trigger.

---

## 22.3 Stable ↔ Laboratory Integration

### 22.3.1 Request Initiation
Stable tenant (lab_mode=requests) creates `lab_request` via `useLabRequests.createRequest`. Sets `initiator_tenant_id` = self, `lab_tenant_id` = selected partner lab. Horse identity resolved from `horses` table and snapshotted.

### 22.3.2 Identity Transfer
**Horse**: `horse_name_snapshot`, `horse_name_ar_snapshot`, `horse_snapshot` (breed/color) written at creation. DB trigger `fn_populate_lab_request_snapshots` additionally resolves from `horse_aliases` for privacy masking.
**Client**: Not directly transferred — Lab auto-creates client from connected tenant on first operational interaction.
**Service**: `lab_request_services` junction with DB trigger `fn_populate_lrs_service_snapshots` capturing `unit_price_snapshot`, `currency_snapshot`, `pricing_rule_snapshot`, `template_ids_snapshot`, `service_name_snapshot`, `service_name_ar_snapshot`, `service_code_snapshot`.

### 22.3.3 Snapshot vs Live
**Snapshot**: Horse identity, service identity, pricing — all immutable after creation. Intentional for privacy and price integrity.
**Live**: `horse:horses(id, name, name_ar)` join in `useLabRequests` query — but this is only readable for the initiating tenant (same-tenant RLS). Lab side relies on snapshots.

### 22.3.4 Sample from Request
`CreateSampleDialog` accepts `fromRequest` prop. Prefills horse (via `lab_horses`), client, and template data from the request. Lab operator may create `lab_horse` linked to the request's horse_id.

### 22.3.5 Result Production and Publish
Lab creates results per sample/template. Status: draft→reviewed→final. `PublishToStableAction` component sets `published_to_stable=true` when:
- Result status is `reviewed` or `final`
- Sample is linked to a `lab_request_id`
- Not already published

### 22.3.6 Stable-Side Consumption
`useStableLabResults` calls `get_stable_lab_results` SECURITY DEFINER RPC. Returns results where `published_to_stable=true` and request was initiated by the calling stable tenant. Client-side groups by Horse → Sample → Template.

### 22.3.7 Invoice/Billing Linkage
Lab creates invoices from samples via `useLabInvoiceDraft` with `entity_type='lab_sample'`. `billing_links` with `source_type='lab_sample'`. `useSampleInvoiceMap` tracks per-sample invoice status. Credits system provides prepaid alternative: debit on accession.

### 22.3.8 Privacy/RLS
Lab-side queries use `lab_tenant_id = tenantId` filter. Stable-side queries use `tenant_id = tenantId` for own requests. Cross-tenant result delivery via SECURITY DEFINER RPC. Immutable field trigger prevents modification of tenant IDs, horse ID, requester.

### 22.3.9 Fragile Points
- Request creation snapshots horse data client-side (lines 150-177 in `useLabRequests`), though DB trigger also runs — double snapshot layer, not harmful but redundant
- `lab_request_services` service join `service:lab_services(...)` may return null for stable users due to cross-tenant RLS — mitigated by snapshot fields

### 22.3.10 Overall Maturity: **Production-grade bidirectional cross-tenant integration.** The most sophisticated integration in the platform.

---

## 22.4 Stable ↔ Doctor Integration

### 22.4.1 Current State
**No direct operational integration exists.** Doctor and Stable operate as fully isolated tenants. There is no request/response flow, no referral system, no consultation delivery mechanism, and no shared workflow.

### 22.4.2 Bridge Mechanisms
`doctor_patients.linked_horse_id` can reference a `horses` table record. However, this is a loose bridge — it requires the doctor to know the horse UUID and manually set it. No automated linking or lookup flow exists.

### 22.4.3 Schema Signals
`doctor_consultations` has `stable_tenant_id` (nullable), `published_to_stable` (boolean, defaults false), `published_at`, `published_by`. These fields clearly anticipate a Lab-style publish-back flow. **However: no publish UI, no publish RPC, no stable-side consumption hook, no stable-side consultation viewer exists.**

### 22.4.4 Can Stable Consume Doctor Outputs?
**No.** No `get_stable_doctor_consultations` RPC exists. No stable-side doctor results view. No HorseProfile section for external consultations. No shared results hook.

### 22.4.5 Can Doctor Work on Stable Horses?
Technically yes — `linked_horse_id` bridge exists. Practically no — no horse lookup dialog connecting to external stable registries. Doctor must manually create patients with optional UUID reference.

### 22.4.6 Consultation Flow-Back
**None.** No consultation outcome flows into stable records, schedule, horse profile, or activity log.

### 22.4.7 Classification
22.4.7.5 **Mostly bridge-table potential with little surfaced UX.** Schema is future-ready (publish fields exist) but zero operational integration exists today.

### 22.4.8 Missing Pieces
1. Publish-to-stable UI for consultations (following Lab's `PublishToStableAction` pattern)
2. SECURITY DEFINER RPC for stable-side consultation delivery (following `get_stable_lab_results` pattern)
3. Stable-side consultation viewer (following `StableResultsView` pattern)
4. Horse lookup from connections (so Doctor can find horses from connected stables)
5. HorseProfile section for external consultations

---

## 22.5 Stable ↔ Movement / Transport

### 22.5.1 Internal Movement
`useHorseMovements` creates movement records with type IN/OUT/TRANSFER. Housing occupancy integration via `record_movement_with_housing` RPC. Dispatch clears occupancy only at dispatched status.

### 22.5.2 Transport Tenant Connection
No transport-specific logic. Transport tenants use the same movement module. No vehicle/fleet/route tables or UI.

### 22.5.3 Connected Movement
`useConnectedMovement` calls `record_connected_movement` RPC with sender tenant, connected tenant, horse, and location params. Validates accepted connection exists. Creates an `incoming_horse_movements` row at receiver tenant.

### 22.5.4 Incoming Arrivals
`useIncomingMovements` queries `incoming_horse_movements` by tenant. `confirm_incoming_movement` RPC creates a local arrival movement at receiver tenant. `cancel_incoming_movement` RPC allows rejection. Both use `(supabase.rpc as any)` — typed via migration RPCs.

### 22.5.5 Transport-Specific Gaps
Transport is not a real cross-module integration — it's a stable-internal workflow that transport tenants can theoretically use. No transport logistics layer (routes, trips, vehicles, ETAs, fleet tracking).

### 22.5.6 Maturity: **Production-grade for stable-to-stable connected movement.** Transport-as-module: not started.

---

## 22.6 Stable ↔ Finance

### 22.6.1 Stable-Origin Financial Events
Boarding admissions → invoices via `CreateInvoiceFromAdmission`. Breeding events → invoices via `CreateInvoiceFromBreedingEvent`. Both produce `billing_links` and `invoice_items`.

### 22.6.2 Housing Billing
`billing_links(source_type='boarding', source_id=admission_id)`. `invoice_items(entity_type='boarding', entity_id=admission_id)`. Package-aware: base plan line + included service lines (v1 enrichment). `useAdmissionFinancials` computes admission-scoped financial state.

### 22.6.3 Breeding Billing
`billing_links(source_type='breeding_attempt'|'pregnancy_check'|'foaling'|'embryo_transfer')`. `invoice_items(entity_type='breeding')`. Contract-aware: prefills from `breeding_contracts.pricing_mode`.

### 22.6.4 Vet Financial Disconnection
**No `CreateInvoiceFromVetVisit` exists.** No `source_type='vet_visit'` billing link. `vet_visits` has `estimated_cost` and `actual_cost` fields but they are display-only — never flow to invoices or ledger. This is the single largest commercial gap in Stable.

### 22.6.5 Statement Enrichment
`useStatementEnrichment` resolves `entity_type='lab_sample'` (via lab_samples→lab_horses), `entity_type='boarding'` (via boarding_admissions→horses→branches), `entity_type='breeding'` (via description parsing). `DomainBadge` renders lab/boarding/breeding variants. **Note**: No `doctor_consultation` entity_type resolution in statement enrichment — doctor consultations create invoice_items without entity_type (bare invoice).

### 22.6.6 Financially Complete vs Not
**Complete**: Boarding ✅, Breeding ✅, Lab (own tenant) ✅
**Disconnected**: Vet ❌, Academy ❌

### 22.6.7 Maturity: **Production-grade for boarding + breeding. Vet is the critical gap.**

---

## 22.7 Laboratory ↔ Finance

### 22.7.1 Credits Flow
`lab_credit_wallets` (per-client balance), `lab_credit_transactions` (purchase/debit/refund). Credit debit occurs on sample accession. Feature-gated via `is_lab_credits_enabled`.

### 22.7.2 Invoice Flow
`useLabInvoiceDraft` creates invoices from samples with `entity_type='lab_sample'`. `useSampleInvoiceMap` tracks per-sample invoice linkage. `billing_links(source_type='lab_sample')`.

### 22.7.3 Pricing Snapshots
`lab_request_services` stores `unit_price_snapshot`, `pricing_rule_snapshot` at request creation. This locks pricing for the entire request lifecycle — changes to catalog don't affect existing requests.

### 22.7.4 Tracking
`useSampleInvoiceMap` queries `billing_links + invoice_items` to show invoiced/uninvoiced status per sample in the samples list.

### 22.7.5 Coherence
Lab finance is coherent — operations (sample lifecycle) and accounting (credits/invoices/ledger) are tightly coupled.

### 22.7.6 Gaps
Minor: No batch invoicing for multiple samples (one-at-a-time).

### 22.7.7 Maturity: **Production-grade.** Most complete commercial integration.

---

## 22.8 Doctor ↔ Finance

### 22.8.1 Consultation-to-Invoice
`CreateInvoiceFromConsultation` creates draft invoice + `billing_link(source_type='doctor_consultation', link_kind='final')`. Amount prefilled from `consultation.actual_cost`.

### 22.8.2 Doctor Services vs Manual Cost
`doctor_services` table has `base_price`. `ConsultationForm` does NOT reference `doctor_services` — cost is manually typed as `actual_cost`. Services catalog exists in isolation.

### 22.8.3 Commercially Integrated
Invoice creation ✅. Billing link ✅. Ledger posting (via standard approve flow) ✅.

### 22.8.4 Missing
- `doctor_services` not consumed during consultation → cost is always manual
- No `entity_type='doctor_consultation'` in `invoice_items` — invoice created as bare line item
- `useStatementEnrichment` does not resolve doctor consultation entity types
- `DomainBadge` has no "doctor" variant — doctor invoices show without domain badge in statements

### 22.8.5 Maturity: **Functional but incomplete.** Core flow works. Service pricing and statement enrichment gaps.

---

## 22.9 Doctor ↔ Schedule / Records / Activity

### 22.9.1 Schedule
`useScheduleItems` queries 7 sources: `vet_visits`, `vet_followups`, `horse_vaccinations`, `breeding_attempts`, `horse_movements`, `academy_sessions`, `lab_samples`. **`doctor_consultations` is NOT included.** Doctor's `scheduled_for` field is never surfaced in the shared calendar.

### 22.9.2 Records/Activity
`useActivityLog` queries 3 event tables: `vet_events`, `lab_events`, `breeding_events`. **No `doctor_events` table exists.** No doctor activity appears in the Records page.

### 22.9.3 Why It Matters
Doctor tenants see an empty Schedule and empty Records page. These shared surfaces appear in their sidebar but provide zero value.

### 22.9.4 Corrective Direction
- Add `doctor_consultations` query to `useScheduleItems` using `scheduled_for` field (quick fix)
- Either create `doctor_events` table with trigger on consultation status changes, or directly query `doctor_consultations` in `useActivityLog` (medium)

### 22.9.5 Maturity: **Missing.** Zero integration.

---

## 22.10 Shared Entity Bridge Audit

### 22.10.1 Bridge Patterns

22.10.1.1 **`lab_horses.linked_horse_id` → `horses`**: Used when Lab links a local lab horse to a platform horse. Set during auto-registration from requests. Enables cross-module horse identity unification.

22.10.1.2 **`doctor_patients.linked_horse_id` → `horses`**: Optional. Set manually during patient creation. No automated linking flow.

22.10.1.3 **`lab_horses`**: Lab-local horse registry with `name`, `name_ar`, `microchip`, `passport`, `ueln`, `source` (manual/platform/request). Decoupled from `horses` for privacy.

22.10.1.4 **`doctor_patients`**: Doctor-local patient registry with `owner_name`, `stable_name`, `source`. Decoupled from `horses`.

22.10.1.5 **`horse_aliases`**: Privacy masking layer for lab requests. Allows stable to present alternate names for horses sent to labs.

22.10.1.6 **`party_horse_links`**: Lab-specific client↔horse junction with relationship types (lab_customer, payer, owner, trainer, stable). Uses `set_primary_party_horse_link` RPC with advisory locking.

22.10.1.7 **Ownership bridge**: `horse_ownership` and `horse_ownership_history` track legal ownership of `horses`. Client-scoped. `clients.linked_profile_id` bridges clients to platform profiles.

### 22.10.2 Robustness Assessment
- `lab_horses` bridge: **Robust** — well-designed with source tracking, optional linking, privacy layer
- `doctor_patients` bridge: **Ad hoc** — optional UUID reference with no lookup flow
- `party_horse_links`: **Robust** — atomic primary enforcement, advisory locking
- `horse_aliases`: **Robust** — privacy-first design
- `horse_ownership`: **Functional** — history tracking included

### 22.10.3 Snapshot vs Live Reference
**Snapshot**: Lab requests (horse identity, service pricing, tenant name), Doctor consultations (patient identity). Used for cross-tenant data where live references would break RLS.
**Live**: Same-tenant references (boarding_admissions.horse_id → horses, vet_visits.horse_id → horses). Safe because same-tenant RLS allows direct joins.

### 22.10.4 Strategy Assessment
Lab's bridge strategy is **clean and consistent**: own registry + optional link + snapshot contract. Doctor's is **fragmented**: own registry + optional link + no discovery flow. The platform lacks a unified "horse identity resolution service" — each module independently manages its horse reference model.

---

## 22.11 Cross-Tenant Privacy and Access

### 22.11.1 Access Granting
`connections` table establishes tenant-to-tenant relationships. `consent_grants` define sharing scope (resource_type, access_level). `can_access_shared_resource` RPC validates access. `connection_rate_limits` prevent abuse.

### 22.11.2 SECURITY DEFINER Usage
- `get_stable_lab_results` — bypasses cross-tenant RLS for result delivery
- `fn_populate_lab_request_snapshots` — captures horse identity from requesting tenant
- `fn_populate_lrs_service_snapshots` — captures service pricing from lab tenant
- `fn_populate_doctor_consultation_snapshots` — captures patient identity
- `record_connected_movement` — validates connection + creates incoming movement
- `confirm_incoming_movement` — creates local arrival at receiver
- `set_primary_party_horse_link` — atomic primary enforcement

### 22.11.3 RLS-Only Patterns
All domain tables use `is_tenant_member()` or `is_active_tenant_member()` for standard same-tenant access. No direct cross-tenant reads via RLS alone — all cross-tenant flows use SECURITY DEFINER RPCs.

### 22.11.4 Privacy Assessment
No integrations leak live data. All cross-tenant flows use either snapshots or SECURITY DEFINER RPCs. Tenant isolation is preserved.

### 22.11.5 Comparison
22.11.5.1 **Stable↔Lab**: Most robust — 3 SECURITY DEFINER triggers, immutable field protection, privacy aliases
22.11.5.2 **Stable↔Doctor**: Schema-ready but no operational cross-tenant flow implemented
22.11.5.3 **Connected movements**: Robust — RPC-mediated with connection validation

### 22.11.6 No fragile access patterns identified.

---

## 22.12 Cross-Module Event and Activity Propagation

### 22.12.1 Event Tables
`vet_events`, `lab_events`, `breeding_events` — all share identical schema: `entity_type`, `entity_id`, `event_type`, `from_status`, `to_status`, `payload`, `created_by`, `tenant_id`.

### 22.12.2 Comparison
22.12.2.1 `breeding_events` — populated by triggers on breeding table changes
22.12.2.2 `vet_events` — populated by triggers on vet table changes
22.12.2.3 `lab_events` — populated by triggers on lab table changes
22.12.2.4 **No `doctor_events` table exists** — doctor activity is invisible in the event system

### 22.12.3 Architecture
Fragmented per-module event tables that `useActivityLog` manually aggregates. No unified event bus or event table. Each module must independently implement its own event table + triggers.

### 22.12.4 Missing Producers
- Doctor module (no event table)
- Housing/boarding module (no `housing_events` — admission status changes not tracked in events)
- Movement module (no `movement_events`)
- Finance module (no `finance_events`)
- Academy module (no `academy_events`)

### 22.12.5 Best Future Direction
A single `tenant_events` table with `module` discriminator would eliminate the fragmented aggregation pattern. However, this is a strategic redesign — current per-module pattern works for the 3 modules that have it.

---

## 22.13 UI/UX Truthfulness at Integration Boundaries

### 22.13.1 Correct Representations
- Lab publish-to-stable: UI accurately shows publish state, disabled when already published
- Billing links: Detail sheets accurately show linked invoices
- Connected movement: UI shows confirmation workflow accurately

### 22.13.2 Implied but Not Real
- Doctor `published_to_stable` field exists in schema AND is exposed in `useConsultations` interface — but no publish button, no publish flow, no stable consumption. If anyone inspects the data model, they'd expect a publish flow that doesn't exist.
- Doctor `stable_tenant_id` field suggests stable-doctor relationship tracking — never populated.

### 22.13.3 One-Way Assumptions
Users may assume Lab results flow bidirectionally — but Stable can only view (read-only), not annotate, comment, or respond to results.

### 22.13.4 Empty Cross-Module Surfaces
Doctor's Schedule and Records pages — visible in nav but empty due to missing integration.

### 22.13.5 Truthfulness Fixes
1. Wire doctor_consultations into Schedule (highest impact, quick fix)
2. Either implement doctor publish-to-stable or remove/hide `published_to_stable` fields from the interface to avoid confusion
3. Add `doctor_consultation` entity_type resolution to `useStatementEnrichment` + DomainBadge

---

## 22.14 Commercial Integration Map

### 22.14.1 Operational vs Commercial Flow

22.14.1.1 **Stable Housing**: Admission lifecycle ✅ → Invoice generation ✅ → billing_link ✅ → ledger posting ✅ → statement enrichment ✅ → DomainBadge ✅. **Mature end-to-end.**

22.14.1.2 **Stable Breeding**: Event lifecycle ✅ → Invoice generation ✅ → billing_link ✅ → ledger ✅ → statement enrichment ✅ → DomainBadge ✅ → Contract-aware pricing ✅. **Mature end-to-end.**

22.14.1.3 **Stable Vet**: Visit lifecycle ✅ → Invoice generation ❌ → billing_link ❌ → ledger ❌. **Operationally complete but commercially disconnected.**

22.14.1.4 **Lab Requests/Samples**: Request+sample lifecycle ✅ → Credits ✅ → Invoice generation ✅ → billing_link ✅ → ledger ✅ → statement enrichment ✅ → DomainBadge ✅ → pricing snapshots ✅. **Mature end-to-end.**

22.14.1.5 **Doctor Consultations**: Consultation lifecycle ✅ → Invoice generation ✅ → billing_link ✅ → ledger ✅ → statement enrichment ❌ (no entity_type) → DomainBadge ❌. **Partial end-to-end.** Core flow works but enrichment layer is incomplete.

---

## 22.15 Cross-Module Gap Map

### 22.15.2.1 Quick Fixes

**Gap X1: Doctor consultations missing from Schedule**
- Modules: Doctor ↔ Schedule
- Evidence: `useScheduleItems` queries 7 sources, none are `doctor_consultations`
- Risk: Doctor schedule page is empty
- Direction: Add `doctor_consultations` query filtering on `scheduled_for` date range
- Priority: **High**

**Gap X2: Doctor statement enrichment missing**
- Modules: Doctor ↔ Finance
- Evidence: `useStatementEnrichment` resolves lab_sample, boarding, breeding — no doctor_consultation. `DomainBadge` has 3 variants — no doctor.
- Risk: Doctor invoices show without context in client statements
- Direction: Add `doctor_consultation` entity_type to invoice_items creation in `CreateInvoiceFromConsultation`, then add resolution in `useStatementEnrichment` + DomainBadge variant
- Priority: **Medium**

### 22.15.2.2 Medium Refactors

**Gap X3: Vet module has no billing linkage**
- Modules: Stable Vet ↔ Finance
- Evidence: No `CreateInvoiceFromVetVisit`, no `source_type='vet_visit'`
- Risk: Vet costs tracked but never flow to accounting
- Direction: Create `CreateInvoiceFromVetVisit` following breeding/consultation pattern
- Priority: **High**

**Gap X4: Doctor activity invisible in Records**
- Modules: Doctor ↔ Records
- Evidence: No `doctor_events` table, `useActivityLog` doesn't query doctor tables
- Risk: Empty Records page for Doctor tenants
- Direction: Create `doctor_events` table + trigger, add to `useActivityLog`
- Priority: **Medium**

**Gap X5: Doctor services disconnected from consultation billing**
- Modules: Doctor internal
- Evidence: `ConsultationForm` doesn't reference `doctor_services`, cost is manual
- Risk: Service catalog is a dead-end
- Direction: Add service picker to ConsultationForm, auto-populate cost from `base_price`
- Priority: **Medium**

### 22.15.2.3 Structural Considerations (Future)

**Gap X6: No doctor publish-to-stable flow**
- Schema fields exist (`published_to_stable`, `stable_tenant_id`) but no implementation
- Would require: publish UI, SECURITY DEFINER RPC, stable-side viewer (following Lab pattern)
- Priority: **Low** — schema is ready when needed

**Gap X7: Fragmented event architecture**
- 3 separate event tables, manual aggregation, 5+ modules without event tables
- Would benefit from unified `tenant_events` table
- Priority: **Low** — current approach works, redesign is strategic

---

## 22.16 Evidence-Based Integration Summary

### 22.16.1 Strongest Integration
**Stable ↔ Laboratory**: Bidirectional cross-tenant flow with request lifecycle, snapshot contracts, publish gate, SECURITY DEFINER RPCs, pricing integrity, credit system, and full statement enrichment. This is the gold standard for all future cross-module integrations.

### 22.16.2 Weakest but Most Promising
**Doctor ↔ Stable**: Schema is fully prepared (stable_tenant_id, published_to_stable, linked_horse_id, snapshot triggers). Implementation would follow the proven Lab pattern. Highest ROI future integration.

### 22.16.3 Most Dangerous Hidden Disconnects
1. **Vet has zero commercial integration** — costs tracked but never reach accounting. Operators may assume vet costs flow to invoices.
2. **Doctor consultations invisible in Schedule** — Doctor tenants see an empty schedule despite having schedulable events.
3. **Doctor invoices lack entity_type** — statement enrichment cannot identify them as clinical revenue; no DomainBadge appears.

### 22.16.4 Ready for 10-Module Vision?
**Partially.** The cross-tenant integration pattern (snapshot + SECURITY DEFINER RPC + publish gate) proven by Lab is architecturally sound and reusable. The billing_links pattern is extensible. However:
- The event/activity layer is fragmented and module-specific
- The entity bridge pattern is inconsistent (Lab is robust, Doctor is ad hoc)
- 5 of 10 modules have zero integration points
- Module stacking is blocked by tenantType gating for Doctor/Academy

The platform needs to (a) standardize the bridge/event patterns, (b) convert type-gating to capability-gating, and (c) build domain surfaces for missing modules before the 10-module vision is achievable.

### 22.16.5 Recommended Next Audit Slice
**Corrective Action Prioritization & Execution Roadmap** — consolidate all gaps identified across audits 1-22 into a prioritized, sequenced execution plan with dependency mapping, effort estimates, and sprint-level groupings.

---

## 23 Output Rules
All findings evidence-based with file/function references. No code patches produced.

## 24 Final Deliverable State

### 24.1 Final numbering point reached: **22.16.5**
### 24.2 Recommended next starting number: **25**
### 24.3 Recommended next audit slice: **Corrective Action Prioritization & Execution Roadmap** — consolidating all gaps from audits 1-22 into a unified, prioritized, dependency-mapped execution plan.

