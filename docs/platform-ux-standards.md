# Dayli Horse — Platform UX Standards Index

> **This is a non-replacing index.** It does not delete, replace, or supersede existing detailed documentation. It links to deeper references where they exist and consolidates the current truthful adoption status of each standard.

---

## 1. Document purpose

This file is the single repository-side reference for Dayli Horse platform UX standards. It is intended to:

- Give engineers one place to discover what standards exist.
- State each standard's **current actual application status** truthfully (not aspirationally).
- Point at deeper documentation, audit scripts, and shared primitives.
- Capture the newly-accepted **Safe Data-Entry Dialog** and **Visible Validation Guidance** rules together with their currently-scoped adoption and the documented Record Movement exception.

This file does **not** introduce runtime behavior changes. Any rule listed here that is not yet "Fully applied platform-wide" requires a separate audit + execution prompt before it can be claimed as complete.

## 2. Scope

- Frontend UX, layout, i18n, RTL, formatting, dialog/drawer behavior, validation guidance, list/density, accessibility-related conventions.
- **Out of scope:** backend authorization, RLS, RPC contracts, schema, lifecycle semantics, movement semantics, admission semantics, billing semantics. Backend authorization is governed separately by RLS and the SQL `has_permission()` function — see `mem://security/granular-backend-enforcement` (agent memory) and the Supabase migrations for the canonical source of truth.

## 3. Status definitions

| Status | Meaning |
|---|---|
| **Fully applied platform-wide** | Rule is enforced by a script, a CSS chokepoint, or has been verified across all implemented relevant surfaces. |
| **Mostly applied with exceptions** | Rule is the default but named exceptions or allowlists exist. |
| **Partially applied** | Rule is followed in some implemented modules but not consistently. |
| **Scoped implementation** | Rule has been deliberately implemented only in a limited set of files or one module. |
| **Approved standard pending rollout** | Direction is accepted, but platform-wide implementation is not complete. |
| **Convention-only** | Rule exists as a repeated implementation pattern or project convention but lacks formal enforcement. |
| **Requires deeper audit** | Compliance cannot be reliably stated without a dedicated audit. |

## 4. Truthfulness summary

### 4.1 Rules currently safe to call fully platform-wide

Only the following rules are backed by a script-enforced or CSS-chokepoint mechanism that cannot be silently bypassed by feature code:

- **A2 — Arabic typography.** CSS variable on `html[lang="ar"]` in `src/index.css`; cascade is universal.
- **A3 — i18n key completeness.** `scripts/audit-i18n.ts` is run in CI and exits non-zero on missing keys; allowlist is documented.

### 4.2 Qualified full-scope claims

Fully applied **only within the qualified scope stated**:

- **A12b — Permission-aware route guarding** — fully applied for organization-mode routes (single chokepoint in `src/App.tsx`). Personal mode bypasses by design.
- **A15 — Golden Layout Contract** — fully applied for organization-mode pages that render through `DashboardShell`. Pages outside the shell (auth, public, lab-mode shell) are not covered.

### 4.3 Rules not yet safe to describe as fully platform-wide

- A1 — RTL & logical properties (script-enforced with allowlist; mostly applied with exceptions).
- A4 — English-digit numeric / currency / date / time output (helper is correct; adoption coverage requires audit).
- A5 — Bilingual identity rendering.
- A6 — Mobile-first layout.
- A7 — Workspace-class dialog layout.
- A8 — Neutral form defaults.
- A9 — In-context creation bridge.
- A10 — Archive/Deactivate over hard delete.
- A11 — Semantic design tokens.
- A12a — Permission-aware in-page action affordances.
- A13 — Tenant currency default.
- A14 — RTL toolbar balance.
- A16 — Date/time formatting consumers.
- A17 — View switcher / list density / active-only default.
- A18 — Drawer for mobile data-entry.
- A19 — Safe data-entry dialog dismissal.
- A20 — Visible validation guidance.
- A21 — Accessibility.
- A22 — Notification copy and dedup.

## 5. Global UX rules table

