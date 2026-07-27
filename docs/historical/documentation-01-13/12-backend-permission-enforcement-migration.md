<!--
id: DHB-DOC12
title: Documentation 12 — Backend Permission Enforcement Migration
version: 1.0.0
status: historical
audience: internal
date: unknown
last-verified: 2026-07-27
supersedes: []
superseded-by: null
source: owner-supplied historical source (`12-backend-permission-enforcement-migration.md`)
source-sha256: 27ed593cb14e32beacbd3e6ac0bba020d6611dcc2118762b163c368f9dc42602
-->

# Documentation 12 — Backend Permission Enforcement Migration

> **Historical evidence — preserved verbatim.** This document is preserved as historical evidence. Current source code, migrations, database state, and later approved handoff documentation supersede specific claims where they conflict.
>
> **Raw source:** [`docs/historical/documentation-01-13/raw/12-backend-permission-enforcement-migration.md`](../documentation-01-13/raw/12-backend-permission-enforcement-migration.md)
> **Source SHA-256:** `27ed593cb14e32beacbd3e6ac0bba020d6611dcc2118762b163c368f9dc42602`



# Documentation 12 — Backend Permission Enforcement Migration: Full Lifecycle from Forensic Audit Through Residual Closure

---

## 6.1 Documentation Identity

### 6.1.1
This is **Documentation 12**.

### 6.1.2
**Full Formal Title:** Documentation 12 — Backend Permission Enforcement Migration: Forensic Permissions Audit, Three-Phase Corrective Architecture, Domain-by-Domain RLS Migration, and Final Residual Closure (April 4, 2026)

### 6.1.3
**Documentation 11** is the baseline reference.

### 6.1.4
**Scope period:** April 4, 2026, beginning immediately after the closure of the People / Team & Partners workstream documented in Documentation 11, and concluding with the final residual cleanup batch that retired the last 13 legacy write policies.

---

## 6.2 Executive Summary

### 6.2.1
After Documentation 11, a comprehensive forensic audit was launched to determine whether the platform's permission/role/governance model truly covered the real platform scope. This audit revealed a systemic "dual-system" problem: 95 granular permission keys existed in the UI layer, but ~85% of backend RLS write enforcement still relied on legacy role-check helpers (`can_manage_orders`, `can_manage_horses`, `can_manage_hr`, etc.) that were hardcoded to `owner`/`manager` roles and completely ignored the granular permission system.

### 6.2.2
The major workstream was a three-phase corrective architecture:
- **Phase 1:** Immediate safety containment — upgrading critically unsafe broad-access policies
- **Phase 2:** Permission vocabulary cleanup, route guard correction, sidebar truthfulness
- **Phase 3:** Full backend RLS migration from legacy helpers to `has_permission()`, executed across 7 domain batches plus a residual cleanup

### 6.2.3
The biggest structural shift was the retirement of the legacy `can_manage_orders()` helper as the governing write-enforcement mechanism across the platform. Backend permission truth now flows through the same `has_permission()` function that the UI uses, making the permission model architecturally unified for the first time.

### 6.2.4
Final state: **104 permission keys** now govern both UI visibility and backend RLS enforcement. All core operational domains — Breeding, Clients, HR, Doctor, Vet, Horses, Media, Movement, Services, Finance, Orders, Service Providers, and Tenant Capabilities — are now enforced via `has_permission()`. Only Laboratory and Academy remain on legacy enforcement (explicitly deferred due to cross-tenant complexity and vocabulary insufficiency respectively).

---

## 6.3 Baseline Continuation Reference

### 6.3.1
Documentation 11 ended with the full closure of the People / Team & Partners workstream, including notification architecture upgrade, invitation identity verification, unified team model, partner management consolidation, and legacy surface removal.

### 6.3.2
At that point, the platform's operational data model and UI were mature. However, the backend enforcement layer had not been audited against the full permission vocabulary. The `has_permission()` RLS function existed and was battle-tested on boarding tables, but was deployed on only 3–5 tables out of 80+.

