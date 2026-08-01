# PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03

## STAGE A — COMPLETE PROJECT MEMORY EXTRACTION — BATCH A1

Stage A only. Stage B, C, D, and E not started. No Project Knowledge text is reconstructed in this output.

### A1 scope

- Items delivered in this batch: MEM-001 through MEM-034 (9 Core rules + the first 25 referenced memory files).
- URI range covered: Core rules 1–9 (index `## Core` block), then `mem://security/community-workspace-rls-logic` through `mem://architecture/stable/housing-paddock-occupancy-model` in index order.
- Cumulative delivered: 34.
- Expected final: 103 (9 Core + 94 referenced files), subject to Stage A reconciliation.
- Remaining after this batch: 69.
- Next batch cursor: `mem://architecture/stable/vet-medical-records-system` (index Memories row 26) → MEM-035.

### Per-item field defaults

Unless a specific item states otherwise, for every item below: field 6 (read status) = **directly read**; field 7 (provenance metadata visible in the item) = **none present**; field 8 (last-updated/timestamp evidence in the item) = **none present**; field 12 (duplicate/overlap IDs) = **none identified in this batch**; field 13 (contradiction IDs) = **none identified in this batch**.

Core rules are delivered from the injected index `## Core` block, which is the only accessible representation of them; they have no separate `mem://` URI.

---

### Core rules (MEM-001 – MEM-009)

**MEM-001** — URI: `mem://index.md#Core` (line 1) · Title: Mobile-first and RTL core rule · Group: Core / UX
```
Mobile-first UI. RTL (Arabic) mode uses flex-1/flex-grow for horizontal layout balance.
```
Type: UX rule (stable global). Initial classification: possible Project Knowledge rule. Internal references: none. Stage B verification required: No.

**MEM-002** — URI: `mem://index.md#Core` (line 2) · Title: Workspace-class dialog layout · Group: Core / UX
```
Workspace-class dialogs: flex-col, fixed header/footer (shrink-0), single scrollable body max-h-[85vh]. No nested scroll containers.
```
Type: UX rule. Initial classification: possible Project Knowledge rule (component-level detail may reduce to Skill-only). Stage B verification required: No.

**MEM-003** — URI: `mem://index.md#Core` (line 3) · Title: Neutral form defaults and cascade resets · Group: Core / UX
```
Form inputs default to neutral states (e.g. `_none`, `__neutral__`). Forced default selections are prohibited. Cascade resets on changes (e.g. Gender).
```
Type: UX rule. Initial classification: possible Project Knowledge rule. Internal references: MEM-098 (reproduction form logic), MEM-096 (wizard selection standards). Stage B verification required: No.

**MEM-004** — URI: `mem://index.md#Core` (line 4) · Title: In-Context Creation Bridge · Group: Core / UX
```
Use In-Context Creation Bridge (+ Add New) for selectors to prevent dead ends. Auto-select and remount UI on save.
```
Type: UX rule. Initial classification: possible Project Knowledge rule. Internal references: MEM-083 (creation bridge pattern), MEM-100 (quick create bridge). Stage B verification required: No.

**MEM-005** — URI: `mem://index.md#Core` (line 5) · Title: Bilingual identity display · Group: Core / Localization
```
Stacked `<BilingualName />` for identity lists. English inputs use English placeholders in AR mode.
```
Type: language/terminology rule. Initial classification: possible Project Knowledge rule. Internal references: MEM-029 (bilingual naming architecture), component `<BilingualName />`. Stage B verification required: No.

**MEM-006** — URI: `mem://index.md#Core` (line 6) · Title: Archive/Deactivate over hard delete · Group: Core / Lifecycle
```
Hard delete forbidden if history exists; cascade Archive (`is_archived`) or Deactivate (`is_active`). Lists default to Active-only.
```
Type: technical architecture fact + stable global rule. Initial classification: possible Project Knowledge rule. Internal references: columns `is_archived`, `is_active`. Stage B verification required: No.

**MEM-007** — URI: `mem://index.md#Core` (line 7) · Title: Permission-based authorization · Group: Core / Security
```
Authorization: Use `hasPermission()` in UI; Backend uses `has_permission()` for 104 granular keys. No hardcoded roles like owner/manager.
```
Type: permission/RLS rule + current implementation claim (the count "104"). Initial classification: possible Project Knowledge rule; the numeric count requires verification. Internal references: `hasPermission()`, `has_permission()`. Stage B verification required: **Yes** — verify current permission-key count against the live permission registry before any count is restated in Project Knowledge.

