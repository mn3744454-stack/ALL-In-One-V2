# WS-DH-2026-0012 — Local Prompt 01 · Correction Continuation C5
## Object-Level Accepted-Truth Classification and Count-Integrity Repair

## 1. Verdict

```text
WS-DH-2026-0012 LOCAL PROMPT 01-C5 OBJECT-LEVEL CLASSIFICATION
CORRECTION COMPLETE —
STORED MEMORY BODIES CLASSIFIED URI-BY-URI —
CORE RULES SEPARATELY CLASSIFIED —
COUNT INTEGRITY VERIFIED —
STAGE 4 SUBSTANTIVELY COMPLETE —
STAGES 0–4 READY FOR OWNER ALIGNMENT
```

## 2. C4 classification-unit error acknowledgement

C4 published an A–G table over a 99-body denominator but mixed counting units: one index Core rule was counted inside the body population, category G counted duplicate clusters rather than URIs, and categories A, E and F used grouped subjects with no URI membership ledger. The arithmetic balanced; the object-level assignment was not proven. C4 also wrote "re-confirmed live" for the movement-RPC arity while performing no code or database inspection.

## 3. Exact rejected finding

Rejected: "The C4 A–G count table proves a complete, mutually exclusive classification of all 99 stored Memory bodies, and therefore proves Stage 4 substantively complete."

Replaced by: "C4 identified accepted-truth sources and several material findings, but a complete object-level classification remained unproven until C5 published a URI-by-URI ledger with consistent counting units." No other Prompt-01, C1, C2, C3 or C4 finding is reopened.

## 4. Repository state

| Field | Value |
|---|---|
| Branch | `edit/edt-3fcffd28-b479-4355-aff7-2185763befb3` |
| HEAD | `a57e38c047e1564cb500bcb7bf9879b8f9ae1e28` |
| Parents | `8dc9ee3a7be30d01e2d97bba4e5aea4f30b9e335`, `c9f009a5388d9fefc5d9417e3893ef742a45bdf0` (merge commit) |
| Working tree before | clean (no modified tracked files) |
| Working tree after | `.lovable/plan.md` only (platform-managed report path) |

## 5. Population proof (P1 / P2)

| Measure | Count | Method |
|---|---|---|
| Files in accessible Memory store | 100 | enumeration of the mirrored corpus |
| `mem://index.md` | 1 | excluded from P1 |
| **P1 — stored Memory bodies** | **99** | 100 − index |
| P1 successfully read | 99 | all readable; 0 read failures |
| Index `mem://` references | 95 | unique URIs parsed from index |
| Index references that resolve | 91 | 95 − 4 dangling |
| Dangling index references | 4 | referenced, no stored body |
| Unindexed stored bodies (orphans) | 8 | stored, not referenced |
| Reconciliation | 91 + 8 = **99** | matches P1 |
| **P2 — index Core rules** | **9** | rendered inline in `mem://index.md`, no URI, never counted in P1 |

No drift: the current proven stored-body population is exactly 99, matching C1.

### Dangling index references (4)

- `mem://architecture/finance/doctor-billing-mismatch`
- `mem://domain/horses/pony-classification-logic`
- `mem://domain/stable/package-billing-cycles`
- `mem://features/stable/room-event-history-strategy`

### Unindexed stored bodies (8)

- `mem://architecture/stable/connected-transfer-lifecycle`
- `mem://features/breeding/connected-mode-status`
- `mem://features/breeding/safety-logic`
- `mem://features/horses/ownership-display`
- `mem://features/hr/payroll-quick-create-employee`
- `mem://features/stable/admission-pricing`
- `mem://style/arabic-terminology-standard`
- `mem://ux/date-time-standard`

## 6. Accepted sources inspected (source key)

| Key | Path |
|---|---|
| S1 | `docs/architecture/account-types-and-module-reality.md` |
| S2 | `docs/architecture/core-user-flows-and-operational-lifecycles.md` |
| S3 | `docs/architecture/cross-account-integrations-consent-and-shared-access.md` |
| S4 | `docs/architecture/account-types-and-identity-model.md` |
| S5 | `docs/architecture/commercial-plans-entitlements-platform-billing-and-monetization.md` |

## 7. Classification rule set (reproducible)