### 6.3.3
The post-Documentation-11 work became necessary because a forensic audit (Documentation 11A) revealed that the platform had grown significantly faster than its permission governance model. Permission keys existed but were "symbolic" — they hid UI buttons but did not enforce at the database level. This created a false sense of granularity and a truthfulness gap between what the UI promised and what the backend enforced.

---

## 6.4 Investigative Discovery

### 6.4.1
The first investigation was a full forensic audit (Documentation 11A) that mapped every module, route, table, and action against its permission coverage at four layers: nav visibility, route accessibility, button/action visibility, and backend RLS enforcement.

### 6.4.2
Key findings:
- ~90% of permission keys were symbolic (UI-only)
- ~80+ tables used legacy helpers (`can_manage_orders`, `can_manage_horses`, `can_manage_hr`, `is_tenant_member`, `is_active_tenant_member`) for write enforcement
- Only `boarding_admissions`, `boarding_status_history`, and `horse_care_notes` used the modern `has_permission()` function
- Several tables (`foalings`, `breeding_contracts`, all `doctor_*` tables) had dangerously broad write policies allowing any tenant member to INSERT/UPDATE/DELETE
- 19 routes in `App.tsx` lacked `requiredPermission` guards
- The sidebar used 9 hardcoded role checks (`['owner', 'manager']`) instead of permission-based visibility

### 6.4.3
The core structural problem was a **dual-system architecture**: the UI resolved 95 granular keys via `usePermissions()`, while the backend checked coarse role membership via legacy helpers. These two systems were disconnected — granting a custom role `finance.invoice.create` in the UI would show the button but the RLS INSERT policy on `invoices` used `can_manage_tenant_services()` which checked `role IN ('owner', 'manager')`, so the insert would fail silently for non-manager roles.

### 6.4.4
What was already strong: cross-tenant isolation (all tables tenant-scoped), owner bypass logic (consistent in both systems), the `has_permission()` function itself (architecturally correct and ready for wider deployment), and the 95 permission keys (well-organized, covering platform scope reasonably).

---

## 6.5 Post-Documentation-11 Work Progression

### 6.5.1 Phase 1 — Immediate Safety Containment

#### 6.5.1.1
Phase 1 was triggered because the forensic audit found critically unsafe write policies — several tables allowed any `is_tenant_member` (including read-only staff) to perform INSERT/UPDATE/DELETE.

#### 6.5.1.2
Migration `20260404011331` upgraded 8 tables from dangerously broad checks to `can_manage_orders()` (owner/manager only): `foalings`, `breeding_contracts`, `doctor_consultations`, `doctor_patients`, `doctor_prescriptions`, `doctor_followups`, `doctor_services`, and `supplier_payables`. Additionally, 19 route guards with `requiredPermission` were added to `App.tsx`.

#### 6.5.1.3
This changed the immediate risk profile from "any member can write" to "only owner/manager can write" on the most exposed tables. It did not yet achieve granular permission enforcement.

#### 6.5.1.4
The `has_permission()` function, cross-tenant enforcement, and read policies were not changed.

#### 6.5.1.5
Result: Critical write-access gaps eliminated. The platform moved from Medium-High risk to Medium risk.

### 6.5.2 Phase 2 — Permission Vocabulary and UI Governance Cleanup

#### 6.5.2.1
Phase 2 was needed because several domains lacked the permission vocabulary required for truthful backend migration, and the sidebar/routes had semantic inconsistencies.

#### 6.5.2.2
Migration `20260404012013` added 7 new permission keys (`breeding.view`, `breeding.manage`, `services.view`, `services.manage`, `team.view`, `team.manage`, `finance.settings.manage`) and removed 3 duplicate keys (`finance.invoices.create/manage/send`). Route guards were semantically corrected, and the sidebar was converted from hardcoded role checks to `hasPermission()` calls.

#### 6.5.2.3
This brought the vocabulary to 99 keys and made the UI layer truthful. Backend enforcement was not changed.

#### 6.5.2.4
Legacy RLS helpers remained the real enforcement mechanism.

#### 6.5.2.5
Result: The platform's UI layer was now semantically correct and ready to be matched by backend enforcement.

### 6.5.3 Phase 3 Readiness Audit

