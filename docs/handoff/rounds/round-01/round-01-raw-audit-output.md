<!--
id: DHB-R01-RAW
title: Round 1 — Raw Audit Output (verbatim)
version: 1.0.0
status: evidence-immutable
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: package file `round-01/round-01-raw-audit-output.txt`
source-sha256: ff7875b8ff2564ae87605b9b060813906c2eb9139816c00916515ff7570f2add
-->

# Round 1 — Raw Audit Output (verbatim)

> **Immutable raw provenance.** Preserved byte-for-byte from Lovable's Round 1 output.
> Do not edit; corrections must live in a later canonical handoff document, not here.
> This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.

---

I have sufficient evidence to compile the Round 1 report. Producing the full A–T deliverable now.

---

DAYLI HORSE — ROUND 1 HANDOFF AUDIT
Read-only foundation audit · Scope: Sections 1, 3, 4, 5, 6, 14, 15, 16 primary; 17–19, 21 foundational

---

A. Executive Verdict

FOUNDATION FUNCTIONAL — MATERIAL GAPS REQUIRE FOLLOW-UP

The Dayli Horse platform is a mature, actively developed multi-tenant equestrian SaaS with substantial breadth (158 public tables, 507 RLS policies, 317 database functions, 167 triggers, 322 migrations, 7 Edge Functions, ~204k LOC frontend). Core surfaces are wired end-to-end: authentication, tenancy, granular permission enforcement (~104 keys) with server-side `has_permission()` mirroring in RLS across the majority of domains, atomic finance RPCs, cross-tenant connections/consent, notifications, and a bilingual (AR/EN + RTL) UI shell.

Foundation is functional and safe to hand off for orientation, but material gaps remain that a receiving developer must be told about before making changes: `TenantContext.createTenant` is a non-atomic client-side 3-step insert with best-effort rollback; 7 RLS-enabled public tables carry zero policies (fail-closed and hidden from clients — but that includes `pos_sales`, which is user-facing); the frontend carries ~554 `as any` occurrences and holds several very large files (2,707 lines in `CreateSampleDialog`, 2,147 in `LabTemplatesManager`); there is no verified staging environment; automated test coverage is finance-heavy and does not cover RLS, auth, tenancy, or E2E flows; the Supabase client uses `localStorage` (not httpOnly cookies) and PWA has been intentionally torn down to a "self-destroying" kill-switch worker.

This is not a launch verdict.

---

B. Audit Scope, Method, and Access Limitations

Method. Strict read-only inspection: `code--view`/`code--exec` (rg/ls/wc only) against the repository; `supabase--read_query` against `information_schema`, `pg_catalog`, `pg_policies`, `storage.buckets`, and `pg_proc`/`pg_trigger` metadata. No writes, migrations, deployments, or record modifications. No secret values were read or emitted.

Evidence classes used: DIRECTLY-VERIFIED-SOURCE (read the file), DB-METADATA (queried live catalog), GEN-TYPES (`src/integrations/supabase/types.ts`), HISTORICAL-DOCS (documents under `docs/` and memory index), INFERRED (multi-source), UNVERIFIED (access limitation).

Access limitations.
- Auth provider configuration (Google, SAML, email templates, HIBP toggle, password policy) not inspected — no tool call was made to `supabase--configure_auth` or auth settings query.
- Live scheduled-job configuration (cron schedule for `mark-overdue-invoices`, `expire-stale-connections`) not verified from platform metadata.
- Deployment target (Lovable hosting), branch → environment mapping, and whether `preview--*.lovable.app` and `daylihorse.com` share the same Supabase project were not independently verified — assumed shared based on single `VITE_SUPABASE_PROJECT_ID` in `.env`.
- Storage `storage.objects` policies were not enumerated by name (bucket-level metadata only).
- Historical documentation under `docs/aml_1_b_1/**` was not exhaustively cross-read.

---

C. Current Platform Definition and Technical Boundary

Classification (DIRECTLY-VERIFIED-SOURCE + DB-METADATA): Dayli Horse is a multi-tenant equestrian operational SaaS with a cross-tenant relationship/consent layer and an emergent marketplace/directory surface. It is not a single-tenant vertical app and not a horizontal open marketplace.

Supporting evidence:
- `tenant_type` enum: `stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor` (10 types).
- Cross-tenant surfaces: `connections`, `consent_grants`, `connection_horse_access`, `horse_shares`, `horse_share_packs`, `horse_owner_access_grants`, `owner_delegations`, `sharing_audit_log`, `party_horse_links`, `service_requests`.
- Directory/public surfaces: `PublicProfile`, `TenantPublicProfile`, `/t/:slug`, `Directory`, `public_profile_fields`, `posts`, `post_comments`, `post_likes`, `follows`.
- Financial engine independently modelled: `invoices`, `invoice_items`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `ledger_entries`, `billing_links`, `customer_balances`, `finance_invoice_number_counters`, `finance_request_idempotency`, `pos_sales`, `pos_sessions`.

Architectural centre of gravity. The tenant (with its `tenant_members`, `tenant_capabilities`, `tenant_role_*` triad, and `has_permission()`) is the primary boundary. The horse is the primary domain entity, with polymorphic-adjacent shape (dual registry `horses` + `lab_horses`, per memory `mem://features/horse-unification-strategy`). Cross-tenant sharing goes through `connections` + `consent_grants` (per memory `mem://architecture/platform-sharing-reference-pattern`).

System boundary.
| Layer | Responsibility | Status |
|---|---|---|
| Frontend | React 18 + Vite 5 SPA; all UI, workspace switching, i18n, forms, PDF rendering (`jspdf`, `html2canvas`), TipTap contract editor | Active |
| Supabase Postgres | Source of truth: 158 tables, 507 policies, 317 functions, 167 triggers, 6 views, 24 enums | Active |
| Supabase Auth | Email/password verified in code (`signInWithPassword`); provider config not verified this round | Active + partially verified |
| Supabase Storage | 2 buckets: `horse-media` (private, 50 MB cap, curated MIME allowlist), `database_export_20_07_26` (private, no limits — audit artifact) | Active + one legacy |
| Edge Functions | 7 functions (invitations, ownership, push, VAPID, shared media sign, expire-connections, mark-overdue) | Active (mixed maturity) |
| PWA | Intentionally torn down — `vite-plugin-pwa` runs in `selfDestroying: true` mode; `main.tsx` explicitly unregisters SWs and clears caches on every load; only `/push-sw.js` retained | Kill-switch (not PWA-ready) |
| External | jsPDF, html2canvas, workbox-window (push SW only), recharts | Active |

Governance dimensions. Overlapping and enforced at multiple levels:
- Tenant type — routing labels, nav config, and `initialize_tenant_defaults(p_tenant_type)`.
- Capability/module flags — `tenant_capabilities` + `useModuleAccess` + `ModuleGuard` for 5 modules (`laboratory`, `vet`, `housing`, `movement`, `breeding`). Not applied to `finance`, `hr`, `academy`, `doctor`, `inventory`, `clients`, `contracts`, `community`.
- Role — `tenant_role` enum still exists (`owner, admin, foreman, vet, trainer, employee, manager`) and gates ownership operations; `admin` is documented as legacy in `TenantContext.tsx:9`.
- Permission — ~104 granular keys (per docs), resolved via `usePermissions` and mirrored server-side via `has_permission()`.
- Workspace mode — `personal | organization`, persisted to `localStorage.workspaceMode`, driven by `WorkspaceRouteGuard`.
- Cross-tenant relationship — `connections` + `consent_grants` + per-horse `connection_horse_access`.
- Consent / sharing — `consent_grants`, `horse_shares`, `media_share_links`, `lab_report_shares`.

Contradictions detected: UI comment states role names are UI-labelled as `owner/admin/manager/foreman/vet/trainer/employee`, but nav guards reference the modern permission vocabulary (`finance.invoice.view`, `hr.manage`, `admin.permissions.delegate`, etc.). `TenantContext` still stores/reads the legacy role string alongside permissions. This is a live dual model — not fully migrated. Verified in `TenantContext.tsx:10` and `App.tsx` guards.

---

D. Current Technology Stack

DIRECTLY-VERIFIED from `package.json`, `vite.config.ts`, `tsconfig.json`.