- **C** — the Memory's explicit claim conflicts with a located accepted statement.
- **B** — the subject is covered by accepted text, but the Memory asserts a number, guarantee or scope not present in that text.
- **A** — the Memory's substantive claim is directly attested by named accepted text at entity/model level.
- **D** — the Memory is superseded by later accepted truth. None proven in this run.
- **E** — presentation, wording, layout or terminology standard with no counterpart anywhere in the accepted corpus (`ux/*`, `localization/*`, `style/*`).
- **F** — behavioural or implementation-level claim whose accepted coverage exists only at entity level; adjudication requires live code/database verification, which is outside WS-DH-2026-0012.

## 8. P1 object ledger (99 rows)

| # | URI | Index | Read | Status | Accepted source | Src status | Reason | Materiality | Impl. verif. | Dup cluster | Finding | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | mem://architecture/connections/operational-partner-scoping | indexed | yes | A | S3 connection_horse_access | accepted | granular cross-tenant horse access attested | medium | no | DC-09 |  | strongly supported |
| 2 | mem://architecture/connections/unified-partner-management | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-09 |  | limited |
| 3 | mem://architecture/finance/billing-linkage-pattern | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 4 | mem://architecture/finance/event-driven-invoicing-pattern | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 5 | mem://architecture/finance/invoice-item-attribution | indexed | yes | A | S2; S5 invoice_items | accepted | line-level attribution attested | medium | no | NONE |  | strongly supported |
| 6 | mem://architecture/finance/tenant-currency-model | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 7 | mem://architecture/horses/unified-profile-architecture | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 8 | mem://architecture/identity/unified-people-model | indexed | yes | A | S1 hr_employees; S4 tenant_members | accepted | people bridge attested at entity level | medium | no | NONE |  | strongly supported |
| 9 | mem://architecture/invitations/invitation-scoping-standard | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-10 |  | limited |
| 10 | mem://architecture/invitations/unified-invitation-entry | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-10 |  | limited |
| 11 | mem://architecture/notification-system-standard | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 12 | mem://architecture/party-horse-relationship-model | indexed | yes | A | S1 §G backend objects (horse_owners) | accepted | junction/ownership model attested at entity level | medium | no | NONE |  | strongly supported |
| 13 | mem://architecture/platform-sharing-reference-pattern | indexed | yes | A | S3 sharing layers | accepted | connections/grants/RLS layering attested | medium | no | NONE |  | strongly supported |
| 14 | mem://architecture/shared-client-registry-and-identity | indexed | yes | A | S1/S3 shared clients | accepted | shared client registry attested | medium | no | NONE |  | strongly supported |
| 15 | mem://architecture/stable/boarding-period-tracking | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 16 | mem://architecture/stable/boarding-proration-engine | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 17 | mem://architecture/stable/boarding-stay-and-care-lifecycle | indexed | yes | A | S2 boarding lifecycle | accepted | stay lifecycle and contracts attested | medium | no | NONE |  | strongly supported |
| 18 | mem://architecture/stable/commercial-truth-hierarchy | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 19 | mem://architecture/stable/connected-transfer-lifecycle | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 20 | mem://architecture/stable/horse-registry-and-onboarding-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 21 | mem://architecture/stable/housing-admissions-unification-model | indexed | yes | A | S2 housing/admission lifecycle | accepted | boarding_admissions as admission truth attested | medium | no | NONE |  | strongly supported |
| 22 | mem://architecture/stable/housing-and-facility-management | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 23 | mem://architecture/stable/housing-lifecycle-model | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-01 |  | limited |
| 24 | mem://architecture/stable/housing-paddock-occupancy-model | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 25 | mem://architecture/stable/housing-room-setup-core | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-02 |  | limited |
| 26 | mem://architecture/stable/housing-type-aware-surfaces | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 27 | mem://architecture/stable/movement-rpc-contract-standard | indexed | yes | C | S2:212 and S1:250,415,751,1031 (20 params) | accepted | Memory asserts a 19-parameter authoritative signature; accepted record states 20 | high | yes | NONE | F-C5-01 | proven |
| 28 | mem://architecture/stable/provider-cost-integration | indexed | yes | A | S1/S2 supplier_payables | accepted | provider cost object attested | medium | no | NONE |  | strongly supported |
| 29 | mem://architecture/stable/service-package-model | indexed | yes | A | S1 §G; S2 services | accepted | tenant_services + stable_service_plans attested | medium | no | DC-03 |  | strongly supported |
| 30 | mem://architecture/stable/service-package-organization | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-03 |  | limited |
| 31 | mem://architecture/stable/unified-commercial-model | indexed | yes | A | S2 services/commercial flows | accepted | shared catalog linkage attested | medium | no | NONE |  | strongly supported |
| 32 | mem://architecture/stable/vet-medical-records-system | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 33 | mem://breeding/domain-architecture-standard | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 34 | mem://domain/breeding/terminology-standard | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 35 | mem://domain/horse-owner-tenant-isolation | indexed | yes | A | S4 account types | accepted | Horse Owner as real account type attested | medium | no | DC-07 |  | strongly supported |
| 36 | mem://domain/horses/breeding-eligibility-rules | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 37 | mem://domain/horses/classification-model | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-08 |  | limited |
| 38 | mem://domain/stable/housing-facility-taxonomy | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 39 | mem://domain/stable/package-types | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-03 |  | limited |
| 40 | mem://domain/stable/service-taxonomy | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-03 |  | limited |
| 41 | mem://features/breeding/connected-mode-status | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 42 | mem://features/breeding/reproduction-form-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 43 | mem://features/breeding/safety-logic | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 44 | mem://features/finance/client-statement-system | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 45 | mem://features/finance/consultation-and-lab-grounding | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 46 | mem://features/finance/credit-limit-enforcement | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 47 | mem://features/finance/invoice-package-consumption | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 48 | mem://features/finance/manual-invoice-management | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 49 | mem://features/horse-unification-strategy | indexed | yes | A | S2/S3 lab_horses + microchip | accepted | dual registry linked by microchip attested | medium | no | NONE |  | strongly supported |
| 50 | mem://features/horses/ownership-display | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 51 | mem://features/horses/quick-create-bridge-pattern | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-04 |  | limited |
| 52 | mem://features/horses/quick-create-minimal-mode | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-04 |  | limited |
| 53 | mem://features/hr/payroll-quick-create-employee | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 54 | mem://features/stable/admission-pricing | unindexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 55 | mem://features/stable/financial-traceability-system | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 56 | mem://features/stable/housing-orphan-repair-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 57 | mem://features/stable/housing-unit-and-numbering-setup | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-02 |  | limited |
| 58 | mem://features/stable/housing-unit-assignment-flows | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 59 | mem://features/stable/housing-unit-integrity-and-refresh | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 60 | mem://features/stable/housing-vacate-and-checkout-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 61 | mem://features/stable/housing-visibility-and-filtering | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-01 |  | limited |
| 62 | mem://features/stable/internal-cost-management | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 63 | mem://features/stable/movement-and-logistics | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 64 | mem://features/stable/provider-markup-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 65 | mem://features/stable/room-function-reclassification | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 66 | mem://features/stable/vaccination-and-health-management | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 67 | mem://features/stable/vet-treatment-and-medication-logic | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 68 | mem://features/team/team-partners-hub | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-09 |  | limited |
| 69 | mem://finance/invoice-accounting-lifecycle | indexed | yes | A | S2 invoice lifecycle | accepted | draft->approved->paid lifecycle attested | medium | no | DC-06 |  | strongly supported |
| 70 | mem://finance/payment-status-integrity-rule | indexed | yes | A | S2 finance lifecycle | accepted | ledger-derived payment status attested | medium | no | DC-06 |  | strongly supported |
| 71 | mem://finance/tax-configuration-standard | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 72 | mem://laboratory/domain-architecture-standard | indexed | yes | A | S1/S2 lab_submissions, lab_requests | accepted | lab domain objects attested | medium | no | NONE |  | strongly supported |
| 73 | mem://laboratory/submission-architecture | indexed | yes | A | S1/S2 lab_submissions | accepted | parent/child submission model attested | medium | no | NONE |  | strongly supported |
| 74 | mem://laboratory/ui-isolation-boundary | indexed | yes | B | S1 lab_mode; S2 routing | accepted | module isolation covered; redirect/sidebar-guard specifics exceed accepted text | high | yes | NONE |  | strongly supported |
| 75 | mem://localization/bilingual-naming-architecture | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 76 | mem://localization/stable/account-aware-housing-terminology | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 77 | mem://security/client-tenant-isolation | indexed | yes | A | S3 cross-tenant boundaries | accepted | tenant-scoped client visibility attested | medium | no | DC-07 |  | strongly supported |
| 78 | mem://security/community-workspace-rls-logic | indexed | yes | A | S4; S2 tenant_id IS NULL | accepted | dual personal/organization scoping attested | medium | no | DC-07 |  | strongly supported |
| 79 | mem://security/connections/partnership-integrity | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | NONE |  | limited |
| 80 | mem://security/granular-backend-enforcement | indexed | yes | B | S2 line 118; S5 | accepted | has_permission() RLS enforcement covered; "replacing legacy checks" scope exceeds accepted text | high | yes | DC-05 |  | strongly supported |
| 81 | mem://security/horses/classification-audit-log | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-08 |  | limited |
| 82 | mem://security/horses/classification-governance | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-08 |  | limited |
| 83 | mem://security/invitations/identity-verification-rules | indexed | yes | F | NONE (entity-level only) | n/a | behavioural/implementation claim not adjudicable from accepted corpus | medium | yes | DC-10 |  | limited |
| 84 | mem://security/permission-system-vocabulary | indexed | yes | B | S1:97,252 (104 keys); Round-5 registry-is-authority wording | accepted | count covered by S1 but Round 5 declines a fixed count | high | yes | DC-05 |  | strongly supported |
| 85 | mem://security/roles/manager-role-baseline | indexed | yes | B | S1 §H 104-key model | accepted | the 102-key manager baseline figure is not stated in accepted text | high | yes | DC-05 |  | strongly supported |
| 86 | mem://security/workspace-authorization-and-guards | indexed | yes | A | S2 line 118 | accepted | hasPermission()/has_permission() routing attested | medium | no | DC-05 |  | strongly supported |
| 87 | mem://style/arabic-terminology-standard | unindexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 88 | mem://ux/date-time-standard | unindexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 89 | mem://ux/horses/registration-classification-step | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-08 |  | proven |
| 90 | mem://ux/horses/wizard-scroll-behavior | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 91 | mem://ux/horses/wizard-selection-standards | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 92 | mem://ux/mobile-first-design-standard | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-11 |  | proven |
| 93 | mem://ux/rtl-layout-quality-standard | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-11 |  | proven |
| 94 | mem://ux/stable/arrivals-departures-toolbar-layout | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-11 |  | proven |
| 95 | mem://ux/stable/complex-dialog-layout-standard | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 96 | mem://ux/stable/creation-bridge-pattern | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-04 |  | proven |
| 97 | mem://ux/stable/housing-creation-unification | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | DC-02 |  | proven |
| 98 | mem://ux/stable/room-detail-panel-standard | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |
| 99 | mem://ux/stable/services-packages-truthfulness-standard | indexed | yes | E | NONE | n/a | presentation/wording standard; no accepted-corpus counterpart | low | no | NONE |  | proven |

