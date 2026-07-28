<!--
id: DHB-R01-INT
title: Round 1 — Internal Lovable Reference
version: 1.0.0
status: supporting-pending-owner-acceptance
audience: internal-lovable
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored during DG.3 as an internal-facing condensed companion to DHB-R01-DEV
source-sha256: n/a
-->

# Round 1 — Internal Lovable Reference (`DHB-R01-INT`)

## 1. Purpose and Usage

This file is the concise, high-signal Round 1 companion to the canonical external developer handoff `DHB-R01-DEV`. It exists so that Lovable can retrieve current Round 1 truth in future sessions without relying on chat memory. It is **not** a second full handoff report. When a session needs full Round 1 detail, open `DHB-R01-DEV`.

Prefer this file when a session needs:

- a fast pointer to authoritative Round 1 sources,
- a summary of the current-truth boundaries versus historical documents,
- the rules Lovable must follow when acting on Round 1 material.

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

- Dayli Horse is a multi-tenant equestrian operations web app delivered as Vite + React 18 + TypeScript with PWA packaging. Backend is managed Supabase (Lovable Cloud).
- Round 1 covers **foundation only**: architecture, database skeleton, identity/tenancy, permissions, RLS, RPCs, storage, edge functions, environment, testing signal, risks, start map, access model. Module maturity, workflows, cross-account flows, commercial behaviour, delivery-channel details, and roadmap are **later rounds**.
- Current data in the environment is predominantly demo/test operational data. Do not treat live rows as production-customer truth without explicit owner confirmation.
- The platform is **not** certified production-ready, launch-ready, or security-hardened by Round 1. Round 1 is a canonical foundation, not a launch decision.

## 4. Architecture and Stack Pointers

- Router root: `src/App.tsx`. Shell: `src/components/layout/DashboardShell.tsx` (+ `DashboardHeader.tsx`). Navigation configs: `src/navigation/{navConfig,workspaceNavConfig,labNavConfig}.ts`.
- Providers: `src/contexts/AuthContext.tsx`, `src/contexts/TenantContext.tsx`, `src/i18n/**`, TanStack Query.
- Backend client: `src/integrations/supabase/client.ts` (auto-generated — do not hand-edit). Types: `src/integrations/supabase/types.ts` (auto-generated).
- Migrations: `supabase/migrations/` (322 files at Round 1 baseline, append-only).
- Edge functions: `expire-stale-connections`, `get-vapid-key`, `mark-overdue-invoices`, `send-invitation-email`, `send-ownership-notification`, `send-push-notification`, `shared-media-sign`.
- Feature roots: `src/components/{boarding,breeding,clients,finance,horses,housing,hr,laboratory,movement,permissions,pos,services,vet,notifications}`, `src/hooks/{finance,housing,hr,laboratory,roles,notifications,…}`, `src/lib/{finance,housing,notifications,pricing,…}`.
- Design system: semantic tokens in `src/index.css`; shadcn + Radix + Tailwind v3. Never hardcode colour utilities.

## 5. Identity, Tenant, and Permission Pointers

- Authentication: managed Supabase Auth via `AuthContext`. Social OAuth redirect URI must be same-origin public URL, not a protected route.
- Tenant switching: `TenantContext` (`activeTenant`, `activeRole`) with `TenantSwitcher.tsx`. Membership stored in `tenant_members`.
- Permissions vocabulary: 104 keys authoritative via `permission_definitions`.
- Client-side check: `src/hooks/usePermissions.ts` computes effective permissions in this order — owner → role-direct → role-bundle → member-bundle → member-override.
- Server-side check: `public.has_permission(uuid, text)` security-definer function, called from RLS policies.
- Delegation: `delegation_scopes` + `admin.permissions.delegate` key. `manager` role has everything except delegation.
- Never store roles on `profiles`; keep them in the tenant_role / user_roles tables.

## 6. RLS and Cross-Tenant Safety Pointers

