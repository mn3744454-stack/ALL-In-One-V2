# Documentation 13 — Laboratory Workstream Closure: Atomic Intake Hotfix, Results Coherence Maturation, and Final Polish

## 1. Document Identity

1.1 This artifact is the next formal documentation in sequence after Documentation 12.
1.2 It is designated **Documentation 13**.
1.3 Proposed full formal title: **"Documentation 13 — Laboratory Workstream Closure: Atomic Intake Hotfix, Results Coherence Maturation, and Final Polish (Phases 5.2.2-Hotfix → 7 → 8)"**.
1.4 The title is inferred from the actual dominant substance of the post-Doc-12 period: a single connected closure arc on the Laboratory side that began with a corrective hotfix to template-level intake for atomic services, matured into the full Results Coherence phase, and ended with a surgical polish-and-hardening pass.
1.5 No generic placeholder title is used.

## 2. Documentation Scope

2.1 Scope begins immediately after the **Documentation 12** baseline (Backend Permission Enforcement Migration closure).
2.2 Scope ends at the present state of the platform — Phase 8 Patches A–F closed, build/type check verified clean.
2.3 The scope covers all meaningful work in that period as discovered from migrations, hooks, components, and completed system behavior.
2.4 The period contains a single dominant connected workstream (Laboratory closure) split into four sequential sub-stages; this is honestly reflected rather than artificially fragmented.

## 3. Executive Summary

3.1 The post-Documentation-12 period is dominated by the closure of the Laboratory architecture roadmap.
3.2 Four sequential sub-stages were executed:
3.2.1 **WS-A** — Phase 5.2.2 Atomic-Service Corrective Hotfix.
3.2.2 **WS-B** — Phase 7 Results Coherence initial execution (Patches A, B, D, F).
3.2.3 **WS-C** — Phase 7 Continuation (Patches C, E + first end-to-end build verification).
3.2.4 **WS-D** — Phase 8 Polish & Edge Cases (P8-A through P8-F).
3.3 Net outcome: Results are now strictly **template-authoritative**, gated end-to-end by DB triggers (`validate_lab_result_eligibility`, `validate_lab_result_publish`) and a unique-partial index on `(template_id, sample_id)`. A new derivation view `vw_lab_result_progress` and two new hooks (`useRequestResultProgress`, `useSubmissionResultProgress`) feed coherent Lab-side and Stable-side surfaces. Legacy `result_url` is demoted to a deprecation-aware reference. Client-side affordances are aligned with database authority. No outward Stable summary states were expanded.
3.4 Closure level: **Laboratory roadmap (Phases 5–8) formally closed — high confidence.**

## 4. Baseline Continuation Definition

4.1 The authoritative starting point is **Documentation 12 — Backend Permission Enforcement Migration**, which closed the platform-wide RLS/granular permission enforcement workstream and left the Laboratory module in the state described by Phase 5.2.2 initial execution (composite-service template-decision authority working, atomic-service template-less services partially undecidable).
4.2 No other module had material architectural change in the covered period; Finance, Stable, Breeding, Doctor, HR, Connections, and Identity systems remained in their Documentation-11/12 states. Doc 13 is therefore intentionally Laboratory-scoped.

## 5. Initial Post-Baseline Discovery

5.1 First investigative pass after Documentation 12 confirmed:
5.1.1 Composite services with linked templates flowed cleanly through the new template-decision pipeline.
5.1.2 Atomic services with no linked templates failed to expand into the decision pipeline silently — mutations on such rows succeeded without producing a decidable record.
5.1.3 The Results layer (`lab_results`, `useLabResults`, `CreateResultDialog`, `ResultsList`, `ResultCard`, `PublishToStableAction`, `useStableLabResults`, `StableResultsView`) had a correct internal lifecycle (`draft → reviewed → final`) and a correct `published_to_stable` separation, but had no foreign-key tie to the new template-decision authority and no DB-level eligibility/publication gates.
5.1.4 A legacy `result_url` field on `lab_requests` continued to surface a competing "View Result" affordance, undermining the structured results pipeline.
5.1.5 No per-request "Results owed" workflow surface existed for Lab operators; no per-template publication visibility existed for Stable users.

