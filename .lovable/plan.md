# PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03

## STAGE A — COMPLETE PROJECT MEMORY EXTRACTION — BATCH A2

Stage A only. Stage B, C, D, and E not started. No Project Knowledge text is reconstructed in this output.

### A2 scope

- Items delivered in this batch: MEM-035 through MEM-059 (25 referenced memory files).
- URI range covered: `mem://architecture/stable/vet-medical-records-system` through `mem://security/granular-backend-enforcement` (index Memories rows 26–50).
- Cumulative delivered: 59.
- Expected final: 103 (9 Core + 94 referenced files), subject to Stage A reconciliation.
- Remaining after this batch: 44.
- Next batch cursor: `mem://security/roles/manager-role-baseline` (index Memories row 51) → MEM-060.

### Per-item field defaults

Unless a specific item states otherwise: field 6 (read status) = **directly read**; field 7 (provenance metadata) = **none present**; field 8 (last-updated/timestamp evidence) = **none present**; field 12 (duplicate/overlap IDs) = as noted per item; field 13 (contradiction IDs) = as noted per item.

---

### BATCH A1 CATEGORY-COUNT CORRECTION (owner-requested item 1)

The A1 interim tallies stated "possible Project Knowledge 14; possible Skill-only 18", which accounts for only 32 of 34 delivered entries. Both numbers were wrong. The corrected A1 counts, derived by re-reading each A1 item's stated field-10 classification, are:

| Initial classification | Corrected A1 count | Item IDs |
| --- | --- | --- |
| Possible Project Knowledge rule | 16 | MEM-001, MEM-002, MEM-003, MEM-004, MEM-005, MEM-006, MEM-007, MEM-008, MEM-009, MEM-015, MEM-017, MEM-019, MEM-024, MEM-027, MEM-028, MEM-029 |
| Possible Skill-only rule | 17 | MEM-010, MEM-011, MEM-012, MEM-014, MEM-016, MEM-018, MEM-020, MEM-021, MEM-022, MEM-023, MEM-025, MEM-026, MEM-030, MEM-031, MEM-032, MEM-033, MEM-034 |
| Requires Stage B verification (primary classification) | 1 | MEM-013 |
| Possible repository-governance rule | 0 | — |
| Possible Current-Prompt-only rule | 0 | — |
| Possible stale rule | 0 | — |
| Possible contradiction | 0 | — |
| Possible private exclusion | 0 | — |
| Not material | 0 | — |
| **Total** | **34** | — |

Previously unaccounted items identified: **MEM-013** (`mem://architecture/party-horse-relationship-model`) — primary classification is "requires Stage B verification", which the A1 tally omitted as a category; and the count error absorbed **MEM-024** (moved into the Project Knowledge column, where its item entry places it) and **MEM-013** simultaneously. The list above is now item-complete and sums to 34.

Secondary Stage-B verification flags remain unchanged: MEM-007, MEM-008, MEM-013, MEM-015, MEM-024, MEM-029.

---

### Referenced memory files (MEM-035 – MEM-059)

**MEM-035** — URI: `mem://architecture/stable/vet-medical-records-system` · Title: Vet Medical Records System · Group: architecture/stable
```
The Vet & Health module is a horse-centric medical records system organized into five primary tabs: Treatments (vet_treatments), Vaccinations (horse_vaccinations), Visits (vet_visits), Follow-ups (vet_followups), and Vaccination Programs (برامج التطعيم). It is functionally distinct from the clinical 'Doctor' module. Operational management is centered around a 'TreatmentDetailSheet' providing visibility into horse context, medications (vet_medications), and linked follow-up tasks. The 'Vaccination Programs' tab, specifically for managing protocols, ensures focused discoverability compared to a generic settings label.
```
Type: module-specific mechanic; technical architecture fact. Initial classification: possible Skill-only rule. Internal references: tables `vet_treatments`, `horse_vaccinations`, `vet_visits`, `vet_followups`, `vet_medications`; `src/hooks/vet/*` (present in the repository); `src/pages/DashboardVet.tsx`. Overlaps: MEM-036, MEM-037. Stage B verification required: No.