| ID | Rule | Description | Evidence / source | Enforcement | Current status | Applied scope | Known exceptions / gaps | Recommended next action |
|---|---|---|---|---|---|---|---|---|
| **A1** | RTL & logical properties | Use logical Tailwind properties (`ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `border-s-*`, `inset-x-*`, `gap-*`) instead of physical (`ml-*`, `mr-*`, `left-*`, `right-*`, `text-left`, `space-x-*`). | `docs/rtl-typography.md`, `docs/stabilization-release-notes.md`, `scripts/audit-rtl.ts`, `scripts/rtl-allowlist.json` | Script-enforced with allowlist | Mostly applied with exceptions | Most app surfaces | Allowlisted UI primitives; sporadic legacy code | Periodic re-run of `audit:rtl`; trim allowlist over time |
| **A2** | Arabic typography | `html[lang="ar"]` swaps `--font-sans` / `--font-display` to IBM Plex Sans Arabic; cascade via `* { font-family: inherit; }`. | `src/index.css`, `tailwind.config.ts`, `docs/rtl-typography.md` | CSS chokepoint | **Fully applied platform-wide** | All surfaces inheriting default font stack | None known | No action |
| **A3** | i18n key completeness | All UI strings live in `src/i18n/locales/{en,ar}.ts` with parity. | `src/i18n/locales/`, `scripts/audit-i18n.ts`, `scripts/i18n-allowlist.json` | CI script exits non-zero on missing keys | **Fully applied platform-wide** | All locale files | Documented allowlist for dynamic keys | Keep allowlist tight |
| **A4** | English-digit numeric, currency, date & time output | All numeric/currency/date/time output should render English digits (0-9) regardless of UI language and should ideally route through `src/lib/formatters.ts` (`formatCurrency`, `formatNumber`, `formatDate`, `formatDateTime`, `formatTime12h`, …). Numeric components should use `dir="ltr"` + `tabular-nums`. | `src/lib/formatters.ts` (top-of-file rule) | Helper centralized; **no script verifies callers route through it**; convention-only for callers | **Central formatter behavior is platform-correct, but adoption coverage requires audit.** Repository scan (informational): ~7 files calling `Intl.NumberFormat` directly, ~68 files importing `date-fns` directly and calling `format()` themselves, 9 `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` sites. Direct `Intl.NumberFormat`, direct `date-fns` `format()`, and `toLocale*` usage can bypass the helper. | Finance, Lab, Housing, HR, Vet, Notifications use the helpers in many surfaces. | `src/components/finance/InvoicePDFGenerator.tsx`, `src/components/dashboard/FinancialSummaryWidget.tsx`, `src/pages/DashboardHRPayroll.tsx`, `src/components/laboratory/ClientPickerSheet.tsx`, `src/components/horses/orders/ClientSelector.tsx`, `src/components/finance/FinancialCategorization.tsx`, `src/lib/boardingUtils.ts` (direct `Intl.NumberFormat`); many components call `date-fns format()` directly, e.g. `src/components/laboratory/SampleProgressStepper.tsx`. PDF/print surfaces and `toLocale*` are particularly at risk in Arabic UI. | Future formatter-adoption audit; lint rule banning direct `Intl.NumberFormat`, direct `date-fns format()` outside `formatters.ts`, and `toLocale*`; migrate listed bypasses. |
| **A5** | Bilingual identity rendering | Stacked `<BilingualName />` for identity lists; English inputs use English placeholders even in AR mode. | `src/components/ui/BilingualName` (and similar), `mem://localization/bilingual-naming-architecture` | Convention | Partially applied | Many identity surfaces (clients, horses, employees) | Older lists not migrated | Audit + migrate |
| **A6** | Mobile-first layout | Mobile-first responsive layout; desktop must not overcrowd mobile. | `mem://ux/mobile-first-design-standard` | Convention | Partially applied | Newer modules (Lab, Housing, Movement) | Older dashboards uneven | Per-page audit |
| **A7** | Workspace-class dialog layout | `flex-col`, fixed header/footer (`shrink-0`), single scrollable body capped at `max-h-[85vh]`/`max-h-[90vh]`; no nested scroll containers. | `mem://ux/stable/complex-dialog-layout-standard` | Convention | Partially applied | Housing, Movement, newer Finance | Many older dialogs deviate | Workspace-class dialog audit |
| **A8** | Neutral form defaults | Form inputs default to neutral states (`_none`, `__neutral__`); no forced default selections; cascade resets on change (e.g. Gender). | `mem://ux/horses/wizard-selection-standards`, `mem://features/breeding/reproduction-form-logic` | Convention | Partially applied | Newer wizards | Older forms still pre-select | Audit per surface |
| **A9** | In-context creation bridge | Selectors expose "+ Add New"; auto-select and remount UI on save. | `mem://ux/stable/creation-bridge-pattern`, `mem://features/horses/quick-create-bridge-pattern` | Convention | Partially applied | Most newer selectors | Older selectors lack the bridge | Adoption sweep |
| **A10** | Archive / Deactivate over hard delete | Hard delete forbidden when history exists; cascade Archive (`is_archived`) or Deactivate (`is_active`). Lists default to Active-only. | `mem://architecture/stable/housing-lifecycle-model` | Convention + DB constraints in some modules | Mostly applied where modeled | Housing, clients, horses, employees | Not all modules model lifecycle yet | Per-module rollout |
| **A11** | Semantic design tokens | Use semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, …); no raw colors in components. | `src/index.css`, `tailwind.config.ts`, design-system prompt | Convention | Partially applied | Most components | Repository scan: ~39 raw-color matches in `src/components/` + `src/pages/` | Lint rule + migration sweep |
| **A12a** | Permission-aware in-page action affordances | In-page actions (buttons, menu items, edit/delete affordances) gated via `hasPermission()` / `<PermissionGuard>` so users do not see actions they cannot perform. **This is a UX/affordance standard, not a backend security certification.** Backend authorization is enforced separately by RLS and the SQL `has_permission()` function. | `src/hooks/usePermissions.ts`, `mem://security/permission-system-vocabulary` | Convention | Mostly applied with exceptions | Org-mode dashboards, settings, importer surfaces | Repository scan: ~28 files importing `hasPermission`/`PermissionGuard`; Lab/Academy per-action coverage unverified | In-page affordance audit |
| **A12b** | Permission-aware route guarding | Org-mode routes wrapped by a single chokepoint guard. **UX/navigation standard, not a backend security certification.** | `src/App.tsx` (route tree), `mem://security/workspace-authorization-and-guards` | Single chokepoint | **Fully applied for organization-mode routes** | Org-mode routes only | Personal-mode routes bypass by design | None |
| **A13** | Tenant currency default | Currency universally defaults to tenant configuration via `useTenantCurrency`. | `src/hooks/useTenantCurrency.ts`, `mem://architecture/finance/tenant-currency-model` | Convention | Mostly applied with exceptions | Finance, Housing, Lab, HR | Surfaces hard-coding `'SAR'` exist | Adoption audit |
| **A14** | RTL toolbar balance | Toolbars use `flex-1`/`flex-grow` to fill trailing space and prevent clustering in Arabic. | `mem://ux/rtl-layout-quality-standard`, `mem://ux/stable/arrivals-departures-toolbar-layout` | Convention | Partially applied | Housing, Movement | Older toolbars cluster on the leading side in RTL | Per-toolbar review |
| **A15** | Golden Layout Contract | Org-mode pages render through `DashboardShell` (sidebar + header + content). | `src/components/dashboard/DashboardShell` (and routes) | Single chokepoint | **Fully applied for organization-mode pages rendered through `DashboardShell`** | Org-mode pages | Auth, public, lab-mode shell are deliberately outside | None |
| **A16** | Date/time formatting consumers | Date/time output should call `formatDate`/`formatDateTime`/`formatTime12h` rather than `date-fns format()` directly. Overlaps with A4. | `src/lib/formatters.ts` | Convention | Partially applied | Many newer screens | ~68 direct `date-fns` callers (see A4) | Joint audit with A4 |
| **A17** | View switcher / list density / active-only default | List screens offer density toggles and default to Active-only. | Various list pages, e.g. Housing, Horses | Convention | Scoped — requires deeper audit | Housing list surfaces | Not consistently applied across modules | Inventory audit |
| **A18** | Drawer for mobile data-entry | Mobile data-entry should prefer drawer over dialog. | shared `Drawer` primitive | Convention | Partially applied | Newer mobile flows | Many dialogs not yet migrated | Per-form audit |
| **A19** | Safe data-entry dialog dismissal | See §6 for full rule wording. | `src/components/ui/safe-form-dialog.tsx`, `src/hooks/useDirtyForm.ts` | Convention via primitives | **Approved standard — scoped implementation** | `CreateBranchWizard`, `CreateFacilityDialog`, `AdmissionWizard`, `RecordMovementDialog` | Not platform-wide yet | Platform-wide dialog/wizard inventory + rollout |
| **A20** | Visible validation guidance | See §7 for full rule wording. | `src/components/ui/missing-requirements-bar.tsx` | Convention via primitive | **Approved standard — scoped implementation** | Same 4 Housing/Movement files as A19 | Not platform-wide yet | Adoption audit |
| **A21** | Accessibility | Keyboard navigability, focus management, ARIA roles/labels, contrast, motion preferences. | shadcn/Radix primitives (baseline), various components | Convention | Requires deeper audit | Baseline from primitives | No formal audit on file | Dedicated a11y audit |
| **A22** | Notification copy & dedup | Localized notification copy and dedup window. | `src/lib/notifications/*`, `mem://architecture/notification-system-standard` | Convention within the notifications module | Mostly applied within emitting modules only | Notifications module | Emitter coverage uneven | Emitter inventory |

