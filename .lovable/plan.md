## Investigative Gate Result

### Roadmap position
1. B2.3d-RLS accepted.
2. B2.3e Customer Materialization accepted.
3. B2.3d-VIEW-S1 accepted.
4. B2.3d-UI-S1 accepted through L2/L3/L4 placement verification.
5. R1-FE-CLOSE accepted.
6. B2-F1-DISPLAY-TRUTH implemented and accepted for user-side QA.
7. Current sub-step: F2 panel visual/RTL QA.
8. F2 is not accepted yet; screenshots 38/39 show the panel still behaves LTR in Arabic.
9. F3–F8 remain blocked until this visual/RTL correction is applied and user-side screenshot QA confirms it.

### Evidence inspected
- `src/components/housing/AdmissionsList.tsx`
  - `AdmissionsList` obtains `{ t, lang, dir } = useI18n()` and computes `isRTL`.
  - `FilterExplanationPanel` currently obtains only `{ t } = useI18n()`.
  - Panel root is currently:
    - `className="border-s-4 border-s-primary/60 border-y-0 border-e-0 bg-primary/5 rounded-md"`
    - no explicit `dir` attribute.
  - Panel content uses `text-start` but inherits direction implicitly.
  - Row uses `flex items-center gap-2 flex-wrap` but no direction-aware containment.
  - Financial predicates/counts live earlier in the component and are not part of this fix.
- `src/i18n/I18nContext.tsx`
  - `dir` is derived from current language and exposed by `useI18n()`.
  - document root gets `document.documentElement.dir = dir`.
- `src/i18n/config.ts`
  - Arabic is RTL via `RTL_LANGUAGES = ['ar', 'ur']`.
- `src/components/layout/DashboardShell.tsx`
  - outer dashboard shell sets `dir={dir}`.
- `src/components/ui/card.tsx`
  - `Card` passes DOM attributes through, so adding `dir` to the panel root is valid and narrow.

### Root cause
The previous correction used logical classes (`border-s-4`, `text-start`) but the `FilterExplanationPanel` itself does not explicitly establish its own direction context. It relies on inherited direction from ancestors. Screenshots 38/39 prove that, at the panel element where `border-s-*` and `text-start` are evaluated, the effective direction is still LTR or not being safely applied locally. Because `border-inline-start` depends on the element’s computed `direction`, `border-s-4` remains visually left-sided when the panel root computes as LTR. `text-start` then also starts from the left.

The narrow fix is therefore not to replace logical CSS with hardcoded left/right, but to make the panel root direction-explicit using the already available i18n direction, then keep logical classes.

## Official Skills selection

| Skill | Selected? | Why / evidence / negative checks / acceptance impact |
|---|---:|---|
| Skill 01 Feature Launch Controller | Yes | F2 cannot be accepted from implementation alone; it needs visual QA confirmation. Evidence: roadmap says F2 is blocked. Impact: prevents falsely marking F2 accepted. |
| Skill 07 React/TypeScript Safety | Yes | Component-level rendering fix in `FilterExplanationPanel`. Evidence: missing local `dir` and layout classes. Negative check: no hook/predicate mutation planned. |
| Skill 09 Design System / Visual Hierarchy | Yes | Panel border accent, compact density, badge/title row and visual alignment are affected. Evidence: screenshots 38/39. Strategy keeps existing `Card`, `Badge`, semantic token classes. |
| Skill 10 UX Flow / Journey Clarity | Yes | The selected filter explanation must remain readable and attached to the selected chip. No workflow/predicate changes. |
| Skill 11 Content Truth / Wording | Yes | Confirm wording is not changed, so financial filter meaning remains preserved. No i18n copy changes planned. |
| Skill 12 Bilingual / RTL Quality | Yes | Primary skill: Arabic RTL and English LTR parity. Evidence: AR screenshots show LTR behavior. Acceptance requires AR right-side accent and EN left-side accent. |
| Skill 19 Billing / Finance | Yes, boundary-only | Selected only to confirm no billing predicates, balances, invoices, ledger, billing links, rates, or `balance_cleared` are touched. |
| Skill 23 Reliability / State Consistency | Yes | Confirm filter state/counts remain unchanged; no query/cache/state logic changes. |
| Skill 24 Mobile / PWA Readiness | Yes | Panel must wrap safely at 360–414px without overflow or detached badge. |
| Skill 25 QA / Release Readiness | Yes | Provide exact manual visual QA; build/typecheck can support but cannot accept F2. |
| Skill 26 Skill Network Governance | Yes | Ensures selected skills are used with evidence and boundaries, not name-only badges; residuals remain mapped. |