## 9. P2 Core-rule ledger (9 rows, counted separately)

| # | Subject | Status | Accepted source | Dup cluster | Namespaced counterpart | Materiality | Reason |
|---|---|---|---|---|---|---|---|
| 1 | Mobile-first UI; RTL uses flex-grow | E | NONE | DC-11 | `mem://ux/mobile-first-design-standard`, `mem://ux/rtl-layout-quality-standard` | low | presentation standard, no accepted counterpart |
| 2 | Workspace-class dialog layout | E | NONE | DC-12 | `mem://ux/stable/complex-dialog-layout-standard` | low | presentation standard |
| 3 | Neutral form defaults, cascade resets | E | NONE | DC-13 | `mem://ux/horses/wizard-selection-standards`, `mem://features/breeding/reproduction-form-logic` | low | UI behaviour standard |
| 4 | In-Context Creation Bridge | E | NONE | DC-04 | `mem://ux/stable/creation-bridge-pattern` | low | UI pattern standard |
| 5 | Stacked BilingualName, EN placeholders in AR | E | NONE | DC-14 | `mem://localization/bilingual-naming-architecture` | low | localization presentation standard |
| 6 | Archive/deactivate instead of hard delete | F | NONE (entity-level `is_archived` in S2) | DC-01 | `mem://architecture/stable/housing-lifecycle-model` | medium | lifecycle enforcement requires live verification |
| 7 | `hasPermission()` / `has_permission()`, 104 keys | B | S1:97,252; S2:118 | DC-05 | `mem://security/permission-system-vocabulary` | high | mechanism attested; the fixed 104 count is asserted by S1 but declined as authoritative by the Round-5 registry wording |
| 8 | Dual RLS scoping personal vs organization | A | S4; S2 (`tenant_id IS NULL`) | DC-07 | `mem://security/community-workspace-rls-logic` | high | directly attested |
| 9 | Financial status derived from ledger | A | S2 finance lifecycle | DC-06 | `mem://finance/payment-status-integrity-rule` | high | directly attested |

