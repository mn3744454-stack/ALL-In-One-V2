<!--
id: DHB-R01-DEV
title: Round 1 — Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment
version: 1.3.0
status: canonical-accepted
audience: external-developer
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3 from Round 1 raw evidence, DG.1/DG.1A audits, current repository source, and current live database metadata; corrected during DG.3A to restore material evidence, precise counts, and contract-level truth compressed in v1.0.0; evidence-closure correction during DG.3B to remove hidden-memory language, qualify the environment claim, remove the unsupported paid-account generalization, fix the DebugAuth risk misclassification, restore route/guard matrix, database relationship map, RLS/isolation-helper inventory and cross-tenant patterns, expand RPC registry columns, apply the exact permanent 21-part framework titles, clarify Round 2 primary scope, and use precise Vitest test-file terminology; DG.3D closure: applies the final DG.3C authorization and path corrections and records Round 1 acceptance.
source-sha256: n/a
confidentiality: Confidential Technical Handoff — No Credential or Secret Values Included
-->

# Round 1 — Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment

> **Confidential Technical Handoff — No Credential or Secret Values Included.**
> This document is a canonical Round 1 developer handoff. It is **pending owner acceptance**; it is not a launch certification and does not authorize deployment, publication, or a merge to `main`.

> **DG.3A correction (v1.1.0):** v1.0.0 compressed several material Round 1 findings (baseline counts, PWA kill-switch status, tenant-creation atomicity, movement RPC parameter count, authority-question answers, full risk register, and the 21-part framework mapping). v1.1.0 restored those facts verbatim from `round-01-raw-audit-output.md` and re-verified each material claim against current source.

> **DG.3B evidence-closure (v1.2.0):** narrow correction pass. v1.2.0 removes remaining hidden-memory language, qualifies the environment claim to the exact evidence boundary, removes the unsupported "paid accounts behave as organizations" generalization, corrects the internal-inconsistency that assigned the DEV-only `DebugAuth` route to R-04 (R-04 is Storage-scoped), restores the concise route/guard matrix, adds the core database relationship map and snapshot/polymorphic-pattern notes, expands the RLS/cross-tenant evidence (isolation-helper inventory, representative RLS matrix, cross-tenant pattern classification, isolation-risk review), completes RPC-registry columns (security mode + pinned search path + status + validation limitation), replaces abbreviated framework names with the exact permanent 21-part titles, makes the Round 2 primary scope explicit, and clarifies that the "19 Vitest tests" baseline is a **test-file** count. No new investigative work; only evidence already established during Round 1 has been restored or clarified.

---

## 1. Document Control

| Field | Value |
|---|---|
| Document ID | `DHB-R01-DEV` |
| Round | R01 |
| Status | canonical-pending-owner-acceptance |
| Audience | External development partner (post-onboarding, contractual) |
| Related internal reference | `DHB-R01-INT` (`docs/handoff/rounds/round-01/round-01-lovable-reference.md`) |
| Raw evidence | `docs/handoff/rounds/round-01/round-01-inputs.md`, `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` |
| Governing conventions | `docs/CONVENTIONS.md` |
| Central index | `docs/README.md` |
| Historical evidence | `docs/historical/documentation-01-13/`, `docs/historical/audits/dg-1-documentation-governance-audit.md`, `docs/historical/audits/dg-1a-alignment-evidence-closure.md` |

Evidence classes used: **directly verified**, **source code**, **live DB metadata**, **generated types**, **inferred**, **historical-only**, **unverified**, **contradictory**. Implementation status labels: **active**, **partial**, **schema-only**, **placeholder**, **legacy**, **superseded**, **planned**, **unknown**.

---

## 2. Executive Platform Overview

Dayli Horse is a multi-tenant equestrian operations platform. Current delivery is a browser-based web application (Vite + React 18 + TypeScript) with a **PWA kill-switch active**: `vite-plugin-pwa` is configured with `selfDestroying: true`, `main.tsx` unregisters any previously installed service worker on every load, and only `public/push-sw.js` is retained for web-push. Do not treat the platform as a PWA-ready or offline-capable product on this baseline. Native iOS/Android builds are not part of Round 1 scope.

The backend is delivered through Lovable Cloud (managed Supabase). Authentication, authorization, data storage, storage buckets, and scheduled/event-driven work all run inside that managed backend. There is no independently deployed server tier in this repository.

Round 1 establishes the technical foundation of the current platform as it exists today. It is not a certification that the platform is production-ready, launch-ready, security-hardened, or feature-complete. Later rounds cover module maturity, workflows, cross-account flows, commercial/subscription behaviour, PWA/native delivery, and roadmap/completion.

The dominant content of the live database is demo and test operational data; entities, invoices, and financial rows in the current environment must not be treated as confirmed production-customer data unless a specific record is separately verified.

---

## 3. Round 1 Scope and Coverage Boundaries

**In scope:** platform foundation; high-level architecture; database inventory and relational shape; tenancy and identity; authentication; roles/permissions/bundles/delegation; RLS and cross-tenant isolation; RPCs, functions, and triggers; storage; edge functions; deployment/environment/migration workflow; testing/quality/reliability signals; known risks; and the receiving-developer start map.

**Out of scope (later rounds):** full account-type maturity; full module inventory and per-module implementation reality; complete user workflows; cross-account operational flows; full finance/commercial and subscription behaviour; web/PWA/native-mobile delivery details; final roadmap and completion status; owner-governance material (access lists, vendor evaluations, account-recovery, offboarding, pricing, contracts) — held privately outside this repository.

---

## 4. Evidence Model and Source-of-Truth Hierarchy

1. Current repository source code and current checked-out project state.
2. Current live database metadata via read-only Supabase tooling.
3. Current generated types (`src/integrations/supabase/types.ts`) where direct DB evidence is unavailable.
4. Round 1 raw evidence (`round-01-inputs.md`, `round-01-raw-audit-output.md`) — immutable provenance.
5. DG.1A / DG.1 audits.
6. Historical Documentation 01–13.
7. Existing `docs/aml_1_b_1/**` evidence.

Current source code, migrations, and live database state override any conflicting historical claim.

---

## 5. Platform Definition and Delivery Context

- **Product identity (directly verified — source code):** "Dayli Horse"; published site `daylihorse.com`, alt `www.daylihorse.com`; preview at `id-preview--…lovable.app`; internal published URL `horse-verse-link.lovable.app`.
- **Delivery surface (directly verified — source code):** browser web application built with Vite 5 and React 18, packaged with `vite-plugin-pwa` in **kill-switch (`selfDestroying: true`)** mode. Only `public/push-sw.js` is retained as an active service worker.
- **Backend (directly verified — live DB metadata / source code):** managed Supabase (Postgres + PostgREST + Auth + Storage + Edge Functions), consumed through `src/integrations/supabase/client.ts` (auto-generated) and typed via `src/integrations/supabase/types.ts` (auto-generated).
- **Environments (verified — `.env` + `supabase/config.toml`):** the repository configuration contains **a single Supabase project reference**; no separate staging backend is evidenced in the repository. Preview, published URL, and custom-domain surfaces appear to use the same frontend environment binding. Full runtime confirmation across every deployed surface remains **owner / platform-confirmation-required**. Until that confirmation is available, treat preview actions as capable of affecting the same backend data, and evaluate separate staging before major database work. This concentration is captured as risk R-01.

---

## 6. Technology Stack

| Layer | Technology | Evidence | Status |
|---|---|---|---|
| UI framework | React 18 + TypeScript 5 | `package.json` | active |
| Build tool | Vite 5 | `package.json`, `vite.config.ts` | active |
| Styling | Tailwind CSS v3 + shadcn/ui + Radix primitives | `tailwind.config.ts`, `components.json`, `src/components/ui/**` | active |
| State & data | TanStack Query v5 | `package.json`, `src/hooks/**` | active |
| Forms | react-hook-form + `@hookform/resolvers` + zod | `package.json`, `src/lib/validations.ts` | active |
| Rich text | Tiptap (color, text-align, text-style extensions) | `package.json`, `src/contracts/**` | active |
| Backend client | `@supabase/supabase-js` v2 | `src/integrations/supabase/client.ts` | active |
| Auth | Supabase Auth (managed) | `src/contexts/AuthContext.tsx` | active |
| i18n | Custom `I18nContext`, EN/AR locales, RTL | `src/i18n/**` | active |
| Testing | Vitest (present); Playwright (installed, no suite) | `vitest.config.ts`, `playwright.config.ts` | partial |
| Drag-and-drop | `@dnd-kit/*` | `package.json` | active |
| PWA plugin | `vite-plugin-pwa` in kill-switch mode | `vite.config.ts:21-27` | active kill-switch |