**MEM-036** — URI: `mem://features/stable/vet-treatment-and-medication-logic` · Title: Vet Treatment & Medication Logic · Group: features/stable
```
Vet treatments follow a formal status lifecycle (draft, scheduled, in_progress, completed, cancelled) and track medical category, priority, and service mode. Medications are explicitly linked to treatment records, allowing for drug name, dosage, frequency, and duration tracking via an inline form in the Treatment Detail Sheet. The system includes a status history section for clinical traceability and supports full record editability through a unified dialog. Includes specific categories for 'respiratory' and 'musculoskeletal' health with dedicated badge configurations and fallbacks to prevent runtime crashes on unknown categories.
```
Type: module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: `src/hooks/vet/useVetTreatments.ts`, `src/hooks/vet/useVetMedications.ts` (both present). Overlap: MEM-035. Stage B verification required: No.

**MEM-037** — URI: `mem://features/stable/vaccination-and-health-management` · Title: Vaccination & Health Management · Group: features/stable
```
Vaccinations are managed through a dedicated registry that supports both program definition and individual dose scheduling via a 'ScheduleVaccinationDialog'. The Vet dashboard is optimized for operational scanning through a top-level horse filter and status-specific chips. All health-side operational terminology is fully localized to ensure Arabic-first compliance across categories, priorities, and follow-up types.
```
Type: module-specific mechanic; language/terminology rule ("Arabic-first compliance"). Initial classification: possible Skill-only rule; the Arabic-first localization obligation is a possible Project Knowledge rule and is relevant to Correction 6. Internal references: `src/hooks/vet/useHorseVaccinations.ts` (present). Overlap: MEM-035. Stage B verification required: **Yes** — confirm the general localization-parity obligation against current i18n audit scripts (`scripts/audit-i18n.ts`).

**MEM-038** — URI: `mem://architecture/stable/unified-commercial-model` · Title: Unified Commercial Model · Group: architecture/stable
```
The Stable module integrates all commercial domains—including Housing, Breeding, Veterinary, Training, and Transport—through a shared 'tenant_services' catalog. All source-generated invoices (from admissions, treatments, or breeding events) persist the 'service_id' on 'invoice_items', establishing a permanent commercial audit trail from financial records back to catalog definitions. Admissions preserve an operational snapshot-rate model while maintaining this link to catalog entries for commercial grounding.
```
Type: technical architecture fact; finance rule. Initial classification: possible Project Knowledge rule (single shared service catalog as commercial source of truth). Internal references: tables `tenant_services`, `invoice_items.service_id`. Overlap: MEM-041, MEM-047. Stage B verification required: No.

**MEM-039** — URI: `mem://architecture/stable/provider-cost-integration` · Title: Provider Cost Integration · Group: architecture/stable
```
The 'supplier_payables' foundation supports tracking external service costs. Saving a Vet treatment, vaccination, or Breeding event with 'service_mode=external' automatically generates a linked 'supplier_payables' record. This establishes a cost reference for pass-through or markup billing workflows and ensures that Stable-side liabilities to external professionals are tracked at the moment of operational or clinical recording.
```
Type: technical architecture fact; finance rule; module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: table `supplier_payables`; `src/lib/finance/createSupplierPayableForExternal.ts` (present and invoked from `useHorseVaccinations.ts`). Overlap: MEM-040, MEM-041. Stage B verification required: No.

**MEM-040** — URI: `mem://features/stable/provider-markup-logic` · Title: Provider Markup Logic · Group: features/stable
```
The Stable module implements a 'Provider Markup Helper' within the treatment, vaccination, and breeding invoicing flows to support commercial decision-making for external-mode services. When a linked 'supplier_payable' exists, the helper displays a real-time comparison between the provider cost and the billed amount, utilizing color-coded indicators (Pass-through, With Markup, Below Cost) and providing a one-click 'Apply Exact Pass-Through' action to sync the invoice total with the provider cost.
```
Type: module-specific mechanic; finance rule. Initial classification: possible Skill-only rule. Internal references: `supplier_payables`. Overlap: MEM-039. Stage B verification required: No.