**P2 counts:** A = 2, B = 1, C = 0, D = 0, E = 5, F = 1, total = 9.

## 10. P1 A–F counts

| Status | Count |
|---|---|
| A — aligned | 20 |
| B — partially supported | 4 |
| C — contradicted | 1 |
| D — superseded/stale | 0 |
| E — not covered | 15 |
| F — live verification required | 59 |
| **P1_TOTAL** | **99** |

## 11. Count-integrity validation

| Check | Result |
|---|---|
| P1_A+P1_B+P1_C+P1_D+P1_E+P1_F | 99 |
| P1_TOTAL | 99 |
| Unique URI count | 99 — equals P1_TOTAL |
| Duplicate URI rows | 0 |
| Omitted URIs | 0 |
| Invalid / multi-status rows | 0 |
| Core rules appearing as P1 rows | 0 |
| P2 total (separate) | 9 |
| Duplicate clusters (overlay, never summed into status totals) | 14 |

## 12. Duplicate / overlap overlay

| Cluster | Overlap type | Members |
|---|---|---|
| DC-01 | lifecycle vs filtering restatement | housing-lifecycle-model; housing-visibility-and-filtering; Core rule 6 |
| DC-02 | creation-path restatement | housing-creation-unification; housing-room-setup-core; housing-unit-and-numbering-setup |
| DC-03 | catalog/packaging taxonomy overlap | service-package-model; service-package-organization; package-types; service-taxonomy |
| DC-04 | creation-bridge restatement | creation-bridge-pattern; quick-create-bridge-pattern; quick-create-minimal-mode; Core rule 4 |
| DC-05 | authorization vocabulary overlap | permission-system-vocabulary; granular-backend-enforcement; workspace-authorization-and-guards; manager-role-baseline; Core rule 7 |
| DC-06 | financial-status restatement | payment-status-integrity-rule; invoice-accounting-lifecycle; Core rule 9 |
| DC-07 | tenant-isolation restatement | client-tenant-isolation; community-workspace-rls-logic; horse-owner-tenant-isolation; Core rule 8 |
| DC-08 | classification governance overlap | classification-model; classification-governance; registration-classification-step; classification-audit-log |
| DC-09 | partner-management overlap | unified-partner-management; operational-partner-scoping; team-partners-hub |
| DC-10 | invitation overlap | invitation-scoping-standard; unified-invitation-entry; identity-verification-rules |
| DC-11 | mobile/RTL layout overlap | mobile-first-design-standard; rtl-layout-quality-standard; arrivals-departures-toolbar-layout; Core rule 1 |
| DC-12 | dialog layout restatement | complex-dialog-layout-standard; Core rule 2 |
| DC-13 | neutral-default restatement | wizard-selection-standards; reproduction-form-logic; Core rule 3 |
| DC-14 | bilingual naming restatement | bilingual-naming-architecture; Core rule 5 |

