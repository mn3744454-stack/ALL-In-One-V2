<!--
id: DHB-R01-INT
title: Round 1 — Internal Lovable Reference
version: 1.2.0
status: supporting-pending-owner-acceptance
audience: internal-lovable
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3 as an internal-facing condensed companion to DHB-R01-DEV; corrected during DG.3A to align counts, contracts, and PWA truth with DHB-R01-DEV v1.1.0 and to remove hidden-memory assumptions; re-aligned during DG.3B to match DHB-R01-DEV v1.2.0 (qualified environment claim, removed paid-account generalization, removed remaining hidden-memory language, corrected DebugAuth misclassification, precise Vitest test-file terminology, explicit Round 2 primary scope, exact 21-part framework terms where referenced)
source-sha256: n/a
-->

# Round 1 — Internal Lovable Reference (`DHB-R01-INT`)

## 1. Purpose and Usage

Concise Round 1 companion to `DHB-R01-DEV`. Exists so that Lovable can retrieve current Round 1 truth in future sessions without relying on chat memory. **Not** a second full handoff report. For full detail, open `DHB-R01-DEV`.

Prefer this file when a session needs a fast pointer to authoritative Round 1 sources, a summary of current-truth boundaries versus historical documents, or the rules Lovable must follow when acting on Round 1 material.

> **DG.3A alignment (v1.1.0):** v1.0.0 propagated compressed claims from `DHB-R01-DEV` v1.0.0 (movement RPC arity, PWA status, coverage detail). v1.1.0 realigns every material fact with the corrected `DHB-R01-DEV` v1.1.0 and with the raw Round 1 evidence.
>
> **DG.3B re-alignment (v1.2.0):** matches `DHB-R01-DEV` v1.2.0. Qualified environment risk (repository shows one Supabase project reference; runtime confirmation across all deployed surfaces is owner / platform-confirmation-required). Removed the unsupported "paid accounts behave as organizations" generalization. Removed remaining hidden-memory language. Fixed the DebugAuth misclassification (DEV-only, informational, not R-04). Uses precise "Vitest test files" terminology. Round 2 primary scope is explicit: Account Types, Complete Module Inventory, Current Implementation Reality. Framework references use the exact permanent 21-part titles.

## 2. Authoritative Sources

Source-of-truth precedence (identical to `DHB-R01-DEV` §4):

1. Current repository source code and current checked-out project state.
2. Current live database metadata via read-only Supabase tooling.
3. Current generated types (`src/integrations/supabase/types.ts`).
4. Round 1 raw evidence: `docs/handoff/rounds/round-01/round-01-inputs.md`, `docs/handoff/rounds/round-01/round-01-raw-audit-output.md`.
5. `docs/historical/audits/dg-1a-alignment-evidence-closure.md`, `docs/historical/audits/dg-1-documentation-governance-audit.md`.
6. `docs/historical/documentation-01-13/**`.
7. `docs/aml_1_b_1/**`.

Current code and live database metadata override any historical claim on conflict.

## 3. Round 1 Current-Truth Summary

- Dayli Horse is a multi-tenant equestrian operations web app delivered as Vite + React 18 + TypeScript. PWA is in **kill-switch mode** (`selfDestroying: true`); `main.tsx` unregisters any prior service worker; only `public/push-sw.js` remains. Backend is managed Supabase (Lovable Cloud).
- Round 1 covers **foundation only**: architecture, database skeleton, identity/tenancy, permissions, RLS, RPCs, storage, edge functions, environment, testing signal, risks, start map, access model. Module maturity, workflows, cross-account flows, commercial behaviour, delivery-channel details, and roadmap are **later rounds**.
- Data in the environment is predominantly demo/test. Do not treat live rows as production-customer truth without owner confirmation.
- The platform is **not** certified production-ready, launch-ready, or security-hardened by Round 1.

## 4. Round 1 Baseline Counts (directly verified)

158 public tables · 6 views · 24 enums · 317 functions · 167 triggers · 627 indexes · 510 foreign keys · 48 unique constraints · **507 RLS policies** · 158/158 RLS-enabled · 2 storage buckets · 7 edge functions · 322 migrations.

**Zero-policy public tables (fail-closed, RPC-only):** `finance_request_idempotency`, `horse_owner_access_grants`, `horse_owner_invites`, `owner_claim_events`, `owner_claim_requests`, `owner_delegations`, `pos_sales`.

**Search-path safety:** every `SECURITY DEFINER` function in `public` has a pinned `search_path` — the "unpinned DEFINER" query returned zero rows.

## 5. Architecture and Stack Pointers