#### 6.5.3.1
Before entering Phase 3, a full readiness audit was conducted to determine the exact safe execution sequence for backend migration. This was not an execution step — it was an investigative planning step.

#### 6.5.3.2
The audit mapped all 65+ tables still on legacy enforcement, identified 4 missing vocabulary keys (`vet.manage`, `movement.manage`, `finance.payables.manage`, `admin.settings.manage`), and proposed a 5-batch migration roadmap ordered by risk and domain coupling.

#### 6.5.3.3
A key concern was identified: migrating from legacy helpers to `has_permission()` would break manager access unless the manager role was explicitly granted the relevant permission keys across all tenants.

### 6.5.4 Batch 0 — Prerequisites and Manager Backfill

#### 6.5.4.1
Batch 0 existed to prevent a "manager access blackout" when later batches migrated RLS policies.

#### 6.5.4.2
Migration `20260404014237` added the 4 missing permission keys. A separate data migration backfilled 103 permission keys to the `manager` role across all 5 tenants (previously only 34 rows existed across 4 tenants).

#### 6.5.4.3
A follow-up validation audit discovered the backfill was over-granted: the manager received `admin.permissions.delegate` (a meta-permission allowing delegation of any permission), effectively making managers shadow owners.

#### 6.5.4.4
Migration `20260404015236` corrected this by removing `admin.permissions.delegate` from the manager role (5 rows deleted across 5 tenants), leaving managers at 102 keys.

#### 6.5.4.5
Result: Safe baseline established. Manager role has 102 operational permissions; delegation remains owner-only.

### 6.5.5 Batch 1 — Breeding, Clients, HR

#### 6.5.5.1
First real domain migration batch, targeting the lowest-risk domains.

#### 6.5.5.2
Migration `20260404015758` replaced legacy `can_manage_orders`/`can_manage_hr` write policies with `has_permission()` on 13 tables: `breeding_attempts`, `breeding_contracts`, `breeding_events`, `embryo_transfers`, `foalings`, `pregnancies`, `pregnancy_checks`, `semen_batches`, `semen_tanks` (breeding); `tenant_clients` (clients); `hr_employees`, `hr_attendance_records`, `hr_payroll_records` (HR).

#### 6.5.5.3
Permission keys used: `breeding.manage`, `clients.manage`, `hr.manage`.

#### 6.5.5.4
Read policies (SELECT) were not changed — they remain on `is_tenant_member()`.

#### 6.5.5.5
Result: 13 tables now have truthful backend enforcement matching the UI permission model.

### 6.5.6 Batch 2 — Doctor and Vet

#### 6.5.6.1
Medical domains migration.

#### 6.5.6.2
Migration `20260404020354` migrated 11 tables. Doctor domain used granular resource-level keys: `doctor.patients.write`, `doctor.consultations.write`, `doctor.followups.write`, `doctor.services.write`. Vet domain used the blanket `vet.manage` key for `vet_visits`, `vet_treatments`, `vet_medications`, `vet_followups`, `horse_vaccinations`, and `vaccination_programs`.

#### 6.5.6.3
The Doctor domain preserved its existing resource-level vocabulary distinction rather than collapsing into a single key — this was a deliberate semantic design decision.

#### 6.5.6.4
Read policies unchanged.

#### 6.5.6.5
Result: 44 write policies migrated across 11 tables.

### 6.5.7 Batch 3 — Horses, Media, Movement

#### 6.5.7.1
The most complex batch, touching highly connected operational entities including the core `horses` table.

#### 6.5.7.2
Migration `20260404020933` migrated 15 tables. Horses used granular keys: `horses.create` for INSERT, `horses.edit` for UPDATE and reference tables, `horses.delete` for DELETE. Reference tables (`horse_aliases`, `horse_owners`, `breeders`, `horse_breeds`, `horse_colors`, `stables`) were governed via `horses.edit`. `horse_ownership` used a JOIN through the `horses` table. Media (`media_assets`) used `files.assets.manage`. Movement tables (`horse_movements`, `facility_areas`, `housing_units`, `housing_unit_occupants`, `external_locations`, `branches`) used `movement.manage`.

