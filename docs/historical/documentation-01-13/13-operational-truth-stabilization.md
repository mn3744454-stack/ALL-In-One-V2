<!--
id: DHB-DOC13
title: Documentation 13 — Operational Truth Stabilization
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`13-operational-truth-stabilization.txt`)
source-sha256: 367440b1771119841ac343c01fb1b3d97f56bbbf3864e51c8ad1d3cd059c4627
-->

# Documentation 13 — Operational Truth Stabilization

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/13-operational-truth-stabilization.txt`](../documentation-01-13/raw/13-operational-truth-stabilization.txt)
> **Source SHA-256:** `367440b1771119841ac343c01fb1b3d97f56bbbf3864e51c8ad1d3cd059c4627`

```text
Documentation 13

Formal Title (proposed):
Post-Permission-Migration Platform Stabilization: Laboratory Closure, Notification Governance Foundation, Arrivals & Departures / Housing / Admissions / Movement Coherence, Financial Checkout Gate, Security Hardening, and Narrow Demo-Data Normalization (04/04/2026 → 14/05/2026)

Alternative titles:
- Operational Truth Stabilization After the Permission Migration: Lifecycle, Movement, Housing, Finance Gate, and Security Hardening Arc.
- From Permission Enforcement to Operational Coherence: Laboratory Closure, Movement-Admission Linkage, and Targeted Data Normalization.
- Lifecycle, Movement, and Financial Trustworthiness Pass: The H1–H5-F, Notification Governance, and May-13 Security Hardening Period.

Scope period: 04/04/2026 (immediately after Documentation 12 closure) → 14/05/2026.
Supersedes: the earlier Laboratory-only Documentation 13 draft (`docs/Documentation_13_-_Laboratory_Workstream_Closure.md`). That draft’s substance is preserved within this combined artifact and should no longer be treated as a standalone final document.
Baseline reference: Documentation 12 — Backend Permission Enforcement Migration: Forensic Permissions Audit, Three-Phase Corrective Architecture, Domain-by-Domain RLS Migration, and Final Residual Closure.

---

1. Document Identity

1.1 This is Documentation 13.
1.2 The formal title is the descriptive title above; the on-disk filename can be shorter when this document is later persisted.
1.3 Scope period: 04/04/2026 → 14/05/2026.
1.4 This combined Documentation 13 supersedes the earlier Laboratory-only Documentation 13 draft. The Laboratory content is integrated into Arc A below.
1.5 Documentation 12 is the official immediate baseline; all work below builds on its `has_permission()` enforcement foundation.

---

2. Executive Summary

2.1 Where Documentation 12 closed the authorization truth model (104 granular permission keys, manager baseline at 102 permissions, owner full, `has_permission()` enforced across migrated operational domains), Documentation 13 closes the operational truth model that sits on top of it: lifecycle state, movement taxonomy, admission linkage, housing occupancy, financial checkout, notification governance, and isolated demo-data integrity.

2.2 Major arcs in this period:

- Arc A — Laboratory closure (Phases 5.2.2-Hotfix → 7 → 8): template-authoritative results, DB-trigger eligibility, publication gates, duplicate prevention.
- Arc B — Notification governance & control foundation: per-family preferences, tenant-side governance schema, dashboard scaffolding.
- Arc C — Arrivals & Departures state contract and Housing / Admissions / Movement coherence (AD-1, H1–H5-F): the deepest arc; rebuilt the operational source-of-truth for where a horse is, what stay it belongs to, and what its next step is.
- Arc D — Financial checkout gate and operational finance clarity: clarified the `useFinancialGate` model and resolved the Suni case manually rather than by SQL.
- Arc E — Security hardening sweep (13/05/2026): tightened RLS on `tenants`, `follows`, `app_settings`, inventory domain, and care notes.
- Arc F — i18n / bilingual terminology: stabilized Housing / Movement / Lifecycle vocabulary in EN and AR.
- Arc G — Data repair & demo-data policy: H5-B bounded repair plus the H5-F narrow three-horse / two-tenant normalization (Basha, Fatin, Maha). Broad demo-data normalization was intentionally deferred at the user’s request.

2.3 Highest-risk problems discovered:

- Lifecycle drift: horses physically present without an open admission (`needs_admission`) or admitted without a unit (`needs_placement`), invisible in operational panels.
- Movement-admission decoupling: no FK between `horse_movements` and `boarding_admissions`, forcing a ±24h heuristic to associate them.
- Same-branch unit operations rendered as generic “transfers,” conflating reassignment with inter-branch transfer.
- Financial checkout could be bypassed via raw SQL `status='checked_out'` updates, ignoring outstanding ledger and unbilled accrual.
- Public-facing exposure of private columns on `tenants`, plus over-permissive RLS on inventory and care-notes domains.

2.4 Most important corrections:

- Centralized lifecycle truth in `vw_horse_lifecycle_state` consumed via `useHorseLifecycleStates`.
- Standardized `movement_subtype` taxonomy and a shared `classifyMovement` helper used by cards, detail sheets, and gating.
- Added partial unique indexes binding admissions to their check-in/checkout movements (`boarding_admissions.checkin_movement_id` / `checkout_movement_id`) and FK-first lookup in `MovementsList.tsx`.
- Hardened the `useFinancialGate` contract (admission balance, client ledger, unbilled accrual, override permission `boarding.checkout.override_balance`).
- Tightened RLS across the security hardening batch on 13/05/2026.

2.5 Final state as of 14/05/2026: the operational, financial-gate, and security postures are materially more trustworthy than at Documentation 12 closure. Remaining items are non-blocking residuals (notification dashboard polish, Academy enforcement, fresh linter rerun, broad demo-data cleanup beyond Basha/Fatin/Maha, finance override hardening, Client portal architecture).

2.6 Closed vs deferred is summarized in §17 and §18.

---

3. Baseline Continuation from Documentation 12

3.1 Documentation 12 left the platform with `has_permission()` enforced on writes across migrated operational domains, legacy `can_manage_orders()` removed from those domains, 104 permission keys, manager bundle at 102 operational permissions, owner retaining everything including `admin.permissions.delegate`, and Laboratory + Academy explicitly deferred.

3.2 Post-12 work became necessary because the authorization layer was now correct, but the operational state layer (where horses are, what stays they belong to, what their next movement is, whether they are billable, and whether the UI agreed with the database) still suffered drift and labeling confusion. Several frontend surfaces were also reading from non-query-backed sources, producing stale views even when the database was correct.

3.3 New work built directly on Documentation 12: every new RLS policy in the May-13 hardening batch and every new write path in the H5 series uses `has_permission()` rather than legacy helpers, consistent with the Documentation 12 vocabulary.

3.4 Documentation 12 deferrals revisited:

- Laboratory — addressed and closed in Arc A.
- Academy permission enforcement — still deferred (residual).
- Read-policy review beyond membership scoping — partially addressed in the May-13 hardening batch; broader review remains a future phase.

---

4. Arc A — Laboratory Closure

(Substance preserved from `docs/Documentation_13_-_Laboratory_Workstream_Closure.md`, integrated here.)

4.1 Phase 5.2.2-Hotfix — template-authoritative result flow. Result entry is anchored to the published template version captured at submission, eliminating drift when templates are later edited.

4.2 Phase 7 — DB-level eligibility and publication gates:

- Eligibility trigger ensures only `Reviewed` results can transition to `Final/Published`.
- Publication gate prevents republishing once a result is finalized except via an explicit `Amend` flow.
- Duplicate prevention: partial unique indexes on the submission/request/result triple guarantee one active result row per request.

4.3 Phase 8 — closure pass:

- Unified progress tracking via `vw_lab_result_progress` (Draft → Reviewed → Final counts per submission).
- i18n and UI polishing on submission detail, request rows, and result cards.
- Lab-mode UI isolation reinforced: lab-mode routes never resolve into stable-mode services (per the Laboratory UI Isolation memory).

4.4 Migration artifacts (Lab arc) include the trigger functions for eligibility/publication, the partial-unique-index migrations, and the `vw_lab_result_progress` view migration. Exact filenames are listed in §15.

4.5 Final residuals in the Laboratory arc:

- Lab navigation polish items tracked separately.
- B2B snapshot contract evolution (out of scope for this period).

4.6 The Laboratory roadmap is closed for the Phase 5.2.2 → 8 scope; further work would be feature evolution, not closure.

---

5. Arc B — Notification Governance and Control Foundation

5.1 Personal notification control center foundation: per-user preferences keyed by notification family (e.g. boarding, finance, lab, movement), surfaced in `DashboardNotificationSettings.tsx` and consumed via `useNotificationPreferences`.