## 6. Chronological Timeline

6.1 **Stage 1 — Atomic-Hotfix Investigation:** Audit confirms atomic template-less expansion failure and silent-success mutation pattern.
6.2 **Stage 2 — Atomic-Hotfix Execution (WS-A):** Expansion fallback updated; orphan rows backfilled; mutation safety added.
6.3 **Stage 3 — Phase 7 Investigative Audit (Round 1, focused):** Identifies the four core gaps — FK linkage, eligibility gate, publish-final gate, completion derivation.
6.4 **Stage 4 — Phase 7 Investigative Audit (Round 2, expanded):** Adds duplicate prevention, legacy `result_url` deprecation, Lab "results owed" workflow, Stable per-template visibility, i18n.
6.5 **Stage 5 — Phase 7 Initial Execution (WS-B):** Patches A (schema/gates/view), B (hooks), D (Stable reflection), F (i18n) land. Patches C (Lab workflow UI) and E (sample-template alignment) intentionally deferred.
6.6 **Stage 6 — Phase 7 Continuation (WS-C):** Patch C remainder (per-request progress chip on `LabSubmissionCard`, prefilled `CreateResultDialog` from `ResultsOwedPanel`) and Patch E (sample-template population filtered to accepted templates) executed; first full end-to-end build/type verification passes.
6.7 **Stage 7 — Phase 8 Investigative Audit:** Final broad-but-disciplined audit identifies six surgical polish items.
6.8 **Stage 8 — Phase 8 Execution (WS-D):** P8-A through P8-F executed; final `npx tsc --noEmit` confirmed clean.

## 7. Workstream Map

7.1 **WS-A** — Phase 5.2.2 Atomic-Service Corrective Hotfix · *corrective/iterative*.
7.2 **WS-B** — Phase 7 Results Coherence Initial Execution · *execution-heavy + cross-module*.
7.3 **WS-C** — Phase 7 Continuation · *execution + workflow maturation*.
7.4 **WS-D** — Phase 8 Polish & Edge Cases · *closure/polish*.
7.5 These four stages form one connected closure arc; each was gated by its own formal investigative audit before execution.

## 8. Workstream Lifecycle — WS-A · Phase 5.2.2 Atomic-Service Corrective Hotfix

8.1 **What it was:** A corrective slice closing an undecidable-intake gap for atomic services without linked templates.
8.2 **Trigger:** Investigative audit confirmed atomic services failed to expand into the template-decision pipeline because expansion required at least one template row to exist.
8.3 **Discovery:** Orphan atomic rows existed in production; mutations on such rows succeeded silently and produced no decidable authoritative record.
8.4 **Architectural meaning:** Template-level authority must include a synthesized atomic fallback so all accepted services — composite or atomic, template-bearing or not — share one decidable path.
8.5 **Execution:** Expansion fallback updated to synthesize a NULL-template authoritative row for atomic template-less services; orphan rows backfilled; zero-row mutation safety added so silent-success failures became loud and recoverable.
8.6 **Schema impact:** Backfill operations only; no structural change to authoritative tables.
8.7 **Workflow impact:** Atomic-service intake decisions now flow through the same authoritative path as composite-service template decisions; no atomic-only side path remains.
8.8 **UI impact:** None visible — surface affordances remained unchanged; only the underlying decidability changed.
8.9 **Initial failure / corrective cycles:** None required after the hotfix landed.
8.10 **Final state:** Atomic template-less services became decidable; silent-success mutation pattern eliminated.
8.11 **Closure level:** **Closed — high confidence.**

## 9. Workstream Lifecycle — WS-B · Phase 7 Initial Execution (Patches A, B, D, F)

