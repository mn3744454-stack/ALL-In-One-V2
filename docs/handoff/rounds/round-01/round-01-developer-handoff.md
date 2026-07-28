<!--
id: DHB-R01-DEV
title: Round 1 — Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment
version: 1.0.0
status: canonical-pending-owner-acceptance
audience: external-developer
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3 from Round 1 raw evidence, DG.1/DG.1A audits, current repository source, and current live database metadata
source-sha256: n/a
confidentiality: Confidential Technical Handoff — No Credential or Secret Values Included
-->

# Round 1 — Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment

> **Confidential Technical Handoff — No Credential or Secret Values Included.**
> This document is a canonical Round 1 developer handoff. It is **pending owner acceptance**; it is not a launch certification and does not authorize deployment, publication, or a merge to `main`.

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

Evidence classes used in this document: **directly verified**, **source code**, **live DB metadata**, **generated types**, **inferred**, **historical-only**, **unverified**, **contradictory**. Implementation status labels used: **active**, **partial**, **schema-only**, **placeholder**, **legacy**, **superseded**, **planned**, **unknown**. Labels are attached to material claims via tables and finding blocks, not to every sentence.

---

## 2. Executive Platform Overview

Dayli Horse is a multi-tenant equestrian operations platform. The current delivery target is a browser-based web application (Vite + React) with progressive-web-app packaging. Native iOS/Android builds are not part of Round 1 scope.

The backend is delivered through Lovable Cloud (managed Supabase). Authentication, authorization, data storage, storage buckets, and scheduled/event-driven work all run inside that managed backend. There is no independently deployed server tier in this repository.

Round 1 establishes the technical foundation of the current platform as it exists today. It is not a certification that the platform is production-ready, launch-ready, hardened, or fully complete. Later rounds cover module maturity, workflows, cross-account flows, commercial/subscription behaviour, PWA/native delivery, and roadmap/completion.

The dominant content of the live database is demo and test operational data; entities, invoices, and financial rows in the current environment must not be treated as confirmed production-customer data unless a specific record is separately verified.

---

## 3. Round 1 Scope and Coverage Boundaries

**In scope for Round 1:** Platform foundation, high-level architecture, database inventory and relational shape, tenancy and identity, authentication, roles/permissions/bundles/delegation, RLS and cross-tenant isolation, RPCs, database functions and triggers, storage, edge functions, deployment/environment/migration workflow, testing/quality/reliability signals, known risks, and the receiving developer start map.

**Out of scope for Round 1** (carried into later rounds):

- full account-type maturity;
- full module inventory and per-module implementation reality;
- complete user workflows;
- cross-account operational flows;
- full finance/commercial subscriptions;
- web/PWA/native-mobile delivery details;
- final roadmap and completion status;
- owner-governance material (access lists, vendor evaluations, account-recovery, offboarding, pricing, contracts) — held privately outside this repository.

---

## 4. Evidence Model and Source-of-Truth Hierarchy

For every claim in this document, the source-of-truth hierarchy is:

1. Current repository source code and current checked-out project state.
2. Current live database metadata available through read-only Supabase tooling.
3. Current generated types where direct database evidence is unavailable.
4. Round 1 raw evidence (`round-01-inputs.md`, `round-01-raw-audit-output.md`) — immutable provenance.
5. DG.1A / DG.1 audits.
6. Historical Documentation 01–13.
7. Existing `docs/aml_1_b_1/**` evidence.

**Current source code, migrations, and live database state override any conflicting historical claim.** Where a historical statement no longer holds, this document records the historical claim, the current verified condition, the evidence class, and which source governs now (see §19).

---

## 5. Platform Definition and Current Delivery Context

- **Product identity (directly verified — source code):** the frontend renders as "Dayli Horse" branding; the site is published at `daylihorse.com` (see `docs/CONVENTIONS.md`, `docs/README.md`, and repository `public/manifest.json`).
- **Delivery surface (directly verified — source code):** browser web application built with Vite and React 18, packaged as a PWA (`public/manifest.json`, `public/push-sw.js`).
- **Backend delivery (directly verified — live DB metadata / source code):** managed Supabase (Postgres + PostgREST + Auth + Storage + Edge Functions), consumed through the generated client at `src/integrations/supabase/client.ts` and the generated types at `src/integrations/supabase/types.ts`.
- **Environments (inferred + source code):** a single managed backend project is bound to the repository via `.env` (values not enumerated here — see §17). No separate self-hosted server, container image, or bespoke deployment pipeline exists in this repository.