Duplication is recorded as an overlay only; every clustered object still carries exactly one primary status.

## 13. Named contradiction findings

**F-C5-01 — Movement RPC arity.**

- URI: `mem://architecture/stable/movement-rpc-contract-standard`
- Memory claim: "the database maintains only one authoritative 19-parameter signature (V3). All client-side callers must pass the full 19-parameter set explicitly."
- Accepted Round record states: `record_horse_movement_with_housing` has **20 parameters**, single overload (`S2:212`; `S1:250`, `S1:415`, `S1:751`, `S1:1031` — "Canonical current-truth: … has 20 parameters. No overload exists.").
- Classification: **C — contradicted by accessible accepted truth**, materiality high, confidence proven against the accepted record.
- C5 performed **no** application-code and **no** database inspection. Accepted Round records state 20 parameters; C5 did not live-verify code or database state.

## 14. Partial-support findings (B)

| URI | Accepted coverage | Unsupported excess |
|---|---|---|
| `mem://security/permission-system-vocabulary` | S1:97 and S1:252 state a 104-key permission model; S2:118 states the vocabulary governs UI and RLS | The fixed count is stated by S1 but the Round-5 wording treats the registry — not a fixed number — as authority; the Memory presents 104 as permanent truth |
| `mem://security/roles/manager-role-baseline` | S1 §H attests the 104-key model and `has_permission()` enforcement | The specific "102 permission keys" manager baseline appears in no accepted text |
| `mem://laboratory/ui-isolation-boundary` | S1 attests `lab_mode`, laboratory capability, and module routing | Sidebar gating, route guards and the redirect-with-notice behaviour are not stated in accepted text |
| `mem://security/granular-backend-enforcement` | S2:118 and S5 attest `has_permission()` in RLS | "Replacing generic legacy checks" across core operational RLS is not attested corpus-wide |