9.1 **What it was:** The architectural coherence layer connecting the existing Results layer to the now-mature template-decision intake authority.
9.2 **Trigger:** Two consecutive investigative audits (focused, then expanded) confirmed the Results layer needed coherence layering — not redesign — to consume the Phase 5.2.2 truth.
9.3 **Discovery:**
9.3.1 Schema was approximately 80% in place; only the FK to `lab_request_service_templates`, eligibility/publish triggers, duplicate-prevention index, and a derivation view were missing.
9.3.2 Existing UI bones — particularly the 5-step `CreateResultDialog` wizard and the `published_to_stable` separation — were strong and worth preserving.
9.3.3 Outward Stable summary states did **not** require expansion; intake-derived states remained authoritative.
9.4 **Architectural meaning:** Results are template-authoritative; service/request/submission completeness must be derived; publication unit is per-template; legacy `result_url` is no longer an authoritative path.
9.5 **Execution — Patch A (Schema & Gates):**
9.5.1 Added `lab_results.lab_request_service_template_id` FK (nullable for backfill safety).
9.5.2 Added a unique partial index on `(template_id, sample_id)` to forbid duplicate per-template results.
9.5.3 Created the `validate_lab_result_eligibility` trigger requiring `template_decision='accepted'`.
9.5.4 Created the `validate_lab_result_publish` trigger requiring `status='final'` for `published_to_stable=true`.
9.5.5 Created the `vw_lab_result_progress` view aggregating per service / request / submission.
9.5.6 Backfilled FK for the existing 26 results.
9.6 **Execution — Patch B (Hooks):**
9.6.1 Extended `useLabResults` to expose the new FK.
9.6.2 Added `useRequestResultProgress(requestId)` and `useSubmissionResultProgress(submissionId)` returning a typed `TemplateResultState` (`no_result | draft | reviewed | final | published | refused | pending_decision`).
9.6.3 `createResult` resolves and stores the FK and surfaces eligibility errors.
9.6.4 `publishToStable` enforces `status='final'`.
9.6.5 Added `publishAllFinalForRequest` fan-out helper while keeping per-result publication authoritative.
9.7 **Execution — Patch D (Stable Reflection):**
9.7.1 New `StableTemplateProgressList` component renders per-template publish-status pills (Published / Pending / Refused at intake) inside Stable-mode `RequestDetailDialog`, scoped under each accepted service.
9.7.2 No new outward summary states added.
9.8 **Execution — Patch F (i18n):** EN/AR added for "Needs result", "X of Y published", "Cannot publish: not final", "Cannot create result: template not accepted", "Publish all final", "Refused at intake", and per-template pills.
9.9 **Initial insufficiency:** Patch C (Lab workflow UI) and Patch E (sample-template alignment) intentionally deferred to a continuation slice; final build/type check not yet performed.
9.10 **Corrective follow-up:** Tracked into WS-C, not abandoned.
9.11 **Final result:** Architectural gap closed; only workflow-UI completion and verification remained.
9.12 **Closure level:** **Phase 7 partially closed at end of WS-B — bounded and tracked.**

## 10. Workstream Lifecycle — WS-C · Phase 7 Continuation (Patches C, E + Verification)