---

## 6. Technology Stack

| Layer | Technology | Evidence | Status |
|---|---|---|---|
| UI framework | React 18 + TypeScript 5 | `package.json` | active |
| Build tool | Vite 5 | `package.json`, `vite.config.ts` | active |
| Styling | Tailwind CSS v3 + shadcn/ui + Radix primitives | `tailwind.config.ts`, `components.json`, `src/components/ui/**` | active |
| State & data | TanStack Query v5 | `package.json`, `src/hooks/**` | active |
| Forms | react-hook-form + `@hookform/resolvers` + zod | `package.json`, `src/lib/validations.ts` | active |
| Rich text | Tiptap (extensions: color, text-align, text-style) | `package.json`, `src/contracts/**` | active |
| Backend client | `@supabase/supabase-js` v2 | `src/integrations/supabase/client.ts` | active |
| Auth | Supabase Auth (managed) | `src/contexts/AuthContext.tsx` | active |
| i18n | Custom `I18nContext` with EN/AR locales and RTL support | `src/i18n/**` | active |
| Testing | Vitest + Playwright | `vitest.config.ts`, `playwright.config.ts` | active |
| Drag-and-drop | `@dnd-kit/*` | `package.json` | active |

Do not add server tiers (Node/Python/Ruby) to the repository. Backend concerns belong in Supabase (SQL migrations, RLS policies, functions, RPCs, Edge Functions).

---

## 7. Repository and Frontend Architecture

Key top-level paths (directly verified — source code):

- `src/pages/**` — route-level components (approx. 60+ pages including `DashboardHorses.tsx`, `DashboardHousing.tsx`, `DashboardLaboratory.tsx`, `DashboardHR.tsx`, `DashboardVet.tsx`, finance pages under `src/pages/finance/**`, public/shared pages such as `PublicProfile.tsx`, `SharedLabReport.tsx`, `SharedMedia.tsx`).
- `src/components/**` — feature-scoped component trees (e.g. `boarding/`, `breeding/`, `clients/`, `finance/`, `horses/`, `housing/`, `hr/`, `laboratory/`, `movement/`, `permissions/`, `pos/`, `services/`, `vet/`, `notifications/`, `pwa/`, `push/`).
- `src/hooks/**` — feature-scoped hooks (e.g. `finance/`, `housing/`, `hr/`, `laboratory/`, `roles/`, `notifications/`) plus cross-cutting hooks (`usePermissions.ts`, `useClients.ts`, etc.).
- `src/lib/**` — pure logic: finance engines (`src/lib/finance/**`), boarding proration, breeding eligibility, notifications helpers, pricing resolver, tax utilities, formatters, validations.
- `src/contexts/**` — `AuthContext`, `TenantContext` (identity/tenant switching surface).
- `src/i18n/**` — bilingual (English/Arabic) localization with RTL layout rules.
- `src/navigation/**` — declarative navigation configuration (`navConfig.ts`, `workspaceNavConfig.ts`, `labNavConfig.ts`).
- `src/integrations/supabase/{client,types}.ts` — auto-generated Supabase client and typed schema. **Do not hand-edit.**
- `src/contracts/**` — contract templates and document editor (Tiptap-based).
- `supabase/**` — migrations, edge functions, and database tests.

Component conventions (directly verified — source code + memory rules):

- Design tokens live in `src/index.css`; components must use semantic tokens/shadcn variants rather than hardcoded colour utilities.
- Mobile-first layouts; RTL uses `flex-1`/`flex-grow` for balanced horizontal spacing.
- Workspace-class dialogs use a single scrollable body with `flex-col`, fixed header/footer, and `max-h-[85vh]` — no nested scroll containers.

---

## 8. Routing, Guards, Shell, and Navigation