#### 6.5.7.3
Special constraints were preserved: `is_demo = true` guards on DELETE for movements and branches.

#### 6.5.7.4
Boarding admission policies were explicitly verified as untouched.

#### 6.5.7.5
Result: 45 write policies migrated across 15 tables.

### 6.5.8 Batch 4A — Services

#### 6.5.8.1
Services was split from Finance to isolate the accounting-sensitive Finance migration.

#### 6.5.8.2
Migration `20260404021503` migrated `tenant_services` using `services.manage`.

#### 6.5.8.3
Finance tables were explicitly confirmed untouched.

#### 6.5.8.4
Result: 3 write policies migrated.

### 6.5.9 Batch 4B — Finance

#### 6.5.9.1
The most sensitive batch, touching accounting tables.

#### 6.5.9.2
Migration `20260404022123` migrated 10 tables: `invoices` (granular: `finance.invoice.create/edit/delete`), `invoice_items` (JOIN through invoices for `finance.invoice.edit`), `expenses` (`finance.expenses.create/manage`), `supplier_payables` (`finance.payables.manage`), `ledger_entries` and `financial_entries` (system-managed, mapped to `finance.invoice.edit`), `customer_balances` (`finance.invoice.edit`), `payment_intents` (`finance.payment.create`), `payment_splits` (JOIN through payment_intents), `custom_financial_categories` (`finance.settings.manage`).

#### 6.5.9.3
Workflow-derived tables (ledger entries, balances) were deliberately mapped to the parent workflow permission rather than receiving independent CRUD keys, preserving accounting integrity.

#### 6.5.9.4
Duplicate legacy INSERT policies on `ledger_entries` were cleaned during migration.

#### 6.5.9.5
Result: Finance backend enforcement now permission-driven. `billing_links` was intentionally left unchanged (tenant member access preserved).

### 6.5.10 Residual Audit and Final Cleanup

#### 6.5.10.1
After Batch 4B, a post-migration residual audit identified exactly 13 write policies across 5 tables still on the legacy `can_manage_orders()` helper: `horse_orders` (3), `horse_order_types` (3), `horse_order_events` (1), `service_providers` (3), `tenant_capabilities` (3).

#### 6.5.10.2
The audit determined that a new `orders.manage` key was needed, while `service_providers` could use existing `services.manage` and `tenant_capabilities` could use existing `admin.settings.manage`.

#### 6.5.10.3
Migration `20260404023915` executed the final residual cleanup: added `orders.manage` to vocabulary, backfilled it to owner/manager roles, and migrated all 13 remaining write policies.

#### 6.5.10.4
Result: Zero legacy `can_manage_orders` write policies remain on any migrated table. The residual tail is fully closed.

---

## 6.6 Corrections, Follow-Ups, and Validation

### 6.6.1
The manager baseline backfill in Batch 0 was corrected after validation discovered over-granting of `admin.permissions.delegate`. This was a legitimate discovery — the initial backfill was mechanically correct but governancially wrong.

### 6.6.2
Every batch included post-migration validation: policy verification, permission truthfulness checks, build verification (`tsc --noEmit`), and regression checks.

### 6.6.3
No false alarms were encountered after the manager correction. All subsequent batches executed cleanly.

### 6.6.4
The Phase 3 readiness audit was a critical follow-up that prevented blind migration. It identified vocabulary gaps and sequencing risks that would have caused manager access loss without Batch 0.

### 6.6.5
Confidence increased progressively: Batch 1 proved the migration pattern on low-risk tables, Batch 2 confirmed it on medical domains, Batch 3 validated it on highly connected entities, and Batch 4B confirmed it on the most sensitive financial tables.

---

## 6.7 Final Closure State

### 6.7.1
**Complete:** All core operational domain tables are now enforced via `has_permission()` for INSERT, UPDATE, and DELETE. The permission vocabulary stands at 104 keys. The manager baseline is 102 keys (all except `admin.permissions.delegate`). Owner retains all permissions.

### 6.7.2
**Aligned:** The UI permission model (`usePermissions()`) and the backend enforcement model (`has_permission()` in RLS) now use the same permission keys and resolution chain. Permission truth is architecturally unified.