5.2 Tenant-side governance schema: per-tenant policy table allowing leadership to enable/disable families globally, consumed via `useTenantNotificationGovernance` and surfaced in `DashboardNotificationGovernance.tsx`.

5.3 Preset/per-family preferences: presets centralized in `src/lib/notifications/presets.ts`; family registry in `src/lib/notifications/familyRegistry.ts`; routing in `src/lib/notifications/routeDescriptor.ts`; deduplication helpers in `src/lib/notifications/helpers.ts`.

5.4 Dashboard state: governance dashboard scaffolding shipped; UX polish is an open residual (filtering, bulk toggles, audit view).

5.5 Migrations: notification preference and governance tables added in this period (exact migration filenames in §15; not verified in this document if not separately confirmed against `supabase/migrations/`).

5.6 Status: foundation closed; dashboard UX polish deferred (non-blocker).

---

6. Arc C — Arrivals & Departures State Contract and Housing / Admissions / Movement Coherence

6.1 Original problems:

- Inconsistent branch visibility on Arrivals & Departures; the branch selector did not actually scope the lists.
- Stale horse locations shown in Horse File / Horse Profile due to non-query-backed sources.
- Admission, occupant, and `horses` rows drifted apart.
- Movement cards labeled same-branch unit operations as generic “transfers.”
- Transfer vs Departure copy was ambiguous.
- The Record Movement dialog allowed contradictory selections.
- “View Admission” from a movement detail did not always resolve.
- Arabic UI showed raw English system reasons / internal notes.

6.2 The pass progressed through AD-1 (Arrivals & Departures branch scoping), then H1 → H5-F (Housing / lifecycle / movement / data).

6.3 H1 — Horse File / Horse Profile freshness.

- New `useHorseFile` hook with a single canonical query key.
- Cache invalidation paths added in `useHousingInvalidation`, movement mutations, and admission mutations.
- Single-horse freshness contract: any write touching a horse’s housing/admission/movement must invalidate that horse’s file query.

6.4 H2 — Lifecycle view correctness.

- Introduced `vw_horse_lifecycle_state` as the derived operational truth source. Fields:

  - `needs_admission` — physically present but no open `boarding_admissions` row.
  - `needs_placement` — admitted but no active `housing_unit_occupants` row.
  - `is_housed` — admitted and currently occupying a unit.
  - `is_departed` — last movement is an outgoing departure.
  - `is_in_transit` — outgoing movement dispatched but not yet completed.
  - `next_scheduled_movement` — next non-completed movement, if any.

- Frontend mapping via `useHorseLifecycleStates`, consumed by `MovementCard`, `MovementDetailSheet`, `MovementsList`, and Housing surfaces.
- Fallback label: “Not Currently Housed / غير مسكّن حاليًا.”

6.5 H3 and H3.1 — Movement classification and copy.

- Shared classifier `src/components/movement/movementClassification.ts` (`classifyMovement`).
- New labels: Inter-Branch Transfer / نقل بين الفروع, Housing Unit Assignment / تعيين وحدة سكن, Housing Unit Reassignment / إعادة تعيين وحدة سكن.
- `RecordMovementDialog` copy and helper text rewritten to disambiguate Departure vs Transfer.
- The “Departure → internal” toggle was removed; internal reassignments are now a distinct subtype.
- Same-branch transfer guard added.
- `HousingSelector` stale state fix.
- Localized system reasons / internal notes via `src/components/movement/movementReasonDisplay.ts` (only known system strings translated; free-text passes through verbatim).
- Tailored Movement Detail layout per classification.
- “View Admission” wired through `linkedAdmissionId`.

6.6 H4-A — Drawer and gating cleanup.

- Removed raw `reason.includes(...)` admission checks; admission drawer eligibility is gated through `classifyMovement` only.
- Direct vs heuristic admission link UX: `linkedAdmissionSource` of `'direct'` (FK reverse-lookup) or `'heuristic'` (±24h fallback) is exposed to the detail sheet so the UI can hint when the link is inferred.
- Drawer-over-drawer cleanup: closing the parent Movement Detail sheet now also dismisses any nested Admission Detail drawer (`MovementsList.tsx` `useEffect` on `selectedMovement`).
- Post-execution verification performed in code and via DB sampling.

6.7 H5 — Coherence completion.