- Router root: `src/App.tsx` (directly verified — source code). It composes providers (`AuthContext`, `TenantContext`, `I18nContext`, TanStack Query client) and mounts approximately twenty top-level routes plus nested workspace routes.
- Authenticated shell: `src/components/layout/DashboardShell.tsx` with `DashboardHeader.tsx`; navigation composed from `src/navigation/*.ts` files.
- Guards: `src/components/guards/**` enforces authentication and permission checks. UI-side authorization uses `hasPermission()` from `src/hooks/usePermissions.ts`; server-side authorization uses `has_permission()` in the database (see §12).
- Public routes: `Index`, `PublicProfile`, `TenantPublicProfile`, `SharedLabReport`, `SharedMedia`, `InviteLandingPage`, `AcceptConnectionPage`, `ForgotPassword`, `ResetPassword`, `Directory`, `CommunityFeed`.
- Debug route: `DebugAuth` (present in source — treat as internal-only, remove or gate before any external launch decision).

---

## 9. Backend and Supabase Architecture

- Managed Supabase project accessed via `src/integrations/supabase/client.ts`. Publishable/anon key is exposed to the browser per Supabase design; the service-role key and database password are not accessible from within this environment and must never be embedded in the repository.
- Migrations directory: `supabase/migrations/`. Migration count at Round 1 baseline: **322 migrations** (directly verified — source code). Migrations are the canonical schema history; treat them as append-only.
- Edge Functions directory: `supabase/functions/` (see §16).
- Database tests: `supabase/tests/database/*.sql` (Vitest-invoked or manually runnable).
- Project-level Supabase configuration: `supabase/config.toml` (auto-managed). Do not hand-edit outside approved flows.

---

## 10. Database Domain Inventory and Core Relationship Map

The database is broad and multi-domain. Round 1 does not enumerate every table; it establishes the domain skeleton required to navigate the schema. Precise table counts, per-table RLS coverage, and per-policy semantics are re-verifiable through live DB metadata and through the generated types file `src/integrations/supabase/types.ts`.

**Core domain clusters** (evidence: source code + generated types + `docs/aml_1_b_1/**`):

- **Identity & tenancy** — `auth.users` (managed by Supabase Auth), `profiles`, `tenants`, `tenant_members`, `tenant_role_permissions`, `tenant_role_bundles`.
- **Permissions** — `permission_definitions`, `permission_bundles`, `bundle_permissions`, `member_permissions`, `member_permission_bundles`, `delegation_scopes`.
- **Horses & registry** — horse registry tables plus lightweight `lab_horses` bridged via microchip (see historical `horse-unification-strategy` memory and generated types).
- **Housing & facilities** — branches, facilities, housing units, boarding admissions, movement/arrival/departure records.
- **Vet & laboratory** — medical records, treatments, vaccinations, lab submissions/requests/results, service catalog.
- **Finance** — `invoices`, `invoice_items`, `ledger_entries`, `payment_sessions`, `payment_allocations`, `payment_horse_allocations`, `billing_links`, `customer_balances`, `expenses`, tax configuration, POS sales/sessions.
- **HR** — `hr_employees` and related attendance/salary tables.
- **Connections & partners** — tenant-to-tenant connections, `connection_horse_access`, invitations.
- **Notifications** — metadata-driven notification tables with deduplication.
- **Community & directory** — community posts, public profiles.
- **Contracts & documents** — contract templates and rendered documents (Tiptap JSON).

Reference schema snapshots preserved at repository root (`invoices.schema.txt`, `invoice_items.schema.txt`, `billing_links.schema.txt`, `customer_balances.schema.txt`, `expenses.schema.txt`) are legacy artifacts (see `docs/README.md` legacy entries); treat them as historical snapshots, not current truth.

Precise, live-verified table and policy counts should be regenerated from live DB metadata before any structural decision (see §17 and §19).

---

## 11. Authentication, Profiles, Tenants, and Memberships

- Authentication is delivered by managed Supabase Auth. Email/password is active; social OAuth (e.g. Google) is configurable via the managed provider surface (do not embed provider secrets in the repository). Redirect URIs for social OAuth must resolve to a same-origin public URL, not directly to protected routes.
- `src/contexts/AuthContext.tsx` exposes the current session/user.
- `src/contexts/TenantContext.tsx` exposes the active tenant membership and active role (`activeTenant`, `activeRole`) and drives tenant switching (`TenantSwitcher.tsx`).
- Tenant membership is stored in `tenant_members`; each membership carries a role key (e.g. `owner`, `manager`, etc.) plus per-member permission bundles/overrides.
- **Historical vs current — tenant creation atomicity:** Round 1 raw audit flagged non-atomic tenant creation. This remains an area requiring re-verification against current migrations before change (see §19).