Do not add server tiers (Node/Python/Ruby) to this repository. Backend concerns belong in Supabase (migrations, RLS, functions, RPCs, Edge Functions).

---

## 7. Repository and Frontend Architecture

Top-level `src/` paths (directly verified — source code):

- `src/pages/**` — approx. 60+ route-level components (`DashboardHorses.tsx`, `DashboardHousing.tsx`, `DashboardLaboratory.tsx`, `DashboardHR.tsx`, `DashboardVet.tsx`, finance pages under `src/pages/finance/**`, public/shared pages `PublicProfile.tsx`, `SharedLabReport.tsx`, `SharedMedia.tsx`, `InviteLandingPage.tsx`, `AcceptConnectionPage.tsx`, `Directory.tsx`, `CommunityFeed.tsx`).
- `src/components/**` — feature-scoped trees (`boarding/`, `breeding/`, `clients/`, `finance/`, `horses/`, `housing/`, `hr/`, `laboratory/`, `movement/`, `permissions/`, `pos/`, `services/`, `vet/`, `notifications/`, `pwa/`, `push/`, `guards/`).
- `src/hooks/**` — feature and cross-cutting hooks including `usePermissions.ts`, `useModuleAccess.ts`, `useNotifications`, `useClients`, plus subfolders `finance/`, `housing/`, `hr/`, `laboratory/`, `roles/`, `notifications/`.
- `src/lib/**` — pure logic: `finance/` (allocation, distribution, KPI, tax, invoice presentation, pagination), boarding proration, breeding eligibility, notifications helpers, pricing resolver, formatters, validations.
- `src/contexts/**` — `AuthContext`, `TenantContext`. (`I18nContext` lives under `src/i18n/**`; see the i18n row above.)
- `src/i18n/**` — bilingual (EN/AR) localization with RTL.
- `src/navigation/**` — three declarative nav configs: `navConfig.ts`, `workspaceNavConfig.ts`, `labNavConfig.ts` (909 total lines — a single-source reconciliation is a Round 2 output; risk R-16).
- `src/integrations/supabase/{client,types}.ts` — auto-generated. **Do not hand-edit.**
- `src/contracts/**` — templates and Tiptap-based document editor.
- `supabase/**` — migrations, edge functions, and database tests.

Frontend conventions (directly verified — source + project rules):

- Design tokens in `src/index.css`; never hardcode colour utilities (`bg-white`, `text-black`, `bg-[#...]`) — use semantic tokens/shadcn variants.
- Mobile-first layouts; RTL balance uses `flex-1`/`flex-grow`.
- Workspace-class dialogs: `flex-col`, fixed header/footer (`shrink-0`), single scrollable body `max-h-[85vh]`; no nested scroll containers.
- Two toast systems (shadcn `Toaster` + `sonner`) are currently mounted simultaneously — risk R-10.

---

## 8. Routing, Guards, Shell, and Navigation

- Router root: `src/App.tsx` (directly verified). Composes providers (`AuthContext`, `TenantContext`, `I18nContext`, TanStack Query) and mounts ~20 top-level routes plus nested workspace routes.
- Authenticated shell: `src/components/layout/DashboardShell.tsx` + `DashboardHeader.tsx`.
- UI-side authorization uses `hasPermission()` from `src/hooks/usePermissions.ts`; server-side authorization uses `has_permission()` in the database. **UI hides are not enforcement.**
- Route categories (directly verified — `src/App.tsx`):
  - **Public** (no auth): `Index`, `Directory`, `PublicProfile`, `TenantPublicProfile`, `SharedLabReport`, `SharedMedia`, `InviteLandingPage`, `AcceptConnectionPage`, `ForgotPassword`, `ResetPassword`, `CommunityFeed`.
  - **Auth**: `/auth`, `/forgot-password`, `/reset-password`.
  - **Onboarding**: `/select-role`, `/create-profile/*`.
  - **Dashboard** (authenticated): dashboard tree under `DashboardShell`.
  - **Redirect / legacy**: `/dashboard/boarding-contracts` → `/dashboard/contracts?type=boarding`; standalone Movement → `/dashboard/housing?tab=movement`.

### 8.1 Guard matrix (directly verified — `src/components/guards/`, `src/App.tsx`)

| Guard | File | Purpose | Checks performed | Checks NOT performed | Risk / limitation | Evidence class |
|---|---|---|---|---|---|---|
| `ProtectedRoute` | `src/App.tsx` (route wrapper) | Require an authenticated user | Session presence via `AuthContext` | Tenant selection, permission keys, module capability | Authenticated routes that rely on RLS alone (e.g. `/dashboard`, `/dashboard/mobile/:moduleKey`, `/dashboard/my-payments`, `/dashboard/my-bookings`, `/profile/:id`, `/dashboard/settings/notifications`, `/dashboard/contracts/documents/:documentId`) may be **manually reachable**; data protection still depends on backend RLS | source code |
| `AuthRoute` | `src/App.tsx` (route wrapper) | Redirect signed-in users away from auth pages | Session absence | Full onboarding state | Assumes hydration order; short-lived flicker acceptable | source code |
| `WorkspaceRouteGuard` | `src/components/guards/WorkspaceRouteGuard.tsx` | Gate a route by workspace mode / active tenant / permission key | Waits for `tenantHydrated`; enforces `requiredMode`, active tenant (organization), `requiredPermission` via `hasPermission()` | Deep per-record authority — RLS is authoritative | Toasts + redirect on failure; not exhaustive per action | source code |
| `ModuleGuard` | `src/components/guards/ModuleGuard.tsx` | Gate a module route (`laboratory`, `vet`, `housing`, `movement`, `breeding`) | `useModuleAccess` capability flag / lab mode | Permission keys inside the module | Missing capability toasts and redirects; only checks the named module | source code |
| `CommunityRouteGuard` | `src/components/guards/CommunityRouteGuard.tsx` | Hybrid Community access | Personal mode allowed unconditionally; organization mode requires active tenant + `community.view` (owner bypass) | Per-post visibility — enforced by RLS on `posts` | Personal feed always allowed while signed in | source code |
| `I18nRecoveryBoundary` | `src/components/guards/I18nRecoveryBoundary.tsx` | DEV-only recovery from stale I18n context after HMR | Catches error whose message includes `I18nProvider` and forces reload | Any production behaviour (no-op passthrough in prod) | Dev-experience only | source code |

**DEV-only surface (directly verified — `src/App.tsx:161`):** the `DebugAuth` route is mounted **only when `import.meta.env.DEV` is true**, so it is not shipped in production builds. It is a source-level informational observation and is **outside the 16-row material risk register** (it is **not** R-04; R-04 is the Storage `storage.objects` policy risk). Manually reachable authenticated routes above do **not** bypass RLS; their data protection continues to depend on backend RLS enforcement.



---

## 9. Backend and Supabase Architecture

- Managed Supabase project accessed via `src/integrations/supabase/client.ts`. The publishable/anon key is exposed to the browser by design; the service-role key and database password are **not accessible** inside this environment and must never be embedded, echoed, or fabricated.
- Migrations directory: `supabase/migrations/`. Round 1 baseline: **322 migrations** (directly verified). Migrations are append-only; every migration that creates a `public` table must ship GRANTs, `ENABLE ROW LEVEL SECURITY`, and explicit `CREATE POLICY` statements in the same file.
- Edge Functions: `supabase/functions/` — 7 functions (see §16).
- Database tests: `supabase/tests/database/*.sql` — 5 SQL harnesses (source-checkout ×2, catalog runtime ×2, payment-session RPC).
- Project-level config: `supabase/config.toml` (auto-managed) — do not hand-edit outside approved flows.

---

## 10. Database Baseline (Round 1 Verified Counts)

Directly verified via live DB metadata during Round 1:

| Metric | Count |
|---|---|
| Public tables | **158** |
| Views | 6 |
| Enums | 24 |
| Functions (public schema) | **317** |
| Triggers (non-internal) | **167** |
| Indexes | 627 |
| Foreign keys | 510 |
| Unique constraints | 48 |
| RLS policies | **507** |
| Tables with RLS enabled | **158 / 158** |
| Storage buckets | 2 |
| Edge Functions | 7 |
| Migrations at baseline | 322 |

**Zero-policy public tables (RLS on, no client policies — fail-closed, RPC-only):**
`finance_request_idempotency`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `pos_sales`.

**Core domain clusters (evidence: source code + generated types + `docs/aml_1_b_1/**`):**

