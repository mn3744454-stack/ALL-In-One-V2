<!--
id: DHB-ARCH-ACCOUNT-TYPES-IDENTITY
title: Dayli Horse — Account Types and Identity Model
version: 1.0.0
status: current
audience: internal+external
date: 2026-07-28
last-verified: 2026-07-28
supersedes: []
superseded-by: null
source: authored from the owner-approved Account Types & Identity Model Clarification and verified against current repository truth (`public.tenant_type` enum in `src/integrations/supabase/types.ts` and onboarding routes in `src/App.tsx`)
source-sha256: n/a
-->

# Dayli Horse — Account Types and Identity Model

> **Current-truth architecture reference.** This document is the permanent source of truth for how account/workspace types, personal identity, workspace mode, membership roles, professions, capabilities, permissions, and tenant/record scope relate on the Dayli Horse platform. On any conflict, current source code, migrations, and live database state remain authoritative; this document is aligned to current truth at the `last-verified` date.

## 1. Purpose and Authority

This document defines the current implemented account/workspace-type set, the owner-approved planned additions, and the identity model used across the platform. It is the reference used by:

- authorized development partners, maintainers, and auditors when reasoning about account types, identity, and authority;
- the project owner when scoping product decisions;
- future documentation rounds when producing per-account-type or per-module implementation reports.

This document does not change database enums, onboarding routes, permissions, RLS, navigation, capabilities, subscriptions, or Community behaviour. Those require separate investigative and execution workstreams.

## 2. Current Implemented Account Types

Dayli Horse currently defines and supports **10 account/workspace types** in the existing platform model. These are the values of the `public.tenant_type` PostgreSQL enum, mirrored in `src/integrations/supabase/types.ts`, and each has an onboarding route in `src/App.tsx` that instantiates `CreateStableProfile` with the matching `tenantType` prop.

| # | Display name | `tenant_type` enum value |
|---|---|---|
| 1 | Stable | `stable` |
| 2 | Veterinary Clinic | `clinic` |
| 3 | Laboratory | `lab` |
| 4 | Training Academy | `academy` |
| 5 | Equine Pharmacy | `pharmacy` |
| 6 | Horse Transport | `transport` |
| 7 | Horse Auction | `auction` |
| 8 | Horse Owner | `horse_owner` |
| 9 | Independent Trainer | `trainer` |
| 10 | Independent Veterinarian | `doctor` |

Implementation depth per type is not uniform. That depth is Round 2 subject matter and is not restated here.

## 3. Planned Account Types

The owner-approved target model adds **3 planned account/workspace types**:

| # | Display name | Status |
|---|---|---|
| 11 | Farrier | planned |
| 12 | Professional Rider | planned |
| 13 | Jockey | planned |

The planned types currently have **no** confirmed:

- `tenant_type` enum values;
- onboarding routes;
- `SelectRole` entries;
- dedicated modules;
- dedicated database architecture;
- capability defaults;
- production-ready workflows.

They must never be described as currently implemented.

### 3.1 Naming-collision clarification

- `farrier` exists today only as a value of the unrelated `hr_employee_type` enum (HR employee/professional classification, consumed by `src/components/hr/*` and `src/hooks/hr/useHorseAssignments.ts`). This is a **membership/employee/professional role inside another workspace**, not a workspace/account type. Its presence is **not** evidence that a Farrier account/workspace type exists.
- `exercise_rider` exists in i18n strings as an HR employee role. It is distinct from the planned **Professional Rider** account/workspace type.
- `jockey` and `professional_rider` do not exist as enum values, routes, modules, components, or migrations today.

## 4. Current / Planned / Target Count Contract

| Category | Count |
|---|---:|
| Current implemented account/workspace types | **10** |
| Planned account/workspace types | **3** |
| Approved target account/workspace types (total) | **13** |

Mandatory wording:

> Dayli Horse currently defines and supports 10 account/workspace types in the existing platform model. The owner-approved target model expands this to 13 through three planned account/workspace types: Farrier, Professional Rider, and Jockey.

Documentation must never state or imply that 13 account types are currently implemented, nor that Farrier, Professional Rider, or Jockey are currently implemented account types.

## 5. Personal Identity