---

## 12. Roles, Permissions, Bundles, and Delegation

- **Vocabulary:** 104 granular permission keys (see memory `Permission System Vocabulary`), authoritative source is the `permission_definitions` table.
- **Client hook:** `src/hooks/usePermissions.ts` computes effective permissions with this precedence:
  1. Owner → all permissions.
  2. Role-direct permissions (`tenant_role_permissions`).
  3. Role bundle permissions (`tenant_role_bundles` → `bundle_permissions`).
  4. Member-specific bundle permissions (`member_permission_bundles` → `bundle_permissions`).
  5. Member overrides (`member_permissions`) — applied last.
- **Server enforcement:** `public.has_permission(...)` security-definer function is the authoritative check; RLS policies call it directly. UI-side `hasPermission()` mirrors the same precedence but is never sufficient on its own.
- **Delegation:** `delegation_scopes` gates who may delegate which permissions; the `admin.permissions.delegate` key protects owner scope. The `manager` role includes all permissions except `admin.permissions.delegate`.
- **Do not** hardcode role names in new code — check permission keys.

---

## 13. Multi-Tenancy, RLS, and Cross-Tenant Isolation

- **Dual-scope tenant model:** tables use `tenant_id IS NULL` for personal-workspace rows and `tenant_id IS NOT NULL` for organization-workspace rows. Paid accounts behave as organizations. RLS policies must respect both scopes (see memory `Community Workspace RLS`).
- **Cross-tenant partner access:** governed by `connection_horse_access` and related grant tables. Do not bypass the RPC/RLS layer to expose partner data.
- **Fail-closed tables:** several tables intentionally omit certain policies (e.g. `hr_employees` DELETE — accepted fail-closed behaviour per security memory). Absence of a policy is not automatically a bug.
- **Every new `public` table requires:** GRANT statements in the same migration for the roles the policies allow, followed by `ENABLE ROW LEVEL SECURITY` and explicit `CREATE POLICY` statements. RLS alone is not sufficient without grants.
- **User roles** must remain in a dedicated `user_roles`-style table (or the equivalent tenant_role tables listed above), never on `profiles`.

---

## 14. RPCs, Database Functions, and Trigger Architecture

Round 1 does not exhaustively enumerate every function/trigger. The following anchors govern how to navigate them:

- **Finance RPCs (directly verified — evidence at `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt`):** among others, `create_invoice_with_items`, `update_invoice_with_items`, `delete_draft_invoice`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `record_salary_payment`, `post_invoice_payments`, plus underscore-prefixed private helpers (`_finance_*`).
- **Payment sessions (active):** `post_payment_session`, `get_payment_session` — canonical entry point for multi-invoice payment allocation.
- **Housing & movement:** the 19-parameter `record_horse_movement_with_housing` RPC contract governs unit occupancy transitions; direct writes to occupancy tables are prohibited (see memory `Housing Admissions Unification`).
- **Identity governance:** `update_horse_identity`, `complete_local_horse_record`, `finalize_invitation_acceptance` — enforce classification, invitation, and completion rules server-side.
- **Triggers:** finance uses ledger-posting and snapshot triggers (e.g. `_invoice_items_fill_snapshots`, `_invoice_items_validate_source`, `sync_post_child_tenant_id`); housing/occupancy uses admission-integrity triggers. Trigger authorship must follow existing security-definer patterns.
- **Never modify:** the `auth`, `storage`, `realtime`, `supabase_functions`, and `vault` schemas — including triggers on those schemas.

Any change to an RPC must be paired with a migration and, ideally, a corresponding SQL test under `supabase/tests/database/`.

---

## 15. Storage and File Handling

- Storage buckets are managed through Supabase Storage. Bucket policies must accompany bucket creation.
- The `shared-media-sign` edge function (see §16) issues signed URLs for shared media access.
- Do not upload demo assets that leak PII into public buckets. Public exposure of a bucket must be an explicit, reviewed decision.