- H5-A — repair preview (read-only; identified the rows H5-B would touch).
- H5-B — bounded data repair: `horses` row repairs, `housing_unit_occupants` inserts, `horse_movements.completed_at` backfill. Rows excluded from H5-B were enumerated in the H5-B audit.
- H5-C-A — FK-first movement-admission lookup. `MovementsList.tsx` first queries `boarding_admissions` by `checkin_movement_id` / `checkout_movement_id`; only on miss does it fall back to the H3.1 ±24h heuristic. The source is reported up to the UI as `'direct'` or `'heuristic'`.
- H5-C-B — partial unique indexes on `boarding_admissions.checkin_movement_id` and `boarding_admissions.checkout_movement_id` (filtered to non-null), enforcing a 1:1 movement↔admission binding at the database level.
- H5-D — financial checkout gate (see Arc D) and i18n micro-fix (`checkout_pending`, `checked_out`, `fullMonth`, `segmentsBreakdown`).
- H5-F — narrow two-tenant demo-data normalization for Basha (EN tenant — Al Qemmah Stud), Fatin (AR tenant — اسطبل القمة), Maha (AR tenant — اسطبل القمة). Documented in §14.

6.8 Manual operational resolutions:

- ALI — stale scheduled movement resolved manually through the UI; no SQL was used.
- Suni — checkout completed manually after invoice creation and override; SQL status update was rejected on principle (see Arc D).
- Basha / Fatin / Maha — normalized within the H5-F scope only.

6.9 Final source-of-truth model:

- `horses` — current branch / area / unit fields are the displayed current location.
- `boarding_admissions` — the active stay and commercial anchor; one open row per horse per stay.
- `housing_unit_occupants` — the active physical occupancy row.
- `horse_movements` — movement audit and history.
- `vw_horse_lifecycle_state` — derived operational truth (the panels read from here).
- `boarding_admissions.checkin_movement_id` / `checkout_movement_id` — durable movement↔admission linkage.

6.10 The canonical placement RPC is `record_horse_movement_with_housing` (20 arguments after this period’s standardization), returning a JSONB envelope with the new movement id and admission delta.

6.11 Closure scope. Arc C is closed for the named coherence issues (lifecycle visibility, movement labeling, movement-admission linkage, drawer behavior, branch-scoped Arrivals & Departures, classifier-driven gating, financial gate clarity). It is not a claim that all latent demo-data drift across all tenants has been repaired — see Arc G and §18.

---

7. Arc D — Financial Checkout Gate and Operational Finance Clarity

7.1 The Suni case revealed that `checkout_pending` admissions could be advanced to `checked_out` in two incompatible ways: through the UI (which honored the financial gate) or via raw SQL (which did not). The operational decision was to refuse SQL bypass.

7.2 The financial gate model (`src/hooks/housing/useFinancialGate.ts`):

- `admissionBalance` — outstanding balance scoped to the admission.
- `clientBalance` — client-wide ledger balance.
- `outstandingAmount` — `max(admissionBalance, clientBalance)` (clamped at zero).
- `unbilledValue` / `hasUnbilled` — accrued boarding value not yet invoiced.
- `canProceed` — no outstanding and no unbilled.
- `needsOverride` — outstanding present and user holds `boarding.checkout.override_balance` (or is owner).
- `isBlocked` — outstanding present and user lacks override.

7.3 H5-D i18n micro-fix added/clarified: `checkout_pending`, `checked_out`, `fullMonth`, `segmentsBreakdown`.

7.4 Suni resolution path (manual, UI-driven):

- Generate invoice for the unbilled accrual.
- Apply override (with permission) to clear gate.
- Complete checkout through the canonical RPC, which writes `balance_cleared` and stamps `admission_checks.checkout_balance_override` for audit.

7.5 Approval path uses the single source of truth `src/lib/finance/approveInvoice.ts` (status update + idempotent ledger posting; zero-charge invoices skip ledger but remain audit records).

7.6 Finance hardening residuals (non-blocking):

- Override audit table / notification — recommended.
- Standard ledger note when override fires — recommended.
- Policy decision: should override coexist with “must-invoice-first,” or replace it? — open.

---

8. Arc E — Security Hardening Sweep (13/05/2026)

8.1 The May-13 batch tightened RLS across multiple domains. Implementation is complete; a fresh `supabase--linter` rerun remains a recommended verification residual and was not executed within this documentation pass.

8.2 Domains touched:

- `tenants` — removed public exposure of private columns (private columns no longer readable through anon-friendly select policies).
- `follows` — tightened to authenticated, owning user.
- `app_settings` — restricted to authorized roles.
- `products`, `warehouses`, `stock_levels` — inventory domain switched to `has_permission()`-gated writes and tenant-scoped reads.
- `horse_care_notes` — updates restricted to the authoring user with the appropriate permission.
- Realtime publication membership reviewed for the affected tables.

8.3 Verification:

- Code-level review of new policies — done.
- Linter rerun — not verified within this period; recommended as the next step (§18).

8.4 Wording principle observed: Security hardening implementation is closed; a fresh security linter rerun remains a recommended verification residual.

8.5 Pre-existing linter warnings outside the May-13 scope are not attributed to this batch.

---

9. Arc F — i18n and Bilingual Terminology

9.1 Stabilized terms (EN / AR):

- Housing Tasks / مهام الإيواء
- Open Admission Required / يحتاج فتح ملف إيواء
- Needs Stall Assignment / يحتاج تعيين وحدة سكن
- Assign Housing Unit / تعيين وحدة سكن
- Inter-Branch Transfer / نقل بين الفروع
- Housing Unit Assignment / تعيين وحدة سكن
- Housing Unit Reassignment / إعادة تعيين وحدة سكن
- Not Currently Housed / غير مسكّن حاليًا
- Departed / مغادر
- Checkout pending / Checked out (with localized keys `checkout_pending`, `checked_out`)
- Billing breakdown / Full month (`segmentsBreakdown`, `fullMonth`)
- Translated movement reasons and internal notes via `formatMovementReason` / `formatMovementInternalNote` (only known system strings; free text untouched).

9.2 Rejected wording: generic Arabic “الحصان” in movement/housing copy where the established convention uses “الخيل.” Existing surfaces conform.

9.3 Bilingual naming rules (stacked `<BilingualName />` for identity lists, English placeholders in English inputs even in AR mode) remained intact and were not regressed by this period’s changes.

---

10. Arc G — Data Repair and Demo-Data Policy

10.1 Categories used in this arc:

- Deterministic repair — only when the correct value was unambiguous from related rows.
- Conservative repair — when a safe default (e.g. clearing an invalid unit reference) was preferable to guessing.
- Mock/demo normalization — limited to named horses inside named tenants.
- Manual UI resolution — performed through the application by the user.
- Intentionally excluded — rows the user wanted preserved as-is for later review.

10.2 H5-B (bounded repair). Touched:

- `horses` rows where stored branch/area/unit disagreed with the active occupant row;
- inserts into `housing_unit_occupants` where an admitted horse had no active occupant;
- `horse_movements.completed_at` backfill where the status was `completed` but the timestamp was null.

Exact row counts and excluded rows are recorded in the H5-B audit attached to that execution.

10.3 H5-F (narrow two-tenant normalization). Two intentionally separate tenants:

- EN tenant — Al Qemmah Stud — Basha: branch aligned to Broodmare Stude; status moved from `intake_draft` to `active`. Final state: Basha appears as Needs Stall Assignment in Broodmare.
- AR tenant — اسطبل القمة — Fatin: invalid `housing_unit_id` cleared; `current_location_id` set to Riyadh. Final state: Fatin appears as Needs Stall Assignment in Riyadh.
- AR tenant — اسطبل القمة — Maha: placed into unit R-A6 via `record_horse_movement_with_housing` under the AR tenant owner’s auth context. Final state: Maha is housed in R-A6.

10.4 Broad demo-data normalization beyond Basha/Fatin/Maha was intentionally deferred at the user’s explicit request, because some mock-data issues are to be preserved for later review. This is a deliberate policy choice, not an oversight.

---

11. Migration and Artifact Summary

The following table lists verified categories of artifact changes during the period. Specific migration filenames are accurate where listed; entries marked not verified indicate the category is real but the exact filename was not separately confirmed in this documentation pass.