## 15. Superseded or stale findings (D)

None proven in this run. D = 0 for P1 and P2.

## 16. Implementation-verification-required findings (F)

59 P1 objects and 1 Core rule assert behavioural guarantees (triggers, indexes, cascades, hooks, form logic, redirect behaviour, proration maths, occupancy transitions) whose accepted coverage stops at entity level. These are not contradictions and not alignments; they are undecidable from the accepted corpus alone and belong to a live-verification lane outside WS-DH-2026-0012.

## 17. Stage-4 result

| Test | Result |
|---|---|
| P1 population proven | Yes — 99, reconciled 91 + 8 |
| Every P1 URI classified exactly once | Yes — 99 rows, 0 duplicates, 0 omissions |
| Core rules classified separately | Yes — 9 P2 rows, excluded from P1 |
| Duplicate clusters as overlay | Yes — 14 clusters, not summed into status totals |
| Accepted sources traceable per object | Yes — S1–S5 keys per row |
| Contradiction / partial / stale / implementation-dependent distinguishable | Yes |
| Material findings ready for Owner Alignment | Yes |

**Stage 4 — SUBSTANTIVELY COMPLETE (not persisted, not Owner accepted).**

## 18. Stage 0–4 substantive state

| Stage | Title | Substantive state |
|---|---|---|
| 0 | Scope, evidence boundary, Prompt lineage | Substantively complete — not persisted |
| 1 | Memory inventory and provenance | Substantively complete — not persisted |
| 2 | Admission, rejection, supersession | Substantively complete — not persisted |
| 3 | Numbering, succession, reserved IDs | Substantively complete — not persisted |
| 4 | Contradiction, duplication, correction | Substantively complete — not persisted |
| 5 | Owner Alignment | Ready — not started |
| 6 | QA and Acceptance Re-Audit | Not started |
| 7 | Persistence, installation readiness, Closure | Not started |

## 19. Stage-5 readiness

Ready. Stages 0–4 are substantively complete with an auditable object ledger and no unresolved counting defect.

## 20. Owner decisions required

1. Approve or reject **Option 2** (repository-authoritative Memory register, candidate-only cutover, no retrospective en-bloc admission).
2. Decide the resolution path for **F-C5-01** (19 vs 20 movement-RPC parameters): correct the Memory, or authorize a live-verification lane to re-establish the canonical arity.
3. Decide whether the fixed 104-permission-count wording is retired in favour of registry-as-authority.
4. Decide the treatment of the 4 dangling index references and the 8 unindexed orphan bodies.
5. Decide whether the 59 F-status objects are routed to a separate live-verification Workstream.
6. Authorize (or withhold) Stage 5 Owner Alignment and the eventual persistence of Stages 0–4.

## 21. Remaining evidence gaps

- No live code or database verification was authorized; all F objects remain undecided.
- Documentation 01–13 remains excluded, so historical provenance of Memory bodies is unrecoverable in this lane.
- No `MEM-NNN` identity exists in the live Memory substrate; the 104-ID inventory remains repository-side governance language only.
- Accepted Rounds 1–5 do not cover UI/UX, wording or localization standards, so 15 E objects have no adjudication path in this corpus.