Round 1 does not enumerate every bucket or policy. Regenerate that inventory from live metadata before any storage-facing change.

---

## 16. Notifications and Edge Functions

Edge Functions present in `supabase/functions/` (directly verified — source code):

| Function | Purpose (as of Round 1) | Status |
|---|---|---|
| `expire-stale-connections` | Marks stale tenant-to-tenant connections | active |
| `get-vapid-key` | Returns the public VAPID key for web push registration | active |
| `mark-overdue-invoices` | Scheduled marker for overdue invoices | active |
| `send-invitation-email` | Sends tenant-member invitation emails | active |
| `send-ownership-notification` | Notifies on ownership changes | active |
| `send-push-notification` | Delivers web push notifications | active |
| `shared-media-sign` | Signs URLs for shared media | active |

Notifications follow the metadata-driven pattern documented in memory `Notification System Standard`, with deduplication windows and localized event alerts. Client-side handling lives in `src/components/notifications/**` and `src/lib/notifications/**`.

Any new Edge Function must be added under `supabase/functions/<name>/index.ts`, registered in the deploy flow, and reviewed for secret handling (all secrets via managed secret storage — never inline).

---

## 17. Environments, Deployment, and Migration Workflow

- **Environment binding:** the frontend reads Supabase URL and publishable key from `.env` (values not enumerated here). These specific variables are auto-generated; do not hand-edit `.env` for those keys.
- **Deployment:** the app is served via Lovable's managed publish flow (preview URL and published URL are registered in `<project_urls>` metadata, not repeated here). There is no separate CI/CD pipeline maintained inside this repository other than the workflow at `.github/workflows/n2-4-controlled-supabase-runtime.yml` (specific to the N2.4 controlled-runtime check).
- **Migration workflow:** SQL migrations land under `supabase/migrations/` with a timestamp prefix. Each migration is append-only. Migrations that create tables must include GRANTs, RLS enablement, and policies in the same file (see §13).
- **Custom domains (verified via project URL metadata):** `daylihorse.com` and `www.daylihorse.com`.
- **Secrets:** the service-role key and database password are not available inside this environment. Do not fabricate placeholders. Any secret the app requires must be added via the managed secret tool, not committed.

---

## 18. Testing, Quality, Performance, and Reliability Signals

- **Unit tests:** Vitest suites under `src/lib/**/__tests__/**` (finance heavy — allocation, distribution, KPI, payment fingerprinting, RPC cutover) plus targeted lab/invoice logic. Historical signal at prior slice: 240+ tests passing.
- **DB tests:** `supabase/tests/database/*.sql` cover J5, N2.4, N2.5, and payment-session RPC behaviour.
- **E2E:** Playwright present via `playwright.config.ts` and `playwright-fixture.ts`; suite maturity should be re-assessed before relying on it for release gates.
- **Lint:** ESLint configured via `eslint.config.js`.
- **Runtime signals:** browser console logs, TanStack Query devtools, and Supabase logs are the primary runtime observability channels. There is no APM tool wired in-repo.
- **Performance/reliability:** no formal load-testing artefacts are present in Round 1 evidence. Treat performance and reliability claims as **unverified** until measured.

---

## 19. Known Risks, Contradictions, and Technical Debt