### 6.7.3
**Legacy behavior remaining:**
- Laboratory tables remain on legacy enforcement (complex cross-tenant data sharing logic)
- Academy tables remain on legacy enforcement (insufficient vocabulary)
- `connection_horse_access` uses direct `role IN ('owner', 'manager')` checks (cross-tenant context, not covered by `has_permission()`)
- Read (SELECT) policies across all tables remain on `is_tenant_member()` / `is_active_tenant_member()` — these were intentionally not migrated as read access is tenant-scoped and safe
- `billing_links` remains on tenant member access

### 6.7.4
**Intentionally future refinement:**
- Laboratory backend enforcement migration (requires cross-tenant permission model design)
- Academy vocabulary creation and enforcement
- Read-policy granularity (low priority — reads are already tenant-isolated)
- `has_permission()` performance optimization if latency issues emerge on high-traffic tables
- Potential future trimming of debatable manager permissions (`finance.invoice.delete`, `clients.creditLimit.override`)

---

## 6.8 Architectural Meaning

### 6.8.1
This work transformed the platform from a dual-system architecture (UI permissions disconnected from backend enforcement) to a unified permission-enforcement architecture. The `has_permission()` function is now the single source of truth for both UI gating and database-level write protection across all core domains.

### 6.8.2
This mattered because without it, the entire permission/role management UI was performative — administrators could configure granular permissions for custom roles, but the backend would ignore those configurations. Any role granted to a member who was `owner` or `manager` had full write access regardless of permission settings. Any non-owner/manager role was completely blocked regardless of granted permissions.

### 6.8.3
Patterns and governance principles established:
- **Domain-by-domain migration:** RLS changes are batched by domain coupling, not by mechanical similarity
- **Vocabulary-first:** Permission keys must exist and be semantically correct before backend migration
- **Baseline-first:** Role permission backfill must precede RLS migration to prevent access loss
- **Write-first, read-deferred:** Write enforcement is the priority; read access is safe when tenant-scoped
- **Parent-workflow mapping:** System-generated tables (ledger entries, balances) inherit permissions from their parent workflow rather than receiving independent CRUD keys
- **JOIN-based enforcement:** Child tables without `tenant_id` use JOINs through parent tables to resolve tenant context for `has_permission()`

### 6.8.4
What should not be casually undone:
- The `has_permission()` RLS enforcement pattern on migrated tables
- The manager baseline of 102 keys (removing keys without testing will silently break manager workflows)
- The semantic distinction between owner-only governance (`admin.permissions.delegate`) and operational management
- The parent-workflow permission mapping for accounting tables (do not give ledger entries independent CRUD permissions)
- The deliberate deferral of Laboratory enforcement (cross-tenant complexity requires dedicated design)

---

## Migration Artifact Summary

| Migration | Timestamp | Purpose |
|---|---|---|
| `20260404011331` | Phase 1 | Safety containment: 8 tables upgraded to `can_manage_orders` |
| `20260404012013` | Phase 2 | Vocabulary cleanup: +7 keys, -3 duplicates |
| `20260404014237` | Batch 0 | +4 prerequisite keys (`vet.manage`, `movement.manage`, `finance.payables.manage`, `admin.settings.manage`) |
| `20260404015236` | Batch 0 correction | Remove `admin.permissions.delegate` from manager |
| `20260404015758` | Batch 1 | Breeding (9), Clients (1), HR (3) → `has_permission()` |
| `20260404020354` | Batch 2 | Doctor (5), Vet (6) → `has_permission()` |
| `20260404020933` | Batch 3 | Horses (8), Media (1), Movement (6) → `has_permission()` |
| `20260404021503` | Batch 4A | Services (1) → `has_permission()` |
| `20260404022123` | Batch 4B | Finance (10) → `has_permission()` |
| `20260404023915` | Residual | Orders (3), Providers (1), Capabilities (1) + `orders.manage` key → `has_permission()` |

**Total: 10 migrations, 104 permission keys, ~60+ tables migrated, ~150+ write policies replaced.**