| Date / Identifier | Workstream | Object | Purpose | Risk | Final result |
|---|---|---|---|---|---|
| Phase 5.2.2-Hotfix | Lab (Arc A) | Result entry trigger / template snapshot binding | Template-authoritative results | Low | Closed |
| Phase 7 | Lab (Arc A) | Eligibility + publication triggers; partial unique indexes on results | DB-level result lifecycle gates | Low | Closed |
| Phase 8 | Lab (Arc A) | View `vw_lab_result_progress`; i18n/UI polish | Unified progress tracking | Low | Closed |
| Notification preferences | Notif (Arc B) | New tables, presets registry | Personal control center | Low | Foundation closed |
| Notification governance | Notif (Arc B) | Tenant-policy table; dashboard scaffolding | Tenant-level governance | Low | Foundation closed; UX polish deferred |
| Lifecycle view | Housing/Movement (Arc C) | `vw_horse_lifecycle_state` | Derived operational truth | Low | Closed |
| Movement taxonomy | Movement (Arc C) | `movement_subtype` standardization | Disambiguate subtypes | Low | Closed |
| Movement RPC | Movement (Arc C) | `record_horse_movement_with_housing` (20 args) | Canonical placement contract | Medium | Closed |
| H5-C-B indexes | Movement↔Admission (Arc C) | Partial unique indexes on `boarding_admissions.checkin_movement_id` / `checkout_movement_id` | Enforce 1:1 link | Low | Closed |
| H5-B | Data repair (Arc G) | `horses`, `housing_unit_occupants`, `horse_movements` | Bounded coherence repair | Medium | Closed for the bounded scope |
| H5-D | Finance + i18n (Arc D/F) | i18n keys; gate copy | Checkout clarity | Low | Closed |
| H5-F | Narrow data normalization (Arc G) | `horses`, `boarding_admissions`; one RPC call | Three named horses, two named tenants | Low | Closed for named scope |
| 2026-05-13 hardening batch | Security (Arc E) | RLS on `tenants`, `follows`, `app_settings`, inventory tables, `horse_care_notes` | Tighten exposure | Medium | Implementation closed; linter rerun deferred |
| Frontend pass (`MovementsList.tsx`, `MovementCard`, `MovementDetailSheet`, `RecordMovementDialog`, `HousingSelector`, `useHorseFile`, `useHorseLifecycleStates`, `useFinancialGate`, `movementClassification`, `movementReasonDisplay`, `approveInvoice`) | Arc C/D | Frontend only | Coherence and gate enforcement | Low | Closed |
| i18n pass | Arc F | i18n keys (EN/AR) | Terminology stabilization | Low | Closed |
| Manual UI actions | Operational | ALI stale movement; Suni checkout | None (no schema change) | None | Resolved |

Specific migration filenames for the Lab triggers/views, notification tables, lifecycle view, RPC update, partial indexes, and security hardening live under `supabase/migrations/` between 2026-04-04 and 2026-05-13. Where filename precision matters for an audit, treat the filenames as to be re-verified against that directory at persistence time.

---

12. Verification and Audit History

| Workstream | Investigative audit | Execution | Post-execution audit | Manual verification | Final pass/fail |
|---|---|---|---|---|---|
| Laboratory (Arc A) | Yes | Yes | Yes (DB-audited) | User-verified | Pass |
| Notification governance (Arc B) | Yes | Yes (foundation) | Code-audited | User-verified (foundation) | Pass for foundation |
| Lifecycle view / H2 | Yes | Yes | DB-audited | User-verified | Pass |
| Movement taxonomy + classifier / H3, H3.1 | Yes | Yes | Code-audited | User-verified | Pass |
| Drawer/gating cleanup / H4-A | Yes | Yes | Code-audited | User-verified | Pass |
| H5-A preview | Yes (read-only) | n/a | n/a | n/a | Pass |
| H5-B repair | Yes | Yes | DB-audited (row counts) | User-verified | Pass for bounded scope |
| H5-C-A FK-first lookup | Yes | Yes | Code-audited | User-verified | Pass |
| H5-C-B indexes | Yes | Yes | DB-audited | Inferred | Pass |
| H5-D financial gate + i18n | Yes | Yes | Code-audited | User-verified (Suni) | Pass |
| H5-F narrow normalization | Yes (H5-F.1 scope clarification) | Yes | DB-audited; user re-confirmed lifecycle states | User-verified | Pass for named scope |
| Security hardening (Arc E) | Yes | Yes | Code-audited | Linter rerun not verified | Implementation pass; verification residual |
| TypeScript/build checks | n/a | Performed automatically by harness during edits | n/a | n/a | Pass |

---

13. Workstream Closure Table