| # | Area | Finding | Evidence | Severity | Confidence | Likely impact | Safe next step |
|---|---|---|---|---|---|---|---|
| R1 | Tenancy | Tenant creation was historically non-atomic (raw Round 1 output). | Historical-only; re-verify against current migrations. | Medium | Medium | Partial tenant state on failure | Re-inspect current `create_tenant`-style RPCs before change |
| R2 | RLS coverage | Broad table set (many domains); per-table RLS re-verification is required before structural change. | Live DB metadata via read-only tooling | Medium | High | Cross-tenant leakage if a new table skips grants/policies | Follow the mandatory GRANT+RLS+POLICY pattern (§13); scan periodically |
| R3 | Historical documentation drift | Docs 01–13 predate multiple current-truth changes (finance J5.x refactor, payment sessions, housing unification). | `docs/historical/documentation-01-13/**` vs current code | Low | High | Confusion if historical claims are used as current truth | Always cross-check historical claims against current code before acting |
| R4 | Debug surfaces | `DebugAuth` route present in source. | `src/pages/DebugAuth.tsx` | Low | High | Information exposure if reachable in production | Gate or remove before any launch decision |
| R5 | Demo data classification | Live records are predominantly demo/test. | Inferred from repository intent; not per-record verified | Medium | Medium | Misinterpretation as real customer data | Do not treat any live row as production truth without owner confirmation |
| R6 | Legacy in-place files | Root-level schema snapshots, `docs/Documentation_13_-_Laboratory_Workstream_Closure.md`, and other `LEG-*` entries remain in place pending cleanup. | `docs/README.md` (legacy registry) | Low | High | Contradictory paths for the same information | Cleanup is deferred behind owner acceptance |
| R7 | Service-role/DB password unavailable in-repo | Managed Cloud does not expose these to the app environment. | Live environment | N/A (by design) | High | Any doc or code that assumes access will fail | Never fabricate placeholder JWTs; use managed secret tooling |
| R8 | Historical Doc 13 identity | The in-place `Documentation_13_-_Laboratory_Workstream_Closure.md` is a **predecessor artifact**, not canonical Doc 13. | `docs/README.md` §"Documentation 13 — identity note", DG.1A | Low | High | Wrong document consulted | Cite `DHB-DOC13` for canonical Doc 13 |

Each risk row is bounded by its evidence class. Historical items must not be reclassified as current risks without re-verification.

---

## 20. Receiving Developer Technical Start Map

**Read first (in order):**

1. `docs/README.md` — central index.
2. `docs/CONVENTIONS.md` — authoring and governance rules.
3. This document (`DHB-R01-DEV`).
4. `docs/handoff/rounds/round-01/round-01-raw-audit-output.md` — immutable Round 1 evidence.
5. `docs/historical/audits/dg-1a-alignment-evidence-closure.md` — most recent governance audit.

**Inspect second:**

- `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/TenantContext.tsx`, `src/hooks/usePermissions.ts` — how identity, tenancy, and permissions flow.
- `src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` — generated backend surface.
- `supabase/migrations/` (most recent 20–30 files) — current schema direction.
- `supabase/functions/` — deployed edge functions.
- `src/lib/finance/**` — the most rule-dense subsystem.

**High-risk areas requiring caution:**

- Finance RPCs and ledger integrity (`src/lib/finance/**` and the `_finance_*` SQL helpers).
- Housing admission / unit occupancy (`record_horse_movement_with_housing` and admissions unification).
- Permission precedence in `usePermissions.ts` and `has_permission()`.
- RLS on multi-tenant tables.

**Changes prohibited until owner-reviewed:**