## 6. Safe Data-Entry Dialog Rule

**Safe Data-Entry Dialog Dismissal.** Dialogs, drawers, and multi-step wizards used for data entry or operational write-actions must not close from accidental gestures: outside click, overlay/scrim tap, drawer swipe-down, or Escape key. Only intentional close paths — the X button, an explicit Cancel button, or a successful submit — may close the surface. When the form is dirty, intentional close must surface a discard confirmation with a **Keep Editing** default.

**Status:** Approved standard — scoped implementation. Currently adopted only in:

- `src/components/housing/CreateBranchWizard.tsx`
- `src/components/housing/CreateFacilityDialog.tsx`
- `src/components/housing/AdmissionWizard.tsx`
- `src/components/movement/RecordMovementDialog.tsx`

Not platform-wide yet. Pending platform-wide dialog/wizard inventory and rollout.

**Reference primitives:**

- `SafeFormDialog` — `src/components/ui/safe-form-dialog.tsx`
- `SafeFormDrawer` — `src/components/ui/safe-form-dialog.tsx`
- `useDirtyForm` — `src/hooks/useDirtyForm.ts`

**Out of scope:** Destructive confirmation dialogs (logout, delete, archive confirmations, etc.) are out of scope for this rule unless they themselves contain a substantial data-entry form.