### Skills explicitly not selected
| Skill | Reason not selected |
|---|---|
| Skill 04 Tenant Isolation | No tenant/account boundary changes; only local panel direction. |
| Skill 05 RLS | No database access/RLS/policy changes. |
| Skill 06 API/RPC | No endpoint/RPC/backend contract changes. |
| Skill 08 Schema/Migration | No schema/migration/index/trigger changes. |
| Skill 16 Customer/Account Identity | No customer/account/Horse Owner identity behavior changes. |
| Skill 22 Permissions | No permission checks, role logic, or authority paths changed. |

## Execution plan after approval

### Files allowed to change
- `src/components/housing/AdmissionsList.tsx` only.

### Narrow code strategy
1. Update `FilterExplanationPanel` to read `dir` from `useI18n()`.
2. Add explicit direction to the panel root:
   - `dir={dir}` or `dir={dir === 'rtl' ? 'rtl' : 'ltr'}`.
3. Keep logical CSS:
   - `border-s-4`
   - `border-s-primary/60`
   - `border-e-0`
   - `text-start`
4. Keep compact layout:
   - title, count badge, and description remain in a single wrapping row.
   - secondary accrued line remains below and starts from inline-start.
5. If badge/title ordering needs correction, use direction-aware flex only within the panel, not hardcoded `left/right` or `ml/mr`.
6. Do not touch:
   - filter predicates
   - counts
   - `useAdmissionFinancialsBatch`
   - `useBoardingAdmissions`
   - billing/invoice/ledger/customer balance code
   - schema/RLS/RPC/migrations/permissions
   - i18n files unless an unexpected missing key is discovered.

### Expected result
- Arabic:
  - accent border appears on the right.
  - title, count badge, description, and secondary line start from the right.
  - compact desktop row preserved.
- English:
  - accent border appears on the left.
  - content starts from the left.
- Mobile 360–414px:
  - natural wrapping.
  - no horizontal overflow.
  - count badge stays visually attached to the title row.

## Manual QA checklist
1. Arabic UI: click `مستحق غير مفوتر`; confirm accent right, text starts right, row compact.
2. Arabic UI: confirm Drama remains in `مستحق غير مفوتر`.
3. Arabic UI: click `بحاجة إلى تحديد سعر`; confirm accent right, text starts right.
4. Arabic UI: confirm Jaki remains in `بحاجة إلى تحديد سعر`.
5. English UI: click `Accrued, Unbilled`; confirm accent left and text starts left.
6. Mobile 360–414px: confirm no horizontal overflow and badge wraps naturally.
7. Confirm counts and visible rows are unchanged from before the direction fix.
8. Confirm filter switching produces no network mutations and no writes to invoices, billing links, ledger entries, balances, rates, schema, RLS, RPCs, or permissions.

## Residuals preserved
- B2-F-SETTLEMENT-SYNC
- admission-time rate snapshot
- automatic billing schedule
- invoice creation changes
- B2.4 Housing UX
- Horse Registry surfacing
- Owner Column
- Edit/Delete suppression
- granular permissions

## Acceptance gate
F2 must not be marked accepted from execution alone. After the patch, F2 still requires user-side screenshot confirmation for Arabic and English panel direction.