- Router root: `src/App.tsx`. Shell: `src/components/layout/DashboardShell.tsx` (+ `DashboardHeader.tsx`). Navigation configs: `src/navigation/{navConfig,workspaceNavConfig,labNavConfig}.ts` (909 lines total — reconciliation deferred, R-16).
- Providers: `src/contexts/AuthContext.tsx`, `src/contexts/TenantContext.tsx`, `src/i18n/**`, TanStack Query.
- Backend client: `src/integrations/supabase/client.ts` (auto-generated — do not hand-edit). Types: `src/integrations/supabase/types.ts` (auto-generated).
- Migrations: `supabase/migrations/` (322 at baseline, append-only).
- Edge functions: `expire-stale-connections`, `get-vapid-key`, `mark-overdue-invoices`, `send-invitation-email`, `send-ownership-notification`, `send-push-notification`, `shared-media-sign`.
- Feature roots: `src/components/{boarding,breeding,clients,finance,horses,housing,hr,laboratory,movement,permissions,pos,services,vet,notifications}`, `src/hooks/{finance,housing,hr,laboratory,roles,notifications,…}`, `src/lib/{finance,housing,notifications,pricing,…}`.
- Design system: semantic tokens in `src/index.css`; shadcn + Radix + Tailwind v3. Never hardcode colour utilities.
- `DebugAuth` route is mounted only when `import.meta.env.DEV` is true; not shipped in production. Still captured as R-04.

## 6. Identity, Tenant, and Permission Pointers

- Authentication: managed Supabase Auth via `AuthContext`. Social OAuth redirect URI must be same-origin public URL, not a protected route.
- Tenant switching: `TenantContext` (`activeTenant`, `activeRole`) with `TenantSwitcher.tsx`. Membership stored in `tenant_members`.
- **Tenant creation is non-atomic — VERIFIED at `TenantContext.tsx:318-483`.** Steps 1–4 are blocking (auth check → zod → insert tenants → insert tenant_members with manual rollback delete). Step 5 (`initialize_tenant_defaults`) is silently non-blocking; on failure the tenant + owner survive without capabilities. This is high-severity risk R-02.
- Permissions vocabulary: **104 keys**, authoritative via `permission_definitions`.
- Client-side check: `src/hooks/usePermissions.ts:207-240` — owner → role-direct → role-bundle → member-bundle → member-override.
- Server-side check: `public.has_permission(uuid, uuid, text)` `SECURITY DEFINER`, called from RLS policies.
- Delegation: `delegation_scopes` + `admin.permissions.delegate` key. `manager` role has everything except delegation.
- Never store roles on `profiles`; keep them in tenant-role / user-roles tables.

## 7. RLS and Cross-Tenant Safety Pointers

- Dual-scope tables: `tenant_id IS NULL` (personal) vs `tenant_id IS NOT NULL` (organization). Policies must honour both.
- Every new `public` table must ship, in one migration: `CREATE TABLE` → `GRANT`s appropriate to policy roles → `ENABLE ROW LEVEL SECURITY` → explicit `CREATE POLICY` statements. Missing GRANTs cause runtime permission errors even with RLS.
- Do not grant `anon` unless a policy actually permits anonymous reads.
- Cross-tenant partner access flows through `connections`, `consent_grants`, `connection_horse_access`, `horse_shares`, `horse_share_packs`, `media_share_links`, and `accept_connection` / `create_connection_request` / `finalize_invitation_acceptance` RPCs. Do not bypass RPC/RLS to expose partner data.
- Some tables intentionally fail closed (e.g. `hr_employees` DELETE). Absence of a policy is not automatically a bug — check first.
- Never modify `auth`, `storage`, `realtime`, `supabase_functions`, or `vault` schemas.
- Full policy-body enumeration is Round 2 scope.

## 8. RPC, Trigger, Storage, and Edge Function Pointers

- Finance canonical entry points: `create_invoice_with_items`, `update_invoice_with_items`, `delete_draft_invoice`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `record_salary_payment`, `post_invoice_payments`, `post_payment_session`, `get_payment_session`, `create_source_checkout_invoice`, `create_pos_sale`. Underscore-prefixed `_finance_*` helpers are private.
- **Housing canonical entry point:** `record_horse_movement_with_housing` — **20 parameters** (verified in `supabase/migrations/20260620151442_65c6a9d4-a351-4e79-b470-c99d9e1f4f43.sql`). Direct occupancy writes are forbidden — go through admissions.
- Identity governance RPCs: `update_horse_identity`, `complete_local_horse_record`, `finalize_invitation_acceptance`.
- Triggers to know about: `_invoice_items_fill_snapshots`, `_invoice_items_validate_source`, `_push_on_notification_insert`, `trg_connections_audit`, `trg_connections_auto_revoke_grants`, plus the `_trg_lock_horse_*` family. Follow existing security-definer patterns when adding triggers.
- Storage: 2 buckets — `horse-media` (private, 50 MB, image + video MIME allow-list) and `database_export_20_07_26` (legacy artifact). Signed access via `shared-media-sign` edge function. Object-level policies not enumerated (R-04).
- Edge functions: `send-invitation-email` (verify_jwt=true), `send-ownership-notification` (true); `send-push-notification`, `get-vapid-key`, `shared-media-sign`, `expire-stale-connections`, `mark-overdue-invoices` (all false — each must self-validate).
- Notifications follow the metadata-driven pattern with dedup windows; see `src/lib/notifications/**`.

## 9. Testing, Build, and Environment Posture