- Any edit to `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` (managed keys), `supabase/config.toml`.
- Any change to `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas.
- Any rewrite of migrations; migrations are append-only.
- Any bulk relocation of legacy files listed in `docs/README.md`.
- Any deletion of historical or raw evidence.

**Suggested first validation tasks:**

- Run the frontend build and existing test suites; confirm current pass counts against Round 1 signal (§18).
- Read the most recent migration and confirm it applied cleanly in the current environment.
- Re-run RLS spot checks on a representative sample of tables.
- Walk one end-to-end path in each domain cluster (identity → tenant → horse → finance) using a demo account.

**Expected questions for the owner:**

- Which environments (beyond the managed preview and the published web app) will the external partner receive access to?
- What is the desired branching/PR discipline (e.g. protected `main`, review requirement)?
- Which legacy files (see `docs/README.md` cleanup section) may be relocated and when?
- Which demo data may be truncated safely, and which must be preserved for continuity?

**Recommended initial discipline:**

- Work on isolated feature branches; open pull requests for review.
- Do not push directly to `main`.
- Do not distribute secret values through documentation or chat.
- Prefer additive, reviewed changes to schema, RLS, and finance logic.

**Do not** rebuild the platform from scratch. Round 1 is a foundation to **continue, stabilize, improve, complete, and expand**, not to restart.

---

## 21. Access and Collaboration Assumptions

Under contractual onboarding, the external development partner is expected to receive controlled direct access to the systems required for their scope (which may include, but is not limited to, the Lovable project, the project repository, the managed backend, Storage, Edge Functions, and staging/testing environments when available).

Collaboration principles:

- Project accounts and repositories remain under owner control.
- Collaborators use individual, named accounts — no shared logins.
- Access is role-based and least-privilege; scope is expanded only when the task requires it.
- Changes flow through isolated branches with review.
- Secret values are not distributed through documentation, chat, or shared files.
- Access to third-party surfaces (for example, the domain registrar) is granted only for a specific approved task and revoked afterwards.
- Any future iOS/Android developer accounts and repositories, once created, remain owner-controlled.

Owner-only material — invitation steps, credential handling, recovery procedures, vendor evaluations, offboarding — is intentionally excluded from this document and from the shared repository. It is prepared and held privately by the owner.

---

## 22. Round 1 Coverage Against the 21-Part Framework

| Framework part | Covered here | Section(s) |
|---|---|---|
| 1. Platform definition | Yes | §2, §5 |
| 2. Delivery context | Yes | §5 |
| 3. Technology stack | Yes | §6 |
| 4. Repository architecture | Yes | §7 |
| 5. Routing/guards/shell | Yes | §8 |
| 6. Backend architecture | Yes | §9 |
| 7. Database inventory | Partial (skeleton, not per-table) | §10 |
| 8. Identity & tenancy | Yes | §11 |
| 9. Roles & permissions | Yes | §12 |
| 10. Multi-tenancy & RLS | Yes | §13 |
| 11. RPCs/functions/triggers | Partial (anchors, not exhaustive) | §14 |
| 12. Storage | Partial | §15 |
| 13. Notifications & Edge Functions | Yes | §16 |
| 14. Environments & deployment | Yes | §17 |
| 15. Testing & quality | Partial | §18 |
| 16. Risks & debt | Yes | §19 |
| 17. Start map | Yes | §20 |
| 18. Access model | Yes | §21 |
| 19. Module maturity | **Deferred to later rounds** | — |
| 20. Workflows | **Deferred to later rounds** | — |
| 21. Roadmap/completion | **Deferred to later rounds** | — |

---

## 23. Inputs Carried Forward to Round 2

- Full account-type maturity model.
- Full module inventory (finance, housing, vet, lab, HR, breeding, community, contracts, notifications, POS) with per-module implementation reality.
- End-to-end user workflows across account types.
- Cross-account operational flows (partner connections, shared horses, shared media, shared invoices).
- Full finance/commercial and subscription behaviour (including invoice lifecycle, payment sessions, POS, expenses, tax).
- Web/PWA/native-mobile delivery differences and packaging.
- Roadmap, completion status, and prioritized backlog.

---

## 24. References and Evidence Paths

- Central index: `docs/README.md`
- Conventions: `docs/CONVENTIONS.md`
- Round 1 raw inputs: `docs/handoff/rounds/round-01/round-01-inputs.md`
- Round 1 raw output: `docs/handoff/rounds/round-01/round-01-raw-audit-output.md`
- Governance audits: `docs/historical/audits/dg-1-documentation-governance-audit.md`, `docs/historical/audits/dg-1a-alignment-evidence-closure.md`
- Historical Documentation 01–13: `docs/historical/documentation-01-13/` (canonical + raw + source manifest)
- Finance evidence: `docs/aml_1_b_1/stage_01_preflight/finance_permission_definitions.txt`, `docs/aml_1_b_1/stage_j5_1/preflight/10_all_finance_fns.txt`
- Internal Lovable reference: `docs/handoff/rounds/round-01/round-01-lovable-reference.md` (`DHB-R01-INT`)

---

## 25. Round 1 Handoff Verdict

Round 1 delivers a canonical technical foundation covering platform identity, architecture, database skeleton, identity/tenancy, permissions, RLS, RPCs, storage, edge functions, environment, testing signal, risks, and a receiving-developer start map. It is **canonical-pending-owner-acceptance**. It is not a certification of production readiness, security completeness, or launch approval. Module maturity, workflows, cross-account flows, commercial behaviour, delivery-channel details, and roadmap/completion are carried into later rounds. Historical Documentation 01–13 remains preserved as evidence, superseded by current code where they conflict.