**MEM-041** — URI: `mem://features/stable/financial-traceability-system` · Title: Financial Traceability System · Group: features/stable
```
The Stable module implements a bidirectional financial traceability system linking operational events with their financial records.
1. Reusable Status Section: A 'FinancialStatusSection' component is integrated into Treatment, Vaccination, and Breeding/Foaling detail sheets, providing a consolidated view of Invoice, Stable Cost, and Supplier Payable statuses. The Invoice status is clickable, allowing operators to drill down directly into the 'InvoiceDetailsSheet'.
2. Invoiced Navigation: Interactive badges on source records identify linked invoices. Zero-charge invoices (typically for included services) are visually flagged with a 'Zero-Charge' badge to distinguish them from standard billables.
3. Finance-to-Source Drill-down: Both the 'InternalCostsTab' and 'SupplierPayablesTab' support outbound navigation. Clicking a record (e.g. a vet treatment or vaccination) fetches the source data and opens the corresponding operational detail sheet. These surfaces include automated horse name resolution for immediate context.
4. Rebilling Visibility: The 'SupplierPayablesTab' displays a 'Client Invoiced' or 'Not Invoiced' status derived from 'billing_links', helping operators ensure that external provider costs are captured in client billing where appropriate.
5. Line Item Enrichment: The 'InvoiceDetailsSheet' enriches stable-origin entity types (vet, vaccination, breeding, foaling) by replacing raw record IDs with human-readable descriptions combining service titles and horse identities.
```
Type: module-specific mechanic; finance rule; UX rule. Initial classification: possible Skill-only rule; the bidirectional-traceability principle is a possible Project Knowledge rule. Internal references: `billing_links`; `InvoiceDetailsSheet`. Overlap: MEM-019, MEM-027, MEM-039. Stage B verification required: No.

**MEM-042** — URI: `mem://architecture/finance/invoice-item-attribution` · Title: Invoice Item Attribution · Group: architecture/finance
```
The 'invoice_items' table serves as the primary architectural insertion point for financial attribution, capturing direct links to 'horse_id' (UUID), 'domain' (text), and 'service_id' (FK to tenant_services). For duration-based services like boarding, it persists the specific 'period_start' and 'period_end' dates. This model ensures catalog lineage and accurate statement filtering without relying on expensive post-fetch multi-hop enrichment.
```
Type: technical architecture fact; finance rule. Initial classification: possible Project Knowledge rule. Internal references: `invoice_items` columns `horse_id`, `domain`, `service_id`, `period_start`, `period_end`; `invoice_items.schema.txt` (present at repository root). Overlap: MEM-012, MEM-043, MEM-047. Stage B verification required: No.

**MEM-043** — URI: `mem://architecture/stable/boarding-period-tracking` · Title: Boarding Period Tracking · Group: architecture/stable
```
Boarding stay periods are tracked directly on 'invoice_items'. The 'CreateInvoiceFromAdmission' dialog enforces financial integrity by displaying a list of already-billed periods, showing the remaining pre-tax billable amount, and preventing the creation of invoices with overlapping date ranges.
```
Type: module-specific mechanic; finance rule. Initial classification: possible Skill-only rule. Internal references: `invoice_items.period_start/period_end`; `CreateInvoiceFromAdmission`. Overlap: MEM-042, MEM-046. Stage B verification required: No.

**MEM-044** — URI: `mem://finance/tax-configuration-standard` · Title: Tax Configuration Standard · Group: finance
```
The platform uses a layered Tax Model (Tenant Defaults -> Service Overrides -> Invoice Overrides):
1. Tenant Settings: Configurable via the 'Tax & Pricing' card. Defines 'default_tax_rate' and 'prices_tax_inclusive' mode.
2. Service Settings: Services include an 'is_taxable' toggle to determine if tax applies, inheriting the rate and pricing mode from the tenant.
3. Calculation Logic: Unified via 'src/lib/taxUtils.ts'. Manual invoices separate taxable and non-taxable subtotals to respect service overrides.
4. Statement Presentation: Rows and cards are unified on a post-tax basis. Boarding segments reflect proportional post-tax amounts from invoice snapshots.
5. Implementation: All financial flows, including Consultations and Laboratory invoices, are grounded in service definitions to ensure consistent 'is_taxable' behavior.
```
Type: finance rule; current implementation claim (item 5 is a universality claim). Initial classification: possible Project Knowledge rule (layered tax inheritance), with the universality wording in item 5 flagged for Correction 7 treatment. Internal references: `src/lib/taxUtils.ts` (present); columns `default_tax_rate`, `prices_tax_inclusive`, `is_taxable`. Overlap: MEM-048. Stage B verification required: **Yes** — item 5's "all financial flows" claim must not be restated as universal compliance without evidence.