10.1 **What it was:** The completion slice for the deferred Phase 7 surface items plus first end-to-end build verification.
10.2 **Trigger:** Continuation prompt explicitly to close Patch C remainder and Patch E.
10.3 **Discovery:** No additional architectural surprises; surface-level completion only.
10.4 **Architectural meaning:** Sample-template population must be filtered by accepted intake truth so result eligibility is enforced before the operator reaches the gate.
10.5 **Execution — Patch C remainder:**
10.5.1 Added a per-request results progress chip on `LabSubmissionCard` driven by `useRequestResultProgress` (truthful "X of Y published", not local counting).
10.5.2 Extended `CreateResultDialog` with `preselectedTemplateId` and `preselectedRequestId` props.
10.5.3 Auto-resolves the matching sample and jumps directly to the "Enter Results" step when launched from `ResultsOwedPanel`.
10.5.4 `RequestDetailDialog` wires the prefilled creation flow.
10.6 **Execution — Patch E:**
10.6.1 `useLabSamples` create mutation filters `template_ids` against `lab_request_service_templates` where `template_decision='accepted'`.
10.6.2 `CreateSampleDialog` prefill logic excludes rejected and pending templates from the initial selection.
10.6.3 Sample/result completion truth aligned to the accepted-template denominator only.
10.7 **Initial failure / corrective cycles:** None.
10.8 **Verification:** Build/type check verified end-to-end across the full Phase 7 surface and confirmed clean.
10.9 **Final result:** Phase 7 fully closed.
10.10 **Closure level:** **Closed — high confidence.**

## 11. Workstream Lifecycle — WS-D · Phase 8 Polish & Edge Cases

11.1 **What it was:** The final surgical polish-and-hardening pass after architectural closure.
11.2 **Trigger:** Final broad-but-disciplined audit identified six remaining items: a publish-gate mismatch between client and DB, lingering `result_url` surfaces, a vocabulary leak in `ResultsList`, silent-null empty states, generic duplicate-insert error UX, and density issues inside `RequestDetailDialog`.
11.3 **Discovery:** No schema work needed; six surgical patches sufficient.
11.4 **Architectural meaning:** Confirms the platform reached a true polish stage — authoritative truth no longer needed adjustment, only its outward affordances.
11.5 **Execution — P8-A (Publish Gate & Duplicate UX):**
11.5.1 `PublishToStableAction.canPublishStatus` restricted to `status === 'final'` only, matching the DB trigger.
11.5.2 An explicit "reviewed but not final" tooltip variant added to prevent confusion.
11.5.3 `useLabResults.createResult` catches unique-index violations and returns "A result already exists for this template and sample".
11.6 **Execution — P8-B (Legacy `result_url` Deprecation Finalization):**
11.6.1 Removed the "View Result" hyperlink from `LabRequestsTab` cards.
11.6.2 Demoted `result_url` inside `RequestDetailDialog` to a small Lab-only "Legacy reference link" with a deprecation hint.
11.6.3 Hidden entirely on Stable surfaces.
11.6.4 Suppressed when structured `lab_results` exist for the request.
11.7 **Execution — P8-C (Vocabulary Fix):** Rebuilt `ResultsList.statusOptions` to use the `LabResultStatus` enum (`draft | reviewed | final`); removed sample-status leakage (e.g. `processing` meaning "reviewed", `completed` meaning "final").
11.8 **Execution — P8-D (Empty States):**
11.8.1 `ResultsOwedPanel`: "Make intake decisions to start authoring results" when `acceptedCount === 0`.
11.8.2 `StableTemplateProgressList`: "All tests refused — no results expected" hint instead of returning null.
11.9 **Execution — P8-E (Density Polish):** Section header above `ResultsOwedPanel`, tightened spacing, header styling (`font-semibold`, `tabular-nums`); reduced visual crowding where results panel + service breakdown + meta + legacy reference coexist.
11.10 **Execution — P8-F (Verification):** `npx tsc --noEmit` verified clean.
11.11 **Initial failure / corrective cycles:** None.
11.12 **Final result:** All polish items closed; legacy `result_url` no longer competes with the authoritative pipeline; client and DB gates aligned.
11.13 **Closure level:** **Closed — high confidence.**

## 12. Final Current-State Summary