## 7. Visible Validation Guidance Rule

**Visible Validation Guidance.** Primary actions in data-entry surfaces must never be silently disabled. When a submit or step-advance is blocked, the surface itself must explain why: inline field errors, a persistent footer requirements summary (`MissingRequirementsBar`), or step-level warning indicators. Toast notifications may supplement but never replace in-surface guidance. For strictly forward-gated, dynamically-shaped wizards, footer-only persistent guidance is sufficient when every actionable blocker is surfaced on the current step.

**Status:** Approved standard — scoped implementation. Same current adoption scope as the Safe Data-Entry Dialog rule (§6).

**Reference primitive:**

- `MissingRequirementsBar` — `src/components/ui/missing-requirements-bar.tsx`

## 8. Record Movement documented exception

**Exception: `RecordMovementDialog` step indicators.** `RecordMovementDialog` intentionally omits per-step warning badges. The wizard is strictly forward-gated and its step list (`effectiveSteps`) is recomputed from `movementType` and `arrivalSource`, so steps can appear or disappear between transitions. Per-step badges would risk surfacing stale or misleading warnings against steps that no longer apply. The footer `MissingRequirementsBar` already exposes every actionable blocker at the moment it matters, satisfying the Visible Validation Guidance rule (§7) without per-step indicators.

## 9. Adoption guidance for new surfaces

- New data-entry dialogs/wizards should adopt `SafeFormDialog` or `SafeFormDrawer` by default unless clearly not applicable (e.g. read-only viewers, destructive confirmations).
- New data-entry forms should provide visible validation guidance (inline errors, `MissingRequirementsBar`, or step indicators) instead of silently disabled primary actions.
- New numeric/currency/date/time output should route through `src/lib/formatters.ts` unless there is a documented exception (e.g. machine-readable export formats).
- New layouts should use logical RTL-safe properties (`ms-*`, `me-*`, `start-*`, `end-*`, `text-start`, `gap-*`, `inset-x-*`).
- New bilingual identity / name rendering should use `BilingualName` where applicable.
- New list surfaces should consider view switcher / list density / active-only-default patterns; current adoption is **not yet universal** — follow nearest comparable Housing/Horses list as reference.

## 10. References

- `docs/rtl-typography.md` — RTL & Arabic typography deep-dive.
- `docs/release-housing-movement-i18n.md` — Housing & Movement i18n release notes.
- `docs/stabilization-release-notes.md` — Fonts + RTL + i18n stabilization gate.
- `scripts/audit-i18n.ts` — i18n key completeness check.
- `scripts/audit-rtl.ts` — RTL/logical-property check.
- `scripts/rtl-allowlist.json`, `scripts/i18n-allowlist.json` — documented exceptions.
- `src/lib/formatters.ts` — central numeric/date formatters.
- `src/components/ui/safe-form-dialog.tsx`, `src/components/ui/missing-requirements-bar.tsx`, `src/hooks/useDirtyForm.ts` — Safe Dialog primitives.

## 11. Future audits required

Before any rule below can be re-classified as "Fully applied platform-wide," a dedicated audit + execution prompt is required:

1. **Platform-wide dialog/wizard inventory** for Safe Dialog (A19) rollout.
2. **Visible validation guidance** adoption audit (A20).
3. **Accessibility** audit (A21).
4. **View switcher / list density** audit (A17).
5. **Date/time and numeric formatter** adoption audit (A4 + A16) — including bypass migration.
6. **Semantic design token** lint/audit (A11).
7. **Workspace-class dialog layout** audit (A7).

---

*This file is a documentation/indexing pass only. It does not introduce platform-wide rollout of any rule. The Safe Data-Entry Dialog and Visible Validation Guidance rules remain scoped to the four Housing/Movement surfaces listed in §6.*