| Layer | Technology | Version | Current use | Evidence | Status |
|---|---|---|---|---|---|
| UI framework | React | ^18.3.1 | All UI | package.json | Active |
| Build/dev | Vite | ^5.4.19 | Dev + prod build (SWC React plugin) | vite.config.ts | Active |
| Language | TypeScript | ^5.8.3 | All code; strictNullChecks off, noImplicitAny off, `allowJs true` | tsconfig.json | Active but relaxed |
| Styling | Tailwind CSS | ^3.4.17 + `@tailwindcss/typography` + `tailwindcss-animate` | Design tokens in `src/index.css` | tailwind.config.ts | Active |
| Component library | shadcn/ui via Radix primitives | 30+ Radix packages | Dialogs, sheets, popovers, tables | package.json:19-45 | Active |
| Routing | react-router-dom | ^6.30.1 | `BrowserRouter` in `App.tsx:803` | App.tsx | Active |
| Server state | @tanstack/react-query | ^5.83.0 | `QueryClient` with `refetchOnWindowFocus: false` | App.tsx:86-91 | Active |
| DB client | @supabase/supabase-js | ^2.88.0 | Single client `src/integrations/supabase/client.ts` | client.ts | Active |
| Forms | react-hook-form + @hookform/resolvers + zod | 7.61 / 3.10 / 3.25 | Wizards, dialogs | package.json | Active |
| Dates | date-fns | ^3.6.0 | Formatters, boarding period engine | src/lib/formatters.ts | Active |
| i18n | Custom (`src/i18n/*`) — no library | AR (7,428 lines) + EN (7,456 lines) locale files | RTL via I18nContext | src/i18n/ | Active |
| PWA | vite-plugin-pwa 1.2 + workbox-window 7.4 | selfDestroying:true — kill-switch only | vite.config.ts:21-27 | Legacy/torn-down |
| Editor | @tiptap/react + starter-kit + text-style/color/align/underline | ^3.26 | Contract templates & documents | src/contracts/** | Active |
| Charts | recharts | ^2.15.4 | Finance dashboards | | Active |
| Toasts | sonner + built-in radix toaster | 1.7 | Dual system — see legacy note | App.tsx:2-3 | Duplicated |
| PDF | jspdf ^4.2.1 + html2canvas ^1.4.1 | Invoice/lab-report PDFs | InvoicePDFGenerator | Active |
| DnD | @dnd-kit core/sortable/utilities | ^6.3 | Contract editor | | Active |
| Drawer/vaul | vaul ^0.9.9 | Mobile sheets | | Active |
| Testing | vitest ^4.1.8 + happy-dom + @playwright/test ^1.57 | 19 vitest tests + 5 SQL harnesses; no runnable Playwright suite in repo config | vitest.config.ts, `playwright-fixture.ts` present but no `playwright/**` tests | Partial |
| Lint | eslint 9 + typescript-eslint 8 + react-hooks + react-refresh plugins | flat config | eslint.config.js | Active |
| Analytics/monitoring | None detected | — | grep miss for Sentry/Datadog/PostHog/LogRocket | — | Absent |

Duplicated / legacy:
- Two toaster systems mounted simultaneously (`<Toaster />` shadcn + `<Sonner />` sonner) — inconsistent notification path.
- `workbox-window` is in dependencies but PWA is intentionally disabled — `selfDestroying:true`.
- `lovable-tagger` dev-only.
- `@playwright/test` in `dependencies` (not `devDependencies`) despite no active suite.

---

E. Repository and Frontend Architecture

Directory map (evidence: `ls`).

| Directory | Purpose | Notes |
|---|---|---|
| `src/pages/` | 62 top-level route pages + `finance/` subfolder | Some pages very large (mixed data-fetch + UI); Doctor and Dashboard-Doctor* are duplicated between root and `pages/finance/`-parallel patterns |
| `src/components/` | 40+ domain folders (`boarding`, `breeding`, `clients`, `community`, `dashboard`, `directory`, `doctor`, `finance`, `guards`, `horses`, `housing`, `hr`, `inventory`, `laboratory`, `layout`, `movement`, `navigation`, `notifications`, `payments`, `permissions`, `pos`, `push`, `pwa`, `roles`, `schedule`, `services`, `settings`, `shared`, `team`, `ui`, `vet`) | Guards under `guards/`: `WorkspaceRouteGuard`, `ModuleGuard`, `CommunityRouteGuard`, `I18nRecoveryBoundary` |
| `src/contexts/` | Only `AuthContext` and `TenantContext` | Design memory: query keys and permissions live in hooks, not contexts |
| `src/hooks/` | 202 hook files organised by domain: `billing/`, `boarding/`, `breeding/`, `clients/`, `connections/`, `doctor/`, `finance/`, `housing/`, `hr/`, `inventory/`, `laboratory/`, `movement/`, `notifications/`, `owner/`, `pos/`, `roles/`, `team/`, plus flat top-level hooks | Heavy — TanStack Query + direct Supabase calls |
| `src/lib/` | Business utilities: `finance/`, `horses/`, `housing/`, `laboratory/`, `notifications/`, `pricing/`, `connections/`, plus atomic files (`boardingPeriodEngine`, `taxUtils`, `withTimeout`, `queryKeys`) | `queryKeys.ts` centralised key registry |
| `src/contracts/` | TipTap contract template & document editor — independent module | Sub-tree with `docModel/`, `editor/`, `sections/`, `prototype/`, `types/` |
| `src/i18n/` | Custom AR/EN + RTL context | `locales/ar.ts` and `locales/en.ts` each ~7.4k lines |
| `src/integrations/supabase/` | Generated `client.ts` + `types.ts` (14,490 lines) | Never edit; regenerated post-migration |
| `src/navigation/` | 3 nav configs: `navConfig.ts` (419 L), `workspaceNavConfig.ts` (365 L), `labNavConfig.ts` (125 L) | Multiple nav sources — verify a single source of truth is intended |
| `supabase/migrations/` | 322 files | Sequential, timestamp-prefixed |
| `supabase/functions/` | 7 Edge Functions | See section M |
| `supabase/tests/database/` | 5 pgTAP-style SQL test files (finance-only) | See section O |
| `public/` | `manifest.json`, `placeholder.svg`, `push-sw.js`, `robots.txt` | PWA icons/service worker intentionally minimal |
| `docs/` | Extensive AML.1.b execution notes, cloudflare proxy, HR demo script, laboratory MVP, RTL typography | See historical section P |
| `scripts/` | `audit-i18n.ts`, `audit-rtl.ts`, `i18n-allowlist.json`, `rtl-allowlist.json` | Custom audit tooling |
| Config | `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `components.json` | |

Oversized files (top offenders, WC-verified).
- `src/integrations/supabase/types.ts` — 14,490 L (generated, expected).
- `src/i18n/locales/en.ts` — 7,456 L; `ar.ts` — 7,428 L.
- `src/components/laboratory/CreateSampleDialog.tsx` — 2,707 L.
- `src/components/laboratory/LabTemplatesManager.tsx` — 2,147 L.
- `src/components/laboratory/LabRequestsTab.tsx` — 1,659 L.
- `src/components/clients/ClientStatementTab.tsx` — 1,484 L.
- `src/components/movement/RecordMovementDialog.tsx` — 1,480 L.
- `src/components/finance/InvoiceDetailsSheet.tsx` — 1,243 L.

Application entry and routing (DIRECTLY-VERIFIED-SOURCE: `App.tsx`).

- Entry: `src/main.tsx` (cleans caches → `<App />` in `React.StrictMode`).
- Provider tree: `QueryClientProvider → HelmetProvider → I18nProvider → TooltipProvider → BrowserRouter → AuthProvider → TenantProvider → AppRoutes`.
- Route categories:
  - Public unauthed: `/`, `/directory`, `/t/:slug`, `/shared/lab-result/:token`, `/shared/lab-report/:token`, `/shared/media/:token`, `/share/horse/:token`, `/invite/:token`, `/connections/accept` (mounted OUTSIDE ProtectedRoute).
  - Auth flow: `/auth`, `/forgot-password`, `/reset-password`, `/debug/auth` (DEV only).
  - Onboarding: `/select-role`, `/create-profile/{stable,clinic,lab,academy,owner,horse-owner,pharmacy,transport,auction,trainer,doctor}` — protected only.
  - Dashboard (ProtectedRoute + WorkspaceRouteGuard): ~50 routes; most gated by `requiredPermission` + optional `ModuleGuard`.
  - Redirects: `/dashboard/payments → /dashboard/finance/payments`; `/dashboard/revenue → /dashboard/finance/revenue`; `/dashboard/movement → /dashboard/housing?tab=movement`; `/dashboard/boarding-contracts → /dashboard/contracts?type=boarding`.
  - Legacy retained: `/dashboard/boarding-contracts/legacy`, `/dashboard/contracts/prototype-rich-editor` (dev-only).
  - Fallback: `NotFound`.

Route-guard matrix (E.5.2).

| Guard | File | Purpose | Checks | Does NOT check | Risk / limitation |
|---|---|---|---|---|---|
| `ProtectedRoute` | `App.tsx:94-110` (inline) | Requires auth user | `useAuth().user`; redirects to `/auth` | Session freshness; role/tenant | Loading spinner but does not force refetch |
| `AuthRoute` | `App.tsx:112-128` | Prevents authed access to auth pages | Redirects to `/dashboard` when `user` present | — | |
| `WorkspaceRouteGuard` | `src/components/guards/WorkspaceRouteGuard.tsx` | Enforces workspace mode + permission | `workspaceMode`, `activeTenant`, `hasPermission(requiredPermission)`; waits for `tenantHydrated && !tenantLoading && !permLoading` | Does not re-verify session; owner bypass handled inside `hasPermission` | Owner bypass entirely UI-side — mirror lives in `has_permission()` server-side |
| `ModuleGuard` | `src/components/guards/ModuleGuard.tsx` | Capability flag check | `useModuleAccess` for one of 5 modules: `laboratory`, `vet`, `housing`, `movement`, `breeding` | Only covers 5 modules; `finance`, `hr`, `academy`, `doctor`, `inventory`, `clients`, `contracts`, `community` are permission-only | Hidden nav does not stop direct URL entry if permission exists |
| `CommunityRouteGuard` | `src/components/guards/CommunityRouteGuard.tsx` | Hybrid personal/org access | Personal mode: always allow; Org mode: activeTenant + `community.view` (owner bypass) | Post-level RLS is separate (`posts`, `post_comments`, `post_likes`) | Personal-mode posts rely on RLS `tenant_id IS NULL` scoping |
| `I18nRecoveryBoundary` | DEV-only React error boundary | HMR recovery for i18n | Not a security guard | Only wraps in DEV | — |

Routes reachable manually despite hidden nav. Any route whose only guard is `ProtectedRoute` (no WorkspaceRouteGuard) is reachable simply by having a session — includes `/dashboard`, `/dashboard/mobile/:moduleKey`, `/dashboard/my-payments`, `/dashboard/my-bookings`, `/community` (guarded by CommunityRouteGuard), `/profile/:id`, `/dashboard/settings/notifications`, `/dashboard/contracts/documents/:documentId`. Backend RLS is the actual guardrail here.

State and contexts (E.5.3).

| Concern | Source of truth | Notes / risks |
|---|---|---|
| Auth user + session | `AuthContext` (`useAuth`) | `TOKEN_REFRESHED` for same user ID short-circuited to avoid cascading remounts (`AuthContext.tsx:118`) — good defence; profile fetch is fire-and-forget |
| Personal profile | `AuthContext.profile` | Fetched separately from `profiles` table |
| Active tenant | `TenantContext` + `localStorage.activeTenantId` | Delayed 1s session-clear on user-null flicker; falls back to last-good on error (`TenantContext.tsx:106-207`) |
| Membership | `tenants` state array in `TenantContext` | Fetched with `is_active = true` filter only — inactive memberships silently disappear |
| Active role | Derived from membership | Stored on ref, mutable via `setActiveRole` (mutates React state only; not persisted) |
| Workspace mode | `localStorage.workspaceMode` + state | Auto-forces "personal" when no tenants (`TenantContext.tsx:283`) |
| Permissions | `usePermissions` (TanStack Query, 5-min stale) | Reads 6 tables: `permission_definitions`, `tenant_role_permissions`, `tenant_role_bundles`, `bundle_permissions`, `member_permission_bundles`, `member_permissions` |
| Language / direction | `I18nContext` (`src/i18n/I18nContext.tsx`) | Custom, no library |
| Query cache | Global `QueryClient` in `App.tsx:86` | `refetchOnWindowFocus:false`; no global mutation-error/onError; query-key registry lives in `src/lib/queryKeys.ts` |
| Realtime | Ad-hoc per hook (e.g. `useNotifications`) | No central subscription manager visible |
| Local storage | `activeTenantId`, `workspaceMode` | Two persisted keys — both cleared on real logout |

State risks.
- `createTenant` is 3 sequential `.insert()` calls (tenants → tenant_members → `initialize_tenant_defaults` RPC) with best-effort rollback if member insert fails (`TenantContext.tsx:412-439`). If step C (RPC) fails, the tenant + owner membership are left in place with default capabilities missing. Non-atomic. See risk register.
- `setActiveRole` mutates React state only — no persistence, no server round-trip.
- `signOut` clears state first then calls `supabase.auth.signOut()` with 5 s timeout and local fallback — good UX defence but a window exists where the app thinks it is logged out while the server session is still valid.

Shared UI foundations. `src/components/layout/**` hosts the app shell; nav configs in `src/navigation/`; dialogs use Radix; RTL via `dir` attribute driven by `I18nContext`; bilingual name via `<BilingualName />` (per memory). Design tokens live in `src/index.css` and `tailwind.config.ts`. Multiple design-system memories reinforce a mobile-first, workspace-class-dialog convention.

---

F. Backend and Supabase Architecture

Ownership of business rules (INFERRED from DIRECTLY-VERIFIED-SOURCE + DB-METADATA).

| Rule | Frontend | Database | Comment |
|---|---|---|---|
| Session / auth | Supabase client | `auth.*` | Session in `localStorage` |
| Tenant scoping | Query filters + `TenantContext` | RLS on 158 tables | Dual enforcement |
| Permission check | `usePermissions.hasPermission()` | `public.has_permission()` in RLS + explicit RPC checks | Mirror maintained; drift possible |
| Invoice creation | UI form | `create_invoice_with_items(p_tenant_id, p_idempotency_key, p_payload) SECURITY DEFINER` | Database only — enforced |
| Payment posting | UI form | `post_payment_session` DEFINER | Database only |
| POS sale | UI | `create_pos_sale` DEFINER | Database only |
| Source checkout invoice | UI | `create_source_checkout_invoice` DEFINER | Database only |
| Horse identity edit | UI gates | `update_horse_identity` DEFINER + `_lock_horse_authority_scope` | Dual, DB is source of truth |
| Movement | UI wizard | `record_horse_movement_with_housing` DEFINER (20 params) | Dual |
| Boarding admissions | UI | Triggers `trg_sync_contract_phase_from_admission`, `trg_notify_boarding_admission` | Trigger-driven |
| Payment status derivation | Presentation only | `_finance_ledger_insert` + `customer_balances` + view logic | DB is source of truth (per memory) |
| Tenant creation | Direct `.insert()` from `TenantContext` | + `initialize_tenant_defaults` RPC (non-blocking) | Frontend orchestrated — not atomic |
| Invitation acceptance | `finalize_invitation_acceptance(_token)` DEFINER | Verifies email/phone (per memory) | Database |
| Connection accept | `accept_connection(_token)` DEFINER | + trigger `trg_connections_auto_revoke_grants` on status change | Database |

Supabase client initialization (`src/integrations/supabase/client.ts`).
```
createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
})
```
- Only VITE-prefixed env vars used.
- `localStorage` is intentional (browser SPA). Comment: user should NOT store the service-role key.
- No timeout wrapper, no retry, no proxy — but `AuthContext.signIn` and other critical calls use `src/lib/withTimeout.ts` (`BOOTSTRAP_TIMEOUT_MS`).
- No service-role key or privileged secret is exposed to the frontend. Only the publishable anon key. VERIFIED-SOURCE.

Generated types (E.6.3).
- Location: `src/integrations/supabase/types.ts` — 14,490 lines, auto-generated (header states "This file is automatically generated. Do not edit it directly.").
- Postgrest version pinned: `"14.1"`.
- ~554 `as any` occurrences across `src/` (rg count) — many likely at Supabase call sites where generated types either lag behind or are cast to bypass strictness. High regeneration risk during handoff.
- 98 RPC callsites (`.rpc(` grep). Some are explicitly cast because `usePermissions.ts` uses `.from("permission_definitions" as any)` etc. — this pattern appears where recently-added tables were not yet in generated types at time of writing.
- Schema/type drift: not exhaustively enumerated; a receiving developer should regenerate types on first setup and audit the resulting diff.

---

G. Database Architecture and Domain Registry

Verified totals (DB-METADATA, `information_schema` + `pg_catalog`):

| Kind | Public schema |
|---|---|
| Tables | 158 |
| Views | 6 |
| Enums | 24 |
| Functions | 317 |
| Triggers (non-internal) | 167 |
| Indexes | 627 |
| Foreign keys | 510 |
| Unique constraints | 48 |
| RLS-enabled tables | 158 / 158 ✅ |
| Policies | 507 |
| Storage buckets | 2 |
| Migration files | 322 |

Domain grouping (INFERRED from table names + confirmed via `<supabase-tables>` context).

| Domain | Primary tables | Supporting | Notable functions/RPCs | Status |
|---|---|---|---|---|
| Auth/profiles | `profiles`, `public_profile_fields` | `push_subscriptions`, `notification_preferences` | trigger provisioning on `auth.users` insert (per memory) | Active |
| Tenants & memberships | `tenants`, `tenant_members`, `tenant_capabilities`, `tenant_notification_governance` | `stables`, `branches`, `external_locations` | `initialize_tenant_defaults`, `_active_tenant_context`, `check_tenant_limit`, `check_tenant_permission` | Active |
| Roles & permissions | `permission_definitions`, `permission_bundles`, `bundle_permissions`, `tenant_roles`, `tenant_role_bundles`, `tenant_role_permissions`, `tenant_role_preset_bindings`, `member_permissions`, `member_permission_bundles`, `delegation_scopes` | `role_audit_log`, `delegation_audit_log` | `has_permission`, `has_tenant_role`, `is_tenant_member`, `is_active_tenant_member`, `can_delegate_permission`, `can_invite_in_tenant` | Active |
| Horses & ownership | `horses`, `horse_ownership`, `horse_ownership_history`, `horse_owners`, `horse_owner_invites`, `horse_owner_access_grants`, `horse_aliases`, `horse_breeds`, `horse_colors`, `horse_classification_changes`, `horse_shares`, `horse_share_packs` | `party_horse_links` | `update_horse_identity`, `complete_local_horse_record`, `_resolve_horse_write_authority`, `_resolve_owner_authority`, `_lock_horse_authority_scope` | Active |
| Housing & facilities | `housing_units`, `housing_unit_occupants`, `facility_areas`, `boarding_admissions`, `boarding_status_history` | | `check_unit_occupancy`, `sync_boarding_contract_phase_from_admission` | Active |
| Movement | `horse_movements`, `incoming_horse_movements` | `external_locations` | `record_horse_movement_with_housing` (20 params), `cancel_horse_movement`, `cancel_incoming_movement`, `default_horse_movement_subtype` | Active |
| Boarding contracts | `boarding_contracts` | `contract_templates`, `contract_documents`, `contract_document_events`, `contract_template_versions` | `create_boarding_contract_with_connection`, `approve_boarding_contract_as_owner/as_stable`, `cancel_boarding_contract`, `build_boarding_plan_snapshot` | Active |
| Vet / health | `vet_visits`, `vet_treatments`, `vet_medications`, `vet_followups`, `vet_events`, `horse_vaccinations`, `vaccination_programs` | `horse_care_notes` | | Active |
| Breeding | `breeders`, `breeding_attempts`, `breeding_contracts`, `breeding_events`, `pregnancies`, `pregnancy_checks`, `foalings`, `embryo_transfers`, `semen_batches`, `semen_tanks` | | `apply_pregnancy_check_effects`, `log_breeding_attempt_event`, `validate_breeding_attempt` | Active |
| Laboratory | `lab_horses`, `lab_requests`, `lab_request_services`, `lab_request_service_templates`, `lab_request_messages`, `lab_samples`, `lab_sample_templates`, `lab_sample_test_types`, `lab_submissions`, `lab_services`, `lab_service_templates`, `lab_templates`, `lab_test_types`, `lab_results`, `lab_result_shares`, `lab_report_shares`, `lab_report_share_results`, `lab_credit_wallets`, `lab_credit_transactions`, `lab_events` | | `create_lab_report_share` | Active (parent-child per memory) |
| Doctor (independent practice) | `doctor_patients`, `doctor_consultations`, `doctor_prescriptions`, `doctor_followups`, `doctor_services` | | | Active (billing separated from `tenant_services` — technical debt per memory `mem://architecture/finance/doctor-billing-mismatch`) |
| Academy | `academy_sessions`, `academy_bookings` | | | Active |
| Clients & sharing | `clients`, `client_claim_tokens`, `connections`, `connection_horse_access`, `connection_messages`, `connection_rate_limits`, `consent_grants`, `party_horse_links`, `owner_delegations`, `owner_claim_requests`, `owner_claim_events`, `sharing_audit_log` | `invitations` | `create_connection_request`, `accept_connection`, `claim_client_portal`, `finalize_invitation_acceptance`, `can_access_shared_resource`, `create_horse_share`, `cleanup_connection_rate_limits`, `auto_revoke_grants_on_connection_change` | Active |
| Services catalog | `tenant_services`, `tenant_service_categories`, `stable_service_plans`, `service_providers`, `service_requests`, `service_request_events` | `custom_financial_categories` | `apply_link_preset`, `_service_request_initial_fulfillment` | Active (Doctor exception noted) |
| Finance | `invoices`, `invoice_items`, `expenses`, `ledger_entries`, `payment_intents`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `payment_accounts`, `payment_splits`, `billing_links`, `customer_balances`, `supplier_payables`, `financial_entries`, `finance_invoice_number_config`, `finance_invoice_number_counters`, `finance_request_idempotency`, `pos_sales`, `pos_sessions` | `suppliers` | 40+ helpers under `_finance_*`; `create_invoice_with_items`, `create_source_checkout_invoice`, `approve_invoice`, `cancel_invoice`, `delete_draft_invoice`, `create_expense`, `create_pos_sale`, `post_payment_session`, `get_payment_session`, `_finance_invoice_approve_inline`, `_finance_ledger_insert`, `_finance_provision_tenant_payment_account` | Active — most mature domain |
| HR | `hr_employees`, `hr_assignments`, `hr_employee_events`, `hr_salary_payments`, `hr_settings` | | | Active |
| Inventory / pharmacy | `inventory_items`, `inventory_movements`, `inventory_transactions`, `products`, `product_categories`, `stock_levels`, `warehouses`, `suppliers`, `measurement_units` | | `_finance_stock_apply_movement` | Foundation present; UI usage partial |
| Media / documents | `media_assets`, `media_asset_clients`, `media_share_links` | | `shared-media-sign` edge function | Active |
| Notifications | `notifications`, `notification_preferences`, `push_subscriptions`, `tenant_notification_governance` | | `_notify_tenant_members` (two overloads), `_push_on_notification_insert` trigger, `notify_on_connection_*`, `notify_on_boarding_admission_change` | Active |
| Community | `posts`, `post_comments`, `post_likes`, `follows` | | `can_view_community`, `can_manage_community` | Active |
| Platform settings | `app_settings` | `hr_settings`, `finance_invoice_number_config` | `_get_app_setting` | Active |
| Contracts (template engine) | `contract_templates`, `contract_template_versions`, `contract_documents`, `contract_document_events` | | `create_contract_template`, `create_contract_document_{blank,from_template}`, `approve/archive/clone_contract_*` | Active |
| Horse orders | `horse_orders`, `horse_order_types`, `horse_order_events` | | | Active |
| Consent/audit | `consent_grants`, `sharing_audit_log`, `role_audit_log`, `delegation_audit_log`, `contract_document_events`, `boarding_status_history`, `horse_ownership_history`, `horse_classification_changes`, `horse_order_events`, `service_request_events`, `hr_employee_events`, `breeding_events`, `lab_events`, `vet_events` | | | Active event-log pattern |

Core relationship map (textual — INFERRED from FK census + memory).

```
auth.users (1) ──▶ profiles (1)
                └─▶ tenant_members (N)   [user_id]
                                └─▶ tenants (1)     [tenant_id]
                                              ├─▶ tenant_capabilities (1)
                                              ├─▶ tenant_roles (N) ─▶ tenant_role_permissions (N)
                                              │                    └─▶ tenant_role_bundles ─▶ permission_bundles ─▶ bundle_permissions
                                              ├─▶ branches (N)
                                              ├─▶ horses (N)
                                              │      ├─▶ horse_ownership (N) ─▶ horse_owners
                                              │      ├─▶ horse_shares (N)  (cross-tenant)
                                              │      ├─▶ horse_movements (N)
                                              │      ├─▶ boarding_admissions (N) ─▶ housing_units
                                              │      ├─▶ vet_visits/treatments/medications/vaccinations
                                              │      ├─▶ breeding_attempts / pregnancies / foalings
                                              │      └─▶ lab_horses  (parallel lightweight registry, linked via microchip — memory)
                                              ├─▶ clients (N)
                                              │      ├─▶ invoices (N) ─▶ invoice_items (N)
                                              │      │                 └─▶ (attribution: horse_id, service_id, category_id, lab_horse_id)
                                              │      └─▶ ledger_entries ─▶ customer_balances (derived)
                                              ├─▶ payment_sessions (N) ─▶ payment_allocations (N) ─▶ payment_horse_allocations (N)
                                              ├─▶ tenant_services (N) ─▶ stable_service_plans
                                              ├─▶ connections (N as initiator)  ─┐
                                              │   connections (N as recipient) ◀─┤ ─▶ consent_grants (N)
                                              │                                  └─▶ connection_horse_access (N)
                                              ├─▶ hr_employees ─▶ hr_assignments
                                              ├─▶ notifications (N)
                                              └─▶ posts / post_comments / post_likes / follows
```

Snapshot vs live-reference architecture (per memory + verified naming).
- Snapshot-heavy tables: `invoice_items` (denormalized `service_snapshot`, `horse_snapshot`, `tax_rate`; enforced by `_invoice_items_fill_snapshots` and `_invoice_items_validate_source` triggers), `boarding_contracts.terms_metadata`, contract documents (rendered JSON), `payment_allocations.snapshot`, movement records.
- Live references: `horse_ownership`, `tenant_members`, `connections`, `consent_grants`.
- Status-history / event tables: `boarding_status_history`, `horse_ownership_history`, `horse_classification_changes`, `horse_order_events`, `service_request_events`, `hr_employee_events`, `breeding_events`, `lab_events`, `vet_events`, `contract_document_events`, `role_audit_log`, `delegation_audit_log`, `sharing_audit_log`, `connections`-audit trigger, `consent_grants`-audit trigger.
- Polymorphic / entity_type-based: `notifications.entity_type/entity_id`, `billing_links.source_type/source_id`, `payment_intents.reference_type/reference_id`, `financial_entries.reference_type` (via enum-adjacent columns). These are declared but not FK-enforced — data-integrity risk if untended.

Legacy / potentially-unused objects identified (needs verification before retirement).
- `tenant_role` enum entry `admin` — flagged legacy in `TenantContext.tsx:9` but still referenced in older records.
- `payments` and `revenue` routes redirect to finance — legacy paths retained for backwards compatibility.
- `DashboardBoardingContracts` page retained under `/legacy` route.
- `PrototypeRichContractEditor` — DEV/prototype route not in nav.
- `database_export_20_07_26` storage bucket — dated audit artifact.
- Old migration series present under `docs/aml_1_b_1/**` include ROLLBACK.sql scripts — evidence of ongoing consolidation.

Zero-policy RLS-enabled tables (DB-METADATA): `finance_request_idempotency`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `pos_sales`. RLS is enabled but no policies defined → all client access is denied. These are intended for RPC-only writes (fail-closed by design) — but `pos_sales` and `horse_owner_*` surfaces are user-facing; verify their reads/writes are exclusively RPC-mediated. See risk register R-06.

---

H. Authentication, Profile, Tenant, and Membership Architecture

Auth flow (DIRECTLY-VERIFIED-SOURCE: `AuthContext.tsx`, `pages/Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`).

- Signup: `AuthContext.signUp(email, password, fullName, phone?)` calls `supabase.auth.signUp` with `emailRedirectTo: window.location.origin + "/"` and `data: { full_name, phone }`. Profile row is expected to be created via database trigger on `auth.users` insert (per memory `mem://architecture/identity/unified-people-model`).
- Sign-in: `signInWithPassword` wrapped in `withTimeout(BOOTSTRAP_TIMEOUT_MS)`.
- Sign-out: Optimistic clear + 5 s race + local-fallback (`AuthContext.tsx:183-217`).
- Reset: `ForgotPassword` and `ResetPassword` pages exist as separate routes.
- Session persistence: `localStorage` (per Supabase client init) with `autoRefreshToken: true`.
- `onAuthStateChange` listener skips `setUser` on `TOKEN_REFRESHED` for same user (prevents downstream remounts).

Verified assumptions:
- ✅ No service-role key in frontend.
- ✅ Timeout guard on sign-in.
- ✅ Auth listener installed before `bootstrap()`.

Unverified this round:
- ⚠ Provider configuration (Google, phone, SAML, HIBP toggle, password policy, email templates) — not queried.
- ⚠ Auth trigger for profile provisioning is expected but not inspected in this pass (`handle_new_user`-style function absent from the `IN (...)` function census; needs a follow-up read).

Identity model.

| Concept | Table / source | Notes |
|---|---|---|
| Auth user | `auth.users` (managed) | Owned by Supabase |
| Personal profile | `public.profiles` | Fields: email, full_name, phone, avatar_url; 4 policies |
| Tenant | `public.tenants` (28 cols including type, slug, is_public, default_tax_rate, currency, owner_id) | Public-facing surface via `slug` |
| Public tenant profile fields | `public_profile_fields` | Curated visibility layer |
| Personal workspace | `workspaceMode === "personal"` derived state | Not a separate DB row |
| Organization workspace | active `tenant_members` row | Persisted via `localStorage.activeTenantId` |

Duplicate identity fields: `phone` appears on `profiles` AND `tenants`; `email` on `profiles` AND `tenants`; the source of truth is context-dependent (personal vs organization).

Tenant creation (E.8.3) — non-atomic, VERIFIED-SOURCE `TenantContext.tsx:318-483`.

1. `supabase.auth.getUser()` — validate session.
2. Client-side `zod` validation via `tenantSchema`.
3. `.insert()` into `tenants` (with `owner_id: currentUserId`).
4. `.insert()` into `tenant_members` (`role: 'owner'`, `can_invite:true`, `can_manage_horses:true`). If this fails: `.delete()` the tenant (rollback).
5. `rpc('initialize_tenant_defaults', { p_tenant_id, p_tenant_type })` — non-blocking. If this fails: tenant + owner remain, capabilities are missing.
6. `refreshTenants()` (background).

Failure classification.
- Blocking: validation, tenant insert, member insert.
- Non-blocking (silent WARNING in logs only): capability initialization.

Onboarding routes exist for 10 tenant types (`stable, clinic, lab, academy, owner/horse-owner, pharmacy, transport, auction, trainer, doctor`) — all instantiate the same `CreateStableProfile` component with a `tenantType` prop. Confirms parity between the enum and the UI.

Membership & active context.
- Multi-tenancy allowed — `TenantContext.tenants` is a list.
- Active tenant selection: prefer `localStorage.activeTenantId` if it matches a fetched membership; otherwise pick first membership.
- If membership goes inactive: fetch filter `is_active=true` silently drops it → user is switched off it on next `fetchTenants()`. No warning UI observed.
- Stale-context risk: `localStorage.activeTenantId` persists across reloads even before `fetchTenants` completes; `WorkspaceRouteGuard` waits for `tenantHydrated` to gate, so pre-hydration render is safe.

---

I. Role, Permission, and Delegation Architecture

Permission architecture inventory (DB-METADATA + `usePermissions.ts`).

| Table | Purpose |
|---|---|
| `permission_definitions` | Master registry of ~104 permission keys (dotted vocabulary). Fields include `key`, `module`, `resource`, `action`, `display_name`, `display_name_ar`, `is_delegatable`. |
| `permission_bundles` | Named permission sets, tenant-scoped, `is_system` flag. |
| `bundle_permissions` | (bundle_id, permission_key) join. |
| `tenant_roles` | Custom per-tenant roles. |
| `tenant_role_permissions` | Direct role permissions. |
| `tenant_role_bundles` | Role → bundle assignments. |
| `tenant_role_preset_bindings` | Preset templates. |
| `member_permissions` | Per-member overrides (grant/revoke). |
| `member_permission_bundles` | Per-member bundle assignments. |
| `delegation_scopes` | Scoped delegation grants (grantor_member_id → permission_key with `can_delegate`). |
| `delegation_audit_log`, `role_audit_log` | Audit trails. |

Frontend resolution order (VERIFIED `src/hooks/usePermissions.ts:207-240`, mirrors server order):
1. Owner → all permissions.
2. Role direct (`tenant_role_permissions`).
3. Role bundles (`tenant_role_bundles → bundle_permissions`).
4. Member bundles (`member_permission_bundles → bundle_permissions`).
5. Member overrides (`member_permissions.granted` boolean — last wins).

Non-owner effective permissions cached 5 min. Delegation requires: has permission + has `admin.permissions.delegate` + `permission_definitions.is_delegatable` + explicit `delegation_scopes` row.

Backend enforcement (DB-METADATA sample from `pg_policies` + function census).

All key permission helpers are `SECURITY DEFINER` with pinned `search_path=public`:
- `has_permission(_user_id uuid, _tenant_id uuid, _permission_key text)`
- `has_tenant_role(_user_id uuid, _tenant_id uuid, _role tenant_role)`
- `is_tenant_member(_user_id uuid, _tenant_id uuid)`
- `is_active_tenant_member(_user_id uuid, _tenant_id uuid)`
- `check_tenant_permission(_user_id uuid, _tenant_id uuid, _permission_key text)`
- `can_delegate_permission(_user_id uuid, _tenant_id uuid, _permission_key text)`
- `can_invite_in_tenant(_user_id uuid, _tenant_id uuid)`
- `can_access_shared_resource(_actor_user_id uuid, _resource_type text, _resource_id uuid, _required_access text)`

Sample policies verified in `pg_policies` snapshot show `has_permission` in RLS for `horse_ownership` (`horses.edit`), `bundle_permissions` (owner OR `admin.permissions.delegate`), `delegation_scopes` (owner only for management), and `is_tenant_member` for reads on `connections`, `consent_grants`, `delegation_scopes`, `delegation_audit_log`.

Frontend/backend enforcement matrix (illustrative — full audit requires policy-body enumeration).

| Domain | Frontend model | Backend enforcement | Aligned? | Evidence | Residual risk |
|---|---|---|---|---|---|
| Horses | `hasPermission('horses.view'/'horses.edit')` | RLS `has_permission(auth.uid(), h.tenant_id, 'horses.edit')` | ✅ | `App.tsx:351`, policy inspection | — |
| Finance invoices | Route permission `finance.invoice.view/edit/approve/...` | Mostly RPC-only writes; RLS uses `has_permission` (per memory `mem://security/granular-backend-enforcement`) | ✅ | `App.tsx:661-745`; 40+ `_finance_*` DEFINER helpers | — |
| Laboratory | Perm `laboratory.samples.view` + module flag | RLS via permissions (per memory) | ✅ | `App.tsx:469` | Complex domain, breadth risk |
| Doctor | Perm `doctor.patients.read/write`, `doctor.consultations.read/write`, `doctor.services.write` | RLS on `doctor_*` tables (each 4 policies) | ✅ | Route guards + table policy counts | Billing separated from tenant_services (`mem://architecture/finance/doctor-billing-mismatch`) |
| Admin/permissions | `admin.permissions.delegate` route gate | RLS on bundles/delegation via same key | ✅ | `App.tsx:601` + `bundle_permissions` policy | — |
| Community | `community.view` in Org mode; personal mode bypasses | Personal-mode posts scope by `tenant_id IS NULL` in RLS (per memory `mem://security/community-workspace-rls-logic`) | Partial | `CommunityRouteGuard`, memory | Post-visibility enum `public/private/followers` — verify per-row |
| HR | `hr.view/manage` | Tenant scoping via `has_permission`; DELETE policy intentionally absent on `hr_employees` (per security memory ignore rationale) | ✅ | Route guards + earlier ignored security finding | Fail-closed deletes require RPC |
| Contracts / documents | Org-only, no per-perm on some routes | RLS per template/document | Partial | `App.tsx:381` no `requiredPermission` | Some contract routes lack UI perm gates — RLS is the guard |
| Notifications settings | ProtectedRoute only for `/dashboard/settings/notifications` | RLS on `notifications` (3 policies), `notification_preferences` (1) | Partial | `App.tsx:611-614` | Personal notifications correctly permissive |

Migration status (I.9.4) — verified snapshot only, not exhaustive.
- RLS is enabled on all 158 public tables (VERIFIED via DB-METADATA).
- 507 policies exist — approx. average 3.2 per table.
- Zero-policy tables are all fail-closed RPC-only (`finance_request_idempotency`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `pos_sales`).
- Legacy `has_role` (non-tenant-scoped) does not appear in the SECURITY DEFINER census; the codebase uses tenant-scoped `has_tenant_role` throughout.
- Whether every domain's writes use `has_permission()` (vs still using `is_tenant_member()` broadly) was not exhaustively enumerated this round — spot checks show alignment; full policy-body audit is a Round 2 deliverable.

9.5 Authority questions — explicit answers.

| # | Question | Answer (with evidence) |
|---|---|---|
| 1 | Can a normal member perform writes hidden by the UI? | Yes for tables whose write RLS uses only `is_tenant_member` (broader than intended). Not exhaustively enumerated; each domain must be verified. Where policies use `has_permission()`, hidden writes are blocked. Front-end hides do not enforce. |
| 2 | Can a custom role see a button but be rejected by RLS? | Yes — `usePermissions` cache is 5 min; server RLS is the truth. UI can lag. This is by design. |
| 3 | Can a hidden route be opened manually? | Yes for `ProtectedRoute`-only routes (`/dashboard`, `/dashboard/mobile/:moduleKey`, `/dashboard/my-payments`, `/dashboard/my-bookings`, `/profile/:id`, `/dashboard/settings/notifications`, `/dashboard/contracts/documents/:documentId`). All rely on RLS to hide data. |
| 4 | Can the final owner be removed or demoted? | Not verified this round. No explicit "last owner" guard was found in `usePermissions` or `TenantContext`. Requires reading `remove_tenant_member` / role-update RPC (not in this pass's census). Flagged in risk register R-08. |
| 5 | Can a manager delegate owner-level authority? | No (per memory `mem://security/roles/manager-role-baseline`): manager includes all permissions except `admin.permissions.delegate`. |
| 6 | Can a user change their own tenant role? | Not verified this round. RLS on `tenant_members` needs body inspection. Flagged R-08. |
| 7 | Can one tenant modify another tenant's membership? | RLS on `tenant_members` should scope by tenant; not verified in body this round. Flagged R-08. |
| 8 | Can a SECURITY DEFINER function accept a foreign tenant ID? | Functions take `p_tenant_id` and rely on internal `is_active_tenant_member(auth.uid(), p_tenant_id)` checks (verified pattern in `create_source_checkout_invoice`, `post_payment_session` per prior conversation). All DEFINER functions verified this round have pinned `search_path` (see Section J). Case-by-case verification of tenant validation is Round 2 scope. |
| 9 | Are membership-only writes broader than intended? | Likely yes on some legacy tables. Full enumeration deferred. |
| 10 | Can normal users write directly to system-managed finance or audit tables? | No — `finance_request_idempotency` has 0 client policies; audit logs (`role_audit_log`, `delegation_audit_log`, `sharing_audit_log`) are populated by triggers/DEFINER RPCs. |

---

J. Multi-Tenancy, RLS, and Cross-Tenant Isolation

Coverage (DB-METADATA).

- 158 / 158 public tables have RLS enabled.
- 507 policies across those tables.
- 7 tables have zero client policies (fail-closed): `finance_request_idempotency`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `pos_sales`.
- No RLS-disabled public tables.

Isolation helper inventory (DB-METADATA — pinned search_path VERIFIED for all).

| Helper | Signature | Security | Search path |
|---|---|---|---|
| `has_permission` | `(_user_id uuid, _tenant_id uuid, _permission_key text)` | DEFINER | `search_path=public` |
| `check_tenant_permission` | `(_user_id, _tenant_id, _permission_key)` | DEFINER | `search_path=public` |
| `has_tenant_role` | `(_user_id, _tenant_id, _role tenant_role)` | DEFINER | `search_path=public` |
| `is_tenant_member` | `(_user_id, _tenant_id)` | DEFINER | `search_path=public` |
| `is_active_tenant_member` | `(_user_id, _tenant_id)` | DEFINER | `search_path=public` |
| `can_delegate_permission` | `(_user_id, _tenant_id, _permission_key)` | DEFINER | `search_path=public` |
| `can_invite_in_tenant` | `(_user_id, _tenant_id)` | DEFINER | `search_path=public` |
| `can_access_shared_resource` | `(_actor_user_id, _resource_type, _resource_id, _required_access)` | DEFINER | `search_path=public` |
| `_active_tenant_context` | `(p_active_tenant_id uuid)` | DEFINER | `search_path=public, pg_temp` |
| `_lock_horse_authority_scope` | `(p_horse_id uuid)` | DEFINER | `search_path=public, pg_temp` |
| `_resolve_horse_write_authority`, `_resolve_horse_access_mode`, `_resolve_host_scope`, `_resolve_owner_authority`, `_resolve_previous_host_scope`, `_resolve_local_record_completion_authority` | horse-scoped context resolvers | DEFINER | `search_path=public, pg_temp` |
| `_tsc_enforce_same_tenant` | tenant-consistency trigger fn | INVOKER | pinned |

Search-path safety. The query for DEFINER functions without a pinned `search_path` returned zero rows. All `SECURITY DEFINER` functions in the public schema pin their search path — no privilege-escalation via search-path manipulation. ✅

RLS coverage matrix (spot-checked, illustrative — full body-level audit deferred to Round 2).

| Domain (representative) | RLS enabled | Read basis | Write basis | Cross-tenant exception | Confidence |
|---|---|---|---|---|---|
| `horses` | ✅ (8 policies) | `is_tenant_member` + share/consent | `has_permission('horses.edit')` (per memory) | `horse_shares`, `connection_horse_access`, `horse_owner_access_grants` | High |
| `horse_ownership` | ✅ (4) | `is_tenant_member` on parent horse | `has_permission('horses.edit')` on parent horse | — | High (body inspected) |
| `invoices` / `invoice_items` | ✅ (4/4) | Tenant scoping via `has_permission` | RPC-only via `create_invoice_with_items`, `approve_invoice`, `cancel_invoice`, `delete_draft_invoice` | — | High (per memory) |
| `ledger_entries` | ✅ (3) | Tenant + finance perm | RPC-only via `_finance_ledger_insert` DEFINER | — | High |
| `payment_sessions` / `payment_allocations` / `payment_horse_allocations` | ✅ (5/1/1) | Tenant + finance perm | RPC-only (`post_payment_session`) | — | High |
| `pos_sales` | ✅ (0 client policies) | — | RPC-only (`create_pos_sale`) | — | High (fail-closed) |
| `tenants` | ✅ (4) | Public read via slug (public_profile_fields) + owner/member | Owner-scoped writes | Public read on selected fields | Medium (body not read this round) |
| `tenant_members` | ✅ (5) | Members of same tenant | Owner-scoped mutations | — | Medium (body not read) |
| `connections` | ✅ (1) | Initiator OR recipient tenant member OR recipient profile OR initiator user | Owner-restricted; audit trigger | Cross-tenant by nature | High |
| `consent_grants` | ✅ (1) | Connection participant | RPC-mediated | Cross-tenant by nature | High |
| `posts` | ✅ (15) | Complex visibility (public/private/followers/community perm) | Author + community perm | Public posts are cross-tenant readable | Medium (many policies — verify overlap) |
| `notifications` | ✅ (3) | User-scoped | Trigger + `_notify_tenant_members` DEFINER inserts | — | High |
| `app_settings` | ✅ (1) | Deny all client access (`qual: false`) | — | — | High (system-only) |
| `client_claim_tokens` | ✅ (1) | Creator only | RPC-mediated | — | High |
| `horse_owner_*` (grants/invites) | ✅ (0 policies) | — | RPC-only | — | Fail-closed |
| `finance_request_idempotency` | ✅ (0 policies) | — | DEFINER only | — | Fail-closed |

Broad `USING (true)` patterns: none detected in the sampled policies. `app_settings` uses `USING false` for total client denial.

Cross-tenant pattern classification (INFERRED + memory).

| Pattern | Initiator | Stored ids | Shared data | Snapshot/live | Release control | Revocation | Enforcement | Maturity |
|---|---|---|---|---|---|---|---|---|
| Stable ↔ Lab | Stable | `lab_requests.tenant_id`, `lab_submissions.stable_tenant_id`, snapshot fields | Requested tests, horse snapshot | Snapshot (per memory) | Lab | Draft state | RLS + RPC | Active |
| Stable ↔ Horse Owner | Owner (via invite) | `horse_owner_invites`, `horse_owner_access_grants` | Horse identity + selected records | Live reference w/ scope | Stable | `auto_revoke_grants_on_connection_change` trigger | RLS (zero-policy → RPC) | Active but zero-policy hardening |
| Stable ↔ Doctor | Either | `service_requests`, `doctor_patients` | — | Snapshot for consultations | Doctor | — | RLS | Partial (billing debt) |
| Connected movement | Stable | `incoming_horse_movements`, `horse_movements` (from/to tenant ids) | Movement events | Live | Destination confirms | Cancel RPC | RLS + DEFINER RPC | Active |
| Partner connections | Either | `connections.initiator_tenant_id`, `recipient_tenant_id`, `recipient_profile_id`, `recipient_email/phone`, `expires_at` | Contact + scope | Live | Recipient accepts | Update status; audit trigger | RLS + `accept_connection` DEFINER | Active |
| Consent grants | Initiator | `consent_grants.connection_id`, `resource_type`, `resource_id`, `access_level` | Per-resource access | Live | Both parties | `auto_revoke_grants_on_connection_change` | RLS via connection | Active |
| Horse sharing | Stable | `horse_shares`, `horse_share_packs`, `connection_horse_access` | Per-horse | Live | Owner | Delete row | RLS | Active |
| Shared media | Stable | `media_share_links` (token, expires_at) | Media | Snapshot + signed URL | Creator | Delete row / expiry | RLS + `shared-media-sign` edge fn | Active |
| Public token links (share/horse/lab-result) | Stable | Token in URL param | Curated horse/lab report | Snapshot | Creator | Delete row | Public route + RLS on read | Active — verify expiry policies |
| Invitations | Tenant owner | `invitations` (email, phone, role, expires_at, status) | Membership grant | Live | Recipient | Owner revoke | RLS + `finalize_invitation_acceptance` DEFINER (email/phone verified per memory) | Active |
| Client claim | Stable | `client_claim_tokens`, `owner_claim_requests`, `owner_claim_events` | Client identity | Live | Both | Token expiry | RLS (0-policy on some) + `claim_client_portal` DEFINER | Active |

Isolation-risk review.

| Concern | Finding |
|---|---|
| Foreign-tenant-ID injection | Every DEFINER RPC takes `p_tenant_id`; validation is implementation-specific. Per memory `mem://security/opaque-key-runtime-auth-rls`, the pattern of "check `is_active_tenant_member(auth.uid(), p_tenant_id)` before mutating" is used. Not exhaustively verified this round. |
| Missing tenant validation in RPCs | Requires per-function body inspection — deferred |
| Client-supplied tenant IDs trusted by privileged functions | Same as above |
| SECURITY DEFINER without pinned search_path | None found ✅ |
| Cross-tenant joins relying on RLS null | Verified pattern in `bundle_permissions` and `consent_grants` policies uses `EXISTS` sub-queries against `is_tenant_member` — safe pattern |
| Public tokens without expiration | `connections.expires_at`, `invitations.expires_at`, `media_share_links.expires_at` present; verify enforcement in queries — deferred |
| Data accessible after revocation | `auto_revoke_grants_on_connection_change` handles connection status changes; signed URLs may outlive revocation (browser-cached; typical Storage behaviour) — flagged R-04 |
| Storage paths without tenant ownership checks | `horse-media` bucket policies not enumerated by name this round — deferred |
| Duplicate or conflicting policies | 8 policies on `horses`, 15 on `posts`, 5 on `academy_bookings`/`academy_sessions`, 5 on `payment_intents` — worth policy-body review for overlap/precedence |

---

K. RPC, Function, Trigger, and Backend Contract Registry

Function census: 317 in `public` schema.

Priority function inventory (spot-verified subset).

| Function | Args | Security / search_path | Purpose | Callers (frontend) | Status |
|---|---|---|---|---|---|
| `create_invoice_with_items` | `(p_tenant_id uuid, p_idempotency_key uuid, p_payload jsonb)` | DEFINER / `""` | Atomic invoice + items + snapshots + idempotency | `src/lib/finance/invoiceRpc.ts`, `useLabInvoiceDraft.ts` | Active |
| `create_source_checkout_invoice` | same shape | DEFINER / `""` | Source-checkout invoice with trace | POS `EmbeddedCheckout` | Active |
| `approve_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id)` | DEFINER / `""` | Post ledger; frozen snapshots | `src/lib/finance/approveInvoice.ts` | Active |
| `cancel_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id, p_effective_date, p_reason)` | DEFINER / `""` | Cancel + reverse ledger | finance hooks | Active |
| `delete_draft_invoice` | `(p_tenant_id, p_idempotency_key, p_invoice_id)` | DEFINER / `""` | Delete draft only | finance UI | Active |
| `post_payment_session` | `(p_tenant_id, p_idempotency_key, p_payload jsonb)` | DEFINER / `""` | Atomic multi-invoice payment + allocation + idempotency | `src/lib/finance/postPaymentSession.ts` | Active |
| `get_payment_session` | `(p_tenant_id, p_session_id)` | DEFINER / `""` | Read session with allocations | finance UI | Active |
| `create_pos_sale` | `(p_tenant_id, p_idempotency_key, p_payload)` | DEFINER / `""` | POS sale | `pos/EmbeddedCheckout` | Active |
| `create_expense` | (per census) | DEFINER | Expense creation | expense forms | Active |
| `_finance_invoice_approve_inline` | `(p_tenant_id, p_invoice_id, p_actor)` | DEFINER / `""` | Inline approval helper | Internal | Active |
| `_finance_ledger_insert` | 12-arg | DEFINER / `""` | Sole ledger insert path | Internal | Active |
| `_finance_provision_tenant_payment_account` | `()` | DEFINER / `""` | Auto-provision payment account | Internal | Active |
| `initialize_tenant_defaults` | `(p_tenant_id uuid, p_tenant_type text)` | DEFINER / `public` | Capability seeding | `TenantContext.createTenant` (non-blocking) | Active |
| `has_permission`, `has_tenant_role`, `is_tenant_member`, `is_active_tenant_member`, `check_tenant_permission`, `can_delegate_permission`, `can_invite_in_tenant`, `can_access_shared_resource` | see Section J | DEFINER / pinned | Permission/tenant helpers | RLS bodies + explicit checks | Active |
| `create_connection_request` | 8-arg | DEFINER / `public` | Cross-tenant invite | connections hooks | Active |
| `accept_connection` | `(_token text)` | DEFINER / `public` | Accept via token | `AcceptConnectionPage` | Active |
| `finalize_invitation_acceptance` | `(_token text)` | DEFINER / `public` | Invite acceptance with email/phone verification (per memory) | `InviteLandingPage` | Active |
| `claim_client_portal` | `(_token text)` | DEFINER / `public` | Client claim | client portal flows | Active |
| `record_horse_movement_with_housing` | 20 args | DEFINER / `public` | Movement with housing sync | `movement/RecordMovementDialog` | Active |
| `create_boarding_contract_with_connection` | 7-arg | DEFINER / `public` | Boarding contract creation via connection | boarding hooks | Active |
| `approve_boarding_contract_as_owner` / `_as_stable` | | DEFINER | Two-sided approval | boarding UI | Active |
| `update_horse_identity` | `(p_horse_id, p_active_tenant_id, p_payload jsonb)` | DEFINER / `public, pg_temp` | Governed sensitive identity edits | Horse wizard | Active |
| `complete_local_horse_record` | same shape | DEFINER / `public, pg_temp` | Custodial local completion | `HorseProfile` | Active |
| `create_lab_report_share` | | DEFINER | Lab sharing | lab hooks | Active |
| `check_tenant_limit` | | DEFINER / `public` | Enforce tenant limits | UI + policies | Active |

Trigger architecture (167 total non-internal, sampled).
- Profile creation: expected `handle_new_user` on `auth.users` — not read this round.
- Snapshot enforcement: `_invoice_items_fill_snapshots`, `_invoice_items_validate_source` (BEFORE INSERT/UPDATE on `invoice_items`).
- Housing sync: `trg_sync_contract_phase_from_admission` on `boarding_admissions`.
- Notifications: `_push_on_notification_insert` on `notifications` (AFTER INSERT).
- Boarding events: `trg_notify_boarding_admission`.
- Connections: `trg_connections_audit`, `trg_connections_auto_revoke_grants`, `trg_notify_connection_created`, `trg_notify_connection_status_change`, `trg_normalize_connection_email`, `trg_connections_updated_at`.
- Consent grants: `trg_consent_grants_audit`, `trg_consent_grants_updated_at`.
- Breeding: `trg_log_breeding_attempt_event`, `trg_validate_breeding_attempt`, `update_breeding_attempts_updated_at`.
- Bundle permissions: `trg_audit_bundle_permissions`.
- Standard `update_updated_at_column` widely applied.
- Multiple horse identity/authority triggers: `_trg_lock_horse_owner_tenant_change`, `_trg_lock_horse_ownership_scope`, `_trg_provision_stable_local_record_permissions`.

Contract consistency signals.
- ~554 `as any` in `src/` — many at Supabase call boundaries (e.g. `usePermissions.ts:63`: `.from("permission_definitions" as any)`) — indicates types file drift or intentional bypass.
- 98 `.rpc(` callsites — most likely typed via generated Database type but some untyped.
- No global RPC-error normalizer detected; each caller does its own error mapping (see `src/lib/finance/approveInvoiceErrorMap.ts`).

---

L. Storage and File Architecture

Buckets (DB-METADATA `storage.buckets`).

| Bucket | Public | Size limit | MIME allow list | Purpose | Status |
|---|---|---|---|---|---|
| `horse-media` | private | 52,428,800 (50 MB) | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`, `video/quicktime` | Horse media assets, community posts, general media | Active |
| `database_export_20_07_26` | private | none | none | Dated audit / backup artifact | Legacy artifact — do not use for production |

Upload / download flows (source-code sampled — not fully audited).
- `useMediaAssets`, `useMediaShareLinks`, `useHorseFile`, `useHorseFileAccess`, `useHorseFileProjection` — the primary access layer.
- Signed URLs are generated via the `shared-media-sign` edge function (`verify_jwt = false`) — supports public token flow.
- Media sharing: `media_share_links` with expiration.

Explicit determinations.
- Path convention: not enumerated in this round.
- MIME/extension validation: client-side (via bucket allow-list) + Supabase enforcement.
- Size checks: bucket-level 50 MB; client-side pre-upload check not verified.
- Cross-tenant sharing: signed URLs are time-bound; long-lived signed URLs can outlive revocation — inherent Storage behaviour.
- MIME/extension mismatch check: not verified.

Storage `storage.objects` policies were not enumerated by name this round — flagged R-04.

---

M. Notifications and Edge Function Architecture

Notification architecture (DB-METADATA + source).

| Component | Table / file | Notes |
|---|---|---|
| Central table | `notifications` (13 cols, 3 policies) | Fields include `event_type`, `entity_type`, `entity_id`, `metadata jsonb` |
| Trigger | `_push_on_notification_insert` on `notifications` AFTER INSERT | Fans out to push subscribers |
| Fan-out helpers | `_notify_tenant_members(_tenant_id, _event_type, _title, _body, _entity_type, _entity_id, _exclude_user_id, _metadata?)` — two overloads (DEFINER, `search_path=public`) | Emits per-member notifications |
| Preferences | `notification_preferences` (15 cols, 1 policy) | Per-user category toggles |
| Tenant governance | `tenant_notification_governance` (8 cols, 2 policies) | Tenant-wide policy |
| Push subscriptions | `push_subscriptions` (10 cols, 1 policy) | User-owned |
| Registry | `src/lib/notifications/familyRegistry.ts`, `helpers.ts`, `policy.ts`, `presets.ts`, `routeDescriptor.ts`, `summary.ts` | Metadata-driven, localized |
| Trigger sources | `notify_on_connection_created`, `notify_on_connection_status_change`, `notify_on_boarding_admission_change`, breeding/lab/horse-order event triggers (implied by `*_events` table naming) | Widely used |

Classification per memory `mem://architecture/notification-system-standard`: metadata-driven, localized, with deduplication window. In-app + push channels active. Email delivery for auth/invitations is via edge functions.

Edge Function inventory (VERIFIED `supabase/config.toml` + file sizes).

| Function | LOC | verify_jwt | Purpose | Secrets (names only) | Status |
|---|---|---|---|---|---|
| `send-invitation-email` | 345 | ✅ true | Deliver invitation emails | Email provider secret (name not enumerated this round; likely Resend) | Active |
| `send-ownership-notification` | 282 | ✅ true | Ownership change notifications | Email provider secret | Active |
| `send-push-notification` | 439 | ❌ false | Web-push fan-out from `notifications` trigger | `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | Active |
| `get-vapid-key` | 25 | ❌ false | Serve VAPID public key to client for subscription | `VAPID_PUBLIC_KEY` (read-only) | Active |
| `shared-media-sign` | 91 | ❌ false | Sign Storage URLs for public share tokens | Storage service creds | Active |
| `expire-stale-connections` | 113 | ❌ false | Scheduled: mark connections past `expires_at` | none obvious | Scheduled — actual schedule not verified |
| `mark-overdue-invoices` | 64 | ❌ false | Scheduled: overdue-invoice sweep | none obvious | Scheduled — actual schedule not verified |

Scheduled operations. Both `expire-stale-connections` and `mark-overdue-invoices` appear designed for cron invocation. The actual cron schedule was not queried this round (Supabase `cron` extension state not inspected). Flagged R-05.

Every `verify_jwt=false` function must self-validate — spot-verified that `send-push-notification` and `shared-media-sign` are triggered internally / by token respectively (per memory + previous conversation).

---

N. Deployment and Environment Foundation

Environment model — HIGH UNCERTAINTY.

- `.env` contains only `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` — a single Supabase project ref.
- `supabase/config.toml.project_id = "vhxglsvxwwpmoqjabfmj"` matches.
- Preview URL: `id-preview--64c79edd-...lovable.app`; published: `horse-verse-link.lovable.app`; custom domains: `daylihorse.com`, `www.daylihorse.com`.
- All URLs point at the same Supabase project. No evidence of a separate staging/preview/production database.
- Impact: preview and production share data → any preview action mutates production data.
- Flagged R-01 as HIGH-SEVERITY environment concern.

Build & deployment (VERIFIED from `package.json` + `vite.config.ts`).

- Build: `vite build` (or `vite build --mode development`).
- No `typecheck` script; no `test` script; `lint` = `eslint .`.
- Deployment target: Lovable managed hosting (per project URL structure). CI/CD not verified from repo.
- `.github/workflows/n2-4-controlled-supabase-runtime.yml` exists — content not inspected this round.
- PWA generation: kill-switch (`selfDestroying: true`) — no true app-shell PWA on this platform.
- Service worker: only `public/push-sw.js` retained.

Environment-variable registry (values NOT read).

| Variable | Purpose | Consumer | Frontend-safe | Scope | Notes |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | `src/integrations/supabase/client.ts` | ✅ | Frontend | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key | client.ts | ✅ | Frontend | Public (anon JWT) |
| `VITE_SUPABASE_PROJECT_ID` | Project ref | build | ✅ | Frontend | Public |
| `VAPID_PUBLIC_KEY` | Push key (public half) | `get-vapid-key` edge fn | ✅ readable | Server + client | Set as Cloud secret (must verify) |
| `VAPID_PRIVATE_KEY` | Push private key | `send-push-notification` edge fn | ❌ never in frontend | Server | Cloud secret |
| `VAPID_SUBJECT` | Mailto for VAPID | push edge fn | ✅ | Server | Cloud secret |
| Email provider key (name TBD) | Transactional email | `send-invitation-email`, `send-ownership-notification` | ❌ never in frontend | Server | Cloud secret; existence assumed |

- No service-role key or database credentials in frontend. ✅
- No hardcoded project URLs beyond `.env`.

Migration and release safety.
- 322 migrations under `supabase/migrations/`, timestamp-prefixed → deterministic order.
- Rollback strategy: several `docs/aml_1_b_1/**/*ROLLBACK.sql` scripts show intentional rollback bundling. No automated rollback tooling in repo.
- Schema/data changes are mixed within single migrations in places (backfills authored inside migrations).
- Hotfixes: no evidence outside migration files.
- Backup/recovery documentation: `database_export_20_07_26` bucket is a one-off snapshot artefact; no rolling backup policy visible.
- CI/CD database validation: `.github/workflows/n2-4-controlled-supabase-runtime.yml` present — content unverified.

---

O. Testing, Quality, Performance, and Reliability Foundation

Testing inventory.

| Kind | Present | Count | Status |
|---|---|---|---|
| Unit tests (vitest) | ✅ | 19 | Finance-heavy (12 in `src/lib/finance/__tests__/`), plus 4 in `src/components/finance/__tests__/`, 1 housing chip test, 1 laboratory checkout safety, 1 POS checkout contract, 1 lab RPC cutover |
| Hook tests | ✅ | 1 (`useLabInvoiceDraftRpcCutover`) | Minimal |
| Component tests | ✅ | 2 (invoice details, PDF paginator) | Minimal |
| Integration tests | ⚠ | 0 | Absent |
| End-to-end tests | ❌ | 0 (Playwright installed but no `playwright/**` suite in repo, only `playwright.config.ts` + `playwright-fixture.ts`) | Absent |
| RLS tests | ❌ | 0 | Absent |
| RPC tests | ✅ | 5 SQL harnesses under `supabase/tests/database/`: source-checkout (×2), catalog runtime (×2), payment-session RPC | Active — finance-focused |
| Migration tests | ❌ | 0 | Absent |
| Finance integrity tests | ✅ | Yes (see above) | Strongest coverage area |
| Mobile / PWA tests | ❌ | 0 | Absent |
| RTL tests | ✅ (audit script) | `scripts/audit-rtl.ts` + `rtl-allowlist.json` | Custom audit — not "tests" |
| i18n tests | ✅ (audit script) | `scripts/audit-i18n.ts` + `i18n-allowlist.json` | Custom audit |
| Accessibility tests | ❌ | 0 | Absent |

Build health.
- `tsconfig.json` has: `allowJs`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false`, `skipLibCheck: true`. Very relaxed TypeScript posture.
- ~554 `as any` occurrences across `src/`.
- No `type-check` script wired in `package.json`.
- ESLint 9 flat config; no lint-on-CI script visible.
- 8 files over 1,200 lines (largest 2,707) — refactoring candidates but out of Round 1 scope.

Performance and reliability signals (observed patterns; not exhaustive).
- 5-min stale time on permissions (fine).
- `refetchOnWindowFocus:false` global — reduces network but delays refresh.
- Multiple TanStack Query hooks per page in large files → risk of N+1 fetches.
- Direct `supabase.from(...)` calls occur inside 20+ component files (grep sample) — mixes UI and data-access.
- No visible pagination guardrail across list queries (must be per-hook).
- No global mutation-error handler on `QueryClient`.
- Realtime subscriptions inferred (`useNotifications` etc.) but no central subscription manager to audit lifecycle.
- Timeout wrapper (`withTimeout`) applied selectively.
- Atomic multi-step writes are correctly encapsulated in DEFINER RPCs for finance — good.
- `TenantContext.createTenant` is the notable non-atomic exception (Section H).

---

P. Historical Contradiction Register

| ID | Historical statement | Source | Current verified state | Evidence | Resolution for handoff |
|---|---|---|---|---|---|
| H-01 | "PWA foundation established" (implied in memory index) | memory | PWA is a kill-switch — `selfDestroying: true`; `main.tsx` unregisters SWs on every load; only push SW retained | `vite.config.ts:21-27`, `main.tsx:9-36` | Do not treat as PWA-ready; native/PWA is future work |
| H-02 | Doctor billing integrated | product intent | Doctor uses `doctor_services` separate from `tenant_services` — architectural debt | memory `mem://architecture/finance/doctor-billing-mismatch` | Note as technical debt |
| H-03 | `admin` role in `tenant_role` enum | historical schema | Kept for backward compatibility, not used in UI | `TenantContext.tsx:9` | Do not assign in new code |
| H-04 | Legacy `/dashboard/boarding-contracts` page | routing | Deprecated; redirects to `/dashboard/contracts?type=boarding`; `/legacy` route retained but not linked | `App.tsx:416-430` | Plan for removal after verification |
| H-05 | Movement as standalone module | earlier docs | Consolidated under Housing (redirect to `/dashboard/housing?tab=movement`) | `App.tsx:528-537` + memory | Update any external docs |
| H-06 | "Fully documented handoff" (implicit) | earlier reports | Extensive execution docs exist under `docs/aml_1_b_1/**`, but no unified handoff or receiving-developer guide | filesystem | Round 1 output is the seed of that guide |
| H-07 | Broad `tenant_role`-based RLS everywhere | earlier | RLS mostly moved to `has_permission()`; some tables still `is_tenant_member` for reads | policy spot-checks + memory `mem://security/granular-backend-enforcement` | Complete Round 2 policy-body audit |
| H-08 | Payments status manually settable | earlier UX | Payments status strictly derived from ledger; `paid` cannot be manually set | memory `mem://finance/payment-status-integrity-rule` | Enforce in all new UI |
| H-09 | Finance breakage after J5 constraints for lab-invoice draft | previous audit | Fixed via `createInvoiceWithItems` cutover | previous conversation | Closed |

---

Q. Current Risk Register

| ID | Area | Finding | Type | Evidence | Severity | Confidence | Impact | Immediate concern? | Next step |
|---|---|---|---|---|---|---|---|---|---|
| R-01 | Environments | Single Supabase project serves preview + production + custom domains | Architectural limitation | `.env` single project ref; `supabase/config.toml` | HIGH | HIGH | Preview actions mutate live data | ✅ | Establish separate staging project before major DB work |
| R-02 | Tenancy | `TenantContext.createTenant` is 3-step non-atomic client insert with partial rollback | Confirmed defect | `TenantContext.tsx:318-483` | HIGH | HIGH | Orphan tenants w/o capabilities on partial failure | ✅ | Wrap in DEFINER RPC `create_tenant_with_defaults` |
| R-03 | TypeScript posture | 554 `as any`; strict null/implicit-any disabled; no `typecheck` script | Technical debt | tsconfig.json, rg count | MEDIUM | HIGH | Refactors are unsafe; type drift hidden | ✅ | Add `tsc --noEmit` to CI; incremental strictness |
| R-04 | Storage | Storage `storage.objects` policies not enumerated; signed URLs can outlive revocation | Incomplete evidence + security concern | Round 1 scope | MEDIUM | MEDIUM | Cross-tenant leak potential | ✅ | Audit `storage.objects` policies before any bucket changes |
| R-05 | Scheduled jobs | `expire-stale-connections` and `mark-overdue-invoices` cron schedule not verified | Incomplete evidence | `supabase/config.toml` + edge functions | MEDIUM | MEDIUM | Silent stall of expiry/overdue sweep | ✅ | Query pg_cron / platform config |
| R-06 | Zero-policy RLS tables | 7 public tables have RLS on with 0 policies (fail-closed) including `pos_sales` | Documentation drift + architectural | DB metadata | MEDIUM | HIGH | If any UI attempts direct query it silently returns empty — hidden failure | Partial | Verify each is RPC-only; annotate in types |
| R-07 | Testing | No RLS, auth, tenancy, or E2E tests; Playwright installed unused | Technical debt | file census | MEDIUM | HIGH | Regressions on permissions and RLS pass unnoticed | ✅ | Establish minimal negative-test harness for RLS |
| R-08 | Membership boundary | Owner-removal, self-role-change, cross-tenant `tenant_members` write policies not body-inspected | Incomplete evidence | Round 1 scope | MEDIUM | MEDIUM | Potential privilege-escalation gap | ✅ | Read `tenant_members` policies in Round 2 |
| R-09 | Frontend architecture | 8 files > 1,200 lines; several > 2,000 lines | Technical debt | wc -l | MEDIUM | HIGH | Refactor risk; onboarding friction | — | Incremental splitting |
| R-10 | Toast systems | Both shadcn Toaster and sonner mounted simultaneously | Technical debt | `App.tsx:2-3` | LOW | HIGH | Inconsistent notification UX | — | Standardise on one |
| R-11 | Analytics / monitoring | No Sentry/Datadog/PostHog wired | Architectural limitation | dependency scan | MEDIUM | HIGH | Blind to prod errors | — | Add error monitoring |
| R-12 | Auth provider config | Google/Phone/SAML/HIBP not inspected | Incomplete evidence | Round 1 scope | MEDIUM | HIGH | Unknown password policy / OAuth state | ✅ | Query `supabase--configure_auth` in Round 2 |
| R-13 | Legacy audit bucket | `database_export_20_07_26` Storage bucket still present | Technical debt | `storage.buckets` | LOW | HIGH | Storage cost; potential PII in artefact | — | Verify contents; archive/delete after review |
| R-14 | Session storage strategy | `localStorage` for Supabase session (not httpOnly cookies) | Architectural limitation | `client.ts:13` | MEDIUM | HIGH | Susceptible to XSS-based token theft | ✅ | Understand tradeoff; enforce XSS-safe rendering (already partially done) |
| R-15 | Direct Supabase calls in UI | 20+ components import supabase | Technical debt | rg | LOW | HIGH | Mixing concerns; harder to test | — | Progressive extraction to hooks |
| R-16 | Nav config duplication | 3 separate nav configs (`navConfig`, `workspaceNavConfig`, `labNavConfig`) total 909 L | Documentation drift | file census | LOW | HIGH | Route/nav drift risk | — | Verify single source of truth |

---

R. Receiving-Developer Technical Start Map

1. Read first (in order).
   - `src/App.tsx` (routing + guard composition)
   - `src/main.tsx` (entry + cache cleanup)
   - `src/contexts/AuthContext.tsx` and `src/contexts/TenantContext.tsx`
   - `src/components/guards/*` (all 4 guards)
   - `src/hooks/usePermissions.ts` (permission model)
   - `src/hooks/useModuleAccess.ts` (module capability gating)
   - `src/integrations/supabase/client.ts` (client init)
   - `src/navigation/{navConfig, workspaceNavConfig, labNavConfig}.ts`
   - `src/lib/queryKeys.ts` (query-key registry)
   - `src/lib/finance/*` (most disciplined domain)
   - `supabase/config.toml` (edge fn config)
   - `mem://index.md` (product/architectural rules)
2. Contexts / hooks to understand first. `AuthContext`, `TenantContext`, `I18nContext`, `usePermissions`, `useModuleAccess`, `useNotifications`, `useHorses`.
3. Database objects to inspect first. `tenants`, `tenant_members`, `tenant_capabilities`, `permission_definitions`, `has_permission`, `has_tenant_role`, `is_tenant_member`, `initialize_tenant_defaults`, `create_invoice_with_items`, `post_payment_session`, `record_horse_movement_with_housing`, `finalize_invitation_acceptance`, `accept_connection`.
4. Routes to test first. `/auth` (signup + login), `/select-role`, `/create-profile/stable`, `/dashboard`, `/dashboard/team`, `/dashboard/horses`, `/dashboard/finance`, `/dashboard/settings/permissions`, `/invite/:token` (paste real token), `/share/horse/:token`.
5. Areas that must initially remain read-only for a new developer.
   - Any change to `supabase/migrations/`.
   - `src/integrations/supabase/client.ts` and `types.ts`.
   - RLS policies on all zero-policy tables (`pos_sales`, `horse_owner_*`, `owner_claim_*`, `finance_request_idempotency`).
   - Edge Function configs (`supabase/config.toml`).
6. Secrets that must never be shared or logged directly. `VAPID_PRIVATE_KEY`, any email provider API key, Supabase service-role key (must not be present in frontend anywhere), database password. Only key names in any documentation.
7. High-risk areas requiring approval before modification. Finance RPCs (`create_invoice_with_items`, `approve_invoice`, `cancel_invoice`, `post_payment_session`, `create_source_checkout_invoice`, `create_pos_sale`), permission model (`has_permission`, `usePermissions`), tenant creation flow, `record_horse_movement_with_housing`, RLS policies on `horses`, `invoices`, `ledger_entries`, `tenant_members`, `posts`.
8. Wait for later audit rounds: exhaustive policy-body enumeration; full RPC parameter/tenant-validation body audit; Storage `storage.objects` policy audit; auth provider configuration; environment separation plan; module inventory (Sections 2 & 7 of the 21-part framework).

---

S. Coverage Against the Permanent 21-Part Handoff Framework

| # | Section | Covered in Round 1? | Level | Remaining | Planned round |
|---|---|---|---|---|---|
| 1 | Project definition & scope | ✅ | Foundation | Marketing scope, business model | R2 |
| 2 | Account types | Partial | Foundation | Deep matrix by tenant_type | R2 |
| 3 | Users, memberships, roles | ✅ | Substantive | Owner-removal & self-role-change verification | R2 |
| 4 | Technical architecture | ✅ | Substantive | Refactor plan for oversized files | R3 |
| 5 | Database architecture | ✅ | Substantive | Full policy-body enumeration; view definitions | R2 |
| 6 | Multi-tenancy & isolation | ✅ | Substantive | Policy-body deep dive; cross-tenant matrix by table | R2 |
| 7 | Full module inventory | Partial | Foundation | Per-module maturity classification, screens, hooks, edge cases | R2 |
| 8 | Core user workflows | ❌ | — | Full workflow tracing | R3 |
| 9 | Cross-account integrations | Partial | Foundation | Detailed flows (accept, revoke, share) | R3 |
| 10 | Operational finance | Partial | Foundation | Full RPC contract catalog; ledger derivation model | R3 |
| 11 | Dayli Horse SaaS subscriptions | ❌ | — | Plan model, entitlement mapping, billing | R4 |
| 12 | Web / PWA / native | Partial | Foundation | Confirmed as kill-switch PWA; native strategy TBD | R4 |
| 13 | AR / EN / RTL | Partial | Foundation | i18n & RTL audit scripts exist; deeper audit due | R3 |
| 14 | Storage & files | Partial | Foundation | Object-level policy audit outstanding | R2 |
| 15 | Notifications & Edge Fns | ✅ | Substantive | Cron schedule verification; email provider name | R2 |
| 16 | Deployment & environments | ✅ (findings) | Substantive | Environment separation plan | R2 |
| 17 | Testing & quality | Foundation | Foundation | Coverage plan, RLS-negative suite | R3 |
| 18 | Performance & reliability | Foundation | Foundation | Metrics baseline | R4 |
| 19 | Known issues & tech debt | Foundation | Foundation | Full backlog | R4 |
| 20 | Current status & roadmap | ❌ | — | Owner input required | R5 |
| 21 | Receiving-developer instructions | Foundation | Foundation | Consolidated onboarding doc | R5 |

The full 21-part handoff is not complete. Round 1 delivers Sections 1, 3, 4, 5, 6, 14, 15, 16 substantively and Sections 17–19, 21 at foundation depth.

---

T. Inputs Required for Round 2

Precise unresolved evidence required to complete Round 2 (Account Types, Full Module Inventory, Current Implementation Reality):

1. Auth provider configuration — enumerate enabled providers (email/password, Google, phone, SAML), password policy, HIBP toggle, email template overrides. Requires `supabase--configure_auth` or platform inspection.
2. `tenant_type` full behaviour matrix — for each of 10 tenant types (stable, clinic, lab, academy, pharmacy, transport, auction, horse_owner, trainer, doctor): what capabilities are seeded by `initialize_tenant_defaults`, which modules become visible, which nav config path is used.
3. Module capability catalog — read `tenant_capabilities` schema + all default values by `tenant_type`; enumerate frontend flags in `useModuleAccess`.
4. Full RLS policy bodies — export every `pg_policies` row with expression bodies, group by (table, cmd), tag each policy as `is_tenant_member` / `has_permission` / `EXISTS` / other, and produce a per-table alignment report.
5. DEFINER RPC body inspection — for each finance/tenancy/connection RPC, verify: `p_tenant_id` validated against `auth.uid()`, idempotency handling, error path, transaction boundaries.
6. `tenant_members` and `tenants` policy bodies — answer R-08 authority questions 4, 6, 7 with evidence.
7. Storage `storage.objects` policies — enumerate by bucket, name, roles, USING expression.
8. Scheduled job configuration — query `pg_cron` (if extension enabled) or platform config for `expire-stale-connections` and `mark-overdue-invoices`.
9. Auth trigger inventory — confirm the `handle_new_user`-style trigger on `auth.users` that provisions `profiles` (and possibly `tenant_members` for Horse-Owner accounts per memory).
10. Environment separation confirmation — verify whether preview and production actually share the same Supabase project (R-01) and set out remediation plan.
11. Nav-config reconciliation — enumerate the three configs (`navConfig`, `workspaceNavConfig`, `labNavConfig`) and produce the single-source-of-truth mapping per tenant type + workspace mode.
12. Doctor billing debt — full audit of `doctor_services` vs `tenant_services` divergence for later consolidation planning.
13. Owner/Horse-Owner Portal boundaries — deep audit of `horse_owner_access_grants`, `horse_owner_invites`, `owner_delegations`, `owner_claim_requests`, `owner_claim_events` (all zero-policy) and their RPC access path.
14. Community post visibility resolution — verify `posts` (15 policies) semantics for `public/private/followers` × personal/organization workspace.
15. CI/CD workflow content — inspect `.github/workflows/n2-4-controlled-supabase-runtime.yml` to understand what is automated.

---

“Round 1 completed in strict read-only mode. No source code, database object, record, policy, secret, environment setting, deployment configuration, or project asset was modified.”