**MEM-045** — URI: `mem://architecture/stable/boarding-proration-engine` · Title: Boarding Proration Engine · Group: architecture/stable
```
Boarding cost calculations utilize a unified calendar-aware proration engine (src/lib/boardingPeriodEngine.ts) that decomposes stays into segments based on calendar month boundaries. The daily rate for each segment is derived from the actual number of days in that specific month (monthlyRate / days_in_month), ensuring a full calendar month exactly matches the monthly rate regardless of length (28, 29, 30, or 31 days). The system generates distinct 'invoice_items' for every calendar segment, recording 'period_start', 'period_end', the calculated daily rate, and the number of days charged to provide a transparent commercial audit trail.
```
Type: finance rule; business formula; module-specific mechanic. Initial classification: possible Skill-only rule. Internal references: `src/lib/boardingPeriodEngine.ts` (present). Overlap: MEM-042, MEM-043. Stage B verification required: No.

**MEM-046** — URI: `mem://architecture/finance/tenant-currency-model` · Title: Tenant Currency Model · Group: architecture/finance
```
Currency Defaulting: All new invoices, admissions, packages, and service resolutions automatically inherit the tenant's configured currency to ensure consistency with the organization's financial settings.
```
Type: finance rule; stable global rule. Initial classification: possible Project Knowledge rule. Internal references: `src/lib/currencyOptions.ts` (present). Stage B verification required: No.