- Testing baseline: **19 Vitest tests** (12 finance lib, 4 finance components, 1 housing chip, 1 laboratory checkout, 1 POS contract), 1 hook test, 2 component tests, **5 SQL harnesses** under `supabase/tests/database/`, **no runnable Playwright suite**, no RLS/auth/tenancy tests, no migration tests.
- TS posture: `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`, `skipLibCheck: true`; ~**554** `as any` occurrences; no `typecheck` script wired.
- Environment: single Supabase project bound to preview + published + custom domains (R-01, HIGH). No staging separation.
- PWA: kill-switch (`selfDestroying: true`); only `public/push-sw.js` retained.
- Two toast systems (shadcn Toaster + sonner) mounted simultaneously (R-10). Twenty-plus components import `supabase` directly (R-15). Eight files exceed 1,200 lines (R-09). No error monitoring wired (R-11). Session persistence in `localStorage` (R-14).

## 10. High-Risk Areas Requiring Re-Inspection Before Change

- Finance ledger integrity (`src/lib/finance/**` and `_finance_*` helpers).
- Payment sessions and allocation math (`post_payment_session`, `payment_allocations`, `payment_horse_allocations`).
- Housing admission / unit occupancy (20-param `record_horse_movement_with_housing` + admissions unification rules).
- Permission precedence (client `usePermissions.ts` must stay aligned with server `has_permission()`).
- Cross-tenant RLS on any table that touches multiple tenants.
- Any migration that creates a `public` table (GRANT+RLS+POLICY block is mandatory).
- Tenant-creation flow (R-02 — currently non-atomic).

## 11. Known Evidence Limitations

- Round 1 does not enumerate every table, policy, function, trigger, or bucket. Regenerate exact inventories from live metadata before structural change.
- Performance and reliability figures are not measured in Round 1; treat as **unverified** until benchmarked.
- `DebugAuth` route exists in source (DEV-only guarded); not shipped in production.
- Historical Round 1 raw output flagged non-atomic tenant creation; re-verified this round in `TenantContext.tsx:318-483`.
- Legacy in-place files (root schema snapshots, `docs/Documentation_13_-_Laboratory_Workstream_Closure.md`, other `LEG-*` entries) remain pending cleanup; do not treat their presence as endorsement of their paths.
- Auth-trigger inventory (`handle_new_user`-style on `auth.users`), Storage `storage.objects` policies, scheduled-job configuration, and auth provider configuration are all **not** inspected in Round 1.

## 12. Historical Documents and Supersession Rules

- Historical Documentation 01–13 lives under `docs/historical/documentation-01-13/`. Canonical Doc 13 is `13-operational-truth-stabilization.md` (`DHB-DOC13`); the in-place `Documentation_13_-_Laboratory_Workstream_Closure.md` is a **predecessor artifact**, not canonical Doc 13.
- Historical documents are preserved as evidence. Do not edit them to reflect current truth. Corrections belong in later canonical current-truth documents that supersede specific claims.
- On conflict between a historical document and current code/DB, current code/DB wins.

## 13. Round 2 Inputs

Carry forward to Round 2:

1. Auth provider configuration (email/password, Google, phone, SAML, HIBP, password policy, templates).
2. `tenant_type` behaviour matrix for all 10 types.
3. Module capability catalog (`tenant_capabilities` + `useModuleAccess`).
4. Full RLS policy-body enumeration and per-table alignment report.
5. DEFINER RPC body inspection (tenant validation, idempotency, transaction boundaries).
6. `tenant_members` and `tenants` policy bodies (authority questions 4/6/7).
7. Storage `storage.objects` policies.
8. Scheduled-job configuration (`pg_cron` / platform).
9. Auth trigger inventory on `auth.users`.
10. Environment separation plan for R-01.
11. Nav-config reconciliation.
12. Doctor-billing debt audit.
13. Owner/Horse-Owner Portal deep audit (zero-policy tables + RPC paths).
14. Community `posts` visibility resolution (15 policies).
15. CI/CD workflow inspection.

## 14. Mandatory Lovable Working Rules

- Read `docs/README.md` first when re-entering the project.
- Use `DHB-R01-DEV` for full Round 1 detail; use this file for pointers and rules.
- Treat raw Round 1 evidence as immutable — never rewrite it.
- Never treat Documentation 01–13 as current truth without checking current code and current database metadata.
- Never expose secret values (service-role key, DB password, provider keys, tokens, JWTs, private URLs with embedded tokens). Publishable/anon values Supabase already exposes are permitted where they are already public.
- When a prompt is explicitly read-only, do not modify code, database, or documentation.
- Do not claim launch readiness from Round 1 evidence.
- Any future change that affects Round 1 truth must update the relevant document's `version` and `last-verified`, the central index (`docs/README.md`), and any related handoff/reference file.
- Contradictions between sources must be logged (evidence class, current condition, governing source), not silently resolved.
- Owner-governance material is outside the shared repository. Do not request it from shared docs and do not create `docs/owner/`.
- When describing work: use "continue / stabilize / improve / complete / expand". Never propose "rebuild from scratch".