12.1 **Materially stronger:**
12.1.1 Results are strictly template-authoritative, FK-bound to the accepted intake decision row.
12.1.2 DB-level triggers enforce eligibility (accepted only) and publication (final only).
12.1.3 A unique partial index forbids duplicate `(sample, template)` results.
12.1.4 `vw_lab_result_progress` provides a single derivation source for service/request/submission completeness.
12.1.5 Lab operators have an explicit "Results owed" workflow inside `RequestDetailDialog`, with per-template contextual actions and a wizard prefilled from intake context.
12.1.6 Stable users see per-template publish-status pills (Published / Pending / Refused at intake) inside request detail, plus per-request "X of Y published" chips on submission cards — without any new outward summary states.
12.1.7 Sample creation only accepts accepted templates; rejected/pending templates are no longer legitimate result targets at any layer.
12.1.8 Vocabulary leaks, silent empty states, misleading publish affordances, raw duplicate-insert errors, and competing legacy paths have all been resolved.
12.2 **Operationally trustworthy:**
12.2.1 Client-side affordances are aligned with DB authority — no more buttons leading to raw trigger errors.
12.2.2 The 5-step `CreateResultDialog` wizard remains intact and now operates inside a properly scoped flow.
12.2.3 Stable mapped-summary philosophy preserved end-to-end.
12.3 **Genuinely closed:** Phases 5.2.2 (atomic-fallback included), 7, and 8 are formally closed.

## 13. Residual / Deferred / Future Items

13.1 **Acceptable retained items (non-blocking):**
13.1.1 Legacy `result_url` field retained at the schema/type level for read safety; not a competing authoritative path.
13.1.2 "Mark received" manual status path on `LabRequestsTab` retained as an operator override.
13.1.3 `lib/labStatus.ts` retains `result_url` in its `Pick<>` signature as harmless type debt.
13.2 **Future-only enhancement candidates (Phase 9+ territory, not gaps):**
13.2.1 Result printable / PDF redesign.
13.2.2 Result trending and historical comparison.
13.2.3 Cross-tenant amendment / unpublish workflows with Stable-side notification semantics.
13.2.4 Optional retirement of the `lib/labStatus.ts` legacy `result_url` field reference.
13.2.5 Optional review of the "Mark received" manual override pathway.
13.3 None of these block the closed state of Phases 5.2.2, 7, or 8.

## 14. Verification and Trustworthiness Notes

14.1 **High-confidence (verified directly from migrations, hooks, components, and i18n locales):** all schema additions (migrations `20260417190602`, `20260417190634`); trigger behavior (`validate_lab_result_eligibility`, `validate_lab_result_publish`); the unique partial index on `(template_id, sample_id)`; the `vw_lab_result_progress` view; hook contracts (`useRequestResultProgress`, `useSubmissionResultProgress`, extended `useLabResults`); prefilled creation flow in `CreateResultDialog`; Stable per-template visibility via `StableTemplateProgressList`; publish-gate alignment in `PublishToStableAction`; empty states; vocabulary fix in `ResultsList`; legacy `result_url` demotion in `RequestDetailDialog` and removal from `LabRequestsTab` cards.
14.2 **Medium-confidence (inferred from chronology of approved prompts and per-phase confirmations):** exact ordering within Patch B helper additions and the precise wording of every locale entry (verified-present but not enumerated exhaustively here).
14.3 **Not asserted:** any product behavior in modules outside the Laboratory closure arc — Documentation 13 deliberately does not extend coverage there because no other workstreams of comparable scope occurred in this period.
14.4 No closure exaggeration: deferred items in §13 are explicitly classified, not hidden.

## 15. Recommended Next Documentation Starting Point

15.1 Documentation 14 should begin from the present closed state and cover whichever workstream the platform turns to next.
15.2 If the next active period is Laboratory enhancement (printing, trending, amendments), Documentation 14 should be titled accordingly and treat Documentation 13 as its baseline.
15.3 If the next active period shifts to a different module (Finance, Stable, Breeding, Doctor, HR, Connections, Identity), Documentation 14 should mark the topical boundary explicitly so the archival chain remains coherent.
15.4 Documentation 13 is the authoritative reference for all post-Documentation-12 work in the Laboratory closure arc.