| Workstream | Status | Closure evidence | Residuals | Blocker |
|---|---|---|---|---|
| Laboratory | Closed | Triggers, indexes, view, UI polish | None for the 5.2.2 → 8 scope | No |
| Notification governance | Foundation closed | Tables + dashboard scaffolding | UX polish | No |
| Personal notification control center | Foundation closed | Preferences + presets | UX polish | No |
| Arrivals & Departures / Housing / Admissions / Movement coherence | Closed for named issues | View, classifier, indexes, FK-first lookup, copy | Broader demo drift | No |
| Lifecycle view | Closed | `vw_horse_lifecycle_state` shipped and consumed | None | No |
| Movement taxonomy | Closed | Standardized `movement_subtype` + classifier | Legacy `unspecified` backfill (if still relevant) | No |
| Movement-admission linking | Closed | `checkin_movement_id`/`checkout_movement_id` + partial unique indexes + FK-first lookup | None | No |
| Financial checkout gate | Closed | `useFinancialGate` + override + i18n keys | Override audit/notification | No |
| Security hardening | Implementation closed | May-13 RLS batch | Fresh linter rerun | No |
| H5 data repair | Closed for bounded scope | H5-B audit | Broader cleanup | No |
| H5-F narrow normalization | Closed for named scope | Three horses, two tenants verified | Broader cleanup | No |
| Academy enforcement | Deferred | n/a | Migrate to `has_permission()` writes | No |
| Client portal architecture | Deferred | n/a | Future phase | No |
| Legacy demo-data cleanup beyond named horses | Intentionally deferred | n/a | Per user policy | No |

---

14. Residuals and Deferred Items Table

| Residual item | Class | Blocker | Recommended future phase |
|---|---|---|---|
| Notification governance dashboard polish | UX | No | Next UX iteration |
| Personal notification control center UX polish | UX | No | Next UX iteration |
| Academy permission enforcement | Authorization | No | Documentation 14 candidate |
| Fresh `supabase--linter` rerun | Security verification | No | Immediate next step |
| Legacy `movement_subtype='unspecified'` backfill | Data hygiene | No | Backfill pass |
| Broad demo-data normalization beyond Basha/Fatin/Maha | Data hygiene | No | Only on user request |
| Finance override hardening (audit table, notification, ledger note) | Finance/security | No | Finance hardening pass |
| Client portal architecture | Architecture | No | Dedicated workstream |
| Remaining Laboratory debt (B2B contract evolution, nav polish) | Feature | No | Lab feature phase |
| Pre-existing security linter warnings | Security | No (not introduced by May-13 batch) | Linter rerun + triage |

Non-blocking residuals are explicitly not blockers; they are tracked for visibility.

---

15. Final Platform State as of 14/05/2026

15.1 More trustworthy than at Documentation 12:

- A horse’s operational state is now derived from a single view (`vw_horse_lifecycle_state`) rather than reconstructed in the UI.
- Movement labels and gating reflect actual subtype, not free-text reasons.
- Movement↔admission linkage is enforced at the DB level and used FK-first in the UI.
- Checkout cannot be advanced past unpaid balances or unbilled accrual without an explicit, permissioned override.
- Public exposure of private tenant columns and over-permissive inventory/care-notes RLS have been closed.
- Bilingual operational vocabulary is stable.
- Three demo horses across two tenants have been brought into a known-clean state for demo purposes.

15.2 Intentionally deferred:

- Broader demo-data normalization (per user policy).
- Academy permission migration.
- Notification dashboard UX polish.
- Finance override audit hardening.
- Fresh security linter rerun.
- Client portal architecture.

15.3 The platform is ready to continue to the next planned workstream.

15.4 Recommended next step: run `supabase--linter`, triage any new findings against the May-13 batch, and proceed to either (a) Academy enforcement migration in the Documentation 12 vocabulary, or (b) finance override hardening — whichever the user chooses.

15.5 Closure language used throughout this document follows the requested discipline: closed for the scoped issues where scope was limited; deferred where work was intentionally not done; not verified where verification was not performed.

---

16. Confirmation

16.1 No code, data, schema, migrations, RPCs, RLS, triggers, indexes, frontend code, i18n files, or documentation files were modified by this investigative documentation refinement. This artifact is text only and is not persisted to disk in this turn.

Awaiting your explicit go-ahead to persist this as the official `docs/Documentation_13...md` (and to retire the Laboratory-only draft) in a separate execution prompt.
```