- Identity & tenancy — `auth.users` (managed), `profiles`, `tenants`, `tenant_members`, `tenant_role_permissions`, `tenant_role_bundles`, `tenant_role_preset_bindings`, `tenant_capabilities`.
- Permissions — `permission_definitions`, `permission_bundles`, `bundle_permissions`, `member_permissions`, `member_permission_bundles`, `delegation_scopes`, `delegation_audit_log`, `role_audit_log`.
- Horses & registry — `horses`, `horse_ownership`, `horse_shares`, `horse_share_packs`, `horse_owner_*`, plus lightweight `lab_horses` bridged via microchip.
- Housing & facilities — `branches`, `facility_areas`, `housing_units`, `housing_unit_occupants`, `boarding_admissions`, `boarding_status_history`, `horse_movements`, `incoming_horse_movements`, `external_locations`.
- Vet & laboratory — `vet_visits`, `vet_treatments`, `vet_medications`, `vet_followups`, `horse_vaccinations`, `lab_requests`, `lab_submissions`, `lab_samples`, `lab_results`, `lab_services`, `lab_templates`, `lab_test_types`.
- Finance — `invoices`, `invoice_items`, `ledger_entries`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `billing_links`, `customer_balances`, `expenses`, `tax_pricing` (via `tenants.default_tax_rate`), `pos_sales`, `pos_sessions`.
- HR — `hr_employees`, `hr_assignments`, `hr_salary_payments`, `hr_employee_events`, `hr_settings`.
- Connections & partners — `connections`, `consent_grants`, `connection_horse_access`, `invitations`.
- Notifications — `notifications`, `notification_preferences`, `tenant_notification_governance`, `push_subscriptions`.
- Community & directory — `posts`, `post_comments`, `post_likes`, `follows`, `public_profile_fields`.
- Contracts & documents — `contract_templates`, `contract_template_versions`, `contract_documents`, `contract_document_events`, `boarding_contracts`, `breeding_contracts`.

Repository-root `.schema.txt` snapshots (`invoices`, `invoice_items`, `billing_links`, `customer_balances`, `expenses`) are legacy artifacts — treat as historical references, not current truth.

### 10.1 Core relationship map (Round 1 verified subset)

Textual relationship map — every arrow below is grounded in current source, generated types, or Round 1 raw evidence. Not exhaustive; exact per-column FKs must be regenerated from live metadata before structural change.

```text
auth.users ──1:1──> profiles (profiles.id = auth.users.id)
auth.users ──1:N──> tenant_members ──N:1──> tenants
tenants ──1:N──> tenant_roles / tenant_role_permissions / tenant_role_bundles / tenant_role_preset_bindings
tenants ──1:N──> permission_bundles ──1:N──> bundle_permissions
tenant_members ──1:N──> member_permissions / member_permission_bundles / delegation_scopes
tenants ──1:N──> branches / horses / clients / invoices / tenant_capabilities
horses ──1:N──> horse_ownership / horse_shares / horse_share_packs
horses ──1:N──> horse_movements / boarding_admissions / housing_unit_occupants
horses ──1:N──> vet_visits / vet_treatments / horse_vaccinations
horses ──1:N──> lab_requests (direct)  and  ──microchip──> lab_horses ──1:N──> lab_requests
clients ──1:N──> invoices ──1:N──> invoice_items
invoices ──1:N──> ledger_entries; clients ──1:1──> customer_balances
payment_sessions ──1:N──> payment_allocations ──1:N──> payment_horse_allocations
payment_allocations ──N:1──> invoices
connections (tenant_a ↔ tenant_b) ──1:N──> consent_grants / connection_horse_access
```

### 10.2 Snapshot vs live-reference patterns

- `invoice_items` persists **frozen snapshots** (name, unit price, tax, service source, category, horse, boarding period) at approval time via `_invoice_items_fill_snapshots`; downstream renaming of source rows does not mutate the invoice line.
- `ledger_entries` records posted amounts against the invoice at approval time; later invoice edits require cancel + re-approve to update the ledger.
- `payment_allocations` and `payment_horse_allocations` capture per-session allocation decisions; totals should be recomputed from allocations, never mutated in place.

### 10.3 Polymorphic and entity-reference patterns

The following polymorphic references exist and **may not be FK-enforced**; referential integrity is enforced by application/RPC code, not by the database, so orphan rows must be handled defensively:

| Table | Reference columns | Purpose |
|---|---|---|
| `notifications` | `entity_type` (text) + `entity_id` (uuid) | Route notification to the originating record |
| `billing_links` | `source_type` (text) + `source_id` (uuid) | Map an operational event to an invoice (`deposit`/`final`/`refund`/`credit_note`) |
| `ledger_entries` | reference columns for source-invoice / source-payment | Ledger provenance |
| `contract_document_events` | entity + event_type | Contract document audit |

### 10.4 Legacy / potentially-unused objects requiring verification before retirement

- Root `.schema.txt` snapshots noted above.
- `database_export_20_07_26` Storage bucket (R-13).
- `admin` value in `tenant_role` enum (kept for backward compatibility, not used in UI — H-03).
- Legacy `/dashboard/boarding-contracts` page (redirects; H-04).
- Standalone Movement route (consolidated under Housing; H-05).

Do not delete these without a dedicated verification round.

---


## 11. Authentication, Profiles, Tenants, and Memberships

- Authentication: managed Supabase Auth via `src/contexts/AuthContext.tsx`. Email/password is active; social OAuth (e.g. Google) is configurable via managed provider surface — do not embed provider secrets. Social OAuth redirect URIs must be same-origin public URLs (`window.location.origin` or `${origin}/auth/callback`), not protected routes.
- `src/contexts/TenantContext.tsx` exposes `activeTenant` and `activeRole`; tenant switching is driven by `TenantSwitcher.tsx`. Active tenant is persisted to `localStorage.activeTenantId`. `WorkspaceRouteGuard` waits for `tenantHydrated` before gating, so pre-hydration render is safe.
- Tenant membership is stored in `tenant_members`; multi-tenancy is allowed (one user may hold multiple memberships).
- Membership rows fetched with `is_active=true`; inactive memberships silently drop from the list — no explicit UI warning today.

### 11.1 Tenant creation is non-atomic — DIRECTLY VERIFIED

Source: `src/contexts/TenantContext.tsx:318-483` (verified this round: `createTenant` at line 318; `initialize_tenant_defaults` RPC call at line 446). The current flow is:

1. `supabase.auth.getUser()` — validate session.
2. Client-side zod validation via `tenantSchema`.
3. `.insert()` into `tenants` (with `owner_id: currentUserId`).
4. `.insert()` into `tenant_members` (`role: 'owner'`, `can_invite: true`, `can_manage_horses: true`). On failure: `.delete()` the tenant as manual rollback.
5. `rpc('initialize_tenant_defaults', { p_tenant_id, p_tenant_type })` — **non-blocking**. On failure: tenant + owner remain persisted; capabilities are missing (silent WARNING in logs only).
6. `refreshTenants()` (background).

Failure classification: steps 1–4 are blocking; step 5 is silently non-blocking. This is captured as high-severity risk R-02 and its remediation (wrap in a single `SECURITY DEFINER` RPC) is the recommended next step for any team touching tenant creation.

Onboarding routes exist for 10 tenant types (`stable`, `clinic`, `lab`, `academy`, `pharmacy`, `transport`, `auction`, `horse_owner`, `trainer`, `doctor`), all instantiating `CreateStableProfile` with a `tenantType` prop — parity with the `tenant_type` enum is confirmed.

---

## 12. Roles, Permissions, Bundles, and Delegation

Permission architecture (DB metadata + `src/hooks/usePermissions.ts`):

| Table | Purpose |
|---|---|
| `permission_definitions` | Master registry of ~**104** permission keys (dotted vocabulary). Fields: `key`, `module`, `resource`, `action`, `display_name`, `display_name_ar`, `is_delegatable`. |
| `permission_bundles` | Named permission sets, tenant-scoped, `is_system` flag. |
| `bundle_permissions` | `(bundle_id, permission_key)` join. |
| `tenant_roles` | Custom per-tenant roles. |
| `tenant_role_permissions` | Direct role → permission grants. |
| `tenant_role_bundles` | Role → bundle assignments. |
| `tenant_role_preset_bindings` | Preset templates. |
| `member_permissions` | Per-member grant/revoke overrides. |
| `member_permission_bundles` | Per-member bundle assignments. |
| `delegation_scopes` | Scoped delegation grants (`can_delegate` flag). |
| `delegation_audit_log`, `role_audit_log` | Audit trails. |

