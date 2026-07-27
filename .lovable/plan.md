# Round 1 Handoff Audit — Execution Plan

Strict read-only investigative audit. No file edits, no migrations, no deploys, no data writes. Deliverable is a single evidence-based report covering Sections A–T defined in the brief, focused on Sections 1, 3, 4, 5, 6, 14, 15, 16 of the 21-part framework, with foundational evidence for 17–19, 21.

## Investigation phases

**Phase 1 — Repository & frontend architecture**

- Map `src/pages`, `src/components`, `src/hooks`, `src/contexts`, `src/lib`, `src/i18n`, `src/navigation`, `supabase/`, `public/`, config files.
- Read entry (`main.tsx`, `App.tsx`), router, all route guards (`WorkspaceRouteGuard`, any auth/module/tenant-type guards), layout shell, nav configs.
- Read `AuthContext`, `TenantContext`, `I18nContext`, `usePermissions`, query-key registry, Supabase client.
- Inventory shared UI patterns (dialogs, tables, bilingual name, formatters, RTL).
- Identify oversized files, duplicate patterns, legacy areas, direct Supabase calls in UI.

**Phase 2 — Technology stack**

- Read `package.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `eslint.config.js`, `postcss.config.js`, `vitest.config.ts`, `playwright.config.ts`, `components.json`.
- Build stack table with versions, evidence, and status.

**Phase 3 — Database inventory (read-only via supabase--read_query)**

- Query `information_schema` / `pg_catalog` for totals: tables, views, enums, functions, triggers, indexes, FKs, RLS-enabled tables.
- Query `pg_policies` for policy inventory grouped by table.
- List Storage buckets and Storage policies via safe queries.
- List migration filenames under `supabase/migrations/`.
- Group all objects by domain (auth/profiles, tenants, roles/permissions, horses, housing, movement, vet, breeding, lab, doctor, academy, clients, services, finance, HR, connections/consent, storage, notifications, community, inventory, platform settings, audit).
- Build core relationship map (textual).
- Identify snapshot vs live-reference patterns, polymorphic references, unenforced FKs.
- Flag legacy/duplicate/unreferenced objects (evidence only, no deletion recommendations).

**Phase 4 — Auth, profiles, tenants, memberships**

- Trace signup/login/logout/reset/verification flows through `AuthContext` and auth pages.
- Read tenant onboarding pages, tenant creation RPCs, membership insertion, capability defaults.
- Document identity model (auth user vs profile vs tenant vs public profile vs personal/organization workspace).
- Document active-tenant selection, persistence, stale-context risks.

**Phase 5 — Roles, permissions, delegation**

- Inventory `permission_definitions`, `permission_bundles`, `bundle_permissions`, `tenant_roles`, `tenant_role_bundles`, `tenant_role_permissions`, `member_permissions`, `member_permission_bundles`, `delegation_scopes`, `delegation_audit_log`, `role_audit_log`.
- Read `usePermissions`, `has_permission()`, `check_tenant_permission()`, related SECURITY DEFINER helpers.
- Compare frontend vs backend enforcement per domain; identify gaps (UI-only checks, hidden routes reachable manually, membership-only writes).
- Answer the 10 authority questions in section 9.5 with evidence.

**Phase 6 — Multi-tenancy, RLS, cross-tenant**

- For every public table: RLS enabled?, read basis, write basis, cross-tenant exception, confidence.
- Inventory isolation helpers (`is_tenant_member`, `_active_tenant_context`, `has_permission`, `can_access_shared_resource`, `_resolve_*` helpers) with SECURITY DEFINER/search_path.
- Classify cross-tenant patterns: Stable↔Lab, Stable↔Horse Owner, Stable↔Doctor, connections, consent grants, horse sharing, shared media, public tokens, invitations.
- Isolation-risk review: foreign-tenant-ID injection, unrestricted search_path, public token expiry, storage-path tenant checks, duplicate policies.

**Phase 7 — RPCs, functions, triggers**

- Group and document important functions with signature, security mode, tables touched, callers, validation, status.
- Trigger inventory (profile creation, snapshots, tenant immutability, housing sync, capacity, ledger, notifications, lab rules, status history, audit).
- Contract consistency: typed vs `as any` RPC calls, parameter drift, generated-types drift.

**Phase 8 — Storage, notifications, Edge Functions, environments**

- Storage bucket inventory (public/private, path convention, upload/download flows, policies, sharing, deletion).
- Notification architecture (`notifications`, family registry, preferences, governance, dedup, push subscriptions).
- Edge Functions from `supabase/config.toml` + `supabase/functions/`: name, purpose, JWT verification, secret names only, validation, idempotency, status.
- Scheduled jobs (cron/functions) — verify actual schedule vs documentation.
- Environment/deployment: `.env` variable names, Vite/PWA config, deployment mechanism, `config.toml`, migration workflow, drift/rollback story.

**Phase 9 — Testing, quality, performance, reliability signals**

- Test inventory (`supabase/tests/`, `src/**/__tests__`, `playwright*`, `vitest.config.ts`, scripts).
- Build health: TS/lint config, suppressions, `as any` usage, oversized files.
- Performance signals: unbounded queries, missing pagination, N+1, cache invalidation gaps, realtime leaks, non-atomic writes.

**Phase 10 — Historical contradiction review**

- Cross-check docs under `docs/` and memory index against verified current state.
- Build contradiction table (statement / source / current state / evidence / resolution).

**Phase 11 — Risk register & compilation**

- Compile risk register (area, finding, type, evidence, severity, confidence, impact, immediate concern, next step).
- Write Receiving-Developer Technical Start Map.
- Coverage table against 21-part framework.
- Round 2 inputs list.
- Assemble final report (Sections A–T) and close with the mandated statement.

## Tools and access

- `code--view` and `code--exec` (rg/ls only, no state changes) for repository inspection.
- `supabase--read_query` for schema/policy/function/trigger/bucket metadata — read-only queries against `information_schema`, `pg_catalog`, `pg_policies`, `storage.buckets`, `storage.objects` counts (no row content dumps of user data).
- `supabase--linter` for advisory findings.
- No `supabase--migration`, no `supabase--insert`, no writes of any kind.

## Guardrails

- Every material claim tagged with evidence class (directly verified / source code / DB metadata / generated types / inferred / historical-only / unverified / contradictory) and surface status (active / partial / schema-only / placeholder / legacy / superseded / planned / unknown).
- No secret values disclosed — names only.
- No rebuild framing; improvements framed as continuations.
- No unsupported readiness claims.
- Report ends with the exact mandated closing statement.

## Deliverable

A single Round 1 report with sections A–T as specified in the brief. No code, DB, or config changes will occur at any point.  
  
  
**Approved. Proceed with the full Round 1 investigation now.**

Do not return another plan, checklist, progress summary, or proposed methodology.

Execute the approved read-only investigation and return the actual complete evidence-based Round 1 report using the exact Sections A–T required in the original brief.

Mandatory execution clarifications:

1. Remain strictly read-only throughout. Do not modify source files, database objects, records, migrations, policies, configuration, secrets, deployment settings, generated files, lockfiles, caches, or project assets.

2. Use repository commands only for safe inspection. Do not run any command that may generate, rewrite, format, build, cache, migrate, install, or modify files.

3. Use database tools only for read-only metadata and safe aggregate inspection. Do not expose production row content, personal data, credentials, tokens, or secret values.

4. Current verified code and live database metadata take precedence over historical documentation. Historical documents may support context but must not be treated as current truth without verification.

5. If an object, policy body, environment setting, schedule, deployment configuration, or other evidence cannot be inspected, mark it explicitly as unverified due to access limitations. Do not infer certainty from historical documentation.

6. Every material finding must include:

- evidence classification;

- implementation-status classification;

- precise evidence such as file path, route, component, hook, table, view, function, RPC, trigger, policy, index, migration, Edge Function, bucket, or configuration location;

- confidence level.

7. Complete all requested matrices and registries, including:

- technology stack;

- route guards;

- domain database registry;

- core relationship map;

- frontend/backend permission enforcement;

- RLS coverage;

- important functions and triggers;

- Storage buckets;

- Edge Functions;

- environment variables by name only;

- testing inventory;

- historical contradictions;

- risk register;

- receiving-developer start map;

- coverage against the 21-part framework;

- precise Round 2 inputs.

8. Answer every high-risk authority and isolation question explicitly. Do not leave them implied inside broader paragraphs.

9. Do not recommend rebuilding, restarting, or transferring the project into a vendor-owned environment.

10. Do not make launch-readiness, production-certification, security-certification, or full-completion claims. This is a foundation handoff audit, not a launch audit.

11. Do not omit findings merely to shorten the response. Preserve material evidence, contradictions, limitations, and risks. Avoid unnecessary repetition, but do not summarize away required details.

12. Return the complete report in English, written professionally for later conversion into formal external-developer handoff documentation.

13. Do not ask for confirmation before beginning unless a genuine access blocker prevents the audit. Where access is partial, continue with all available evidence and document the limitation precisely.

14. End the report with the exact mandated closing statement:

“Round 1 completed in strict read-only mode. No source code, database object, record, policy, secret, environment setting, deployment configuration, or project asset was modified.”

&nbsp;