A person registers once using **one** personal user identity (`auth.users` row). The personal identity represents the individual regardless of how many organizations or professional workspaces they own or join.

Changing the active workspace changes the **operating context**, not the underlying person.

## 6. Personal Mode

In Personal Mode the user operates as an individual. Personal Mode may include personal profile, personal community participation, bookings, payments, personally owned or followed horses, personal notifications, and other individual-facing functionality.

Personal Mode must **not** automatically inherit organization-specific operational modules merely because the user belongs to an establishment.

At the frontend, Personal Mode corresponds to `workspaceMode === "personal"` in `src/contexts/TenantContext.tsx`, gated by `WorkspaceRouteGuard.tsx` and served by `PERSONAL_NAV_MODULES` in `src/navigation/workspaceNavConfig.ts`.

## 7. Establishment / Workspace Mode

In Establishment / Workspace Mode the user operates within the currently selected professional or organizational workspace. The active workspace determines the primary account type and the organizational context.

Examples: Stable workspace, Laboratory workspace, Independent Veterinarian workspace, Training Academy workspace, Horse Owner workspace.

At the frontend, Establishment Mode corresponds to `workspaceMode === "organization"` with an `activeTenant` present, served by `ORG_NAV_MODULES` in `src/navigation/workspaceNavConfig.ts`.

## 8. Multiple Workspace Memberships

The same person may:

- own one workspace;
- own several workspaces;
- be a manager, employee, member, professional, or contractor in another workspace;
- hold different membership roles and effective permissions in each workspace.

Workspace membership is represented in `tenant_members(user_id, tenant_id, role, …)` and is many-to-many.

## 9. Account Type vs Membership Role

Account/workspace type and membership role are two independent concepts.

| Concept | Enum / Registry | Defines |
|---|---|---|
| Account / workspace type | `public.tenant_type` (10 values) | What kind of professional or organizational entity the workspace represents. |
| Membership role | `public.tenant_role` (`owner`, `admin`, `foreman`, `vet`, `trainer`, `employee`, `manager`) plus custom tenant roles | What the person is allowed to do inside a specific workspace. |

A person may be, for example:

- the owner of an Independent Trainer workspace **and** hold a `trainer` membership role inside a Stable;
- the owner of a Horse Owner workspace **and** an `employee` in a Veterinary Clinic;
- the owner of a future Jockey workspace **and** hold a jockey-style employment classification inside a racing-oriented organization.

Documentation must not collapse account types and membership roles into a single concept.

## 10. Account Type vs Profession or Specialization

Profession or specialization alone must **not** automatically grant organization-specific functionality. Profession describes what a person does; the workspace type + capabilities + role + permissions decide what a workspace exposes.

The existing HR classifications (`farrier`, `exercise_rider`, and others under `hr_employee_type`) are professional/employee classifications inside a workspace. They are distinct from the planned Farrier, Professional Rider, and Jockey account/workspace types.

## 11. Independent Professional vs Organization Workspace

**A. Independent Veterinarian vs Veterinary Clinic.** An Independent Veterinarian (`doctor`) workspace represents a solo professional. It must not automatically inherit clinic-specific organizational features such as wards, inpatient accommodation, clinic facilities, departments, or clinic-wide staffing structures. A Veterinary Clinic (`clinic`) workspace represents an organization and may support clinic-level facilities, departments, staff, and organizational clinical operations.

**B. Independent Trainer vs Trainer role.** An Independent Trainer (`trainer`) may own a professional workspace and operate across several clients or stables. A Trainer may also exist only as a membership role inside a Stable or Training Academy, without owning a dedicated workspace.

**C. Professional Rider vs Jockey.** Professional Rider and Jockey are **separate** planned account/workspace types in the approved target model. Either may also exist as a membership role, employment classification, or professional specialization inside another workspace.

**D. Farrier.** Farrier is a planned independent professional account/workspace type. A Farrier may also exist as a member, employee, contractor, or professional classification inside another workspace — which is how `hr_employee_type = 'farrier'` is used today.

## 12. Capability and Permission Resolution

Visible functionality must be determined through the combination of:

1. active workspace type (`tenant_type`);
2. enabled capabilities/modules (`tenant_capabilities`, consumed via `useModuleAccess`);
3. membership role (`tenant_role` and per-tenant custom roles);
4. effective permissions (permission-key vocabulary resolved by `has_permission()` / `hasPermission()`);
5. record and tenant scope (RLS, dual-scoping between personal `tenant_id IS NULL` and organizational `tenant_id IS NOT NULL` where a given table supports it).

Consequences:

- **Account type alone does not prove that every associated feature is enabled or complete.**
- **Profession alone does not grant access.**
- **UI visibility alone is not backend authorization.** UI gating is a rendering convenience; authority is decided server-side by RLS and `SECURITY DEFINER` functions.
- **Record and tenant scope remain part of the authority decision** — the same permission key can succeed on one record and fail on another based on tenant membership and scope helpers.

## 13. Community Publishing Identity Principle

Community activity must distinguish between personal and organizational representation:

- **Personal Mode:** posts, comments, reactions, and other community activity are performed as the individual.
- **Establishment Mode:** the user may represent the active workspace only when they have explicit permission to publish or interact on behalf of that workspace.
- **Workspace membership alone does not grant organizational publishing authority.**

This document records the principle. It **does not** modify Community behaviour, permissions, RLS, or workflow. Any behavioural change is a separate investigative and execution workstream.

## 14. Current Implementation vs Planned Architecture

| Aspect | Current implemented (10 types) | Planned (3 types: Farrier, Professional Rider, Jockey) |
|---|---|---|
| `tenant_type` enum values | Yes — 10 values | No |
| Onboarding routes (`/create-profile/*`) | Yes — 10 routes via `CreateStableProfile` | No |
| `SelectRole` entries | Yes | No |
| Dedicated modules / navigation | Varies by type; some modules mature, others foundation-only (Round 2 scope) | No |
| Database architecture / capability defaults | Present (implementation depth varies) | Not defined |
| Production-ready workflows | Vary by type | Not yet |

The next account-types/modules assessment must:

- deeply audit the 10 current implemented types against routes, pages, components, hooks, tables, RPCs, capabilities, onboarding, permissions, and real post-onboarding behaviour;
- separately assess architectural readiness and required foundations for the 3 planned types;
- never claim that the 3 planned types are currently implemented;
- preserve the distinctions in §§9–11.

## 15. Documentation and Future Assessment Rules

1. Preserve verified current technical facts unless new repository or database evidence contradicts them.
2. Describe the 10 current types as implemented/current.
3. Describe the 3 planned types clearly as planned.
4. State the approved target total of 13.
5. Do not imply that planned types already have enum values, onboarding, modules, routes, permissions, database objects, or production readiness.
6. Preserve the personal identity × workspace × membership role × profession/specialization × capability/permission × scope distinction.
7. Preserve the difference between an independent professional workspace, an organization workspace, and a membership role inside another workspace.
8. Do not rename or rewrite historical evidence silently. Historical files that reference only "10 tenant types" remain historical evidence; this document provides current-truth qualification.
9. Update versioning, `last-verified`, and index registration according to `docs/CONVENTIONS.md`.
10. Do not use internal round labels (e.g. "Round 1", "Round 2", "R1", "R2") in this document's formal title or filename.

## 16. Scope Boundary

This document does **not** authorize:

- adding new database enum values;
- creating Farrier, Professional Rider, or Jockey onboarding;
- implementing new modules;
- modifying permissions, RLS, or delegation;
- modifying navigation, capabilities, or `SelectRole`;
- changing subscriptions or plans;
- altering Community behaviour;
- publishing or deploying the application.

Any such change requires its own investigative and execution workstream.

## 17. Final Architecture Statement

Dayli Horse currently defines and supports **10** account/workspace types in the existing platform model (`stable`, `clinic`, `lab`, `academy`, `pharmacy`, `transport`, `auction`, `horse_owner`, `trainer`, `doctor`). The owner-approved target model expands this to **13** through **3** planned account/workspace types: **Farrier, Professional Rider, and Jockey**. Personal identity, workspace type, membership role, profession/specialization, capabilities, permissions, and record/tenant scope are separate but connected concepts. Documentation and future assessments must preserve every distinction defined here.
