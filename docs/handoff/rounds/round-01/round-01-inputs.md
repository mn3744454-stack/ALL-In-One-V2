<!--
id: DHB-R01-INPUTS
title: Round 1 — Investigative and Proceed Prompts (verbatim)
version: 1.0.0
status: evidence-immutable
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: package files `round-01/round-01-investigative-prompt.html` and `round-01/round-01-proceed-prompt.html`
source-sha256: investigative=90ce6ec646c10acdffdcfbff83641505af57441856211da8841a57563cf4f9fe; proceed=7bfa18d30d6a7cdedc40146c3088b572afa8fa0d0a8a25f3edee7fbda5d0877b
-->

# Round 1 — Investigative and Proceed Prompts (verbatim)

> **Immutable raw provenance.** The two prompts below are preserved verbatim (text extracted from the editable-HTML source's `<textarea>` frame). Neither prompt has been paraphrased, reordered, or corrected.
> - Investigative prompt source SHA-256: `90ce6ec646c10acdffdcfbff83641505af57441856211da8841a57563cf4f9fe`
> - Proceed prompt source SHA-256: `7bfa18d30d6a7cdedc40146c3088b572afa8fa0d0a8a25f3edee7fbda5d0877b`

---

## 1. Investigative prompt (verbatim)

```text
Dayli Horse — Current Developer Handoff Audit
Round 1: Platform Foundation, Architecture, Database, Tenancy, Authentication, Permissions, Storage, Edge Functions, and Environment Foundation

MODE: Investigative Chat / Planning
STRICTLY READ-ONLY
NO IMPLEMENTATION, NO CODE CHANGES, NO DATABASE CHANGES, NO MIGRATIONS, NO DEPLOYMENT

PURPOSE

Conduct Round 1 of the current-state developer handoff audit for the existing Dayli Horse platform.

The project is active and continues to be developed. This audit is intended to establish an evidence-based technical foundation that can later be rewritten into formal external-developer handoff documentation.

The final handoff framework contains 21 major sections:

1. Project definition and scope.
2. Account types.
3. Users, memberships, and roles.
4. Technical architecture.
5. Database architecture.
6. Multi-tenancy and data isolation.
7. Full module inventory.
8. Core user workflows.
9. Cross-account integrations.
10. Operational finance.
11. Dayli Horse SaaS subscriptions.
12. Web, PWA, and native mobile.
13. Arabic, English, and RTL.
14. Storage and files.
15. Notifications and Edge Functions.
16. Deployment and environments.
17. Testing and quality.
18. Performance and reliability.
19. Known issues and technical debt.
20. Current status and continuation roadmap.
21. Receiving-developer instructions.

Round 1 must focus primarily on Sections 1, 3, 4, 5, 6, 14, 15, and 16, while collecting foundational evidence for Sections 17, 18, 19, and 21.

Do not claim that the complete 21-part handoff is finished after this round.

0. MANDATORY OPERATING RULES

0.1 Strict Read-Only Mode

Do not:

- Modify any source file.
- Create, delete, rename, or move files.
- Commit, push, merge, or deploy code.
- Change dependencies.
- Create or modify SQL migrations.
- Change tables, columns, indexes, constraints, enums, views, triggers, functions, RPCs, policies, RLS, Storage policies, Auth settings, Edge Functions, environment variables, secrets, deployment settings, domains, or DNS.
- Insert, update, delete, normalize, repair, or seed records.
- Create demo or production data.
- Enable or disable modules.
- Execute destructive or write-capable database operations.

Read-only inspection and safe metadata queries are allowed only when they cannot modify project state.

0.2 No Rebuild Framing

Do not recommend rebuilding the project from scratch, starting over, transferring it into a vendor-owned environment, or replacing the current project as the default approach.

The intended direction is to continue, stabilize, improve, complete, and expand the existing Dayli Horse platform.

Architectural improvements may be documented, but they must be framed as improvements to the existing system unless direct evidence proves that a specific isolated component should be replaced.

0.3 No Unsupported Readiness Claims

Do not describe the platform as fully complete, production-certified, security-certified, fully tested, launch-ready, or fully documented unless the evidence inspected in this round proves the exact claim.

Historical documentation is not sufficient proof by itself.

0.4 No Secret Disclosure

Never output:

- Passwords.
- Private keys.
- API key values.
- Access-token values.
- Refresh-token values.
- Service-role key values.
- Full database credentials.
- Production personal data.
- Private user records.

You may report secret names, where they are configured, which service consumes them, and whether their handling appears safe, unsafe, or unverified.

1. SOURCE-OF-TRUTH ORDER

Use this priority when determining current truth:

1. Current live database structure and safely inspectable backend objects.
2. Current repository source code.
3. Current routes, components, hooks, contexts, services, configuration, and generated types.
4. Current Auth, Storage, Edge Function, and deployment configuration that can be inspected safely.
5. Current application behavior where directly verifiable.
6. Documentation 1–13 and later continuation reports.
7. Historical implementation summaries and audit outputs.

When old documentation conflicts with current code or database:

- Treat current verified implementation as current truth.
- Record the contradiction.
- Identify the historical source.
- Explain what changed or what remains uncertain.
- Do not silently merge incompatible claims.

Do not decide freshness from filenames or modification dates alone.

2. REQUIRED EVIDENCE METHOD

For each material conclusion, classify the evidence as one of:

- Directly verified.
- Verified through current source code.
- Verified through current database metadata.
- Verified through generated schema/types.
- Inferred from multiple consistent current sources.
- Historical documentation only.
- Unverified due to access limitations.
- Contradictory evidence.

For each technical surface, classify its status as one of:

- Active and currently used.
- Implemented but partially wired.
- Implemented but not surfaced.
- Schema-only foundation.
- Placeholder.
- Legacy but still referenced.
- Legacy and apparently unused.
- Superseded.
- Planned only.
- Unknown.

Every significant finding must include the most relevant available evidence:

- Exact file path.
- Route.
- Component, hook, context, utility, or service name.
- Table, view, enum, function, RPC, trigger, index, constraint, or policy name.
- Edge Function name.
- Storage bucket or policy name.
- Migration filename where relevant.
- Current call chain or data flow.
- Confidence level.

Do not provide vague claims without evidence.

3. PROJECT DEFINITION AND TECHNICAL BOUNDARIES

Investigate and answer:

3.1 What is Dayli Horse according to the current implementation?

Determine whether it is technically:

- A multi-tenant SaaS platform.
- An equestrian operational management system.
- A multi-role ecosystem.
- A marketplace foundation.
- A hybrid of these.

Explain which classification is supported by code and schema.

3.2 Identify the current architectural center of gravity.

Report:

- Main shared entities.
- Main domain entities.
- Platform-wide systems.
- Domain-specific modules.
- Shared service layers.
- Major architectural boundaries.

3.3 Identify the current system boundary.

Include:

- Frontend.
- Backend.
- PostgreSQL/Supabase responsibilities.
- Authentication.
- Storage.
- RPCs and database functions.
- Triggers.
- Edge Functions.
- Push notifications.
- PWA foundation.
- External services.
- Repository and development tooling.
- Deployment and domain configuration.

Classify referenced external systems as active, configured but inactive, planned, or unknown.

3.4 Explain how the application is governed by:

- Tenant type.
- Capability/module flags.
- Role.
- Permission.
- Workspace mode.
- Cross-tenant relationship.
- Consent or sharing.

Identify overlaps, contradictions, and areas where navigation, routes, frontend actions, and backend enforcement use different concepts.

4. CURRENT TECHNOLOGY STACK

Identify the current verified stack and version where available:

- React.
- Vite.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- React Router.
- TanStack Query.
- Supabase client.
- Form libraries.
- Validation libraries.
- Date libraries.
- i18n libraries.
- PWA/service-worker libraries.
- Testing libraries.
- Build tools.
- Linting tools.
- Formatting tools.
- Type-check tools.

Use this table:

| Layer | Technology | Version | Current use | Evidence | Status |

Identify dependencies that appear:

- Active.
- Duplicated.
- Legacy.
- Unused.
- Inconsistently used.

5. REPOSITORY AND FRONTEND ARCHITECTURE

5.1 Provide a high-level repository map.

Cover:

- src/pages
- src/components
- src/hooks
- src/contexts
- src/lib
- src/utils
- src/services
- src/i18n
- Supabase directories
- Edge Functions
- Migrations
- Public/PWA assets
- Tests
- Documentation
- Build/configuration files

Do not dump every file.

For each major directory, explain:

- Purpose.
- Key files.
- Shared vs domain-specific ownership.
- Oversized or highly coupled files.
- Duplicate patterns.
- Legacy or abandoned areas.

5.2 Application entry and routing

Document:

- Main entry files.
- Route-definition file.
- Layout hierarchy.
- Public routes.
- Authentication routes.
- Onboarding routes.
- Dashboard routes.
- Shared routes.
- Domain routes.
- Redirect routes.
- Legacy routes.
- Error/fallback routes.

Inspect all current guards:

- Protected/authentication guard.
- Workspace guard.
- Module guard.
- Permission guard.
- Tenant-type guard.
- Community guard.
- Any other route-level guard.

Create this matrix:

| Guard | File | Purpose | What it checks | What it does not check | Risk/limitation |

Identify routes that can be reached manually even when navigation is hidden.

5.3 State and contexts

Explain the source of truth for:

- Auth user.
- Personal profile.
- Active tenant.
- Membership.
- Active role.
- Workspace mode.
- Tenant capabilities.
- Permissions.
- Language.
- Direction.
- Query cache.
- Realtime state.
- Local storage.
- Session storage.
- Any global-state library.

Identify:

- Duplicate sources of state.
- Stale-state risks.
- Local-storage mismatch risks.
- Direct Supabase queries inside large UI components.
- Business logic embedded in components.
- Inconsistent query keys.
- Missing or broad cache invalidation.

5.4 Shared UI architecture

Identify:

- Application shell.
- Desktop sidebar.
- Mobile navigation.
- Header.
- View switcher.
- Shared tables.
- Dialogs, sheets, and drawers.
- Shared forms.
- Bilingual name rendering.
- Formatting utilities.
- Design tokens.
- Global fonts.
- RTL architecture.

This is not a full design review. Focus on what a receiving developer must understand before changing shared UI foundations.

6. BACKEND AND SUPABASE ARCHITECTURE

6.1 Explain the current backend model.

Distinguish responsibilities of:

- Frontend.
- Supabase/PostgreSQL.
- Lovable Cloud.
- Database functions and RPCs.
- Triggers.
- Edge Functions.
- Storage.
- Authentication.
- External services.

For major business rules, classify enforcement as:

- Frontend only.
- Database only.
- Frontend and database.
- Edge Function.
- Unknown.

6.2 Supabase client initialization

Inspect:

- Client initialization file.
- Environment-variable names.
- Session persistence.
- Token refresh.
- Realtime configuration.
- Timeout wrappers.
- Retry behavior.
- Error handling.
- Backend proxy usage.
- Privileged-secret usage.

Explicitly answer whether any service-role key or privileged backend secret is exposed to frontend code.

6.3 Generated types and schema synchronization

Inspect:

- Location of generated Supabase TypeScript types.
- Apparent generation source.
- Whether the types appear current.
- Any as-any casts around tables or RPCs.
- Untyped RPC calls.
- Manual type overrides.
- Schema/type drift.
- Objects used by code but absent from generated types.
- Generated objects apparently unused by the app.

7. COMPLETE DATABASE ARCHITECTURE INVENTORY

7.1 Provide verified totals where possible:

- Tables.
- Views.
- Materialized views.
- Enums.
- Functions.
- RPC-callable functions.
- Triggers.
- Indexes.
- Unique constraints.
- Foreign keys.
- RLS-enabled tables.
- Storage buckets.
- Migration files.

Where exact totals are unavailable, provide the safest verified approximation and explain the limitation.

7.2 Group objects by domain.

At minimum include:

- Authentication and profiles.
- Tenants and memberships.
- Roles and permissions.
- Horses and ownership.
- Stable/housing/facilities.
- Boarding contracts and admissions.
- Movement.
- Vet/health.
- Breeding/reproduction.
- Laboratory.
- Independent doctor.
- Academy.
- Clients.
- Services.
- Finance.
- HR/team.
- Partners/connections/consent/sharing.
- Documents/media/storage.
- Notifications.
- Community.
- Inventory/pharmacy foundations.
- Platform settings and feature flags.
- Audit and event logs.

For each group provide:

- Primary tables.
- Supporting tables.
- Views.
- RPCs/functions.
- Important relationships.
- Current implementation status.
- Legacy or duplicate objects.

7.3 Create a textual core relationship map.

Include at minimum:

- Auth user → profile.
- User → tenant membership.
- Tenant → members.
- Tenant → roles and permissions.
- Tenant → capabilities.
- Tenant → domain records.
- Horse → tenant.
- Horse → ownership.
- Horse → admission.
- Horse → occupancy.
- Horse → movement.
- Horse → vet records.
- Horse → breeding records.
- Horse → laboratory requests/results.
- Client → invoice.
- Invoice → invoice items.
- Invoice → ledger.
- Connection → consent/access records.

Identify:

- Canonical foreign keys.
- Snapshot fields.
- Live references.
- Bridge tables.
- Polymorphic references.
- Identifier fields without enforced foreign keys.
- Relationships based on parsing or heuristics.

7.4 Source-of-truth and snapshot architecture

Identify where the platform uses:

- Live FK references.
- Immutable snapshots.
- Denormalized current-state fields.
- Derived views.
- Status-history tables.
- Event tables.
- entity_type/entity_id patterns.

For each important pattern explain:

- Why it exists.
- Which workflows rely on it.
- Whether it is consistently enforced.
- Whether the source of truth is clear.

7.5 Legacy and potentially dead objects

Identify objects that appear:

- Superseded.
- Duplicated.
- Unreferenced.
- Partially migrated.
- Kept for backward compatibility.
- Referenced by old FKs.
- Present in schema but absent from UI.
- Present in UI but no longer written.

Do not recommend deletion without evidence.

State what must be verified before retirement.

8. AUTHENTICATION, PROFILES, TENANTS, AND MEMBERSHIPS

8.1 Trace the current authentication flow:

- Signup.
- Login.
- Logout.
- Session persistence.
- Password reset.
- Email verification.
- Phone fields or phone verification.
- Profile creation.
- Auth triggers.
- First login.
- No-tenant state.
- Multiple-tenant state.
- Redirects and errors.

Identify missing or incomplete flows and security-relevant assumptions.

8.2 Explain the identity model.

Distinguish:

- Auth user.
- Personal profile.
- Tenant/organization.
- Public organization profile.
- Personal workspace.
- Organization workspace.

Identify:

- Relevant tables.
- Routes.
- Context logic.
- Duplicate identity fields.
- Source of truth for name, phone, email, avatar, and language.

8.3 Trace tenant creation end to end.

Include:

- Tenant-type selection.
- Onboarding route/page.
- Tenant insertion.
- Owner membership insertion.
- Default capability initialization.
- Default roles or permission setup.
- Failure handling.
- Rollback behavior.
- Post-creation routing.

Provide exact files, tables, and RPCs.

State which failures are blocking and which are non-blocking.

Identify tenant-type mismatches or onboarding promises not supported by architecture.

8.4 Membership and active context

Explain:

- How membership is created.
- Whether one user can belong to multiple tenants.
- How active tenant is selected.
- How active tenant is persisted.
- How current role is resolved.
- How workspace mode is resolved.
- What happens if membership becomes inactive.
- What happens if the selected tenant is unavailable.
- Whether stale persisted context is possible.

9. ROLES, PERMISSIONS, AND DELEGATION

9.1 Inventory the permission architecture:

- Permission definitions.
- Permission keys.
- Bundles.
- Custom tenant roles.
- Role-to-bundle mappings.
- Direct role permissions.
- Delegation scopes.
- Role/delegation audit logs.
- Owner bypass.
- Manager defaults.
- System roles.
- Invitation-time role assignment.

Provide verified totals where possible.

9.2 Frontend permission resolution

Explain:

- Main permission hook.
- Permission-loading flow.
- Cache behavior.
- Owner behavior.
- Manager behavior.
- Custom-role behavior.
- Route checks.
- Navigation checks.
- Button/action checks.
- Remaining hardcoded role checks.
- Visible actions without permission checks.

9.3 Backend enforcement

Identify:

- has_permission() or equivalent.
- check_tenant_permission() or equivalent.
- RLS policies using granular permissions.
- Policies using membership-only checks.
- Policies still using legacy role helpers.
- SECURITY DEFINER functions.
- Functions that bypass normal RLS.
- Tenant validation inside privileged functions.

Create:

| Domain | Frontend permission model | Backend enforcement | Aligned? | Evidence | Residual risk |

9.4 Current migration status

Verify current truth rather than relying only on old documentation:

- Which domains use permission-based RLS.
- Which remain deferred.
- Whether Laboratory was later completed.
- Whether Academy remains deferred.
- Whether newer tables use inconsistent policies.
- Whether manager backfills match the current vocabulary.
- Whether delegation remains owner-restricted where intended.

9.5 Explicitly answer these authority questions:

- Can a normal member perform writes hidden by the UI?
- Can a custom role see a button but be rejected by RLS?
- Can a hidden route be opened manually?
- Can the final owner be removed or demoted?
- Can a manager delegate owner-level authority?
- Can a user change their own tenant role?
- Can one tenant modify another tenant’s membership?
- Can a SECURITY DEFINER function accept a foreign tenant ID?
- Are membership-only writes broader than intended?
- Can normal users write directly to system-managed finance or audit tables?

10. MULTI-TENANCY, RLS, AND DATA ISOLATION

10.1 Tenant scoping

Explain:

- Tables with tenant_id.
- Tables using other tenant-link columns.
- Global/master-data tables.
- Cross-tenant tables.
- Initiating/receiving tenant patterns.
- Owner/provider/recipient tenant patterns.
- Tables without an obvious tenant boundary.

10.2 Isolation helpers

Inventory helpers such as:

- is_tenant_member.
- is_active_tenant_member.
- has_permission.
- Tenant-owner checks.
- Connection checks.
- Consent checks.
- Horse-access checks.
- Legacy helpers.

For each provide:

- Signature.
- SECURITY DEFINER or INVOKER.
- Search path.
- Policies/functions that use it.
- Risks and limitations.

10.3 RLS coverage

Create:

| Table/domain | RLS enabled? | Read-policy basis | Write-policy basis | Cross-tenant exception | Confidence |

Identify:

- RLS-disabled tables.
- RLS-enabled tables with incomplete policies.
- Broad USING (true) patterns.
- Membership-scoped reads with overly broad writes.
- Duplicate policies.
- RPC-only intended tables that still allow direct writes.
- New tables lacking clear policy evidence.

10.4 Cross-tenant patterns

Inspect and classify:

- Stable ↔ Laboratory.
- Stable ↔ Horse Owner.
- Stable ↔ Doctor.
- Connected movement.
- Partner connections.
- Consent grants.
- Horse sharing.
- Shared media.
- Public token links.
- Invitations.
- Any cross-tenant finance/client behavior.

For each explain:

- Initiator.
- Stored identifiers.
- Shared data.
- Snapshot vs live reference.
- Release-control owner.
- Revocation.
- RLS or SECURITY DEFINER involvement.
- Current maturity: active, partial, schema-only, planned, or unknown.

10.5 Isolation-risk review

Explicitly investigate:

- Foreign-tenant-ID injection.
- Missing tenant validation in RPCs.
- Client-supplied tenant IDs trusted by privileged functions.
- SECURITY DEFINER without restricted search_path.
- Cross-tenant joins relying on null results from RLS.
- Public tokens without expiration.
- Data remaining accessible after revocation.
- Storage paths without tenant ownership checks.
- Duplicate or conflicting policies.

11. RPCs, FUNCTIONS, TRIGGERS, AND BACKEND CONTRACTS

11.1 Group important functions into:

- Authentication/invitations.
- Tenant initialization.
- Permission checks.
- Horses/ownership.
- Housing/admissions.
- Movement.
- Boarding contracts/service requests.
- Laboratory.
- Doctor.
- Finance.
- Notifications.
- Connections/consent.
- Storage/media.
- Scheduled maintenance.

For each important function provide:

- Name.
- Purpose.
- Parameters.
- Return type.
- SECURITY DEFINER or INVOKER.
- Search path.
- Tables read/written.
- Calling frontend file.
- Permission and tenant validation.
- Current status.
- Risk.

11.2 Trigger architecture

Identify important triggers for:

- Profile creation.
- Snapshot creation.
- Tenant immutability.
- Housing synchronization.
- Capacity enforcement.
- Ledger/balance maintenance.
- Notifications.
- Laboratory result rules.
- Status history.
- Audit logs.

Explain which rules are database-enforced and which remain frontend-only.

Identify overlapping or legacy triggers.

11.3 Contract consistency

Identify:

- Typed RPC calls.
- as-any RPC calls.
- Frontend parameters missing from generated signatures.
- Optional/default arguments hiding version skew.
- RPC bodies inconsistent with current callers.
- Overly broad return payloads.
- Inconsistent error-code patterns.

12. STORAGE AND FILE ARCHITECTURE

12.1 Inventory all current Storage buckets.

For each provide:

- Bucket name.
- Public/private status.
- Intended content.
- Path convention.
- Tenant/user ownership convention.
- Upload hooks/components.
- Download/signed-URL flow.
- Size limits.
- File-type limits.
- Storage policies.
- Sharing behavior.
- Deletion behavior.
- Current status.

12.2 Inspect media/document flows for:

- Horse media.
- Shared media.
- General file manager.
- Contracts/generated documents.
- Lab attachments/results.
- Profile images.
- Community media.
- Private customer documents.

Identify:

- Orphan-file risk.
- DB row/file mismatch.
- Public URL leakage.
- Long-lived signed URLs.
- Missing cleanup.
- Inconsistent tenant paths.

12.3 Explicitly determine:

- Can private paths be guessed?
- Do signed URLs revalidate current authorization?
- Can revoked users keep using old signed URLs?
- Is cross-tenant sharing time-bound?
- Are MIME type and extension validated?
- Are file-size checks enforced in both client and backend?

13. NOTIFICATIONS AND EDGE FUNCTIONS

13.1 Notification architecture

Inspect:

- Notifications table.
- Metadata.
- Family registry.
- User preferences.
- Tenant governance.
- Deduplication.
- Read/unread.
- Routing.
- Push subscriptions.
- Trigger-generated notifications.
- Edge-Function-generated notifications.

Classify notifications as:

- In-app.
- Email.
- Push.
- Scheduled.
- Cross-tenant.
- User-specific.
- Tenant-wide.

13.2 Edge Function inventory

For every current Edge Function provide:

- Name.
- Purpose.
- Invocation method.
- Authentication requirement.
- Secret names only.
- Tables/external services used.
- CORS behavior.
- Input validation.
- Tenant validation.
- Error handling.
- Idempotency or deduplication.
- Current status: active, partial, unused, legacy, or unknown.

13.3 Scheduled operations

Identify:

- Cron jobs.
- Scheduled Edge Functions.
- Expiry jobs.
- Overdue-invoice jobs.
- Connection-expiry jobs.
- Notification maintenance.
- Cleanup jobs.
- Processes documented as scheduled but lacking a verified schedule.

14. DEPLOYMENT AND ENVIRONMENT FOUNDATION

14.1 Determine the actual environment model:

- Development.
- Preview.
- Staging.
- Production.
- Separate Supabase projects.
- Separate environment variables.
- Separate domains.
- Test database.
- Demo tenant.

Do not assume Lovable preview and production are isolated unless verified.

14.2 Build and deployment

Inspect:

- Build command.
- Type-check command.
- Lint command.
- Test command.
- Deployment mechanism.
- Lovable deployment configuration.
- Repository integration.
- Branch deployment behavior.
- Domain configuration.
- PWA asset generation.
- Service-worker deployment.
- Cache invalidation.

14.3 Environment-variable registry

Create:

| Variable name | Purpose | Consumer | Frontend-safe? | Environment scope | Risk/notes |

Do not reveal values.

Identify:

- Used but undocumented variables.
- Defined but unused variables.
- Privileged secrets exposed through frontend prefixes.
- Hardcoded project URLs/IDs.
- Environment-specific assumptions.

14.4 Migration and release safety

Explain:

- Migration storage.
- Application method.
- Deterministic order.
- Rollback strategy.
- Schema/data changes mixed together.
- Hotfixes outside migrations.
- Database/repository drift detection.
- Backup/recovery documentation.
- CI/CD database validation.

15. TESTING, QUALITY, PERFORMANCE, AND RELIABILITY FOUNDATION

This is a foundation review, not the complete later specialist round.

15.1 Testing inventory

Classify each as active, stale, documentation-only, absent, or unknown:

- Unit tests.
- Hook tests.
- Component tests.
- Integration tests.
- End-to-end tests.
- RLS tests.
- RPC tests.
- Migration tests.
- Finance integrity tests.
- Mobile/PWA tests.
- RTL tests.
- Accessibility tests.
- Manual acceptance evidence.

15.2 Build health

Report:

- TypeScript configuration.
- Lint configuration.
- Build configuration.
- Suppressions.
- as-any usage.
- Disabled rules.
- Ignored failures.
- Oversized files.
- Circular-dependency indicators.
- Dead-code indicators.

Do not make changes.

15.3 Performance and reliability signals

Identify evidence of:

- N+1 queries.
- Sequential queries that could be batched.
- Unbounded queries.
- Full-table client filtering.
- Missing pagination.
- Oversized generated types.
- Oversized components/hooks.
- Repeated cross-tenant resolution.
- Cache invalidation gaps.
- Realtime subscription leaks.
- Excessive rerenders.
- Large route bundle.
- Missing route-level splitting.
- Timeout/retry inconsistency.
- Non-atomic multi-step writes.
- Client loops inserting multiple records.
- Orphan-record risk after partial failure.

Do not issue a broad performance verdict without evidence.

16. HISTORICAL CONTRADICTION REVIEW

Compare current verified truth with Documentation 1–13 and later reports.

Identify:

- Statements still current.
- Superseded statements.
- Statements contradicted by current code/database.
- Features previously called complete that later changed.
- Earlier gaps later closed.
- New objects absent from older documentation.
- Old account/module classifications no longer accurate.
- Permission/RLS claims changed by later migrations.
- Financial claims changed by later corrections.
- Housing, movement, Horse Owner, boarding-contract, and service-request changes added after older baselines.

Create:

| ID | Historical statement | Source | Current verified state | Evidence | Final-handoff resolution |

Do not rewrite history silently.

17. RISK REGISTER

Create:

| ID | Area | Finding | Finding type | Evidence | Severity | Confidence | Current impact | Immediate access concern? | Next investigation |

Severity:

- Critical.
- High.
- Medium.
- Low.
- Informational.

Finding type:

- Confirmed defect.
- Security concern.
- Architectural limitation.
- Documentation drift.
- Technical debt.
- Incomplete evidence.
- Future improvement.

Do not label every improvement as a defect.

18. REQUIRED FINAL OUTPUT

Return one complete report with exactly these sections:

A. Executive Verdict

Use one:

- FOUNDATION WELL-ESTABLISHED — RESIDUAL RISKS IDENTIFIED
- FOUNDATION FUNCTIONAL — MATERIAL GAPS REQUIRE FOLLOW-UP
- FOUNDATION PARTIALLY VERIFIED — EVIDENCE GAPS REMAIN
- FOUNDATION HIGH-RISK — HANDOFF ACCESS SHOULD BE RESTRICTED
- AUDIT INCOMPLETE — REQUIRED ACCESS OR EVIDENCE UNAVAILABLE

This is not a launch verdict.

B. Audit Scope, Method, and Access Limitations

C. Current Platform Definition and Technical Boundary

D. Current Technology Stack

E. Repository and Frontend Architecture

F. Backend and Supabase Architecture

G. Database Architecture and Domain Registry

H. Authentication, Profile, Tenant, and Membership Architecture

I. Role, Permission, and Delegation Architecture

J. Multi-Tenancy, RLS, and Cross-Tenant Isolation

K. RPC, Function, Trigger, and Backend Contract Registry

L. Storage and File Architecture

M. Notifications and Edge Function Architecture

N. Deployment and Environment Foundation

O. Testing, Quality, Performance, and Reliability Foundation

P. Historical Contradiction Register

Q. Current Risk Register

R. Receiving-Developer Technical Start Map

Include:

1. Files to read first.
2. Contexts and hooks to understand first.
3. Database objects to inspect first.
4. Routes to test first.
5. Access that should initially remain read-only.
6. Secrets that must never be shared directly.
7. High-risk areas requiring approval before modification.
8. Areas that must wait for later audit rounds.

S. Coverage Against the Permanent 21-Part Handoff Framework

Create:

| Handoff section | Covered in Round 1? | Coverage level | Remaining work | Planned round |

Do not mark the full framework complete.

T. Inputs Required for Round 2

List precise unresolved questions and evidence needed for:

Account Types, Full Module Inventory, and Current Implementation Reality.

19. COMPLETION STANDARD

Round 1 is complete only when:

1. Every material statement has evidence.
2. Current truth is separated from historical documentation.
3. Users, tenants, memberships, roles, and permissions are traced end to end.
4. Frontend authorization and backend enforcement are compared.
5. RLS and cross-tenant exceptions are examined.
6. SECURITY DEFINER and privileged paths are identified.
7. Database objects are grouped by domain and current usage.
8. Storage, notifications, Edge Functions, and environments are documented.
9. Secrets are not exposed.
10. Contradictions and evidence limitations are reported honestly.
11. No project state is modified.
12. A receiving developer can begin orientation safely.
13. Remaining work for later rounds is explicit.

End the report with this exact statement:

“Round 1 completed in strict read-only mode. No source code, database object, record, policy, secret, environment setting, deployment configuration, or project asset was modified.”
```

---

## 2. Approval / proceed prompt (verbatim)

```text
Approved. Proceed with the full Round 1 investigation now.

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
```