**Frontend resolution order (verified in `src/hooks/usePermissions.ts:207-240`, mirrors server order):**

1. Owner → all permissions.
2. Role-direct permissions (`tenant_role_permissions`).
3. Role bundles (`tenant_role_bundles` → `bundle_permissions`).
4. Member bundles (`member_permission_bundles` → `bundle_permissions`).
5. Member overrides (`member_permissions.granted` — last wins).

Non-owner effective permissions are cached for 5 min. UI hides are not enforcement; server RLS is the truth.

Manager effective permissions are derived from persisted role grants (`tenant_role_permissions`), role bundles (`tenant_role_bundles` → `bundle_permissions`), member bundles, and member overrides. Owner is the only role with a server-side bypass in `has_permission()`. Delegation additionally requires `admin.permissions.delegate`, a delegatable `permission_definitions` row, and an applicable `delegation_scopes` entry. Manager is a tenant-seeded system role and is tenant-configurable; do not assume every manager has every non-delegation permission — verify the tenant's current `tenant_role_permissions` configuration.

**Backend enforcement helpers (`SECURITY DEFINER`, all with pinned `search_path`):** `has_permission`, `has_tenant_role`, `is_tenant_member`, `is_active_tenant_member`, `check_tenant_permission`, `can_delegate_permission`, `can_invite_in_tenant`, `can_access_shared_resource`.

Do **not** hardcode role names in new code — check permission keys. User roles remain in `user_roles`-style / tenant-role tables; never on `profiles`.

### 12.1 Authority questions — Round 1 answers

| # | Question | Answer |
|---|---|---|
| 1 | Can a normal member perform writes hidden by the UI? | Yes on tables whose write RLS is `is_tenant_member`-only (broader than intended). Not exhaustively enumerated. Where policies use `has_permission()`, hidden writes are blocked. Front-end hides never enforce. |
| 2 | Can a custom role see a button but be rejected by RLS? | Yes — `usePermissions` cache is 5 min; server RLS is the truth. UI can lag. By design. |
| 3 | Can a hidden route be opened manually? | Yes for `ProtectedRoute`-only routes (`/dashboard`, `/dashboard/mobile/:moduleKey`, `/dashboard/my-payments`, `/dashboard/my-bookings`, `/profile/:id`, `/dashboard/settings/notifications`, `/dashboard/contracts/documents/:documentId`). All rely on RLS to hide data. |
| 4 | Can the final owner be removed or demoted? | Not verified this round. No explicit "last owner" guard was found. Requires reading `remove_tenant_member` / role-update RPCs. Flagged R-08. |
| 5 | Can a manager delegate owner-level authority? | No. `admin.permissions.delegate` is never granted to `manager` in any current tenant, and delegation additionally requires a delegatable definition plus a `delegation_scopes` row. Other manager permissions are tenant-configurable. |
| 6 | Can a user change their own tenant role? | Not verified this round — `tenant_members` policy bodies not inspected. Flagged R-08. |
| 7 | Can one tenant modify another tenant's membership? | RLS on `tenant_members` should scope by tenant; body not verified this round. Flagged R-08. |
| 8 | Can a `SECURITY DEFINER` function accept a foreign tenant ID? | Functions take `p_tenant_id` and rely on internal `is_active_tenant_member(auth.uid(), p_tenant_id)` checks (pattern verified in `create_source_checkout_invoice`, `post_payment_session`). All DEFINER functions in this pass have pinned `search_path`. Per-function verification is Round 2 scope. |
| 9 | Are membership-only writes broader than intended? | Likely yes on some legacy tables. Full enumeration deferred. |
| 10 | Can normal users write directly to system-managed finance or audit tables? | No — `finance_request_idempotency` has 0 client policies; audit logs are populated only by triggers/DEFINER RPCs. |

---

## 13. Multi-Tenancy, RLS, and Cross-Tenant Isolation