**MEM-047** — URI: `mem://architecture/stable/commercial-truth-hierarchy` · Title: Commercial Truth Hierarchy · Group: architecture/stable
```
The platform follows a strict 5-layer hierarchy of commercial truth to ensure financial integrity:
1. Catalog Truth (tenant_services): Defines the canonical services and their default pricing/taxability.
2. Packaging Truth (stable_service_plans): Defines bundled packages and recurring billing cycles.
3. Operational Truth (admissions/events): Represents the actual service delivery, using 'snapshot' rates from plans at the time of contract/entry.
4. Financial-Record Truth (invoice_items): Records exactly what was billed, for what period (period_start/end), and which catalog service was used (service_id).
5. Ledger Truth (ledger_entries/statements): Reflects the chronological financial impact and cumulative account balance.
```
Type: technical architecture fact; finance rule; stable global rule. Initial classification: possible Project Knowledge rule (strong candidate: the platform's canonical commercial-truth layering). Internal references: `tenant_services`, `stable_service_plans`, `invoice_items`, `ledger_entries`. Overlap: MEM-038, MEM-042. Stage B verification required: No.

**MEM-048** — URI: `mem://features/finance/consultation-and-lab-grounding` · Title: Consultation & Lab Grounding · Group: features/finance
```
The Consultation invoice flow is grounded in the veterinary service catalog, supporting service selection, 'is_taxable' overrides, and the generation of detailed 'invoice_items' for statement attribution (previously header-only). Additionally, Laboratory invoices are integrated into the tenant-level tax configuration, utilizing the shared 'computeTax' utility to ensure consistent financial behavior.
```
Type: module-specific mechanic; finance rule; historical implementation claim ("previously header-only"). Initial classification: possible Skill-only rule. Internal references: `computeTax` in `src/lib/taxUtils.ts`. Overlap: MEM-044. Note: a separate index entry (Doctor Billing Mismatch) records that Doctor services are architecturally separate from `tenant_services`; that entry will be delivered in a later batch and must be compared against this one. Potential contradiction ID: pending (Doctor Billing Mismatch). Stage B verification required: **Yes**.

**MEM-049** — URI: `mem://ux/mobile-first-design-standard` · Title: Mobile-First Design Standard · Group: ux
```
The platform adheres to a mandatory 'Mobile-First' governance rule for all UI/UX design and architectural decisions. All features are evaluated and implemented for the mobile experience first, ensuring usability, readability, and action clarity on small screens before scaling up to tablet and desktop breakpoints. Desktop patterns must not be forced into mobile; instead, mobile-safe density and layout alternatives must be prioritized to prevent visual clutter and maintain action clarity across the global header and module surfaces.
```
Type: UX rule; stable global rule. Initial classification: possible Project Knowledge rule (strong candidate; corroborates Core rule MEM-001). Overlap: MEM-001. Stage B verification required: No.

**MEM-050** — URI: `mem://architecture/identity/unified-people-model` · Title: Unified People Model · Group: architecture/identity
```
The platform distinguishes between Platform Members (access-focused via 'tenant_members') and Employees (payroll/personnel-focused via 'hr_employees'). These tracks are unified through an architectural bridge where:
1. Auto-Creation: Accepting an invitation automatically creates an HR record (defaulting to 'external' employment kind) linked via 'user_id'.
2. Back-linking: For employees existing only in the HR registry (HR-Only), the system provides an 'Invite to Platform' action that prefills the invitation form with existing contact details, ensuring that joined users link to their established personnel records rather than creating duplicates.
```
Type: technical architecture fact; identity model. Initial classification: possible Project Knowledge rule (member identity vs personnel identity distinction). Internal references: tables `tenant_members`, `hr_employees`. Overlap: MEM-053, MEM-054. Stage B verification required: No.

**MEM-051** — URI: `mem://architecture/invitations/invitation-scoping-standard` · Title: Invitation Scoping Standard · Group: architecture/invitations
```
Invitations follow a 'Configure Post-Acceptance' model to minimize onboarding friction. At invite-time, the system captures only a single identifier—either Email or Phone (at least one is required)—and an optional role hint. Detailed configurations, including horse assignments, internal/external classification, and granular permission overrides, are deferred until after the invitee has accepted the invitation and joined the organization.
```
Type: module-specific mechanic; UX rule. Initial classification: possible Skill-only rule. Internal references: `invitations` table; `src/pages/InviteLandingPage.tsx` (present). Overlap: MEM-055. Stage B verification required: No.

**MEM-052** — URI: `mem://security/connections/partnership-integrity` · Title: Partnership Integrity · Group: security/connections
```
The system enforces financial and operational integrity in B2B relationships by preventing duplicate active connections between the same two organizations. This is implemented via a unique partial index on the 'connections' table that restricts active (accepted) pairs to a single record using 'LEAST' and 'GREATEST' on tenant IDs to ensure uniqueness regardless of which party initiated the request. This constraint preserves historical records (revoked, rejected) while ensuring a single active channel for data sharing and requests.
```
Type: technical architecture fact; permission/RLS-adjacent integrity rule. Initial classification: possible Skill-only rule. Internal references: table `connections`. Overlap: MEM-015, MEM-054. Stage B verification required: No.

**MEM-053** — URI: `mem://features/team/team-partners-hub` · Title: Team & Partners Hub · Group: features/team
```
The 'Team & Partners' hub (/dashboard/team) is the centralized surface for relationship management.
1. Unified List: Merges 'tenant_members', 'hr_employees', and pending invitations using the 'useUnifiedTeam' hook, deduplicating by 'user_id'.
2. Management Interface: 'PersonDetailSheet.tsx' is the primary hub for configuring roles, horse assignments, and HR links. It supports an inline 'Internal/External' employment classification toggle with immediate updates and event logging.
3. HR Integration: Includes an 'Invite to Platform' action for HR-only records that prefills invitation details to bridge personnel records with platform accounts.
4. Status Tracking: Dynamic counters distinguish between members with platform access, HR-only personnel, and internal/external employment kinds.
```
Type: module-specific mechanic; UX rule. Initial classification: possible Skill-only rule. Internal references: route `/dashboard/team`; `useUnifiedTeam`; `PersonDetailSheet.tsx`. Overlap: MEM-050. Stage B verification required: No.

**MEM-054** — URI: `mem://architecture/connections/operational-partner-scoping` · Title: Operational Partner Scoping · Group: architecture/connections
```
The platform distinguishes between Service Partners (transactional, e.g., labs/pharmacies) and Operational Partners (e.g., independent doctors/trainers).
1. Scoping: Operational partners utilize the 'connection_horse_access' table to manage granular horse-level visibility.
2. Access Levels: Supports 'read' and 'readwrite' permissions per horse.
3. Management: The inviting organization's managers assign horse-level scope post-acceptance. While the configuration UI and persistence in 'connection_horse_access' are implemented, the corresponding RLS enforcement across domain tables (e.g., 'horses', 'vet_treatments') to actually gate cross-tenant data access is a known gap deferred for future implementation.
```
Type: technical architecture fact; permission/RLS rule; **known debt** (item 3). Initial classification: possible Project Knowledge rule for the partner-type distinction; the debt statement is a known-debt record whose Project Knowledge suitability is limited because it is mutable state. Internal references: table `connection_horse_access`; tables `horses`, `vet_treatments`. Contradiction relevance: directly contradicts any universal "all cross-tenant access is enforced" claim — material to Correction 7. Overlap: MEM-015, MEM-056. Stage B verification required: **Yes** — confirm whether the gap still exists in current RLS before any statement about cross-tenant enforcement is written.

**MEM-055** — URI: `mem://security/invitations/identity-verification-rules` · Title: Identity Verification Rules · Group: security/invitations
```
The 'finalize_invitation_acceptance' RPC enforces strict identity matching before granting tenant membership. For email-based invitations, the authenticated user's email must match the 'invitee_email'. For phone-based invitations, the system normalizes both the user's profile phone and the stored 'invitee_phone' (stripping all characters except digits and '+') and requires an exact match. Additionally, this RPC atomically creates or links an 'hr_employees' record (defaulting to 'external') to maintain personnel registry integrity upon joining.
```
Type: permission/RLS rule; technical architecture fact. Initial classification: possible Project Knowledge rule (membership is granted only through a verified server-side RPC). Internal references: RPC `finalize_invitation_acceptance`; tables `invitations`, `hr_employees`. Overlap: MEM-050, MEM-051. Stage B verification required: No.

**MEM-056** — URI: `mem://architecture/connections/unified-partner-management` · Title: Unified Partner Management · Group: architecture/connections
```
Consolidated all B2B relationship controls—including connection acceptance, consent grant CRUD, sharing audit logs, and inbound shared-data visibility—into a single mobile-first detail sheet ('PartnerConfigSheet'). This eliminates the legacy tab-based management surface and its 'invisible state' dependency (where selecting a partner on one tab was required for others to function), ensuring all partner context is always visible during configuration. Backend RLS enforcement for data sharing is currently active only for 'lab_results'; grants for 'vet_records', 'breeding_records', and 'lab_requests' are present in the UI and database but do not yet gate actual cross-tenant data access.
```
Type: module-specific mechanic; UX rule; **known debt** (final sentence). Initial classification: possible Skill-only rule plus a known-debt record. Internal references: `PartnerConfigSheet`; tables `lab_results`, `vet_records`, `breeding_records`, `lab_requests`. Contradiction relevance: same as MEM-054 — material to Correction 7 and to MEM-015's "domain tables implement shared access policies" wording, which this entry qualifies. Potential contradiction IDs: MEM-015, MEM-054. Stage B verification required: **Yes**.

**MEM-057** — URI: `mem://security/workspace-authorization-and-guards` · Title: Workspace Authorization & Guards · Group: security
```
Organization-level access is protected by 'WorkspaceRouteGuard.tsx', which enforces 'requiredMode' and 'requiredPermission' across all primary routes (including Finance, Doctor, Team, and Settings). The navigation sidebar utilizes 'hasPermission()' checks for item visibility, replacing legacy hardcoded role checks (e.g., owner/manager) to ensure the UI truthfully reflects the user's granular authorization. Permission resolution follows the priority: Owner > Role Direct > Role Bundle > Member Bundle > Member Override.
```
Type: permission rule; technical architecture fact. Initial classification: possible Project Knowledge rule (permission-based UI gating and the resolution order). Internal references: `WorkspaceRouteGuard.tsx`; `hasPermission()`. Overlap: MEM-007, MEM-058, MEM-059. Note: current code still contains legacy role checks in some hooks (for example `const canManage = activeRole === "owner" || activeRole === "manager"` in `src/hooks/vet/useVetMedications.ts`, `useVetFollowups.ts`, and `useHorseVaccinations.ts`), so the "replacing legacy hardcoded role checks" wording is not universally true in current code. Potential contradiction ID: MEM-007. Stage B verification required: **Yes** — material to Correction 7.

**MEM-058** — URI: `mem://security/permission-system-vocabulary` · Title: Permission System Vocabulary · Group: security
```
The platform's permission vocabulary consists of 104 granular keys. This includes additions such as 'breeding.manage', 'services.manage', 'team.manage', 'vet.manage', 'movement.manage', 'finance.payables.manage', and 'orders.manage'. This vocabulary provides a unified source of truth for both UI-level action gating and backend RLS enforcement across all core operational domains.
```
Type: permission rule; current implementation claim (the count 104). Initial classification: possible Project Knowledge rule with the numeric count requiring verification (mutable). Internal references: permission definitions table; `docs/aml_1_b_1/stage_01_preflight/permission_definitions_shape.txt`. Overlap: MEM-007. Stage B verification required: **Yes** — verify the live count before restating it; a fixed number is mutable state and may be unsuitable for static Project Knowledge.

**MEM-059** — URI: `mem://security/granular-backend-enforcement` · Title: Granular Backend Enforcement · Group: security
```
Core operational domains—including Horses, Movement, Breeding, Vet, Doctor, HR, Clients, Services, and Finance—utilize a granular enforcement model via the 'has_permission()' RLS function. This ensures that backend data access for INSERT, UPDATE, and DELETE operations is strictly aligned with the granular permission keys defined in the UI and Roles settings. This model fully replaces the legacy 'can_manage_orders' role-based helper, which has been retired. Legacy helpers are retained only for the Laboratory and Academy modules and specific reference tables.
```
Type: permission/RLS rule; current implementation claim with a stated exception. Initial classification: possible Project Knowledge rule (backend enforcement contract), with the scope exception (Laboratory, Academy, reference tables) preserved so no universal-compliance claim is made. Internal references: function `has_permission()`; retired helper `can_manage_orders`. Overlap: MEM-007, MEM-057, MEM-058. Stage B verification required: **Yes** — material to Correction 7.

---

### BATCH A2 INTERIM STATUS (not the Stage A verdict)

- Directly read in this output: 25 memory files.
- Cumulative directly read: 59 (34 from A1 + 25 from A2).
- Expected final: 103.
- Unreadable so far: 0.
- Duplicate or alias URIs so far: 0 (all recorded overlaps are content overlaps between distinct URIs).
- Batch A2 initial category tallies (sums to 25): possible Project Knowledge 10 (MEM-038, MEM-042, MEM-044, MEM-046, MEM-047, MEM-049, MEM-050, MEM-055, MEM-057, MEM-058); possible Skill-only 13 (MEM-035, MEM-036, MEM-037, MEM-039, MEM-040, MEM-041, MEM-043, MEM-045, MEM-048, MEM-051, MEM-052, MEM-053, MEM-056); possible Project Knowledge with known-debt qualification 1 (MEM-054); possible Project Knowledge with scope exception 1 (MEM-059); repository governance 0; Current-Prompt-only 0; possible stale 0; private 0; not material 0.
- Cumulative tallies after A1 correction + A2 (sums to 59): possible Project Knowledge 28; possible Skill-only 30; requires Stage B verification as primary classification 1 (MEM-013).
- Entries newly flagged for Stage B verification in A2: MEM-037, MEM-044, MEM-048, MEM-054, MEM-056, MEM-057, MEM-058, MEM-059. Cumulative Stage-B-flagged: 14.
- New contradiction candidates recorded: MEM-054 and MEM-056 qualify MEM-015; MEM-057 is contradicted in part by current code (legacy `activeRole` checks in `src/hooks/vet/*`); MEM-048 versus the not-yet-delivered "Doctor Billing Mismatch" entry.

Full Stage A reconciliation (Sections A–E: count reconciliation equation, coverage proof, final category counts, gaps, and the Stage A Completeness Verdict) remains deferred to the end of the final Stage A batch.

### WORKSTREAM PERSISTENCE

No Workstream was created. No Workstream ID was assigned. No Workstream file was modified. No persistence occurred.

### ROADMAP IMPACT

RM-DH-003 remains Active. RM-DH-003 / Phase 2 remains CLOSED. WS-DH-2026-0002 remains CLOSED. No new Phase was created. No Phase was advanced. No Sub-phase was created. No Track was created. No Workstream was created. No Roadmap or registry file was modified. This staged re-audit does not itself approve governance classification.

### RUN METADATA AND EXACT STOPPING POINT

1. Mode: Plan Mode / Chat Mode.
2. Operation: Staged read-only Project Memory completeness extraction (Stage A).
3. Received Official Prompt ID: PROMPT-DH-PERSISTENT-KNOWLEDGE-ARCHITECTURE-PROJECT-KNOWLEDGE-REAUDIT-03.
4. Current Stage: Stage A.
5. Current Stage batch: BATCH A2.
6. Prompt Preparation Date: 01-08-2026 — August.
7. Prompt Preparation Time: 02:50.
8. Prompt Preparation Timezone: Asia/Riyadh — UTC+03:00.
9. Lovable Run Start Date and Time (this batch): Exact time not recorded. First timestamp evidence in this batch: 2026-08-01 00:31:46 UTC = 01-08-2026, 03:31:46 (+03:00), from sandbox `date -u`. No earlier time is evidenced and none is asserted.
10. Lovable Run End Date and Time: Exact time not recorded.
11. Final Report Generated Date and Time: Exact time not recorded. The last evidenced timestamp of this batch is 2026-08-01 00:31:46 UTC.
12. Timezone and evidence source: all timestamps originate from sandbox `date -u` (UTC) and are presented additionally in Asia/Riyadh (UTC+03:00). Latin digits used throughout.
13. Branch: `edit/edt-b53bf8d4-6ca5-4b15-aea7-afaff5bd8442`.
14. HEAD before this batch: `0e4af63381dff14fc8e1b155f2ee7f17276c2a25` (verified by `git rev-parse HEAD` at 2026-08-01 00:31:46 UTC). HEAD after this batch: exact post-write hash not recorded, because the only write in this batch is the platform-managed `.lovable/plan.md` commit, which the platform performs after this report is produced. Correction to Batch A1: the A1 report recorded HEAD before as `aec75cad014932dcb1af0298eb3d1efb2afb640a` and described HEAD after as "unchanged apart from any platform-generated commit"; the verified A1 HEAD after is `0e4af63381dff14fc8e1b155f2ee7f17276c2a25`, that is, the A1 planning-artifact commit did advance HEAD.
15. Working Tree before: clean (`git status --porcelain` returned no output). Working Tree after: clean apart from the platform planning artifact.
16. Staged paths before: none. After: none.
17. Unstaged paths before: none. After: none.
18. Untracked non-ignored paths before: none. After: none.
19. Memory URIs directly opened in this output: `mem://architecture/stable/vet-medical-records-system`, `mem://features/stable/vet-treatment-and-medication-logic`, `mem://features/stable/vaccination-and-health-management`, `mem://architecture/stable/unified-commercial-model`, `mem://architecture/stable/provider-cost-integration`, `mem://features/stable/provider-markup-logic`, `mem://features/stable/financial-traceability-system`, `mem://architecture/finance/invoice-item-attribution`, `mem://architecture/stable/boarding-period-tracking`, `mem://finance/tax-configuration-standard`, `mem://architecture/stable/boarding-proration-engine`, `mem://architecture/finance/tenant-currency-model`, `mem://architecture/stable/commercial-truth-hierarchy`, `mem://features/finance/consultation-and-lab-grounding`, `mem://ux/mobile-first-design-standard`, `mem://architecture/identity/unified-people-model`, `mem://architecture/invitations/invitation-scoping-standard`, `mem://security/connections/partnership-integrity`, `mem://features/team/team-partners-hub`, `mem://architecture/connections/operational-partner-scoping`, `mem://security/invitations/identity-verification-rules`, `mem://architecture/connections/unified-partner-management`, `mem://security/workspace-authorization-and-guards`, `mem://security/permission-system-vocabulary`, `mem://security/granular-backend-enforcement`.
20. Number directly read in this output: 25.
21. Cumulative number directly read: 59.
22. Expected final number: 103.
23. Unreadable number: 0.
24. Duplicate or alias count: 0.
25. Repository changes: None, except the separately disclosed platform-generated planning artifact.
26. Database changes: None. No database query was issued in this batch.
27. Project Memory changes: None.
28. Project Knowledge changes: None.
29. Workspace Knowledge changes: None.
30. Skill changes: None.
31. Settings changes: None.
32. Roadmap or Workstream changes: None.
33. Platform-generated `.lovable/plan.md` activity: this report is written to `.lovable/plan.md` by the platform's Plan Mode mechanism and is committed by the platform, which advances HEAD (evidenced by the A1 HEAD advance from `aec75cad014932dcb1af0298eb3d1efb2afb640a` to `0e4af63381dff14fc8e1b155f2ee7f17276c2a25`). Governed by `docs/CONVENTIONS.md` §11.10 and DEC-RM-DH-003-004. It is not implementation and not Acceptance evidence. No other `.lovable/` path exists or changed.
34. Current Stage batch status: STAGE A — BATCH A2 COMPLETE. Stage A remains incomplete. No Stage A Completeness Verdict is issued.
35. Exact stopping point: Stage A Batch A2 completed (MEM-035 – MEM-059; cumulative MEM-001 – MEM-059); Stage A remains incomplete with 44 entries outstanding beginning at `mem://security/roles/manager-role-baseline`; Stage B not started; no Project Knowledge text rebuilt or installed; no repository, database, Project Memory, Knowledge, Skill, settings, Roadmap, or Workstream change occurred.
36. Exact next permitted owner command: `CONTINUE STAGE A — NEXT BATCH`.
