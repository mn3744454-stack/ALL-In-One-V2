<!--
id: DHB-DOC10
title: Documentation 10 — Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`10-financial-architecture-maturation.txt`)
source-sha256: 9f245f742e8f1977fac27c07638c91d34f986e353f578641de566f95ed7923a5
-->

# Documentation 10 — Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/10-financial-architecture-maturation.txt`](../documentation-01-13/raw/10-financial-architecture-maturation.txt)
> **Source SHA-256:** `9f245f742e8f1977fac27c07638c91d34f986e353f578641de566f95ed7923a5`

```text


# Documentation 10

## Dayli Horse Platform — Post-Documentation 9 Completion Report

---

## 1. Document Identity

### 1.1

This is **Documentation 10**.

### 1.2

**Full Formal Title:** Documentation 10 — Financial Architecture Maturation, Service-Grounding Completion & Final Readiness Closure

### 1.3

**Documentation 9** is the baseline reference.

### 1.4

Documentation 9 covered: Movement module lifecycle maturation, Boarding admissions domain establishment, Breeding domain expansion with foalings/contracts/source-mode tracking, Financial traceability infrastructure (FinancialStatusSection, InternalCostsTab, SupplierPayablesTab), Invoice status constraint expansion, and the complete Identity / Signup / Onboarding / Personal Profile / Organization Profile / Public Profile workstream. Documentation 9 ended approximately March 28, 2026, with the platform's Identity/Profile layer architecturally stable and a functional but financially immature billing/invoicing layer.

### 1.5

Documentation 10 covers all meaningful work completed after Documentation 9 until the final closure of the structured financial maturation roadmap (Phases 1 through 10), concluded on April 3, 2026.

---

## 2. Scope of Documentation 10

### 2.1

Documentation 10 covers the full sequence of post-Documentation-9 work that closed the structured financial maturation roadmap:

#### 2.1.1 Phase 1 — True Prorated Housing Billing Engine
#### 2.1.2 Phase 2 — Boarding Billing Workflow & Statement Alignment
#### 2.1.3 Phase 2 Continuation — Scoped Statement Clarity, Chronological Rows, and Dual-Total Semantics
#### 2.1.4 Phase 3 — Statement Financial Integrity (Tax Basis Unification)
#### 2.1.5 Phase 4A — Tenant-Level Tax Settings UI
#### 2.1.6 Phase 4B — Service-Level Taxability (`is_taxable`)
#### 2.1.7 Phase 5 — Tenant Currency Architecture
#### 2.1.8 Phase 5.1 — Currency Closure Pass (Remaining SAR Cleanup)
#### 2.1.9 Phase 6 — Historical Invoice Reconciliation
#### 2.1.10 Phase 7 — Manual Invoice UX Restructuring
#### 2.1.11 Phase 8 — Financial Closure Testing
#### 2.1.12 Phase 9 — Service-Grounding Completion (Consultation & Lab)
#### 2.1.13 Phase 10 — Final Architecture / Financial Readiness Review

### 2.2

For each phase, this document explains:

#### 2.2.1 what each phase was for
#### 2.2.2 what problem triggered it
#### 2.2.3 what was found during investigation
#### 2.2.4 what was executed
#### 2.2.5 what failed initially
#### 2.2.6 what corrective follow-up happened
#### 2.2.7 what final result was reached
#### 2.2.8 what confidence level or closure status was achieved

### 2.3

This document is **comprehensive and archival**, intended to serve as the definitive record of the platform's financial architecture maturation journey.

---

## 3. Executive Completion Summary

### 3.1

After Documentation 9, the platform underwent a structured 13-step financial maturation roadmap spanning approximately six days (March 28 – April 3, 2026). This roadmap transformed the platform's financial layer from a functionally present but architecturally immature state into a coherent, service-grounded, tenant-configurable, and operationally trustworthy financial system.

### 3.2

Major structural themes:

#### 3.2.1 Boarding/Admission Financial Correctness
Replaced flat `/30` proration with a calendar-aware decomposition engine that correctly handles 28/29/30/31-day months, partial entry months, full months, and partial exit months.

#### 3.2.2 Statement Integrity
Rebuilt client statements as scoped views with explicit horse/category filtering, dual-total semantics (scoped vs client-wide), chronological boarding segment rows, and consistent running balances.

#### 3.2.3 Tax Architecture Maturation
Progressed from no visible tax controls to a two-layer model: tenant-level defaults (Phase 4A) plus service-level taxability overrides (Phase 4B).

#### 3.2.4 Service-Level Taxability
Added `is_taxable` to `tenant_services`, propagated through all invoice creation flows, and made visible as per-line tax badges in the manual invoice UI.

#### 3.2.5 Tenant Currency Architecture
Replaced ~43 hardcoded `"SAR"` references with a tenant-configurable currency system supporting 9 ISO currencies.

#### 3.2.6 Historical Invoice Reconciliation
Cleaned orphan drafts, voided duplicate boarding invoices with proper ledger adjustments, backfilled missing ledger entries for paid lab invoices, and recalculated affected balances.

#### 3.2.7 Manual Invoice UX Restructuring
Removed the initial empty row, added explicit "Add Manual Item" vs "From Catalog" paths, added per-line tax badges, moved column headers above items, and restructured the financial summary card.

#### 3.2.8 Closure Testing
Verified zero ledger drift across all clients, confirmed all Phase 6 reconciliation entries are stable, validated that all approval/payment/cancellation flows use single-source-of-truth utilities.

#### 3.2.9 Service-Grounding Completion
Grounded the Consultation flow in the vet service catalog (service picker, `invoice_items` creation, `is_taxable` check) and fixed Lab invoice tax hardcode from `0` to tenant-configured tax.

#### 3.2.10 Final Readiness Review
Confirmed end-to-end architectural coherence across all 16 identified financial surfaces.

### 3.3

**Biggest structural shift:** The platform evolved from a system where financial amounts were computed with crude approximations (flat `/30`), displayed with hardcoded SAR, taxed globally without service awareness, and lacked ledger integrity verification — to a system where every invoice-generating flow is service-grounded, tenant-configurable for tax and currency, and verified against live ledger data for zero drift.

### 3.4

**Biggest risks during this period and how they were contained:**

1. **Ledger contamination from duplicate boarding invoices:** Contained via Phase 6 automated reconciliation — duplicate invoices were cancelled with matching negative adjustment entries.
2. **Statement misalignment (1,150 SAR gap):** Discovered during Phase 2 Continuation when boarding invoices with non-boarding line items had their non-boarding amounts silently dropped from the flat-row construction. Fixed by injecting an "Other charges" remainder row.
3. **Tax ambiguity between tenant and service levels:** Resolved by the clear two-layer model: tenant defines rate and pricing mode, service defines applicability. No per-service rates.
4. **Consultation invoices creating no `invoice_items`:** Discovered in Phase 9 audit — consultation invoices were header-only with a billing link but zero line items. Fixed by mirroring the Treatment/Vaccination/Breeding pattern.

---

## 4. Baseline Continuation Reference

### 4.1

At the end of Documentation 9, the platform had: a functional invoice lifecycle (draft → approved → paid), a `billing_links` system connecting operational events to invoices, a `FinancialStatusSection` deployed on vet and breeding detail sheets, supplier payables infrastructure, and the full identity/profile architecture.

### 4.2

The work after Documentation 9 was necessary because the financial layer, while functionally present, was architecturally unsound: boarding billing used flat `/30` proration producing incorrect amounts on every invoice, currency was hardcoded as SAR everywhere, tax was applied globally without service awareness, statements could display misaligned totals, and historical data contained orphan drafts and duplicate approved invoices contaminating client balances.

### 4.3

Initial instability after Documentation 9 included: (a) every boarding invoice amount was financially incorrect due to the `/30` divisor, (b) no tax configuration existed in any user-facing settings surface, (c) services had no `is_taxable` flag, (d) consultation invoices created no invoice items, (e) lab invoices hardcoded `taxAmount = 0`, (f) `"SAR"` appeared in 43 files as a hardcoded string, (g) client statements mixed scoped and client-wide totals without distinction.

---

## 5. Post-Documentation-9 Workstream Map

### 5.1

The post-Documentation-9 effort is grouped into nine workstreams:

#### 5.2.1 Boarding/Admission Commercial Correction (Phases 1–2)
**Initial problem:** Flat `/30` divisor produced incorrect boarding costs for every month length. `Math.ceil(days/30)` estimated months incorrectly.
**Execution path:** Created `boardingPeriodEngine.ts` with `decomposeStay()`, refactored `boardingUtils.ts` and `CreateInvoiceFromAdmission.tsx`, generated per-segment invoice items.
**Final state:** Calendar-aware proration engine producing correct amounts for 28/29/30/31-day months with per-segment invoice line items.

#### 5.2.2 Statement Integrity and Scoped Architecture (Phases 2 Continuation, 3)
**Initial problem:** Statements displayed invoice-centric rows rather than decomposed boarding segments, summary cards mixed scoped and client-wide totals, running balance could drift from summary cards.
**Execution path:** Three passes — boarding segment explosion into flat rows, scoped/dual-total card model, chronological ordering toggle, boarding date semantics (period end), From/To wording, tax-basis unification on post-tax amounts, "Other charges" remainder row injection, loading guards.
**Final state:** Fully scoped statement model with explicit horse/category filtering, dual-total cards, user-controllable chronological sort, and stable enrichment guards.

#### 5.2.3 Tax Architecture and Service Taxability (Phases 4A, 4B)
**Initial problem:** No tax settings existed in the UI. Tax was computed tenant-wide without service awareness. The `tenant_services` table had no `is_taxable` column.
**Execution path:** Phase 4A exposed `default_tax_rate` and `prices_tax_inclusive` in a "Tax & Pricing" settings card. Phase 4B added `is_taxable BOOLEAN DEFAULT true` to `tenant_services`, updated service creation/edit UI, and propagated to invoice calculation logic.
**Final state:** Two-layer tax model — tenant-level defaults plus service-level applicability. All invoice generation flows check `is_taxable` before applying tax.

#### 5.2.4 Tenant Currency and Finance-Surface Propagation (Phases 5, 5.1)
**Initial problem:** `"SAR"` hardcoded in 43 files across formatters, invoices, dashboards, services, lab, breeding, and PDF output.
**Execution path:** Phase 5 added `currency` to `tenants`, created `useTenantCurrency()` hook, updated `TaxPricingCard` with currency dropdown, performed mechanical sweep of 17+ files. Phase 5.1 closed remaining gaps — service pricing resolver, admission wizard, financial categorization widget, HR/payroll displays, and removed the `as any` cast in the hook.
**Final state:** All active finance surfaces read currency from tenant configuration. Record-level currency preserved on invoices for historical truth.

#### 5.2.5 Historical Invoice Cleanup and Reconciliation (Phase 6)
**Initial problem:** Database contained 9 orphan draft invoices, 2 duplicate approved boarding invoices with double-posted ledger entries, 4 paid lab invoices with missing ledger entries, and 1 protected 60,000 SAR invoice requiring manual review.
**Execution path:** Strict automated reconciliation via edge function with protected-scope handling — deleted orphan drafts, cancelled duplicates with negative adjustment entries, backfilled missing debits and payment entries, recalculated affected balances.
**Final state:** Zero orphan drafts, zero duplicate contamination, all affected balances corrected, protected invoice untouched.

#### 5.2.6 Manual Invoice UX Restructuring (Phase 7)
**Initial problem:** Dialog opened with an empty starter row biasing toward free-text entry, column headers appeared below items, no per-line tax indicator existed, no visual distinction between manual and catalog lines, summary section was visually disconnected.
**Execution path:** Removed initial empty row, moved headers above items, added empty state, renamed buttons ("Add Manual Item" / "From Catalog"), added per-line tax badges (VAT/Tax-exempt) and source indicators (📦/📄), restructured summary into bordered card, removed stale `currency = "SAR"` default prop.
**Final state:** Clean, operationally clear manual invoice experience with explicit entry paths and visible tax behavior.

#### 5.2.7 Financial Closure Testing (Phase 8)
**Initial problem:** No formal verification that all phases produced a coherent, drift-free financial system.
**Execution path:** Combined code-level audit and live database verification. Queried all `customer_balances` against computed ledger sums, verified all Phase 6 reconciliation entries, audited all approval/payment/cancellation code paths.
**Final state:** Zero drift confirmed across all 6 clients. All financial layers (invoices → ledger → balances → statements) aligned.

#### 5.2.8 Service-Grounding Completion (Phase 9)
**Initial problem:** Consultation invoices bypassed the service catalog entirely — no service selection, no `is_taxable` check, no `invoice_items` rows. Lab invoices hardcoded `taxAmount = 0`.
**Execution path:** Refactored `CreateInvoiceFromConsultation.tsx` to include `useServicesByKind("vet")` service picker, `is_taxable` check, invoice items creation with `service_id`/`domain`/`horse_id`. Fixed lab tax in `useLabInvoiceDraft.ts` by replacing `taxAmount = 0` with `computeTax(subtotal, getTenantTaxConfig(...))`.
**Final state:** All 7 invoice-generating flows (Boarding, Treatment, Vaccination, Breeding, Consultation, Lab, Manual) are now fully service-grounded.

#### 5.2.9 Final Architecture / Financial Readiness Review (Phase 10)
**Initial problem:** No formal certification that the roadmap was complete.
**Execution path:** Comprehensive code and database audit across 16 financial surfaces.
**Final state:** Platform certified as ready for current intended stage with explicitly acceptable residual items only.

---

## 6. Phase-by-Phase Documentation

### 6.3.1 Phase 1 — True Prorated Housing Billing Engine

**6.2.1 Purpose:** Replace the flat `/30` boarding cost logic with calendar-aware proration.

**6.2.2 Initial problem:** `boardingUtils.ts` used `monthlyRate / 30` and `CreateInvoiceFromAdmission.tsx` used `Math.ceil(periodDays / 30)`. Every boarding invoice amount was financially incorrect — February was overstated, 31-day months were understated.

**6.2.3 Findings:** The `/30` divisor was embedded in three locations: `boardingUtils.ts`, `useAdmissionFinancials.ts`, and `CreateInvoiceFromAdmission.tsx`. No calendar-boundary decomposition existed anywhere.

**6.2.4 Decision:** Build a dedicated decomposition engine as a new utility module.

**6.2.5 Implementation:**
- Created `src/lib/boardingPeriodEngine.ts` with `decomposeStay(startDate, endDate, monthlyRate)` — splits stays into calendar-month segments, calculates `dailyRate = monthlyRate / actualDaysInMonth`.
- Refactored `boardingUtils.ts` to use the new engine via `computeAccruedCostDecomposed()`.
- Refactored `CreateInvoiceFromAdmission.tsx` to generate one invoice line item per decomposed segment with `period_start`, `period_end`, `quantity` (days), and `unit_price` (daily rate).
- Fixed the `nav.services` i18n missing key.

**6.2.6 Initial issues:** The `isFullMonth` detection initially failed for February because `endOfMonth()` returns a timestamp at `23:59:59.999` while segment end was midnight. Corrected by adjusting the comparison logic.

**6.2.7 Corrective:** Single correction for `isFullMonth` edge case within the same execution pass.

**6.2.8 Final state:** Engine validated with concrete examples — Jan 15–31 at 5000/mo = 2741.94, Feb full = exactly 5000, multi-month stays correctly decomposed. Clean build confirmed.

**6.2.9 Fully closed:** Yes.

**6.2.10 Dependencies:** Phase 2 (statement alignment) and all subsequent phases depended on this correct engine.

---

### 6.3.2 Phase 2 — Boarding Billing Workflow & Statement Alignment

**6.2.1 Purpose:** Align the billing workflow UX and client statements around the new decomposition engine.

**6.2.2 Initial problem:** After Phase 1, the invoice dialog did not show operators the decomposed segments before submission, and statements still displayed boarding charges as single collapsed rows.

**6.2.3 Findings:** The billing start date defaulted to the current month start rather than advancing past already-billed periods. Statement rendering used `(+N)` collapsed summaries that hid segment details.

**6.2.4 Decision:** Add a segments preview panel in the billing dialog and explode boarding segments into individual statement rows.

**6.2.5 Implementation:**
- Auto-calculated `periodStart` to default to the day after the latest billed period end.
- Added a `billingSegments` preview panel showing decomposed segments before invoice submission.
- Extended `useStatementEnrichment.ts` with a `boardingSegments` array.
- Rendered each boarding segment as an individual chronological statement row.
- Standardized all date displays to `dd-MM-yyyy`.

**6.2.6 Initial issues:** None significant within the Phase 2 base pass.

**6.2.7 Corrective:** Phase 2 Continuation (see next section) was required for deeper scoped-statement work.

**6.2.8 Final state:** Billing workflow shows decomposed segments, statements render explicit boarding rows.

**6.2.9 Fully closed:** Required continuation pass (see 6.3.3).

**6.2.10 Dependencies:** Phase 3 depended on the statement model being structurally sound.

---

### 6.3.3 Phase 2 Continuation — Scoped Statement Clarity

**6.2.1 Purpose:** Transform the statement from an invoice-centric display into a true scoped, client-facing statement model.

**6.2.2 Initial problem:** Summary cards mixed scoped and client-wide totals without distinction. Running balance silently used client-wide ledger data even under filtered views. Boarding row dates used segment start instead of end (accounting due date).

**6.2.3 Findings:** The statement needed three fundamental structural changes: (a) scoped vs client-wide total separation, (b) horse/category filter context made explicit, (c) running balance recomputed within scope.

**6.2.4 Decision:** Full rewrite of `ClientStatementTab.tsx` and `StatementPrintUtils.ts`.

**6.2.5 Implementation (three passes):**
- **Pass 1:** Scope context header with horse/category badges, three scoped summary cards (Invoices/Paid/Due within scope), fourth dashed card for client-wide context, `FlatStatementRow` structure exploding boarding segments, scoped running balance computation, print/PDF alignment.
- **Pass 2 (refinement):** Updated card labels to explicit Arabic wording (إجمالي الفواتير ضمن النطاق المحدد), changed fourth card data source from `outstanding_balance` to sum of all invoice-type ledger entries, added chronological sort toggle (oldest-first default), changed boarding row dates from `periodStart` to `periodEnd`, replaced `→` with "From/To" (من/إلى).
- **Pass 3 (stability):** Added enrichment loading guards — `flatRows` returns empty during `isEnriching`, summary cards show skeletons, export buttons disabled during loading.

**6.2.6 Issues discovered:** The 1,150 SAR gap between summary card total (143,625) and final running balance (142,475) was reported by the user. Root cause: boarding invoices with non-boarding line items had those items silently dropped from flat-row construction.

**6.2.7 Corrective:** Injected an "Other charges" (رسوم أخرى) remainder row when `entry.debit - sum(segmentAmounts) > 0.01`, ensuring every SAR of ledger debit is visible as a table row.

**6.2.8 Final state:** Fully scoped statement with dual-total cards, explicit scope context, chronological ordering, remainder injection, and loading stability guards.

**6.2.9 Fully closed:** Yes.

**6.2.10 Dependencies:** Phase 3 built directly on this foundation to unify the tax basis.

---

### 6.3.4 Phase 3 — Statement Financial Integrity (Tax Basis)

**6.2.1 Purpose:** Resolve inconsistencies between pre-tax and post-tax amounts across statement rows and summary cards.

**6.2.2 Initial problem:** Investigation revealed that boarding segment amounts in statements were pre-tax (from individual `invoice_items.total_price`), while the summary card debit came from the full post-tax ledger entry. This created a mismatch where the visible row accumulation did not match the summary cards.

**6.2.3 Findings:** The core issue was that multi-segment boarding invoices had their tax applied to the total invoice amount, but individual segments had no per-segment tax attribution. The statement needed to decide: display pre-tax segments or post-tax segments.

**6.2.4 Decision:** Unify all statement rows on a **post-tax basis**. For multi-segment boarding invoices, distribute the tax proportionally across segments based on the invoice snapshot.

**6.2.5 Implementation:**
- Updated `useStatementEnrichment.ts` to compute proportional post-tax amounts per boarding segment: `segmentPostTax = segment.total_price × (invoiceTotal / sumOfSegmentPrices)`.
- Updated `ClientStatementTab.tsx` to use the post-tax `amount` field from enriched segments.
- The proportional distribution ensures segment amounts sum exactly to the ledger debit.

**6.2.6 Initial issues:** None significant.

**6.2.7 Corrective:** A final stability pass added enrichment loading guards to prevent transient stale rendering during filter transitions.

**6.2.8 Final state:** Statement rows and summary cards are unified on a post-tax basis. Running balances are consistent.

**6.2.9 Fully closed:** Yes.

**6.2.10 Dependencies:** Foundation for all later phases that rely on statement/ledger trust.

---

### 6.3.5 Phase 4A — Tenant-Level Tax Settings UI

**6.2.1 Purpose:** Expose the already-existing tenant-level tax fields (`default_tax_rate`, `prices_tax_inclusive`) in a user-facing settings interface.

**6.2.2 Initial problem:** The fields existed in the database and were consumed by `taxUtils.ts`, but no UI existed for operators to view or edit them. Tax behavior was invisible and uncontrollable.

**6.2.3 Findings:** The `DashboardOrganizationSettings.tsx` page used a consistent Card pattern. Adding a "Tax & Pricing" card required no structural reorganization.

**6.2.4 Decision:** Add an inline card on the Organization Settings page with two controls: numeric tax rate input and pricing mode radio toggle.

**6.2.5 Implementation:**
- Updated `Tenant` interface in `TenantContext.tsx` to include `default_tax_rate: number | null` and `prices_tax_inclusive: boolean`.
- Created `TaxPricingCard.tsx` with tax rate input (0-100%), pricing mode toggle (exclusive/inclusive), helper text, `canManage` permission guard.
- Cleaned up `as any` casts in `InvoiceFormDialog.tsx` and `useAdmissionFinancials.ts`.
- Added full EN/AR translations.

**6.2.6 No initial failures.**

**6.2.8 Final state:** Tax settings visible and editable by owner/manager. Defaults: 15%, tax-exclusive.

**6.2.9 Fully closed:** Yes.

**6.2.10 Dependencies:** Phase 4B required this as the foundation for service-level taxability.

---

### 6.3.6 Phase 4B — Service-Level Taxability

**6.2.1 Purpose:** Add `is_taxable` to services so that individual services can be marked tax-exempt, with that flag propagated into invoice calculations.

**6.2.2 Initial problem:** All invoice generation flows applied tax globally to the full amount. No mechanism existed to exempt specific services (e.g., veterinary consultations, certain breeding services) from tax.

**6.2.3 Findings:** The `tenant_services` table had no `is_taxable` column. `ServiceFormDialog.tsx` had no tax-related toggle. `InvoiceFormDialog.tsx` computed a single tax amount on the full invoice total without per-line separation.

**6.2.4 Decision:** Add `is_taxable BOOLEAN DEFAULT true NOT NULL` to `tenant_services`. Add a simple toggle in the service UI. Refactor invoice calculation to separate taxable and non-taxable subtotals.

**6.2.5 Implementation:**
- Migration adding `is_taxable` to `tenant_services`.
- Updated `ServiceFormDialog.tsx` and doctor service dialog with "Taxable / خاضع للضريبة" toggle.
- Refactored `InvoiceFormDialog.tsx` tax calculation (lines 131–169) to separate `taxableSubtotal` and `nonTaxableSubtotal` based on each line item's service `is_taxable` status.
- Updated generated invoice flows (Treatment, Vaccination, Breeding) to check `is_taxable` before applying `computeTax`.
- Added EN/AR translations.

**6.2.6 No initial failures.**

**6.2.8 Final state:** Services have a visible `is_taxable` toggle. Manual and generated invoices correctly separate taxable from non-taxable amounts.

**6.2.9 Fully closed:** Yes (for flows that were already service-grounded; Consultation and Lab gaps were deferred to Phase 9).

**6.2.10 Dependencies:** Phase 7 used this to display per-line tax badges. Phase 9 extended this to Consultation and Lab.

---

### 6.3.7 Phase 5 — Tenant Currency Architecture

**6.2.1 Purpose:** Replace hardcoded `"SAR"` references with a tenant-configurable currency system.

**6.2.2 Initial problem:** The string `"SAR"` appeared in 43 files across formatters, invoice creation, dashboards, services, lab, breeding, PDF, and HR surfaces. No currency setting existed for tenants.

**6.2.3 Findings:** The affected areas spanned 11 categories: central formatters, statements, invoice forms, invoice details, generated invoice flows, manual invoices, PDF/print, service pricing, admission/housing, vet/breeding/lab, and dashboard widgets.

**6.2.4 Decision:** Add `currency TEXT DEFAULT 'SAR' NOT NULL` to `tenants`, create `useTenantCurrency()` hook, extend the Tax & Pricing card with a currency dropdown, perform mechanical sweep of affected files.

**6.2.5 Implementation:**
- Migration adding `currency` to `tenants`.
- Updated `Tenant` interface with `currency: string`.
- Created `useTenantCurrency()` hook.
- Extended `TaxPricingCard` (renamed to "Currency, Tax & Pricing") with dropdown supporting 9 currencies (SAR, AED, QAR, KWD, BHD, OMR, USD, EUR, GBP).
- Propagated to 17+ files including `FinancialSummaryWidget`, `DashboardFinance`, `InvoicesList`, `ExpensesList`, `InvoiceDetailsSheet`, `ClientCard`, `ClientsTable`, `CreateInvoiceFromTreatment`, `CreateInvoiceFromVaccination`, `BreedingDetailSheets`, `useLabInvoiceDraft`.

**6.2.6 Initial incompleteness:** Several files were missed in the first sweep — service pricing resolver, admission wizard, financial categorization widget, HR/payroll displays, and the hook itself contained an `as any` cast.

**6.2.7 Corrective:** Phase 5.1 closure pass (see next section).

**6.2.8 Final state (after 5.1):** All active financial surfaces use tenant-configured currency. Record-level currency preserved on invoices for historical truth.

**6.2.9 Fully closed after Phase 5.1.**

**6.2.10 Dependencies:** Phase 7 relied on currency being tenant-aware for the line items editor prop cleanup.

---

### 6.3.8 Phase 5.1 — Currency Closure Pass

**6.2.1 Purpose:** Close remaining gaps from Phase 5's initial sweep.

**6.2.2 Initial problem:** The Phase 5 audit found that service pricing resolver (`resolver.ts`), admission wizard (`AdmissionWizard.tsx`), financial categorization, HR/payroll, and multiple lab surfaces still used hardcoded `"SAR"`. The `useTenantCurrency` hook had an `as any` cast despite the Tenant interface already including `currency`.

**6.2.3 Findings:** 10+ additional files required cleanup. The `CURRENCY_OPTIONS` array was duplicated between `TaxPricingCard` and `AdmissionWizard`.

**6.2.4 Decision:** Focused closure pass to eliminate remaining references.

**6.2.5 Implementation:**
- Removed `as any` from `useTenantCurrency` hook.
- Extracted `CURRENCY_OPTIONS` to a shared constant.
- Updated `resolver.ts`, `AdmissionWizard.tsx`, `HRPayrollTab.tsx`, `FinancialCategorization.tsx`, and remaining lab surfaces.
- Added `fallbackCurrency` parameter to pricing resolver for proper propagation.

**6.2.6 No issues.**

**6.2.8 Final state:** Currency architecture fully closed. No remaining active hardcoded SAR references in closure-critical flows. Only safe fallbacks remain for pre-Phase-5 historical records (e.g., `invoice.currency || "SAR"` in PDF generator).

**6.2.9 Fully closed:** Yes.

---

### 6.3.9 Phase 6 — Historical Invoice Reconciliation

**6.2.1 Purpose:** Clean up known historical data contamination — orphan drafts, duplicate approved invoices, and missing ledger entries.

**6.2.2 Initial problem:** Database contained: 9 orphan draft invoices with no ledger impact, 2 duplicate approved boarding invoices (`INV-MNAVS3UJ` and `INV-MMQ5FJ3G`) with double-posted ledger entries inflating client balances, 4 paid lab invoices with missing debit ledger entries, and 1 large manual invoice (`INV-MMO9AAXD`, 60,000 SAR) with zero items.

**6.2.3 Findings:** The 9 drafts were safely deletable (no ledger impact). The 2 duplicates needed status cancellation plus negative adjustment entries to reverse the double-posted debits. The 4 lab invoices needed debit entries backfilled to align ledger truth with their "paid" status. The 60,000 SAR invoice was classified as requiring manual business review — excluded from automated cleanup.

**6.2.4 Decision:** Execute automated reconciliation via edge function, with strict protected-scope handling for the 60,000 SAR invoice.

**6.2.5 Implementation:**
- Deleted 9 orphan draft invoices.
- Cancelled `INV-MNAVS3UJ` and `INV-MMQ5FJ3G`, created matching negative adjustment ledger entries (-5,750 and -10,000 SAR).
- Posted missing debit entries for 4 paid lab invoices (total 1,110 SAR) and 1 payment entry.
- Recalculated `customer_balances` for 3 affected clients.
- All reconciliation entries prefixed with "Phase 6 Reconciliation:" for auditability.

**6.2.6 No failures.** Pre-reconciliation balance snapshots were captured and verified post-execution.

**6.2.8 Final state:** Zero orphan drafts. Duplicate contamination reversed. Missing ledger entries backfilled. Protected invoice untouched.

**6.2.9 Fully closed:** Yes.

**6.2.10 Dependencies:** Phase 8 verified these results as stable.

---

### 6.3.10 Phase 7 — Manual Invoice UX Restructuring

**6.2.1 Purpose:** Restructure the manual invoice creation experience to be operationally clearer without changing the underlying accounting model.

**6.2.2 Initial problem:** The dialog opened with a noisy empty starter row, column headers appeared below items (inverted), there was no visual distinction between taxable and non-taxable lines, the buttons "Add Item" and "From Catalog" were not clearly differentiated, and the summary section was visually disconnected.

**6.2.3 Findings:** Primarily UI/layout issues with one important operational gap — operators had zero visibility into which lines would be taxed.

**6.2.5 Implementation:**
- Removed initial empty row (lineItems starts as `[]`).
- Moved column headers (Description, Quantity, Unit Price, Total) above the items grid.
- Added empty state with "No items added yet" message and clear action buttons.
- Renamed "Add Item" to "Add Manual Item" (إضافة بند يدوي).
- Added per-line tax badges: "VAT" for taxable, "Tax-exempt" for non-taxable.
- Added source indicators: 📦 Catalog, 📄 Manual.
- Restructured summary into bordered card with clear subtotal → tax → discount → total hierarchy.
- Added prominent tax mode badge (incl. tax / excl. tax).
- Removed stale `currency = "SAR"` default prop from `InvoiceLineItemsEditor`.

**6.2.6 No significant failures.**

**6.2.8 Final state:** Clean, operationally clear manual invoice dialog with explicit entry paths, visible tax behavior, and proper layout.

**6.2.9 Fully closed:** Yes.

---

### 6.3.11 Phase 8 — Financial Closure Testing

**6.2.1 Purpose:** Verify end-to-end financial coherence after all implementation phases.

**6.2.2 Initial problem:** No formal verification had been performed that all phases together produced a coherent, drift-free system.

**6.2.3 Findings:** Combined code audit and live database verification confirmed:
- Zero balance drift across all 6 clients (computed ledger sums matched `customer_balances` exactly).
- All Phase 6 reconciliation entries stable and present.
- All approval/payment/cancellation flows use single-source-of-truth utilities (`approveInvoice`, `postLedgerForPayments`, `handleCancel`).
- Tax architecture correctly separates taxable/non-taxable at line level.
- Currency propagation confirmed via `useTenantCurrency` hook.

**6.2.4 Decision:** The audit itself constitutes the closure test — no additional test infrastructure needed.

**6.2.5 Implementation:** Read-only verification pass. No code changes.

**6.2.6 No failures. One known gap identified:** Consultation invoices still bypassed service grounding (deferred to Phase 9).

**6.2.8 Final state:** All financial layers confirmed aligned.

**6.2.9 Fully closed:** Yes.

---

### 6.3.12 Phase 9 — Service-Grounding Completion

**6.2.1 Purpose:** Close the last service-grounding gaps so all invoice-generating flows consistently derive tax behavior from service definitions.

**6.2.2 Initial problem:** Consultation invoice flow in `CreateInvoiceFromConsultation.tsx` bypassed the service catalog entirely — no service picker, no `is_taxable` check, no `invoice_items` rows created (header-only invoices). Lab invoice flow in `useLabInvoiceDraft.ts` hardcoded `taxAmount = 0`.

**6.2.3 Findings:** Consultation was structurally different from all other grounded flows (Treatment, Vaccination, Breeding). Those flows all used `useServicesByKind()`, checked `is_taxable`, and created detailed invoice items. Consultation created only an invoice header plus a billing link. Lab used template-based pricing but ignored tenant tax entirely.

**6.2.5 Implementation:**
- Refactored `CreateInvoiceFromConsultation.tsx` to include:
  - `useServicesByKind("vet")` service picker.
  - `is_taxable` check — tax only applied if selected service is taxable.
  - `invoice_items` creation with `service_id`, `domain: "vet"`, `horse_id`, `entity_id`.
  - `useTenantCurrency()` instead of hardcoded fallback.
- Fixed `useLabInvoiceDraft.ts`: replaced `taxAmount = 0` with `computeTax(subtotal, getTenantTaxConfig(activeTenant?.tenant))`.
- Added required i18n keys for consultation service picker.

**6.2.6 No failures.**

**6.2.8 Final state:** All 7 invoice-generating flows are now fully service-grounded with consistent `is_taxable` behavior.

**6.2.9 Fully closed:** Yes.

---

### 6.3.13 Phase 10 — Final Architecture / Financial Readiness Review

**6.2.1 Purpose:** Final certification that the platform is architecturally and financially ready for the current intended product stage.

**6.2.2 Initial problem:** No formal readiness certification existed after 12 prior phases.

**6.2.3 Findings:** Comprehensive audit across 16 financial surfaces confirmed:
- All service-grounded, all using `computeTax`, all using `useTenantCurrency`.
- Single-source-of-truth utilities for approval, payment, and reversal.
- Zero ledger drift. Phase 6 reconciliation entries stable.
- No architecture seams or inconsistencies between modules.

**6.2.4 Decision:** Declare the platform ready with explicitly acceptable residual items.

**6.2.5 Implementation:** Read-only audit. No code changes.

**6.2.8 Final state:** Platform certified as "mostly ready, with explicitly acceptable residual issues." No blockers identified.

**6.2.9 Fully closed:** Yes.

---

## 7. Failures, Confusion Points, and Corrective Passes

### 7.2.1 Statement Mismatches (1,150 SAR Gap)

**7.3.1** The summary card showed 143,625 SAR total invoices, but the final running balance in the table showed 142,475 SAR.

**7.3.2** Discovered when the user explicitly noticed the discrepancy and asked for explanation.

**7.3.3** The first solution (Phase 2 base) only rendered boarding segment rows for items with `period_start`/`period_end`. Non-boarding items on the same invoice were silently dropped from the table.

**7.3.4** An "Other charges" remainder row was injected: after boarding segments, if `entry.debit - sum(segmentAmounts) > 0.01`, a supplementary row captures the difference.

**7.3.5** Full confidence — running balance now always reaches the same total as the summary card.

### 7.2.2 Tax Ambiguity and Architecture Hesitation

**7.3.1** Before Phase 4, the question arose whether the platform needed per-service tax rates, cross-jurisdiction tax, destination-based tax, or just a simple applicability flag.

**7.3.2** Discovered during the pre-Phase-4B cross-border readiness audit.

**7.3.3** Initial concern was that a narrow `is_taxable` flag might be insufficient for multi-country operation.

**7.3.4** The audit concluded that tenant-level rate + pricing mode + service-level `is_taxable` boolean is the correct model for the current product stage. Multi-jurisdiction tax was explicitly deferred as a future enhancement.

**7.3.5** High confidence — the two-layer model is architecturally sound and extensible.

### 7.2.3 Currency Propagation Incomplete at First

**7.3.1** Phase 5's initial sweep missed 10+ files (resolver, admission wizard, HR, some lab surfaces).

**7.3.2** Discovered during the Phase 5.1 audit which systematically scanned all remaining references.

**7.3.3** The mechanical sweep approach missed files that used `"SAR"` through indirect patterns or in non-obvious contexts.

**7.3.4** Phase 5.1 performed a complete closure pass, eliminating all remaining references and extracting shared `CURRENCY_OPTIONS`.

**7.3.5** High confidence — verified via code search that no active finance path retains hardcoded SAR.

### 7.2.4 Phase 5 Requiring 5.1 Closure

**7.3.1** Phase 5 was executed as a large mechanical sweep but left gaps.

**7.3.2** Discovered via systematic post-Phase-5 audit.

**7.3.3** A single pass across 43 files was insufficient; some patterns were non-obvious.

**7.3.4** Phase 5.1 was created as a dedicated closure pass.

**7.3.5** Confirmed complete — the two-pass approach (sweep + closure) was ultimately sufficient.

### 7.2.5 Historical Cleanup Requiring Protected-Scope Handling

**7.3.1** One invoice (`INV-MMO9AAXD`, 60,000 SAR) had unusual characteristics — paid status, zero items, no clear source. Automated cleanup could have been destructive.

**7.3.2** Discovered during Phase 6 audit of live database state.

**7.3.3** Applying blanket automated cleanup to all anomalous records would have been unsafe.

**7.3.4** The invoice was explicitly excluded from automated reconciliation and flagged for manual operator review.

**7.3.5** Appropriate confidence — the protected-scope decision was correct.

### 7.2.6 Manual Invoice UX Requiring Restructuring

**7.3.1** The manual invoice dialog had multiple operator-confusion risks that were structural, not cosmetic.

**7.3.2** Discovered during Phase 7 investigative audit.

**7.3.3** Simply adding features on top of the existing layout would have perpetuated the confusion.

**7.3.4** A focused restructuring pass (7 steps) addressed layout, entry paths, tax visibility, and summary clarity without touching calculations.

**7.3.5** High confidence — the restructured UI is operationally clear.

### 7.2.7 Consultation and Lab Requiring Phase 9

**7.3.1** Consultation invoices had no service linkage and no invoice items. Lab invoices hardcoded `taxAmount = 0`.

**7.3.2** Discovered during Phase 8 closure testing when all flows were audited for service-grounding completeness.

**7.3.3** These flows were implemented before the service-grounding pattern was established, so they never received the updates.

**7.3.4** Phase 9 was created specifically to close these gaps by mirroring the already-proven Treatment/Vaccination/Breeding pattern.

**7.3.5** High confidence — both flows now follow the identical grounded pattern.

### 7.2.8 Final Readiness Proving Residual vs Blocking

**7.3.1** The question of whether remaining items were truly non-blocking required rigorous classification.

**7.3.2** Phase 10 audit systematically classified every residual item.

**7.3.3** Without formal classification, some items might have been perceived as blockers unnecessarily.

**7.3.4** Each item was classified as: non-blocking legacy (1 invoice), future enhancement (bilingual PDF, per-line tax toggle, lab template `is_taxable`), or cosmetic (`as any` casts).

**7.3.5** High confidence — the classification is explicit and defensible.

---

## 8. Major Financial Architecture Progression

### 8.1

The platform's financial layer underwent a complete structural maturation after Documentation 9, progressing from an architecturally immature but functional state to a coherent, verifiable, and trustworthy system.

### 8.2

#### 8.2.1 Boarding Billing Correctness
**Before:** Flat `/30` divisor, `Math.ceil(days/30)` month estimation, single opaque line items.
**After:** Calendar-aware `decomposeStay()` engine, per-segment line items with `period_start`/`period_end`, correct daily rates by actual month length.

#### 8.2.2 Statement Integrity
**Before:** Invoice-centric display, collapsed `(+N)` summaries, no scope distinction.
**After:** Scoped statement model with horse/category filtering, dual-total cards, explicit boarding segment rows, "Other charges" remainder injection.

#### 8.2.3 Scoped Totals vs Client-Wide Totals
**Before:** Single ambiguous total mixing filtered and unfiltered amounts.
**After:** Three scoped cards (Invoices/Paid/Due within filter) plus one client-wide context card.

#### 8.2.4 Running Balance Correction
**Before:** Could drift from summary cards when boarding invoices contained non-boarding items.
**After:** Every SAR of ledger debit is represented as a visible table row; running balance always reaches the summary card total.

#### 8.2.5 Tenant Tax Settings
**Before:** No UI; tax fields invisible and uncontrollable.
**After:** "Currency, Tax & Pricing" settings card with numeric rate input, pricing mode toggle, and currency dropdown.

#### 8.2.6 Service Taxability
**Before:** No concept of per-service tax applicability.
**After:** `is_taxable` toggle on every service; invoice calculation separates taxable/non-taxable subtotals.

#### 8.2.7 Tenant Currency
**Before:** `"SAR"` hardcoded in 43 files.
**After:** Tenant-configurable currency, `useTenantCurrency()` hook, 9 ISO options, record-level currency preservation.

#### 8.2.8 Historical Reconciliation
**Before:** 9 orphan drafts, 2 duplicate approved invoices, 4 incomplete ledger histories.
**After:** All cleaned; reconciliation entries traceable via "Phase 6 Reconciliation:" prefix.

#### 8.2.9 Manual Invoice Clarity
**Before:** Empty starter row, hidden tax behavior, indistinguishable line types.
**After:** No initial row, explicit entry paths, per-line tax badges, source indicators, structured summary card.

#### 8.2.10 Service-Grounded Invoice Generation
**Before:** Consultation had no service linkage; Lab had zero tax.
**After:** All 7 flows service-grounded with consistent `is_taxable` behavior.

#### 8.2.11 Final Ledger/Balance/Statement Trust
**Before:** No formal verification of alignment.
**After:** Zero drift confirmed across all clients via live database verification.

### 8.3

This sequence mattered architecturally because each layer built on the previous: correct amounts (Phase 1) → correct display (Phase 2) → correct tax basis (Phase 3) → configurable tax (Phase 4) → configurable currency (Phase 5) → clean history (Phase 6) → clear UX (Phase 7) → verified integrity (Phase 8) → complete grounding (Phase 9) → certified readiness (Phase 10).

---

## 9. Verification and Trustworthiness History

### 9.2

The trustworthiness progression followed a consistent pattern:

#### 9.2.1 Audit: Every phase began with a structured investigative audit that read real code and, where applicable, queried live database state.
#### 9.2.2 Execution: Implementation followed the audit's approved plan with strict scope boundaries.
#### 9.2.3 Verification: Post-execution verification included TypeScript build checks, engine validation with concrete numerical examples, and database state queries.
#### 9.2.4 Correction: Where verification exposed gaps (Phase 2 Continuation refinements, Phase 5.1, Phase 3 stability pass), corrective follow-up was performed.
#### 9.2.5 Closure: Each phase was formally closed with explicit confirmation of acceptance criteria.

### 9.3

Passes required per workstream:
- **Boarding billing:** 1 pass (Phase 1)
- **Statement integrity:** 4 passes (Phase 2 base + Phase 2 Continuation with 2 refinements + Phase 3 + Phase 3 stability)
- **Tax architecture:** 2 passes (Phase 4A + Phase 4B)
- **Currency architecture:** 2 passes (Phase 5 + Phase 5.1)
- **Historical cleanup:** 1 pass (Phase 6)
- **Manual invoice UX:** 1 pass (Phase 7)
- **Closure testing:** 1 pass (Phase 8)
- **Service grounding:** 1 pass (Phase 9)

### 9.4

#### 9.4.1 High confidence: Boarding engine (validated with computed examples), ledger integrity (zero drift verified), tax separation logic, currency propagation.
#### 9.4.2 Medium confidence: Statement enrichment stability during edge-case filter transitions (guards added but not exhaustively tested with adversarial data).
#### 9.4.3 Inferred: PDF output formatting for non-SAR currencies (code path verified, not visually inspected).
#### 9.4.4 Directly verified: Ledger drift (SQL query), Phase 6 reconciliation entries (SQL query), approval flow code paths (3 call sites audited), payment flow (single utility audited), cancellation flow (code + database evidence).

---

## 10. Final Current-State Summary

### 10.1

The platform at the end of Documentation 10 has a complete, structurally coherent financial architecture spanning boarding billing, invoice generation (7 flows), approval/posting, ledger entries, customer balances, client statements, PDF export, tenant tax configuration, service taxability, and tenant currency — all verified against live data with zero drift.

### 10.2

**Materially stronger than Documentation 9:**
- Boarding billing is calendar-correct instead of flat `/30`.
- Tax is configurable and visible instead of hidden and global-only.
- Currency is tenant-driven instead of hardcoded SAR.
- Statements are scoped with dual totals instead of ambiguous.
- All 7 invoice flows are service-grounded instead of ad hoc.
- Historical contamination is cleaned instead of silently polluting balances.
- Manual invoices are operationally clear instead of confusing.
- Financial integrity is verified instead of assumed.

### 10.3

**Financially and architecturally closed:**
- Boarding proration engine
- Statement integrity model
- Tax configuration (tenant + service layers)
- Currency architecture
- Ledger/balance/statement alignment
- Historical data reconciliation
- Service-grounding across all flows
- Manual invoice UX

### 10.4

**Operationally trustworthy:**
- Invoice creation (all 7 flows)
- Invoice approval and posting
- Payment recording with split-tender support
- Client statements with scoped filtering
- PDF generation with record-level currency
- Cancellation with adjustment reversal

### 10.5

**Remaining only as non-blocking future enhancements:**
- Bilingual PDF labels (currently English-only)
- Per-line tax toggle for manual invoice free-text items
- Lab template-level `is_taxable`
- Multi-jurisdiction VAT support
- Rate transition support for mid-stay package changes
- `as any` Supabase type casts (cosmetic)
- Manual review of `INV-MMO9AAXD` (operator business follow-up)

---

## 11. Residual / Deferred / Future Items

### 11.2.1 Non-blocking legacy/manual items
- `INV-MMO9AAXD` (60,000 SAR): Paid invoice with zero items. Excluded from automated cleanup. Flagged for manual operator review. Does not affect system behavior or other client balances.

### 11.2.2 Future enhancements
- Bilingual PDF labels (Arabic + English on invoices/statements)
- Per-line tax toggle for free-text manual invoice items (allow operator to mark individual free-text lines as non-taxable)
- Lab template-level `is_taxable` (currently lab uses tenant-level tax for all templates)
- Rate transition support (`boarding_rate_changes` table for mid-stay package/price changes)
- Multi-jurisdiction/destination-based tax logic

### 11.2.3 Cosmetic improvements
- `as any` casts in Supabase queries (TypeScript type generation limitation)
- Suggested tags on public profile remain English-only

### 11.2.4 Possible later strategic workstreams
- Multi-currency conversion (currently only single-currency-per-tenant)
- Advanced pricing models (volume discounts, negotiated rates)
- Audit trail / financial event logging UI

### 11.2.5 Things intentionally not required for closure
- The 60,000 SAR protected invoice — explicitly a manual business follow-up item
- Cross-country tax complexity beyond single-tenant-rate model — explicitly deferred as future enhancement
- Bilingual PDF — enhancement, not financial correctness issue

### 11.4

**None of these items are blockers.** They are clearly classified as enhancements, manual follow-ups, or cosmetic improvements that do not affect financial correctness, ledger integrity, or operational trustworthiness.

---

## 12. Final Judgment

### 12.2.1

The structured roadmap from Phase 1 to Phase 10 is **complete**.

### 12.2.2

The platform is **ready at the current intended stage** with explicitly acceptable residual items. Financial integrity has been verified via live database queries showing zero drift. All 7 invoice-generating flows are service-grounded. Tax and currency are tenant-configurable. Statements are scoped and accurate. Historical contamination is cleaned.

### 12.2.3

**No additional mandatory execution phase remains.**

### 12.2.4

All remaining items are **enhancements or business follow-up only** — none are financial correctness blockers.

### 12.3

This judgment is based on: (a) code-level verification of all financial flows, (b) live database verification of zero ledger drift, (c) systematic classification of all residual items as non-blocking, (d) confirmation that every phase was formally closed with explicit acceptance criteria met.

---

## 13. Documentation Metadata and Continuity

### 13.1

Documentation 10 reaches section **13** with subsection numbering up to **13.4**.

### 13.2

The next document, if needed, should be numbered **Documentation 11** and should begin its section numbering at **1**.

### 13.3

After Documentation 10, the following types of future documents would make sense:
- **Feature-focused documentation** for new major workstreams (e.g., Community/Marketplace, Advanced Pricing, POS integration)
- **Enhancement documentation** for items listed in Section 11 (bilingual PDF, rate transitions, multi-jurisdiction tax)
- **Module maturation documentation** for Vet/Health workflow completion, Housing Phase 2, or Community features
- **Operational documentation** for deployment, onboarding, or operator training materials

### 13.4

**No new mandatory roadmap phase exists.** The financial maturation roadmap is complete. Future work should be driven by new product requirements, not by architectural debt from this roadmap.
```