**MEM-008** — URI: `mem://index.md#Core` (line 8) · Title: Dual RLS scoping model · Group: Core / Security
```
RLS Models: Dual scoping (personal `tenant_id IS NULL` vs organization `tenant_id IS NOT NULL`). Paid accounts act as organizations.
```
Type: permission/RLS rule. Initial classification: possible Project Knowledge rule. Internal references: MEM-010, MEM-017. Stage B verification required: **Yes** — confirm the scoping model is current and whether it is community-scoped or platform-wide.

**MEM-009** — URI: `mem://index.md#Core` (line 9) · Title: Financial status integrity · Group: Core / Finance
```
Financial Status Integrity: Never manually set 'paid'/'partial' status on invoices; they are strictly derived from the payment ledger.
```
Type: finance rule. Initial classification: possible Project Knowledge rule. Internal references: MEM-024, MEM-025. Stage B verification required: No.

---

### Referenced memory files (MEM-010 – MEM-034)

**MEM-010** — URI: `mem://security/community-workspace-rls-logic` · Title: Community Workspace RLS · Group: security
```
Community module RLS supports dual scoping:
1. Personal Scope (tenant_id IS NULL): Existing behavior for public/followers/own posts.
2. Organization Scope (tenant_id IS NOT NULL): Access is gated by tenant membership and permissions.
'can_view_community' and 'can_manage_community' helper functions handle authorization. SELECT access requires 'community.view' permission. INSERT (posts) and moderation (UPDATE/DELETE) require 'community.manage'. Comments and likes automatically inherit the tenant_id of their parent post to prevent cross-tenant leakage.
```
Type: permission/RLS rule; module-specific mechanic. Initial classification: possible Skill-only rule (module mechanic); the dual-scoping principle overlaps MEM-008. Internal references: functions `can_view_community()`, `can_manage_community()`; permissions `community.view`, `community.manage`. Overlap: MEM-008. Stage B verification: No (Stage D may cite it as the source of MEM-008's scope).

**MEM-011** — URI: `mem://features/finance/credit-limit-enforcement` · Title: Credit Limit Enforcement · Group: features/finance
```
The credit limit system tracks client utilization by comparing their outstanding balance against their credit_limit. Consumption is calculated as 'used = max(ledger_balance, 0)', meaning only positive "owes" (debt) consume the limit, while negative balances (credits) do not. During billing, a Credit Info Card displays the Limit, Current Outstanding (used), and Available Credit. Warnings or blocks are triggered at 80% and 100% utilization respectively. Overriding a block requires the 'clients.creditLimit.override' permission.
```
Type: finance rule; module-specific mechanic; business formula. Initial classification: possible Skill-only rule. Internal references: column `credit_limit`; permission `clients.creditLimit.override`. Stage B verification required: No.

**MEM-012** — URI: `mem://features/finance/client-statement-system` · Title: Client Statement System · Group: features/finance
```
The Client Statement (كشف حساب) provides a unified cross-module financial history driven by ledger entries.
1. Scoped View Model: Summary cards are derived from filtered ledger entries, while running balances are recomputed row-by-row from the visible exploded rows to ensure chronological consistency within the active horse/category filter.
2. Card Labels:
   - Scoped: 'إجمالي الفواتير ضمن النطاق المحدد' (Total Invoices), 'إجمالي المبلغ المسدد ضمن النطاق المحدد' (Total Paid), 'إجمالي المبلغ المستحق ضمن النطاق المحدد' (Total Outstanding).
   - Global: 'إجمالي جميع الفواتير التي تخص العميل' (Total All Client Invoices).
3. Value Sourcing: The 4th card sums all 'invoice' type ledger entries for the account, providing global context outside the active filter.
4. Ordering: User-toggled chronological sort (Oldest-to-Newest default).
5. Boarding Row Semantics: Rows use the 'Period End' date (accounting due date logic) and "From/To" (من/إلى) range wording.
6. Multi-Domain Attribution: Prioritizes direct 'invoice_items' metadata (horse_id, domain, service_id).
7. Tax Basis: Statement rows are unified on a post-tax basis to align with summary cards. For multi-segment boarding invoices, tax is distributed proportionally across segments based on the invoice snapshot.
8. Stability: Loading guards (skeletons and disabled exports) prevent rendering stale or incomplete data during enrichment/filter transitions.
9. Reconciliation: Discrepancies between the ledger debit and the sum of boarding segments (e.g. from non-boarding items on the same invoice) are injected as an 'Other charges' (رسوم أخرى) row to ensure the running balance matches summary cards.
10. Multi-Horse Invoices: Summary cards prioritize ledger truth over proportional line-item allocation. If an invoice contains line items for multiple horses, the full post-tax ledger debit is included in the scoped summary totals if any of the horses associated with that invoice match the current filter. This ensures totals align with real ledger obligations even when row views are filtered.
```
Type: finance rule; module-specific mechanic; UX rule (labels). Initial classification: possible Skill-only rule. Internal references: table `invoice_items` (horse_id, domain, service_id); ledger entries. Stage B verification required: No.

**MEM-013** — URI: `mem://architecture/party-horse-relationship-model` · Title: Party/Horse Relationships · Group: architecture
```
The platform uses a junction table 'party_horse_links' to manage many-to-many relationships between business entities (Parties/Clients) and horses across all segments (Stables, Labs, etc.). This model supports multiple relationship types such as 'owner', 'stable', 'trainer', 'payer', and 'lab_customer', allowing a single horse profile to be shared and accessed across different modules while maintaining granular permission scoping and segment-specific metadata.
```
Type: technical architecture fact; current implementation claim. Initial classification: requires Stage B verification (table existence and current use). Internal references: table `party_horse_links`. Stage B verification required: **Yes** — confirm `party_horse_links` exists and is current.

**MEM-014** — URI: `mem://features/horse-unification-strategy` · Title: Horse Unification Strategy · Group: features
```
Horse records are managed through a dual-registry system: 'horses' (rich facility records with pedigree, lineages, and housing) and 'lab_horses' (lightweight records for external/walk-in lab intake). These records are unified via the 'linked_horse_id' column in the 'lab_horses' table.

Cross-Tenant Unification:
- When sharing is granted via connections, Lab records can bridge back to canonical facility 'horses' using the 'linked_horse_id'.
- Deterministic matching based on microchip, passport, or UELN numbers is used to establish and verify canonical horse identities across different tenant boundaries.
- This allows for a unified history (tests, results, treatments) for a single horse across the platform while respecting tenant data ownership.
```
Type: technical architecture fact. Initial classification: possible Skill-only rule; the dual-registry fact may qualify as Project Knowledge context. Internal references: tables `horses`, `lab_horses`; column `linked_horse_id` (corroborated by `invoice_items.lab_horse_id` FK to `lab_horses`). Stage B verification required: No.

**MEM-015** — URI: `mem://architecture/platform-sharing-reference-pattern` · Title: Platform Sharing Reference Pattern · Group: architecture
```
The platform uses a 3-layer reference architecture for all cross-tenant data sharing:
1. Connection: Establish the relationship (tenant-to-tenant or tenant-to-profile).
2. Grant: Define the sharing scope (resource_type, access_level).
3. RLS: Domain tables (lab_results, horses, vet_records, etc.) implement shared access policies using the 'can_access_shared_resource()' helper.
This pattern ensures a single source of truth for relationships, prevents data duplication across tenants, and provides a scalable way to plug new modules (Lab, Stable, Clinic, Pharmacy) into the sharing ecosystem without breaking security boundaries.
```
Type: technical architecture fact; permission/RLS rule. Initial classification: possible Project Knowledge rule (cross-tenant sharing contract). Internal references: function `can_access_shared_resource()`. Stage B verification required: **Yes** — confirm the helper and 3-layer model are current.

**MEM-016** — URI: `mem://architecture/notification-system-standard` · Title: Notification System Standard · Group: architecture
```
The notification system uses a metadata-driven architecture for expressive, source-aware alerts.
1. Data Model: A 'metadata' JSONB column stores snapshots of context (e.g., 'actor_tenant_name', 'horse_name', 'entity_label', 'status') at creation time to ensure historical clarity and avoid RLS data loss.
2. Backend Infrastructure: The internal notification helper includes a 10-second deduplication window to prevent identical alerts within a short interval and logs warnings for high-volume fan-outs exceeding 50 recipients.
3. Rendering: Titles and bodies are rendered at display-time using i18n interpolation (e.g., 't("notifications.events.type.body", metadata)').
4. i18n Key Normalization: To prevent lookup failures in the dot-notation resolver, notification event types are normalized by replacing dots with underscores (e.g., 'lab_request.status_changed' becomes 'lab_request_status_changed') before building the translation lookup keys.
5. Localization: Status enums map to labels via 'tStatus()'. Relative time uses the active 'date-fns' locale.
6. UI: The notification drawer is responsive: mobile (w-[95vw]), tablet (sm:w-[480px]), and desktop (lg:w-[520px]).
7. Navigation: Event-specific routes (e.g., 'movement.*' -> '/dashboard/housing?tab=arrivalsAndDepartures') ensure deep-linking to the correct module surfaces. Routes must utilize the actual canonical tab keys defined in the destination components to avoid falling back to default tabs.
8. Legacy Compatibility: The system maintains readability for older notifications lacking metadata by falling back to the stored database 'title' and 'body' strings if the i18n lookup fails or interpolation results in incomplete content.
```
Type: technical architecture fact; module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: `src/lib/notifications/*`, route `/dashboard/housing?tab=arrivalsAndDepartures`. Stage B verification required: No.

**MEM-017** — URI: `mem://domain/horse-owner-tenant-isolation` · Title: Horse Owner Tenant Isolation · Group: domain
```
The 'Horse Owner' account is implemented as a paid industry tenant package, not as part of the personal/free user layer. This distinction ensures that ownership records, financial interactions, and pedigree data are managed within an organization workspace, separate from the user's personal community activity and bookings.
```
Type: technical architecture fact; account-model rule. Initial classification: possible Project Knowledge rule (supports the account-type model). Internal references: `tenant_type` value `horse_owner` (present in the live enum). Stage B verification required: No — corroborated by the live enum evidence.

**MEM-018** — URI: `mem://architecture/shared-client-registry-and-identity` · Title: Shared Client Registry · Group: architecture
```
The platform utilizes a shared 'clients' table for all billing parties, but auto-registration mechanics differ by module to prevent unpopulated registries.
1. Laboratory: Clients (via 'linked_tenant_id') and horses (via 'linked_horse_id') are automatically registered when a Lab operator opens the 'Create Sample' dialog for an incoming B2B request. This ensures they appear in the registry only at the start of a meaningful operational transaction.
2. Stable: Client registration remains manual. Operators select from the shared registry during admission or intake, with 'intake_draft' status used for new horses until arrival is confirmed.
3. Partnerships: B2B partnership or connection acceptance alone does NOT trigger client creation; registration is deferred until the first operational interaction (e.g., stay, service request, or sample intake).
```
Type: technical architecture fact; module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: table `clients`; columns `linked_tenant_id`, `linked_horse_id`; status `intake_draft`. Overlap: MEM-022 (intake_draft). Stage B verification required: No.

**MEM-019** — URI: `mem://architecture/finance/billing-linkage-pattern` · Title: Billing Linkage Pattern · Group: architecture/finance
```
The 'billing_links' table serves as the standard junction for associating domain-specific operational records (e.g., doctor consultations, future service bookings) with financial records (invoices). Each link record stores 'source_type', 'source_id', 'invoice_id', 'amount', and 'tenant_id'. This architectural pattern allows the finance module to track the revenue source and provides a standardized way for operational modules to trigger billing workflows and track linked financial status without direct coupling to the invoices table schema.
```
Type: technical architecture fact. Initial classification: possible Project Knowledge rule (operational-to-financial linkage principle), detail to Skill. Internal references: table `billing_links` (corroborated: FK `billing_links_invoice_id_fkey` in `docs/aml_1_b_1/stage_j5_1/preflight/02_invoices_schema.txt`). Stage B verification required: No.

**MEM-020** — URI: `mem://architecture/stable/housing-and-facility-management` · Title: Housing & Facility Management · Group: architecture/stable
```
Stable housing operations are strictly separated between Physical Facilities and Commercial Stays (Admissions). The module utilizes a standardized 4-tab Information Architecture (IA): (1) Branches (الفروع) - the primary operational command center and location index. (2) Facilities (المرافق) - physical infrastructure and unit management. (3) Admissions (الإيواء) - commercial stay contracts and billing. (4) Arrivals & Departures (الوصول والمغادرة) - logistics and movements. Sidebar navigation sub-items are aligned to exactly mirror these four tabs, ensuring a consistent mental model across the platform. Admissions acts as the transaction layer that consumes the physical resources defined in the Facilities layer.
```
Type: module-specific mechanic; UX rule. Initial classification: possible Skill-only rule. Internal references: `src/pages/DashboardHousing.tsx`; navigation config. Stage B verification required: No.

**MEM-021** — URI: `mem://architecture/stable/boarding-stay-and-care-lifecycle` · Title: Boarding Stay Lifecycle · Group: architecture/stable
```
The 'boarding_admissions' lifecycle (draft -> active -> checkout_pending -> checked_out) is integrated with the financial system.
1. Invoicing: Staff manually trigger invoice generation from the stay detail, which creates an invoice starting in 'draft' status.
2. Line Items: Invoices include 'boarding' entity type items with standardized descriptions: '{Horse} | {Branch} | {Date Range} | {Rate}'.
3. Accounting: Financial impact (ledger posting) occurs only when the invoice is transitioned to 'approved' via a unified approval utility.
4. Financial Gate: Checkout and physical dispatch are blocked for staff if an outstanding balance exists. The balance calculation uses a 'Financial Truth' model that considers both financially active invoices and unbilled accruals. Overriding a block requires a recorded manager override.
5. Domain Components: The domain includes 'boarding_status_history' for lifecycle tracking and 'horse_care_notes' for recording specific care instructions or observations linked to an admission.
6. Creation Integrity: New admissions follow a specific three-step commit sequence: (a) create draft admission, (b) execute the movement RPC, (c) update admission with the resulting movement ID and set status to 'active'. To prevent un-admitted placements or un-housed commercial records, the system implements programmatic rollback (deleting the draft admission) if the movement RPC or ID extraction fails.
```
Type: module-specific mechanic; finance rule. Initial classification: possible Skill-only rule. Internal references: tables `boarding_admissions`, `boarding_status_history`, `horse_care_notes`; movement RPC. Stage B verification required: No.

**MEM-022** — URI: `mem://architecture/stable/horse-registry-and-onboarding-logic` · Title: Horse Registry Onboarding · Group: architecture/stable
```
The 'Manual Arrival' flow supports immediate operational intake by allowing lightweight horse registration (name, sex, intake notes) directly within the movement wizard.
1. Transitional Status: New horses are initialized with an 'intake_draft' status and do not count toward 'Inside Stable' totals or occupy housing until the arrival movement is confirmed.
2. Profile Completeness: These records are flagged as 'Incomplete'. The Horse Profile surfaces an 'Incomplete' badge and a checklist of missing critical data (birth date, microchip, passport) with a CTA to finish the record via the full registration wizard.
3. Historical Onboarding: The system supports accurate legacy record entry by allowing custom 'admitted_at' and 'movement_at' timestamps, which override the default current-time behavior for admissions, movements, and housing occupancy.
```
Type: module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: status `intake_draft`; `src/pages/HorseProfile.tsx`. Overlap: MEM-026, MEM-018. Stage B verification required: No.

**MEM-023** — URI: `mem://features/stable/movement-and-logistics` · Title: Movement & Logistics · Group: features/stable
```
Horse movements are managed through a unified 'Arrivals & Departures' interface tracking inbound, outbound, and internal logistics. (1) Eligibility: Selection lists are filtered by movement type. (2) Source Branching: Arrivals support 'Existing Horse Lookup' and 'Manual External Arrival'. (3) Unified View: Sub-tabs for Arrivals, Departures, Incoming, Pending, Completed, and Cancelled. (4) Auto-resolution: Wizard auto-resolves 'From' location for OUT and TRANSFER movements. (5) Housing Clearance: Occupancy is released only upon 'dispatched' status. (6) Connected Movements: Confirming a connected incoming movement requires an explicit receiving branch selection; no silent fallback to the first branch is allowed. (7) Recipient Integration: Confirmation automatically creates an arrival movement and a boarding admission at the destination. (8) Lifecycle: Follows scheduled -> dispatched -> completed transition. (9) Destinations: Supports connected platform partners (filtered by 'stable' or 'clinic' types) and off-platform 'external_locations'.
```
Type: module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: table `external_locations`; tenant types `stable`, `clinic` (both present in the live enum); `src/pages/DashboardMovement.tsx`. Stage B verification required: No.

**MEM-024** — URI: `mem://finance/payment-status-integrity-rule` · Title: Payment Status Integrity · Group: finance
```
To maintain accounting integrity, the system forbids manual status updates to 'paid' or 'partial' via simple column toggles or dropdowns. These statuses are strictly derived from formal payment records processed through 'postLedgerForPayments'. This enforcement prevents 'Paid' invoices from existing without corresponding negative ledger entries, ensuring that the visual status always remains synchronized with the client's actual financial balance.
```
Type: finance rule. Initial classification: possible Project Knowledge rule. Internal references: `src/lib/finance/postLedgerForPayments.ts` (present in the repository). Overlap: MEM-009, MEM-025. Note: later memory entries and current code describe payment-session RPC posting (`post_payment_session`), so the named utility may be partially superseded. Stage B verification required: **Yes** — confirm the current authoritative payment-posting path before restating this rule.

**MEM-025** — URI: `mem://finance/invoice-accounting-lifecycle` · Title: Invoice Accounting Lifecycle · Group: finance
```
Invoices follow a strict accounting lifecycle: 'draft' or 'reviewed' (financially invisible) -> 'approved' (accounting activation) -> 'shared' (external visibility) -> 'paid'/'overdue'/'cancelled'.
1. Database Integrity: The 'invoices' table enforces this lifecycle via the 'invoices_status_check' constraint.
2. Activation: Transitioning to 'approved' via the 'approveInvoice' utility triggers idempotent ledger posting and balance updates.
3. Reversal and Adjustment: Statuses 'paid' or 'partial' are derived from payments. Cancellation of approved invoices requires a reversal ledger entry ('adjustment' type) to neutralize financial effect.
4. Reconciliation Auditability: Automated reconciliation entries (e.g., from Phase 6 historical cleanup) are prefixed with 'Phase 6 Reconciliation:' in ledger descriptions to ensure transparency for data corrections.
```
Type: finance rule; current implementation claim; historical implementation claim (item 4). Initial classification: possible Skill-only rule with a Project Knowledge core (ledger activation on approval). Internal references: constraint `invoices_status_check` (corroborated in `docs/aml_1_b_1/stage_j5_1/preflight/02_invoices_schema.txt`); `src/lib/finance/approveInvoice.ts`. Stage B verification required: No.

**MEM-026** — URI: `mem://architecture/horses/unified-profile-architecture` · Title: Unified Profile Architecture · Group: architecture/horses
```
The 'Unified Horse Profile' is implemented as a UI composition ('src/pages/HorseProfile.tsx') that aggregates data from multiple underlying tables. The hero section utilizes the canonical '<BilingualName />' component for language-aware identity display. Incompleteness (missing birth date, microchip, or passport) is surfaced via an 'Incomplete' badge and checklist CTA. This architecture enables a modular, multi-source record while respecting tenant-scoped data ownership.
```
Type: module-specific mechanic; UX rule. Initial classification: possible Skill-only rule. Internal references: `src/pages/HorseProfile.tsx`; `<BilingualName />`. Overlap: MEM-005, MEM-022. Stage B verification required: No.

**MEM-027** — URI: `mem://architecture/finance/event-driven-invoicing-pattern` · Title: Event-Driven Invoicing Pattern · Group: architecture/finance
```
The platform implements a standardized 'Generate Invoice from Event' architectural pattern across multiple modules (Stable Boarding, Independent Doctor, Breeding). Operational detail views (e.g., AdmissionDetailSheet, ConsultationDetail, BreedingRecordDetailSheet) provide a manual action to trigger a dedicated invoicing dialog (e.g., CreateInvoiceFromBreedingEvent.tsx). This dialog creates a draft invoice and a 'billing_link' using a domain-specific 'source_type' (e.g., 'breeding_attempt', 'doctor_consultation'). This ensures billing remains opt-in and operator-controlled while maintaining a traceable link to the operational or clinical evidence.
```
Type: technical architecture fact. Initial classification: possible Project Knowledge rule (operations link to invoices, never duplicate them). Internal references: `billing_links`; component names listed above. Overlap: MEM-019. Stage B verification required: No.

**MEM-028** — URI: `mem://security/client-tenant-isolation` · Title: Client Tenant Isolation · Group: security
```
Clients are strictly tenant-scoped entities. The 'clients' table uses RLS policies (`is_tenant_member(auth.uid(), tenant_id)`) to ensure that one tenant's clients are not visible or selectable by another. This isolation must be maintained even when operational records (like Breeding Contracts) reference clients, to prevent cross-tenant data contamination.
```
Type: permission/RLS rule. Initial classification: possible Project Knowledge rule. Internal references: function `is_tenant_member()` (corroborated in the invoices/invoice_items policy evidence). Stage B verification required: No.

**MEM-029** — URI: `mem://localization/bilingual-naming-architecture` · Title: Bilingual Naming Architecture · Group: localization
```
The platform implements a unified bilingual naming strategy using the '<BilingualName />' component.
1. Display: Identity surfaces like grids, tables, and list cards must use a stacked layout (primary bold top, secondary lighter in parentheses below). Inline rendering is restricted to compact contexts.
2. Data Entry: Inputs for English-only fields must maintain English-language placeholders even when the UI is in Arabic mode to provide correct linguistic context.
3. Label Symmetry: Identity labels for symmetric bilingual fields (e.g. in creation forms) must follow a parallel structure (e.g. 'Field Name (English)' and 'Field Name (Arabic)') rather than asymmetric variants to maintain semantic balance.
```
Type: language/terminology rule; UX rule. Initial classification: possible Project Knowledge rule. Internal references: `<BilingualName />`. Overlap: MEM-005. Note for Stage C: this entry states primary/secondary-in-parentheses display, which is directionally consistent with the owner's Correction 6 but does not by itself state the language-primacy rule per UI language. Stage B verification required: **Yes** — check current bilingual display implementation against Correction 6.

**MEM-030** — URI: `mem://domain/stable/housing-facility-taxonomy` · Title: Housing Facility Taxonomy · Group: domain/stable
```
The platform enforces a strict 8-type facility taxonomy: Housing (barn, isolation), Open-area (paddock, pasture), Activity (arena, round_pen, wash_area), and Storage (storage). The 'Other / أخرى' type is explicitly removed from the system to ensure data classification integrity and drive specific type-aware behaviors in the UI and data model.
```
Type: module-specific mechanic; domain taxonomy. Initial classification: possible Skill-only rule. Internal references: facility type values listed. Stage B verification required: No.

**MEM-031** — URI: `mem://localization/stable/account-aware-housing-terminology` · Title: Account-Aware Housing Terminology · Group: localization/stable
```
Housing terminology adapts to the tenant type: Stable accounts use 'Stall Block' (جناح) and 'Stall' (بوكس), while Clinic accounts use 'Ward' (عنبر) and 'Patient Room' (غرفة مريض). This account-awareness is applied consistently across creation wizards, headers, and individual unit labels.
```
Type: language/terminology rule; module-specific mechanic. Initial classification: possible Skill-only rule; the general principle (terminology adapts to account type) is a possible Project Knowledge rule. Internal references: tenant types `stable`, `clinic`. Stage B verification required: No.

**MEM-032** — URI: `mem://architecture/stable/housing-type-aware-surfaces` · Title: Housing Type-Aware Surfaces · Group: architecture/stable
```
The Facilities tab serves as an inline operational surface utilizing type-aware content routing:
1. Housing (Barn, Isolation): Renders a color-coded unit grid with occupant names and specific vacancy counts in the section header.
2. Open-area (Paddock, Pasture): Displays advisory capacity ('X / ~Y' horses present), real-time horse rosters, and environmental attributes (area_size, shade, has_water) persisted in typed columns.
3. Activity/Service (Arena, Round Pen, Wash Area): Spec-driven surface rendering physical attributes (dimensions, diameter, footing type, covered status, wash points) persisted via a JSONB metadata column.
Creation and editing are managed through a 2-phase dynamic dialog that adapts field logic based on this 8-type taxonomy.
```
Type: module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: `OpenAreaContent`; facility columns listed. Overlap: MEM-030. Stage B verification required: No.

**MEM-033** — URI: `mem://features/stable/housing-unit-and-numbering-setup` · Title: Housing Unit Numbering Setup · Group: features/stable
```
Room-based facility setup supports batch unit creation using counts, prefixes, and starting numbers (e.g., 101). It features a live preview grid with a layout toggle between 'single' and 'two-sided' (center-aisle) arrangements and Side A/B labels with a 'startSide' numbering control. Internal roles (storage, isolation_room) are assigned via popover pickers. Facilities can be extended post-creation using the same batch logic to preserve numbering and spatial coherence.
```
Type: module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: `RoomLayoutSetup`. Stage B verification required: No.

**MEM-034** — URI: `mem://architecture/stable/housing-paddock-occupancy-model` · Title: Housing Paddock Occupancy Model · Group: architecture/stable
```
Paddock and pasture occupancy utilizes a separate architectural path from room-based housing units. While housing units (Barns, Isolation) use the 'housing_unit_occupants' table, open-area occupancy is derived directly from 'horses.current_area_id'. This dual model ensures that open-area turnout is tracked as a facility-level physical presence rather than a specific stall assignment, and is reflected in 'OpenAreaContent' via a real-time horse roster.
```
Type: technical architecture fact; module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: table `housing_unit_occupants`; column `horses.current_area_id`; `OpenAreaContent`. Stage B verification required: No.

---

### BATCH A1 INTERIM STATUS (not the Stage A verdict)

- Directly read in this output: 34 (9 Core rules + 25 memory files).
- Cumulative directly read: 34.
- Expected final: 103 (to be reconciled at the end of Stage A).
- Unreadable so far: 0.
- Duplicates/aliases so far: 0 (overlaps noted are content overlaps, not duplicate URIs).
- Entries flagged for Stage B verification so far: MEM-007, MEM-008, MEM-013, MEM-015, MEM-024, MEM-029.
- Interim initial category tallies for the 34 delivered items: possible Project Knowledge 14; possible Skill-only 18; repository governance 0; Current-Prompt-only 0; possible stale 0 (MEM-024 flagged as possibly partially superseded, pending Stage B); possible contradiction 0; private 0; not material 0; pending Stage B 6 (counted within the categories above).

Full reconciliation (Sections A–E of the Stage A contract: count reconciliation equation, coverage proof, final category counts, gaps, and the Stage A Completeness Verdict) is deliberately deferred to the end of the final Stage A batch, as required by the batching rule.

### WORKSTREAM PERSISTENCE

No Workstream was created. No Workstream ID was assigned. No Workstream file was modified. No persistence occurred.

### ROADMAP IMPACT

RM-DH-003 remains Active. RM-DH-003 / Phase 2 remains CLOSED. WS-DH-2026-0002 remains CLOSED. No new Phase was created. No Phase was advanced. No Sub-phase was created. No Track was created. No Workstream was created. No Roadmap or registry file was modified. This staged re-audit does not itself approve governance classification.

### RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan Mode / Chat Mode.
2. Operation: Staged read-only Project Memory completeness extraction (Stage A).
3. Received Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03.
4. Current Stage: Stage A.
5. Current Stage batch: BATCH A1.
6. Prompt Preparation Date: 01-08-2026 — August.
7. Prompt Preparation Time: 02:50.
8. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
9. Lovable Run Start Date and Time: 01-08-2026, 02:58:00 (+03:00) = 2026-07-31 23:58:00 UTC (approximate to the minute; evidence: sandbox `date -u` returned 2026-07-31 23:59:29 UTC at the first repository-state command of this run).
10. Lovable Run End Date and Time: Exact time not recorded.
11. Final Report Generated Date and Time: 01-08-2026 — exact time not recorded.
12. Timezone and evidence source: Asia/Riyadh (UTC+03:00) presentation of UTC values returned by sandbox `date -u`; Latin digits used throughout.
13. Branch: `edit/edt-b53bf8d4-6ca5-4b15-aea7-afaff5bd8442`.
14. HEAD before: `aec75cad014932dcb1af0298eb3d1efb2afb640a`. HEAD after: unchanged apart from any platform-generated planning commit disclosed in item 33.
15. Working Tree before: clean (`git status --porcelain` returned no output). Working Tree after: clean apart from the platform planning artifact.
16. Staged paths before: none. After: none.
17. Unstaged paths before: none. After: none.
18. Untracked non-ignored paths before: none. After: none.
19. Memory URIs directly opened in this output: `mem://index.md` (Core block, MEM-001 – MEM-009), `mem://security/community-workspace-rls-logic`, `mem://features/finance/credit-limit-enforcement`, `mem://features/finance/client-statement-system`, `mem://architecture/party-horse-relationship-model`, `mem://features/horse-unification-strategy`, `mem://architecture/platform-sharing-reference-pattern`, `mem://architecture/notification-system-standard`, `mem://domain/horse-owner-tenant-isolation`, `mem://architecture/shared-client-registry-and-identity`, `mem://architecture/finance/billing-linkage-pattern`, `mem://architecture/stable/housing-and-facility-management`, `mem://architecture/stable/boarding-stay-and-care-lifecycle`, `mem://architecture/stable/horse-registry-and-onboarding-logic`, `mem://features/stable/movement-and-logistics`, `mem://finance/payment-status-integrity-rule`, `mem://finance/invoice-accounting-lifecycle`, `mem://architecture/horses/unified-profile-architecture`, `mem://architecture/finance/event-driven-invoicing-pattern`, `mem://security/client-tenant-isolation`, `mem://localization/bilingual-naming-architecture`, `mem://domain/stable/housing-facility-taxonomy`, `mem://localization/stable/account-aware-housing-terminology`, `mem://architecture/stable/housing-type-aware-surfaces`, `mem://features/stable/housing-unit-and-numbering-setup`, `mem://architecture/stable/housing-paddock-occupancy-model`.
20. Number directly read in this output: 34 materially distinct entries (9 Core rules + 25 memory files).
21. Cumulative number directly read: 34.
22. Expected final number: 103.
23. Unreadable number: 0.
24. Duplicate or alias count: 0.
25. Repository changes: None, except separately disclosed platform-generated behaviour.
26. Database changes: None. No database query was issued in this output.
27. Project Memory changes: None.
28. Project Knowledge changes: None.
29. Workspace Knowledge changes: None.
30. Skill changes: None.
31. Settings changes: None.
32. Roadmap or Workstream changes: None.
33. Platform-generated `.lovable/plan.md` activity: this report is written to `.lovable/plan.md` by the platform's Plan Mode mechanism. Governed by `docs/CONVENTIONS.md` §11.10 and DEC-RM-DH-003-004. It is not implementation, not Acceptance evidence, and not proof that other paths were unchanged. No other `.lovable/` path exists or changed.
34. Current Stage batch status: STAGE A — BATCH A1 COMPLETE. Stage A remains incomplete. No Stage A Completeness Verdict is issued yet.
35. Exact stopping point: Stage A Batch A1 completed (MEM-001 – MEM-034); Stage A remains incomplete with 69 entries outstanding beginning at `mem://architecture/stable/vet-medical-records-system`; Stage B not started; no Project Knowledge text rebuilt or installed; no repository, database, Project Memory, Knowledge, Skill, settings, Roadmap, or Workstream change occurred.
36. Exact next permitted owner command: `CONTINUE STAGE A — NEXT BATCH`.