## 22. Facts

99 stored Memory bodies; 1 index; 9 Core rules; 95 index references; 91 resolved; 4 dangling; 8 orphans; 0 read failures; P1 A20/B4/C1/D0/E15/F59; P2 A2/B1/C0/D0/E5/F1; 14 duplicate clusters; 1 contradiction against accepted text.

## 23. Lovable-accessible claims

The Memory corpus mirror, `mem://index.md`, the five accepted architecture documents, and Git branch/HEAD/parents were directly readable in this run.

## 24. Inferences

The E/F split is an evidence-boundary inference, not an adjudication: an F object is unproven, not wrong. The Core-rule duplication overlay infers counterpart relationships from subject identity, not from stored linkage metadata.

## 25. CROSS-TASK REPORT CONTAMINATION CHECK

```text
NO CROSS-TASK CONTAMINATION DETECTED
```

## 26. WORKSTREAM PERSISTENCE

```text
WS-DH-2026-0012:
ACTIVE — LOCAL PROMPT 01 INVESTIGATION RUN — C1 CORPUS CORRECTION RUN —
C2 RESPONSIBILITY-MAPPING CORRECTION RUN — C3 STAGE RECONCILIATION RUN —
C4 ACCEPTED-TRUTH VERIFICATION RUN — C5 OBJECT-LEVEL CLASSIFICATION CORRECTION RUN —
NO GOVERNANCE CONTRACT PERSISTED

LOCAL PROMPT 01: SUBMITTED — RUN — CONSUMED
C1: SUBMITTED — RUN — NO NEW LOCAL NUMBER CONSUMED
C2: SUBMITTED — RUN — NO NEW LOCAL NUMBER CONSUMED
C3: SUBMITTED — RUN — NO NEW LOCAL NUMBER CONSUMED
C4: SUBMITTED — RUN — NO NEW LOCAL NUMBER CONSUMED
C5: SUBMITTED — RUN — NO NEW LOCAL NUMBER CONSUMED
NEXT LOCAL PROMPT: 02 — NOT CONSUMED
OWNER ACCEPTANCE: NOT GRANTED BY THIS RUN
```

## 27. ROADMAP IMPACT

- RM-DH-003 remains ACTIVE; Phase 3 remains ACTIVE; Sub-phase 3.1 remains current.
- WS-DH-2026-0012 remains the current Workstream; WS-DH-2026-0013 remains unrun.
- WS-DH-2026-0014 and WS-DH-2026-0015 remain blocked.
- No Sub-phase 3.2 advancement. Project Knowledge remains NOT INSTALLED.
- RM-DH-004 remains separate. No Acceptance or Closure.

## 28. RUN METADATA AND EXACT STOPPING POINT

| Field | Value |
|---|---|
| Mode / operation | Plan/Chat — read-only object-level classification correction |
| Parent Prompt ID | PROMPT-DH-WS0012-MEMORY-GENESIS-INVESTIGATIVE-AUDIT-01 — C5 |
| Workstream lineage / local number | WS-DH-2026-0012 / Local Prompt 01 (no new number consumed) |
| Parallel Task ID | PT-DH-WS0012-P01-C5-OBJECT-CLASSIFICATION-LEDGER |
| Owner authorization | Exact C5 authorization time not recorded |
| Run / report time | 06-08-2026 — August, 06:05 (Asia/Riyadh — UTC+03:00) |
| Branch / HEAD / parents | see §4 |
| Working tree before / after | clean / `.lovable/plan.md` only |
| P1 / P2 populations inspected | 99 / 9 |
| P1 ledger rows | 99 |
| P2 ledger rows | 9 |
| Count integrity | VERIFIED |
| Accepted sources inspected | S1–S5 |
| Repository writes | None |
| Database access | None |
| Application-code inspection | None |
| Skill-body inspection | None |
| Project Knowledge activity | None |
| Platform-managed paths | `.lovable/plan.md` (report surface only) |
| Contamination verdict | NO CROSS-TASK CONTAMINATION DETECTED |

**Exact stopping point:** the object-level classification correction report is complete. No persistence, no Acceptance, no Closure. Next action: ChatGPT review, Arabic explanation, and Owner Alignment for Stages 0–4.