- Dual-scope tables: `tenant_id IS NULL` (personal) vs `tenant_id IS NOT NULL` (organization). Policies must honour both.
- Every new `public` table must ship, in one migration: `CREATE TABLE` → `GRANT`s appropriate to policy roles → `ENABLE ROW LEVEL SECURITY` → explicit `CREATE POLICY` statements. Missing GRANTs cause runtime permission errors even with RLS.
- Do not grant `anon` unless a policy actually permits anonymous reads.
- Cross-tenant partner access flows through `connection_horse_access` and related grant tables. Do not bypass RPC/RLS to expose partner data.
- Some tables intentionally fail closed (e.g. `hr_employees` DELETE). Absence of a policy is not automatically a bug — check the security memory before adding one.
- Never modify `auth`, `storage`, `realtime`, `supabase_functions`, or `vault` schemas.

## 7. RPC, Trigger, Storage, and Edge Function Pointers

- Finance canonical entry points: `create_invoice_with_items`, `update_invoice_with_items`, `delete_draft_invoice`, `approve_invoice`, `cancel_invoice`, `post_payment`, `post_expense_with_ledger`, `post_manual_ledger_adjustment`, `record_salary_payment`, `post_invoice_payments`, `post_payment_session`, `get_payment_session`. Underscore-prefixed `_finance_*` helpers are private.
- Housing canonical entry point: `record_horse_movement_with_housing` (19 parameters). Direct occupancy writes are forbidden — go through admissions.
- Identity governance RPCs: `update_horse_identity`, `complete_local_horse_record`, `finalize_invitation_acceptance`.
- Triggers to know about: `_invoice_items_fill_snapshots`, `_invoice_items_validate_source`, `sync_post_child_tenant_id`. Follow existing security-definer patterns when adding triggers.
- Storage: signed access via `shared-media-sign` edge function. New buckets must ship with explicit policies.
- Notifications follow the metadata-driven pattern with dedup windows; see `src/lib/notifications/**`.

## 8. High-Risk Areas Requiring Re-Inspection Before Change

- Finance ledger integrity (`src/lib/finance/**` and `_finance_*` helpers).
- Payment sessions and allocation math (`post_payment_session`, `payment_allocations`, `payment_horse_allocations`).
- Housing admission / unit occupancy (`record_horse_movement_with_housing` + admissions unification rules).
- Permission precedence (client `usePermissions.ts` must stay aligned with server `has_permission()`).
- Cross-tenant RLS on any table that touches multiple tenants.
- Any migration that creates a `public` table (GRANT+RLS+POLICY block is mandatory).

## 9. Known Evidence Limitations

- Round 1 does not enumerate every table, policy, function, trigger, or bucket. Regenerate exact inventories from live metadata before structural change.
- Performance and reliability figures are not measured in Round 1; treat them as **unverified** until benchmarked.
- The `DebugAuth` route exists in source; it is not intended to remain reachable in a launch-ready environment.
- Historical Round 1 raw output flagged non-atomic tenant creation; re-verify against current migrations before acting on that claim.
- Legacy in-place files (root schema snapshots, `docs/Documentation_13_-_Laboratory_Workstream_Closure.md`, other `LEG-*` entries) remain pending cleanup; do not treat their presence as endorsement of their paths.

## 10. Historical Documents and Supersession Rules

- Historical Documentation 01–13 lives under `docs/historical/documentation-01-13/`. Canonical Doc 13 is `13-operational-truth-stabilization.md` (`DHB-DOC13`); the in-place `Documentation_13_-_Laboratory_Workstream_Closure.md` is a **predecessor artifact**, not canonical Doc 13.
- Historical documents are preserved as evidence. Do not edit them to reflect current truth. Corrections belong in later canonical current-truth documents that supersede specific claims.
- On conflict between a historical document and current code/DB, current code/DB wins.

## 11. Round 2 Inputs

Carry forward to Round 2:

- Full account-type maturity.
- Full module inventory and per-module implementation reality.
- End-to-end user workflows.
- Cross-account operational flows.
- Full finance/commercial and subscription behaviour.
- Web/PWA/native-mobile delivery details.
- Roadmap, completion status, prioritized backlog.

## 12. Mandatory Lovable Working Rules

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