- **Coverage (directly verified):** 158/158 public tables have RLS enabled; 507 policies across those tables; 0 tables have RLS disabled; 7 tables are zero-policy fail-closed (list above §10).
- **Search-path safety:** the DB metadata scan returned **zero** `SECURITY DEFINER` functions in the `public` schema without a pinned `search_path`. No search-path-based privilege escalation surface was found this round. ✅
- **Workspace-scope pattern (verified only where inspected):** some tables support a personal scope with `tenant_id IS NULL` and an organization scope with `tenant_id IS NOT NULL`. The exact table-by-table scope must be verified against each table's policy bodies; do not generalize this pattern to every table, and do not generalize it to every paid account. Broad account-type / subscription statements are out of Round 1 scope.
- **Cross-tenant partner access:** governed by `connections`, `consent_grants`, `connection_horse_access`, `horse_shares`, `horse_share_packs`, `media_share_links`, and RPCs `accept_connection`, `create_connection_request`, `finalize_invitation_acceptance`. Do not bypass the RPC/RLS layer.
- **Observed policy absence — `hr_employees` DELETE:** the current policy bodies show no client-visible DELETE policy on `hr_employees`. Whether that absence is intentional fail-closed behaviour or an unrecognized gap must be verified from the current policy bodies **and** the actual write paths (RPC vs UI). **Do not add a DELETE policy without that investigation.** Absence of a policy is not automatically a bug; it is also not automatically safe.
- **Every new `public` table** must ship, in one migration: `CREATE TABLE` → `GRANT`s appropriate to policy roles → `ENABLE ROW LEVEL SECURITY` → explicit `CREATE POLICY` statements. Missing GRANTs cause runtime permission errors even with RLS.
- **Never modify** the `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas — including triggers on those schemas.
- **Full policy-body enumeration is deferred to Round 2.** Spot checks show alignment with `has_permission()` on finance/horses; some legacy reads still use `is_tenant_member` (see H-07 §19).

### 13.1 Isolation-helper inventory (`SECURITY DEFINER`, pinned `search_path` unless noted)

| Function | Signature (shape) | Security mode / search path | Purpose |
|---|---|---|---|
| `has_permission` | `(_user_id uuid, _tenant_id uuid, _permission_key text) → boolean` | DEFINER, pinned | Authoritative permission check (RLS + UI parity) |
| `check_tenant_permission` | `(_user_id uuid, _tenant_id uuid, _permission_key text) → boolean` | DEFINER, pinned | Alternate wrapper used by legacy policies |
| `has_tenant_role` | `(_user_id uuid, _tenant_id uuid, _role text) → boolean` | DEFINER, pinned | Legacy role check (do not reintroduce hardcoded roles) |
| `is_tenant_member` | `(_user_id uuid, _tenant_id uuid) → boolean` | DEFINER, pinned | Broad membership predicate — often too broad for writes |
| `is_active_tenant_member` | `(_user_id uuid, _tenant_id uuid) → boolean` | DEFINER, pinned | Active membership predicate; preferred for write policies |
| `can_delegate_permission` | `(_user_id uuid, _tenant_id uuid, _permission_key text) → boolean` | DEFINER, pinned | Delegation gate |
| `can_invite_in_tenant` | `(_user_id uuid, _tenant_id uuid) → boolean` | DEFINER, pinned | Invite authority |
| `can_access_shared_resource` | `(_user_id uuid, _resource_type text, _resource_id uuid) → boolean` | DEFINER, pinned | Shared-resource gate |
| `_active_tenant_context` | `() → uuid` | DEFINER, pinned | Resolve currently-active tenant for the request |
| `_resolve_horse_*` family (where verified) | horse authority helpers | DEFINER, pinned | Horse-scoped authority resolution |

### 13.2 Representative RLS matrix (spot-verified, not exhaustive)

| Domain | Read basis | Write basis | Cross-tenant exception | Confidence |
|---|---|---|---|---|
| Horses / horse_ownership | `is_tenant_member` or shared-access predicate | `has_permission('horse.*')` on inspected policies | `horse_shares`, `connection_horse_access` | HIGH (spot) |
| Invoices / invoice_items | tenant membership + `has_permission('finance.invoice.view')` on inspected policies | `has_permission('finance.invoice.edit')`; approval only via RPC | none | HIGH (spot) |
| Ledger entries | tenant membership | writes via `_finance_ledger_insert` DEFINER only | none | HIGH (spot) |
| Payment sessions / allocations | tenant membership | writes via `post_payment_session` DEFINER only | none | MEDIUM |
| POS sales | zero client policies | writes via `create_pos_sale` DEFINER only | none | HIGH |
| Tenants / tenant_members | membership scoped | tenant-scoped writes — body not fully inspected (R-08) | none | LOW (body pending) |
| Connections / consent_grants | connection endpoints | RPC-only (`create_connection_request`, `accept_connection`) | intentional | MEDIUM |
| Posts (community) | 15 policies covering `public`/`followers`/`private` × personal/org | scoped to author + workspace | followers via `follows` | LOW (Round 2 resolution) |
| Notifications | recipient-scoped | inserts via DEFINER helpers | none | MEDIUM |
| App settings | tenant membership | permission-gated | none | LOW |
| Claim / access tables (`horse_owner_*`, `owner_claim_*`, `owner_delegations`, `horse_owner_access_grants`) | zero policies | RPC-only | intentional fail-closed | HIGH |

### 13.3 Cross-tenant pattern classification (Round 1 subset)

| Pattern | Vehicle | Notes |
|---|---|---|
| Stable ↔ Lab | `lab_horses` linked via microchip; `lab_requests` submissions | Do not merge with primary `horses` blindly |
| Stable ↔ Horse Owner | `horse_owner_access_grants`, `horse_owner_invites`, `owner_delegations` | Zero-policy — RPC-only |
| Stable ↔ Doctor | `doctor_services` separate from `tenant_services` (H-02 debt) | Round 2 audit |
| Connected movement | `record_horse_movement_with_housing` + connection scoping | 20-parameter contract |
| Partner connections | `connections` + `consent_grants` + `connection_horse_access` | LEAST/GREATEST unique partial index |
| Consent grants | `consent_grants` (auto-revoke trigger) | `trg_connections_auto_revoke_grants` |
| Horse sharing | `horse_shares`, `horse_share_packs` | Time/scope bounded |
| Shared media | `media_share_links` (+ `shared-media-sign` edge fn) | Signed URLs may outlive revocation (R-04) |
| Public token links | `SharedLabReport`, `SharedMedia`, `AcceptConnectionPage` | Token expiry enforcement not fully audited (R2) |
| Invitations | `invitations` + `finalize_invitation_acceptance` | Verifies email/phone before joining |
| Client claim | `claim_client_portal` DEFINER | Token-based |

### 13.4 Isolation-risk review (evidence-boundary)

- **Foreign-tenant-ID validation:** DEFINER RPCs typically accept `p_tenant_id` and rely on `is_active_tenant_member(auth.uid(), p_tenant_id)` (spot-verified). **Per-RPC validation across all 317 functions is unverified — requires Round 2 body audit.**
- **Token expiry enforcement:** share/invite tokens carry `expires_at`; enforcement inside every consumer path is **unverified** in Round 1.
- **Post-revocation signed URLs:** Storage signed URLs can outlive a revocation event (R-04).
- **Storage `storage.objects` policies:** not enumerated in Round 1 (R-04).
- **Duplicate / overlapping policies:** Round 1 did not run an overlap census; a duplicate-policy audit is a Round 2 input.

---


## 14. RPC, Function, and Trigger Registry

**Function census: 317 public-schema functions.** Priority anchors (verified subset):

| Function | Signature / parameter shape | Security mode / search path | Purpose | Callers | Current status | Validation limitation |
|---|---|---|---|---|---|---|
| `create_invoice_with_items` | `(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` | DEFINER, pinned | Atomic invoice + items + snapshots + idempotency | `src/lib/finance/invoiceRpc.ts`, `useLabInvoiceDraft.ts` | active | body inspection deferred to R2 |
| `create_source_checkout_invoice` | same shape | DEFINER, pinned | Source-checkout invoice with trace | POS `EmbeddedCheckout` | active | body inspection deferred to R2 |
| `approve_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id)` | DEFINER, pinned | Post ledger; freeze snapshots | `src/lib/finance/approveInvoice.ts` | active | body inspection deferred to R2 |
| `cancel_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id, p_effective_date, p_reason)` | DEFINER, pinned | Cancel + reverse ledger | finance hooks | active | body inspection deferred to R2 |
| `delete_draft_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id)` | DEFINER, pinned | Delete draft only | finance UI | active | body inspection deferred to R2 |
| `post_payment_session` | `(p_tenant_id, p_idempotency_key, p_payload jsonb)` | DEFINER, pinned | Atomic multi-invoice payment + allocation + idempotency | `src/lib/finance/postPaymentSession.ts` | active | body inspection deferred to R2 |
| `get_payment_session` | `(p_tenant_id, p_session_id)` | DEFINER, pinned | Read session with allocations | finance UI | active | — |
| `create_pos_sale` | `(p_tenant_id, p_idempotency_key, p_payload)` | DEFINER, pinned | POS sale | `pos/EmbeddedCheckout` | active | body inspection deferred to R2 |
| `_finance_invoice_approve_inline` | `(p_tenant_id, p_invoice_id, p_actor)` | DEFINER, pinned | Inline approval helper | internal | active | — |
| `_finance_ledger_insert` | 12-arg | DEFINER, pinned | Sole ledger insert path | internal | active | — |
| `_finance_provision_tenant_payment_account` | `()` | DEFINER, pinned | Auto-provision payment account | internal | active | — |
| `initialize_tenant_defaults` | `(p_tenant_id uuid, p_tenant_type text)` | DEFINER, pinned | Capability seeding | `TenantContext.createTenant` (non-blocking) | active — non-blocking (R-02) | wraps within non-atomic createTenant flow |
| `create_connection_request` | 8-arg | DEFINER, pinned | Cross-tenant invite | connection hooks | active | body inspection deferred to R2 |
| `accept_connection` | `(_token text)` | DEFINER, pinned | Accept via token | `AcceptConnectionPage` | active | token-expiry enforcement across paths unverified |
| `finalize_invitation_acceptance` | `(_token text)` | DEFINER, pinned | Invite acceptance with email/phone verification | `InviteLandingPage` | active | — |
| `claim_client_portal` | `(_token text)` | DEFINER, pinned | Client claim | client portal flows | active | body inspection deferred to R2 |
| `record_horse_movement_with_housing` | **20 parameters** (see below) | DEFINER, pinned | Movement + housing sync | `movement/RecordMovementDialog` | active | Direct occupancy writes forbidden |
| `create_boarding_contract_with_connection` | 7-arg | DEFINER, pinned | Boarding contract via connection | boarding hooks | active | — |
| `approve_boarding_contract_as_owner` / `_as_stable` | see source | DEFINER, pinned | Two-sided approval | boarding UI | active | — |
| `update_horse_identity` | `(p_horse_id, p_active_tenant_id, p_payload jsonb)` | DEFINER, pinned | Governed identity edits | horse wizard | active | — |
| `complete_local_horse_record` | same shape | DEFINER, pinned | Custodial local completion | `HorseProfile` | active | — |
| `create_lab_report_share` | see source | DEFINER, pinned | Lab sharing | lab hooks | active | signed-URL longevity — R-04 |
| `check_tenant_limit` | see source | DEFINER, pinned | Enforce tenant limits | UI + policies | active | — |

Per-function tenant-authority validation was **not** enumerated across all 317 functions in Round 1; do not assume every DEFINER function validates `p_tenant_id` against `auth.uid()` without reading its body.


**Movement RPC contract (directly verified in `supabase/migrations/20260620151442_65c6a9d4-a351-4e79-b470-c99d9e1f4f43.sql`):** `record_horse_movement_with_housing` now takes **20 parameters** — `p_tenant_id, p_horse_id, p_movement_type, p_from_location_id, p_to_location_id, p_from_area_id, p_from_unit_id, p_to_area_id, p_to_unit_id, p_movement_at, p_reason, p_notes, p_internal_location_note, p_is_demo, p_clear_housing, p_destination_type, p_from_external_location_id, p_to_external_location_id, p_movement_status, p_movement_subtype`. Prior v1.0.0 documentation stating "19 parameters" is corrected here. Returns `jsonb`. Direct writes to occupancy tables remain prohibited — go through admissions.

**Trigger architecture (167 non-internal, spot-verified):**

- Snapshot enforcement: `_invoice_items_fill_snapshots`, `_invoice_items_validate_source` (BEFORE INSERT/UPDATE on `invoice_items`).
- Housing sync: `trg_sync_contract_phase_from_admission` on `boarding_admissions`.
- Notifications: `_push_on_notification_insert` on `notifications` (AFTER INSERT).
- Connections: `trg_connections_audit`, `trg_connections_auto_revoke_grants`, `trg_notify_connection_created`, `trg_notify_connection_status_change`, `trg_normalize_connection_email`, `trg_connections_updated_at`.
- Consent grants: `trg_consent_grants_audit`, `trg_consent_grants_updated_at`.
- Breeding: `trg_log_breeding_attempt_event`, `trg_validate_breeding_attempt`, `update_breeding_attempts_updated_at`.
- Bundle permissions: `trg_audit_bundle_permissions`.
- Horse identity/authority: `_trg_lock_horse_owner_tenant_change`, `_trg_lock_horse_ownership_scope`, `_trg_provision_stable_local_record_permissions`.
- Standard `update_updated_at_column` widely applied.
- Auth-trigger inventory (`handle_new_user`-style on `auth.users`) was **not** inspected this round — Round 2 input.

Contract-consistency signals: ~**554** `as any` occurrences in `src/` (mostly at Supabase call boundaries — indicates types-file drift or intentional bypass); 98 `.rpc(` callsites; no global RPC-error normalizer.

---

## 15. Storage and File Handling

Buckets (directly verified — `storage.buckets`):

| Bucket | Public | Size limit | MIME allow-list | Purpose | Status |
|---|---|---|---|---|---|
| `horse-media` | private | 52,428,800 (50 MB) | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, `video/quicktime` | Horse media, community posts, general media | active |
| `database_export_20_07_26` | private | none | none | Dated audit / backup artifact | legacy — do not use for production (R-13) |

Primary access layer: `useMediaAssets`, `useMediaShareLinks`, `useHorseFile`, `useHorseFileAccess`, `useHorseFileProjection`. Signed URLs are issued through the `shared-media-sign` edge function (`verify_jwt = false`), supporting public token flow. Media sharing lifecycle via `media_share_links` (with `expires_at`).

Not enumerated this round (deferred, R-04): path conventions, per-object policies in `storage.objects`, client-side pre-upload size checks, MIME/extension mismatch enforcement, cross-tenant leakage via long-lived signed URLs.

---

## 16. Notifications and Edge Functions

**Notifications architecture:** `notifications` (13 cols, 3 policies) → AFTER INSERT trigger `_push_on_notification_insert` fans out via `send-push-notification`. Fan-out helpers: `_notify_tenant_members(...)` overloads (DEFINER, pinned `search_path`). Preferences: `notification_preferences` (per-user); tenant governance: `tenant_notification_governance`; push subscriptions: `push_subscriptions`. Client registry: `src/lib/notifications/{familyRegistry,helpers,policy,presets,routeDescriptor,summary}.ts`. Metadata-driven, localized, with deduplication windows.

**Edge Function inventory (directly verified — `supabase/config.toml` + source):**

| Function | LOC | verify_jwt | Purpose | Secrets (names only) | Status |
|---|---|---|---|---|---|
| `send-invitation-email` | 345 | ✅ true | Deliver invitation emails | Email provider secret (name not enumerated) | active |
| `send-ownership-notification` | 282 | ✅ true | Ownership change notifications | Email provider secret | active |
| `send-push-notification` | 439 | ❌ false | Web-push fan-out from `notifications` trigger | `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | active |
| `get-vapid-key` | 25 | ❌ false | Serve VAPID public key to client | `VAPID_PUBLIC_KEY` (read-only) | active |
| `shared-media-sign` | 91 | ❌ false | Sign Storage URLs for public share tokens | Storage service creds | active |
| `expire-stale-connections` | 113 | ❌ false | Scheduled: mark connections past `expires_at` | none obvious | scheduled — actual cron not verified (R-05) |
| `mark-overdue-invoices` | 64 | ❌ false | Scheduled: overdue-invoice sweep | none obvious | scheduled — actual cron not verified (R-05) |

Every `verify_jwt=false` function must self-validate its caller.

---

## 17. Environments, Deployment, and Migration Workflow

- **Environment binding (verified):** `.env` contains **only** `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` — a single project reference. `supabase/config.toml.project_id` matches. Preview, published URL, and custom-domain surfaces appear to use the **same** frontend environment binding, but full runtime confirmation across every deployed surface is **owner / platform-confirmation-required**. Until confirmed otherwise, treat preview actions as capable of affecting the same backend data, and evaluate separate staging before major database work. Captured as high-severity R-01.
- **Build & deployment:** `vite build` (or `vite build --mode development`); no `typecheck` or `test` script wired in `package.json`; `lint` = `eslint .`. Deployment via Lovable managed hosting. Repository workflow: `.github/workflows/n2-4-controlled-supabase-runtime.yml` exists — content not inspected (R2 input).
- **PWA generation:** kill-switch (`selfDestroying: true`) — no true app-shell PWA today. Only `public/push-sw.js` is retained.
- **Environment-variable registry (values NOT included):**

| Variable | Purpose | Consumer | Frontend-safe | Notes |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Project URL | `client.ts` | ✅ | public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon JWT | `client.ts` | ✅ | public |
| `VITE_SUPABASE_PROJECT_ID` | Project ref | build | ✅ | public |
| `VAPID_PUBLIC_KEY` | Push key (public half) | `get-vapid-key` | ✅ | Cloud secret |
| `VAPID_PRIVATE_KEY` | Push private key | `send-push-notification` | ❌ | Cloud secret |
| `VAPID_SUBJECT` | Mailto for VAPID | push fn | ✅ | Cloud secret |
| Email provider key (name TBD) | Transactional email | invitation / ownership fns | ❌ | Cloud secret (existence assumed) |

- **Migration & release safety:** 322 timestamp-prefixed migrations = deterministic order. Rollback scripts appear under `docs/aml_1_b_1/**/*ROLLBACK.sql` as intentional bundles; no automated rollback tooling. Schema and data changes are sometimes mixed within a single migration (backfills authored inline). No rolling backup policy is visible; `database_export_20_07_26` is a one-off snapshot artifact.
- **Secrets:** service-role key and DB password are **not available** in this environment. Do not fabricate placeholders. New secrets go through the managed secret tool.

---

## 18. Testing, Quality, Performance, and Reliability

Testing inventory (Round 1 baseline):

| Kind | Present | Count | Notes |
|---|---|---|---|
| Unit tests (Vitest) | ✅ | **19 test files** (individual test-case count not independently enumerated in Round 1) | Finance-heavy (12 in `src/lib/finance/__tests__/`), 4 in `src/components/finance/__tests__/`, 1 housing chip, 1 lab checkout safety, 1 POS checkout contract |
| Hook tests | ✅ | 1 (`useLabInvoiceDraftRpcCutover`) | Minimal |
| Component tests | ✅ | 2 (invoice details, PDF paginator) | Minimal |
| Integration tests | ⚠ | 0 | Absent |
| End-to-end tests | ❌ | 0 (Playwright installed; only `playwright.config.ts` + `playwright-fixture.ts`; no `playwright/**` suite) | Absent |
| RLS tests | ❌ | 0 | Absent |
| RPC tests | ✅ | 5 SQL harnesses (source-checkout ×2, catalog runtime ×2, payment-session RPC) | Finance-focused |
| Migration tests | ❌ | 0 | Absent |
| Mobile / PWA tests | ❌ | 0 | Absent |
| RTL / i18n audit scripts | ✅ | `scripts/audit-rtl.ts`, `scripts/audit-i18n.ts` (+ allowlists) | Custom audits, not tests |
| Accessibility tests | ❌ | 0 | Absent |

**Build health (verified):** `tsconfig.json` has `allowJs: true`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`, `skipLibCheck: true` — a very relaxed TypeScript posture. `~554` `as any` occurrences across `src/`. No `type-check` script. ESLint 9 flat config; no lint-on-CI script visible. 8 files exceed 1,200 lines (largest 2,707) — refactor candidates (R-09).

**Performance/reliability signals (observed patterns; not measured):** 5-min stale time on permissions; global `refetchOnWindowFocus: false`; multiple TanStack Query hooks per page in large files (N+1 fetch risk); ~20+ components import `supabase` directly (mixed UI/data-access, R-15); no visible pagination guardrail across list queries; no global mutation-error handler on `QueryClient`; realtime subscriptions inferred (`useNotifications` etc.) but no central subscription manager; `withTimeout` applied selectively; atomic multi-step writes are correctly encapsulated in DEFINER RPCs for finance (good); `TenantContext.createTenant` is the notable non-atomic exception (R-02). **All performance and reliability figures are unverified until benchmarked.**

---

## 19. Current Risk Register

| ID | Area | Finding | Type | Evidence | Severity | Confidence | Impact | Immediate concern? | Next step |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Environments | Repository configuration contains a single Supabase project reference; no separate staging backend is evidenced. Preview / published / custom-domain surfaces appear to use the same frontend binding; runtime confirmation across every deployed surface is owner / platform-confirmation-required. Until confirmed otherwise, preview actions may affect the same backend data. | Architectural limitation | `.env` single project ref; `supabase/config.toml` | **HIGH** | HIGH | Preview actions may mutate live data until confirmed otherwise | ✅ | Establish separate staging project before major DB work |
| R-02 | Tenancy | `TenantContext.createTenant` is a 3-step non-atomic client insert with partial rollback | Confirmed defect | `TenantContext.tsx:318-483` | **HIGH** | HIGH | Orphan tenants without capabilities on partial failure | ✅ | Wrap in DEFINER RPC `create_tenant_with_defaults` |
| R-03 | TS posture | ~554 `as any`; strict null/implicit-any disabled; no `typecheck` script | Technical debt | `tsconfig.json`, rg count | MEDIUM | HIGH | Refactors unsafe; type drift hidden | ✅ | Add `tsc --noEmit` to CI; incremental strictness |
| R-04 | Storage | Object-level policies not enumerated; signed URLs may outlive revocation | Incomplete evidence + security concern | Round 1 scope | MEDIUM | MEDIUM | Cross-tenant leak potential | ✅ | Audit `storage.objects` policies before any bucket changes |
| R-05 | Scheduled jobs | `expire-stale-connections` and `mark-overdue-invoices` cron schedule not verified | Incomplete evidence | `supabase/config.toml` + edge fns | MEDIUM | MEDIUM | Silent stall of expiry/overdue sweep | ✅ | Query pg_cron / platform config |
| R-06 | Zero-policy RLS tables | 7 public tables have RLS on with 0 policies (fail-closed) including `pos_sales` | Documentation drift + architectural | DB metadata | MEDIUM | HIGH | If any UI attempts direct query it silently returns empty — hidden failure | Partial | Verify each is RPC-only; annotate in types |
| R-07 | Testing | No RLS, auth, tenancy, or E2E tests; Playwright installed unused | Technical debt | file census | MEDIUM | HIGH | Regressions on permissions and RLS pass unnoticed | ✅ | Establish minimal negative-test harness for RLS |
| R-08 | Membership boundary | Owner-removal, self-role-change, cross-tenant `tenant_members` write policies not body-inspected | Incomplete evidence | Round 1 scope | MEDIUM | MEDIUM | Potential privilege-escalation gap | ✅ | Read `tenant_members` policies in Round 2 |
| R-09 | Frontend architecture | 8 files > 1,200 lines; several > 2,000 lines | Technical debt | `wc -l` | MEDIUM | HIGH | Refactor risk; onboarding friction | — | Incremental splitting |
| R-10 | Toast systems | Both shadcn Toaster and sonner mounted simultaneously | Technical debt | `App.tsx` | LOW | HIGH | Inconsistent notification UX | — | Standardise on one |
| R-11 | Analytics / monitoring | No Sentry/Datadog/PostHog wired | Architectural limitation | dependency scan | MEDIUM | HIGH | Blind to prod errors | — | Add error monitoring |
| R-12 | Auth provider config | Google/Phone/SAML/HIBP not inspected | Incomplete evidence | Round 1 scope | MEDIUM | HIGH | Unknown password policy / OAuth state | ✅ | Query `supabase--configure_auth` in Round 2 |
| R-13 | Legacy audit bucket | `database_export_20_07_26` Storage bucket still present | Technical debt | `storage.buckets` | LOW | HIGH | Storage cost; potential PII in artefact | — | Verify contents; archive/delete after review |
| R-14 | Session storage strategy | `localStorage` for Supabase session (not httpOnly cookies) | Architectural limitation | `client.ts:13` | MEDIUM | HIGH | XSS-based token theft risk | ✅ | Enforce XSS-safe rendering (already partially done) |
| R-15 | Direct Supabase calls in UI | 20+ components import supabase | Technical debt | rg | LOW | HIGH | Mixing concerns; harder to test | — | Progressive extraction to hooks |
| R-16 | Nav config duplication | 3 separate nav configs total 909 lines | Documentation drift | file census | LOW | HIGH | Route/nav drift risk | — | Verify single source of truth |

### 19.1 Historical contradictions carried forward

| ID | Historical statement | Current verified state | Resolution |
|---|---|---|---|
| H-01 | "PWA foundation established" | Kill-switch active (`selfDestroying: true`); `main.tsx` unregisters SWs; only push SW retained | Do not treat as PWA-ready |
| H-02 | Doctor billing integrated | `doctor_services` is separate from `tenant_services` — architectural debt | Note as tech debt |
| H-03 | `admin` role in `tenant_role` enum | Kept for backward compatibility, not used in UI | Do not assign in new code |
| H-04 | Legacy `/dashboard/boarding-contracts` page | Deprecated; redirects to `/dashboard/contracts?type=boarding`; `/legacy` retained but unlinked | Plan for removal |
| H-05 | Movement as standalone module | Consolidated under Housing (redirect to `/dashboard/housing?tab=movement`) | Update external docs |
| H-06 | "Fully documented handoff" | Extensive execution docs under `docs/aml_1_b_1/**`, but no unified handoff | Round 1 output seeds it |
| H-07 | Broad `tenant_role`-based RLS everywhere | Mostly moved to `has_permission()`; some tables still `is_tenant_member` for reads | Complete Round 2 body audit |
| H-08 | Payments status manually settable | Strictly derived from ledger; `paid` cannot be manually set | Enforce in all new UI |
| H-09 | Finance breakage after J5 constraints for lab-invoice draft | Fixed via `createInvoiceWithItems` cutover | Closed |

### 19.2 Documentation-only clarifications

- **Historical Doc 13 identity:** the in-place `docs/Documentation_13_-_Laboratory_Workstream_Closure.md` is a **predecessor artifact**, not canonical Doc 13. Canonical Doc 13 is `docs/historical/documentation-01-13/13-operational-truth-stabilization.md` (`DHB-DOC13`).
- **Legacy in-place files** (root schema snapshots, N2.2 report, others) remain pending cleanup per `docs/README.md`.

---

## 20. Receiving Developer Technical Start Map

**Read first (in order):**

1. `src/App.tsx` (routing + guard composition).
2. `src/main.tsx` (entry + cache/service-worker cleanup).
3. `src/contexts/AuthContext.tsx` and `src/contexts/TenantContext.tsx`.
4. `src/components/guards/*` (all guards).
5. `src/hooks/usePermissions.ts` (permission model).
6. `src/hooks/useModuleAccess.ts` (module capability gating).
7. `src/integrations/supabase/client.ts` (client init).
8. `src/navigation/{navConfig, workspaceNavConfig, labNavConfig}.ts`.
9. `src/lib/queryKeys.ts` (query-key registry).
10. `src/lib/finance/**` (most disciplined domain).
11. `supabase/config.toml` (edge fn config).
12. `docs/README.md`, `docs/CONVENTIONS.md`, this document, and `docs/handoff/rounds/round-01/round-01-raw-audit-output.md`.

**Contexts / hooks to understand first:** `AuthContext`, `TenantContext`, `I18nContext`, `usePermissions`, `useModuleAccess`, `useNotifications`, `useHorses`.

**Database objects to inspect first:** `tenants`, `tenant_members`, `tenant_capabilities`, `permission_definitions`, `has_permission`, `has_tenant_role`, `is_tenant_member`, `initialize_tenant_defaults`, `create_invoice_with_items`, `post_payment_session`, `record_horse_movement_with_housing`, `finalize_invitation_acceptance`, `accept_connection`.

**Routes to test first:** `/auth` (signup + login), `/select-role`, `/create-profile/stable`, `/dashboard`, `/dashboard/team`, `/dashboard/horses`, `/dashboard/finance`, `/dashboard/settings/permissions`, `/invite/:token` (real token), `/share/horse/:token`.

**Read-only until owner approval:**

- Any change to `supabase/migrations/`.
- `src/integrations/supabase/client.ts` and `types.ts`, `.env` (managed keys), `supabase/config.toml`.
- RLS policies on all zero-policy tables (`pos_sales`, `horse_owner_*`, `owner_claim_*`, `finance_request_idempotency`).
- Edge Function configs.
- `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas.
- Any rewrite of migrations; migrations are append-only.
- Bulk relocation of legacy files listed in `docs/README.md`.
- Deletion of historical or raw evidence.

**High-risk areas requiring approval before modification:** finance RPCs (`create_invoice_with_items`, `approve_invoice`, `cancel_invoice`, `post_payment_session`, `create_source_checkout_invoice`, `create_pos_sale`); the permission model (`has_permission`, `usePermissions`); tenant-creation flow; `record_horse_movement_with_housing`; RLS on `horses`, `invoices`, `ledger_entries`, `tenant_members`, `posts`.

**Secrets that must never be shared or logged:** `VAPID_PRIVATE_KEY`, any email provider API key, Supabase service-role key (must not be present in the frontend anywhere), database password. Only key **names** in any documentation.

**Wait for later rounds:** exhaustive policy-body enumeration; full RPC parameter/tenant-validation body audit; Storage `storage.objects` policy audit; auth provider configuration; environment separation plan; module inventory (Sections 2 & 7 of the 21-part framework).

**Suggested initial validation tasks:** run the frontend build and Vitest; read the most recent migration and confirm it applied cleanly; re-run RLS spot checks on a representative sample of tables; walk one end-to-end path in each domain cluster (identity → tenant → horse → finance) using a demo account.

**Do not** rebuild the platform from scratch. Round 1 is a foundation to **continue, stabilize, improve, complete, and expand**.

---

## 21. Access and Collaboration Assumptions

Under contractual onboarding, the external development partner is expected to receive controlled direct access to the systems required for their scope (which may include, but is not limited to, the Lovable project, the project repository, the managed backend, Storage, Edge Functions, and staging/testing environments when available).

- Project accounts and repositories remain under owner control.
- Collaborators use individual, named accounts — no shared logins.
- Access is role-based and least-privilege; scope expands only when the task requires it.
- Changes flow through isolated branches with review; no direct pushes to `main`.
- Secret values are not distributed through documentation, chat, or shared files.
- Third-party access (e.g. domain registrar) is granted per-task and revoked afterwards.
- Any future iOS/Android developer accounts and repositories remain owner-controlled.

Owner-only material (invitations, credential handling, recovery, vendor evaluations, offboarding) is intentionally excluded from this document and from the shared repository. It is prepared and held privately by the owner.

---

## 22. Round 1 Coverage Against the Permanent 21-Part Handoff Framework

Section names below use the **exact permanent 21-part framework titles**. Do not abbreviate, rename, or substitute terms in future rounds.

| # | Section | Covered? | Level | Remaining | Planned round |
|---|---|---|---|---|---|
| 1 | Project Definition and Scope | ✅ | Foundation | Marketing scope, business model | R2 |
| 2 | Account Types | Partial | Foundation | Deep matrix by `tenant_type` | R2 (primary) |
| 3 | Users, Memberships, and Roles | ✅ | Substantive | Owner-removal & self-role-change verification | R2 |
| 4 | Technical Architecture | ✅ | Substantive | Refactor plan for oversized files | R3 |
| 5 | Database | ✅ | Substantive | Full policy-body enumeration; view definitions | R2 |
| 6 | Multi-Tenancy and Data Isolation | ✅ | Substantive | Policy-body deep dive; cross-tenant matrix per table | R2 |
| 7 | Complete Module Inventory | Partial | Foundation | Per-module maturity, screens, hooks, edge cases | R2 (primary) |
| 8 | Core User Flows | ❌ | — | Full workflow tracing | R3 |
| 9 | Cross-Account Integrations | Partial | Foundation | Detailed accept/revoke/share flows | R3 |
| 10 | Financial System | Partial | Foundation | Full RPC contract catalog; ledger derivation model | R3 |
| 11 | Dayli Horse Commercial Subscriptions | ❌ | — | Plan model, entitlement mapping, billing | R4 |
| 12 | Web, PWA, and Mobile Applications | Partial | Foundation | Confirmed kill-switch PWA; native strategy TBD | R4 |
| 13 | Arabic, English, and RTL | Partial | Foundation | i18n & RTL audit scripts exist; deeper audit due | R3 |
| 14 | Storage and Files | Partial | Foundation | Object-level policy audit outstanding | R2 |
| 15 | Notifications and Edge Functions | ✅ | Substantive | Cron schedule verification; email provider name | R2 |
| 16 | Deployment and Environments | ✅ (findings) | Substantive | Environment separation plan | R2 |
| 17 | Testing and Quality | Foundation | Foundation | Coverage plan, RLS-negative suite | R3 |
| 18 | Performance and Reliability | Foundation | Foundation | Metrics baseline | R4 |
| 19 | Known Issues and Technical Debt | Foundation | Foundation | Full backlog | R4 |
| 20 | Current Status and Continuation Roadmap | ❌ | — | Owner input required | R5 |
| 21 | Incoming Developer Instructions | Foundation | Foundation | Consolidated onboarding doc | R5 |

Round 1 delivers Sections 1, 3, 4, 5, 6, 14, 15, 16 substantively and Sections 17–19, 21 at foundation depth.

---

## 23. Inputs Required for Round 2

**Round 2 primary scope:** Account Types, Complete Module Inventory, and Current Implementation Reality.

### 23.1 Primary Round 2 product/module evidence

1. **10-account-type behaviour matrix** — for each `tenant_type` (`stable`, `clinic`, `lab`, `academy`, `pharmacy`, `transport`, `auction`, `horse_owner`, `trainer`, `doctor`): capabilities seeded by `initialize_tenant_defaults`, visible modules, nav-config path, and post-onboarding experience.
2. **Tenant capability seeding** — read `tenant_capabilities` schema + default values by `tenant_type`; enumerate `useModuleAccess` flags.
3. **Module inventory** — for every module, list routes, pages, components, hooks, tables, and RPCs.
4. **Module implementation status** — classify each as `active` / `partial` / `schema-only` / `placeholder` / `legacy` / `planned`.
5. **Per-account post-onboarding experience** — what the user sees after `initialize_tenant_defaults` completes.
6. **Module visibility and navigation** — reconciled against `navConfig`, `workspaceNavConfig`, `labNavConfig`.

### 23.2 Foundation evidence closures carried alongside Round 2

1. Auth provider configuration — enumerate enabled providers (email/password, Google, phone, SAML), password policy, HIBP toggle, email template overrides.
2. Full RLS policy bodies — export every `pg_policies` row with expression bodies; tag as `is_tenant_member` / `has_permission` / `EXISTS` / other; produce per-table alignment report.
3. DEFINER RPC body inspection — for each finance/tenancy/connection RPC, verify `p_tenant_id` validated against `auth.uid()`, idempotency handling, error path, transaction boundaries.
4. `tenant_members` and `tenants` policy bodies — answer authority questions 4, 6, 7 with evidence (membership authority).
5. Storage `storage.objects` policies — enumerate by bucket, name, roles, USING expression.
6. Scheduled job configuration — query `pg_cron` (if enabled) or platform config for `expire-stale-connections` and `mark-overdue-invoices`.
7. Auth-trigger inventory — confirm the `handle_new_user`-style trigger on `auth.users`.
8. Environment separation confirmation and remediation plan for R-01.
9. Nav-config reconciliation across `navConfig`, `workspaceNavConfig`, `labNavConfig`.
10. Doctor-billing debt audit (`doctor_services` vs `tenant_services`).
11. Owner / Horse-Owner Portal boundaries — deep audit of the zero-policy tables and their RPC access paths.
12. Community post visibility resolution — `posts` (15 policies) semantics for `public`/`private`/`followers` × personal/organization workspace.
13. CI/CD workflow content — inspect `.github/workflows/n2-4-controlled-supabase-runtime.yml`.

Full workflows, cross-account operational lifecycle tracing, full finance depth, PWA/native strategy, and the final roadmap remain **out** of the Round 2 primary scope — they belong to Rounds 3–5.

---

## 24. References and Evidence Paths

- Central index: `docs/README.md`
- Conventions: `docs/CONVENTIONS.md`
- Round 1 raw inputs: `docs/handoff/rounds/round-01/round-01-inputs.md`
- Round 1 raw output: `docs/handoff/rounds/round-01/round-01-raw-audit-output.md`
- Governance audits: `docs/historical/audits/dg-1-documentation-governance-audit.md`, `docs/historical/audits/dg-1a-alignment-evidence-closure.md`
- Historical Documentation 01–13: `docs/historical/documentation-01-13/`
- Finance evidence: `docs/aml_1_b_1/stage_01_preflight/finance_permission_definitions.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt`
- Internal Lovable reference: `docs/handoff/rounds/round-01/round-01-lovable-reference.md` (`DHB-R01-INT`)

---

## 25. Round 1 Handoff Verdict

Round 1 delivers a canonical technical foundation covering platform identity, architecture, database skeleton, identity/tenancy, permissions, RLS, RPCs, storage, edge functions, environment, testing signal, risks, and a receiving-developer start map. It is **canonical-pending-owner-acceptance**. It is **not** a certification of production readiness, security completeness, or launch approval. Module maturity, workflows, cross-account flows, commercial behaviour, delivery-channel details, and roadmap/completion are carried into later rounds. Historical Documentation 01–13 remains preserved as evidence, superseded by current code where they conflict.
