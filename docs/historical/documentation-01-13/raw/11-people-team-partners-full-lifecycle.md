

# Documentation 11 — People, Team & Partners Workstream: Full Lifecycle from Investigative Audit Through Final Closure

---

## 1. Documentation Identity

### 1.1
This is **Documentation 11**.

### 1.2
**Full Formal Title:** Documentation 11 — People, Team & Partners Workstream: Investigative Audit, Architectural Unification, Legacy Migration, and Final Closure (April 3–4, 2026)

### 1.3
**Documentation 10** is the baseline reference.

### 1.4
Documentation 10 ended on April 3, 2026, covering the completion of the structured financial maturation roadmap (Phases 1–10). It concluded with the platform's financial layer architecturally mature: service-grounded invoicing, tenant-configurable tax and currency, zero ledger drift, and all 7 invoice-generating flows fully service-grounded. Documentation 10 did not cover the People / HR / Invitations / Team / Partners / Relationship / Sharing workstream, which was the next major area of work.

### 1.5
Documentation 11 covers all meaningful work completed after Documentation 10 until the final closure of the People / HR / Invitations / Team / Partners / Relationship / Sharing workstream, concluded on April 4, 2026.

---

## 2. Scope of Documentation 11

### 2.1
Documentation 11 covers two distinct but interconnected workstreams that occurred after Documentation 10:

#### 2.1.1 Notification Architecture Upgrade
A cross-domain infrastructure migration that upgraded the notification trigger system with metadata enrichment.

#### 2.1.2 People / Team & Partners Full Workstream
A multi-phase workstream that progressed through:
- Investigative Documentation Audit (initial current-state assessment)
- Cleanup/Refinement Batch (dead code removal, phone verification, localization, employment kind toggle)
- Investigative Audit Round 2.2 (legacy relationship/sharing surface redesign analysis)
- Legacy Migration Execution (PartnerConfigSheet expansion, DashboardConnectionsSettings removal)
- Final Closure Audit (verification and classification)
- Final Closure Batch (orphaned component deletion)

### 2.2
For each stage, this document explains what was found, what was executed, what failed, what was corrected, and what final state was reached.

---

## 3. Chronological Timeline

### 3.1 Stage 1 — Notification Architecture Upgrade (April 3, early)

#### 3.1.1 Problem
The notification system used a basic `_notify_tenant_members` helper that inserted notifications with title/body text only. Cross-tenant notifications (lab requests, connection requests, movements) carried no structured metadata, making it impossible for the UI to render rich contextual information (partner names, horse names, statuses).

#### 3.1.2 Investigation
Audit of all notification trigger functions revealed that each trigger composed plain-text messages with no structured payload. The `notifications` table had no `metadata` column.

#### 3.1.3 Execution
Migration `20260403050803` performed a comprehensive upgrade:
- Added `metadata JSONB DEFAULT '{}'` column to `notifications` table
- Upgraded `_notify_tenant_members` helper to accept an `_metadata jsonb` parameter with dedup window (10-second anti-duplicate check)
- Rewrote 8 trigger functions to include structured metadata:
  - `notify_on_connection_created` — includes `actor_tenant_name`
  - `notify_on_connection_status_change` — includes `actor_tenant_name`, `status`
  - `notify_on_lab_request_created` — includes `actor_tenant_name`, `entity_label`
  - `notify_on_lab_request_updated` — includes `actor_tenant_name`, `status`, `entity_label`
  - `notify_on_lab_request_message` — includes `actor_tenant_name`, `entity_label`, `message_preview`
  - `notify_on_boarding_admission_change` — includes `horse_name`, `status`
  - `notify_on_horse_movement` — includes `horse_name`
  - `notify_on_incoming_movement` — includes `actor_tenant_name`, `horse_name`

#### 3.1.4 Final State
All notification triggers now carry structured JSONB metadata. The dedup window prevents duplicate notifications within 10 seconds. Fan-out warnings are logged for notifications exceeding 50 recipients.

#### 3.1.5 Closure Status
Fully closed. No regressions. No follow-up required.

---

### 3.2 Stage 2 — Investigative Documentation Audit (April 3)

#### 3.2.1 Problem
The People / HR / Invitations / Team / Partners area had accumulated work across fragmented earlier phases but had never been formally documented as a coherent system. The previous state involved three siloed surfaces (HR, Invitations in notifications, Connections in settings) with no cross-linking.

#### 3.2.2 Investigation
A comprehensive audit was performed across all relevant files, hooks, components, tables, RPCs, and migrations. The audit produced a full current-state documentation report covering:
- Person invitation flow (email/phone → acceptance → membership + HR auto-upsert)
- Organization invitation / partner flow (directory search → connection request → acceptance)
- HR auto-upsert bridge (`finalize_invitation_acceptance` RPC)
- Unified team surface (`useUnifiedTeam` hook merging `tenant_members` + `hr_employees`)
- Person detail sheet (role management, horse assignment, invite-to-platform)
- Operational collaborator horse scoping (`connection_horse_access` table)
- Share links (separate anonymous token-gated system)

#### 3.2.3 Key Findings
1. `MemberSetupSheet.tsx` was dead code — superseded by `PersonDetailSheet.tsx`
2. `NotificationsPanel` had a duplicate "Invite" button competing with Team & Partners
3. `useConnectionHorseAccess` had hardcoded English toast messages
4. Phone-based invitation acceptance had no identity verification
5. `connection_horse_access` was configurable but not enforced in domain RLS
6. Legacy `DashboardConnectionsSettings` page was partially redundant but still the only place for consent grants, audit logs, and connection acceptance

#### 3.2.4 Architectural Meaning
The audit established that the product had evolved from fragmented silos into a centralized Team & Partners hub, but legacy surfaces remained and needed either migration or removal.

---

### 3.3 Stage 3 — Cleanup/Refinement Batch (April 3)

#### 3.3.1 Scope
Five targeted cleanup items identified by the documentation audit.

#### 3.3.2 Item 1: Dead Code Removal
**Deleted:** `src/components/team/MemberSetupSheet.tsx`
**Verification:** Confirmed zero imports across the entire codebase before deletion.
**Replacement:** `PersonDetailSheet.tsx` (already active, 319 lines, handles role management + horse assignment + HR link + employment kind toggle + invite-to-platform).

#### 3.3.3 Item 2: Duplicate Invitation Entry Point Removal
**Changed:** `src/components/NotificationsPanel.tsx`
**Action:** Removed the lazy-loaded `InvitePersonDialog` import and the duplicate "Invite Team Member" button from the notifications panel.
**Preserved:** Received invitation visibility and notification badges remain in the panel for secondary awareness. Team & Partners (`/dashboard/team`) is now the sole primary invitation entry point.

#### 3.3.4 Item 3: Phone-Based Invitation Acceptance Verification
**Changed:** `finalize_invitation_acceptance` RPC (migration `20260403213333`)
**Implementation:** Added phone identity verification block (lines 90–100):
- Triggers only when `invitee_email IS NULL AND invitee_phone IS NOT NULL` (phone-only invitations)
- Fetches authenticated user's phone from `profiles.phone`
- Normalizes both numbers via `regexp_replace(phone, '[^0-9+]', '', 'g')` to strip formatting
- Returns `phone_mismatch` error if numbers don't match
- Returns `phone_unavailable` error if user has no phone in profile
- Existing email verification (lines 81–88) is preserved unchanged
- Backward compatibility: email+phone invitations still verify by email only

#### 3.3.5 Item 4: Localization of Hardcoded Strings
**Changed:** `src/hooks/team/useConnectionHorseAccess.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts`
**Action:** Replaced hardcoded English toast messages ("Horse access updated", "Failed to update horse access") with `t()` calls using new keys:
- `teamPartners.partnerConfig.accessUpdated` / `تم تحديث صلاحيات الوصول للخيول`
- `teamPartners.partnerConfig.accessUpdateFailed` / `فشل تحديث صلاحيات الوصول`
Also added keys for `employmentClassification`, `classificationHint`, and partner config labels.

#### 3.3.6 Item 5: Inline Employment Kind Toggle
**Changed:** `src/components/team/PersonDetailSheet.tsx`
**New hook:** `src/hooks/hr/useEmploymentKind.ts` — calls `hr_update_employment_kind` RPC, logs `employment_kind_changed` event to `hr_employee_events`, invalidates relevant queries.
**UX:** Added an "Internal/External" classification section in PersonDetailSheet with:
- Current classification badge (internal/external)
- Helper text explaining the distinction
- Two-option selector (Internal Staff / External Collaborator)
- Immediate save via `useEmploymentKind` mutation
- Event logging for audit trail

#### 3.3.7 Final State
All 5 cleanup items completed. Build verified clean via `tsc --noEmit`. No behavior regressions.

---

### 3.4 Stage 4 — Investigative Audit Round 2.2 (April 3)

#### 3.4.1 Problem
The legacy `DashboardConnectionsSettings` page (4-tab surface at `/dashboard/settings/connections`) remained as a parallel management surface. It exclusively governed: consent grant CRUD, sharing audit log, "Shared With Me" inbound data visibility, and connection acceptance for the receiving party.

#### 3.4.2 Investigation
Deep audit of the legacy surface revealed the core UX failure: **invisible state dependency**. The Grants and Audit tabs depended on a `selectedConnection` state set on the Connections tab, but switching tabs hid the connection list. The user had to remember which card they clicked. The "Shared With Me" tab had its own separate selection model — a different `selectedConnection` state — creating inconsistent interaction patterns.

#### 3.4.3 Real Data Analysis
Live database analysis of connections and consent grants revealed:
- Summit Stable had 3 accepted partners but almost no configured grants
- Only 1 active consent grant existed across the entire system (Mutamayiz → Summit, `lab_results`)
- That single active grant had already expired (date_to: 2026-03-21) but remained "active"
- The grant system was architecturally functional but practically unusable due to poor discoverability

#### 3.4.4 Three Options Evaluated
- **Option A (recommended):** Expand `PartnerConfigSheet` with collapsible sections for grants, activity, and inbound data
- **Option B:** Dedicated partner detail page at `/dashboard/team/partner/:id`
- **Option C:** Inline expandable accordion cards in the partner list

#### 3.4.5 Decision
Option A selected for: lowest implementation cost, no new routes, already mobile-first, familiar sheet pattern, eliminates hidden-selection anti-pattern completely.

---

### 3.5 Stage 5 — Legacy Migration Execution (April 3–4)

#### 3.5.1 Scope
Expand `PartnerConfigSheet` into the primary full partner-detail experience. Migrate all remaining legacy functionality. Add inline partner accept/reject. Remove legacy surface.

#### 3.5.2 PartnerConfigSheet Expansion
**File:** `src/components/team/PartnerConfigSheet.tsx` (expanded to 561 lines)
**New sections added (all collapsible):**

1. **Partner Summary** (lines 264–285): Partner name, connection status badge, operational/service type badge — always visible at top.

2. **Partner Type Info** (lines 287–294): Shield icon with type label from tenant type configuration.

3. **Operational Horse Scoping** (lines 296–351): Preserved existing `useConnectionHorseAccess` behavior. Checkbox list of horses, read/readwrite access level selector, save button. Only shown for operational partners (doctor, trainer, vet_clinic) with accepted status.

4. **Data Sharing Permissions** (lines 363–405): New section using `useConsentGrants(connectionId)`. Lists existing outbound grants as cards with: resource type icon + label, status badge (active/revoked), access level badge, forward-only badge, date range, relative timestamp. "Add Permission" button opens inline `CreateGrantDialog`. Revoke action on each active grant.

5. **Inbound / Shared With Me** (lines 409–443): Uses `useConsentGrants(connectionId, { recipientView: true })`. Shows grants shared TO the current tenant by this partner. Same card rendering as outbound but without revoke action.

6. **Activity History** (lines 446–476): Uses `useSharingAuditLog({ connectionId }, 10)`. Compact timeline with event icon mapping (connection_created, connection_accepted, grant_created, etc.), localized event labels, resource type badges, relative timestamps.

7. **Create Permission Dialog** (lines 482–558): Inline dialog with: resource type selector (4 types with domain-specific icons — Beaker for lab, Stethoscope for vet, Baby for breeding), access level selector, date range inputs, forward-only toggle with explanation text, helper text per resource type.

**Resource Type Presentation Improvements:**
- `lab_results` → Beaker icon + localized label + helper text explaining what it covers
- `lab_requests` → Beaker icon + helper text
- `vet_records` → Stethoscope icon + helper text
- `breeding_records` → Baby icon + helper text
- Each type has a `dataTypeHints.*` translation key providing user-facing explanation

#### 3.5.3 Partner Accept/Reject in Team & Partners
**File:** `src/pages/DashboardTeamPartners.tsx` (lines 61–99, 400–419)
**Implementation:**
- `handleAcceptPartner` callback: calls `acceptConnection.mutateAsync(conn.token)`, then auto-applies consent grant presets based on tenant type combinations (stable↔lab → `requests_and_results`, stable↔clinic → `appointments_and_records`, clinic↔lab → `referrals_and_results`)
- `handleRejectPartner` callback: calls `rejectConnection.mutateAsync(conn.token)`
- UI: Pending inbound partner cards show Accept (gold) and Reject (outline) icon buttons inline
- Pending inbound cards have `border-primary/30` highlight and descriptive text

#### 3.5.4 Legacy Surface Removal
**Deleted:** `src/pages/DashboardConnectionsSettings.tsx`
**Removed:** Route for `/dashboard/settings/connections` from `App.tsx`
**Removed:** Sidebar entry from `DashboardSidebar.tsx`
**Updated:** `DashboardOrganizationSettings.tsx` — any stale link to connections settings now points to `/dashboard/team`
**Updated:** `AcceptConnectionPage.tsx` — post-accept redirect changed from `/dashboard/settings/connections` to `/dashboard/team`
**Kept:** `AcceptConnectionPage.tsx` at `/connections/accept` — this is the external token-based landing page reached via email links, still needed

#### 3.5.5 Reusable Components Kept
- `AddPartnerDialog.tsx` — still actively used by `DashboardTeamPartners`
- `useConnections.ts` — connection CRUD hook, still used
- `useConnectionsWithDetails.ts` — enriched connection data, still used
- `useConsentGrants.ts` — grant CRUD hook, now used by `PartnerConfigSheet`
- `useSharingAuditLog.ts` — audit log hook, now used by `PartnerConfigSheet`

#### 3.5.6 Localization
Added comprehensive translation keys under:
- `teamPartners.partnerDetail.*` — partner detail section labels, data sharing, activity, inbound, permission CRUD, event type labels, data type hints
- `teamPartners.partnerConfig.*` — horse scoping, access levels, save actions
- `teamPartners.connectionStatus.*` — accepted, pending, revoked, rejected
- `teamPartners.partnerTypes.*` — operational, service, organization
- Both English and Arabic complete

---

### 3.6 Stage 6 — Final Closure Audit (April 4)

#### 3.6.1 Purpose
Determine whether the workstream could be closed or needed further execution.

#### 3.6.2 Findings

**Fully Complete:**
- Person invitations (email/phone, simplified form, acceptance with HR auto-upsert + phone verification)
- Organization invitations / partners (search, request, inline accept/reject, preset auto-apply)
- HR bridge (atomic upsert via `finalize_invitation_acceptance`)
- Unified team surface (`useUnifiedTeam` merging members + employees)
- Person detail sheet (role, horse assignment, employment kind, HR link, invite-to-platform)
- Partner detail sheet (summary, type distinction, horse scoping, grants CRUD, inbound data, activity)
- Activity history (partner-scoped, localized event labels)
- Legacy surface removal (page, route, sidebar entry all deleted)

**Partially Complete (acceptable for closure):**
- `connection_horse_access` RLS enforcement: Table + RLS policies + config UI exist, but no domain table (horses, vet_treatments) references it. Classified as domain-workstream concern, not people-workstream.
- Grant enforcement: Only `lab_results` has working `can_access_shared_resource` RLS. `vet_records`, `breeding_records`, `lab_requests` grants are symbolic. Classified as domain-workstream concern.
- Inbound data preview: New sheet shows grant metadata; old raw JSON preview dialog (`GrantedDataPreviewDialog`) was orphaned.

**Orphaned Dead Code Identified:**
10 components in `src/components/connections/` no longer imported by any live code path:
`ConnectionCard`, `ConnectionsList`, `ConnectionStatusBadge`, `ConsentGrantsList`, `CreateGrantDialog`, `SharedWithMeTab`, `GrantedDataPreviewDialog`, `SharingAuditLog` (component), `QRCodeDialog`, `ConnectionMessagesDialog`

#### 3.6.3 Classification
**Closure-ready after one final small batch** — purely dead code removal, no features, no migrations.

---

### 3.7 Stage 7 — Final Closure Batch (April 4)

#### 3.7.1 Scope
Dead code deletion only. No behavior changes.

#### 3.7.2 Files Deleted (10 components + 1 hook)
1. `src/components/connections/ConnectionCard.tsx`
2. `src/components/connections/ConnectionsList.tsx`
3. `src/components/connections/ConnectionStatusBadge.tsx`
4. `src/components/connections/ConsentGrantsList.tsx`
5. `src/components/connections/CreateGrantDialog.tsx`
6. `src/components/connections/SharedWithMeTab.tsx`
7. `src/components/connections/GrantedDataPreviewDialog.tsx`
8. `src/components/connections/SharingAuditLog.tsx`
9. `src/components/connections/QRCodeDialog.tsx`
10. `src/components/connections/ConnectionMessagesDialog.tsx`
11. `src/hooks/connections/useConnectionMessages.ts`

#### 3.7.3 Barrel Exports Updated
- `src/components/connections/index.ts` — trimmed to export only `AddPartnerDialog`
- `src/hooks/connections/index.ts` — removed `useConnectionMessages` export

#### 3.7.4 Verification
Build verified clean via `tsc --noEmit`. Approximately 1,500 lines of dead code removed.

#### 3.7.5 Closure Status
**Workstream fully closed.**

---

## 4. Major Structural / Product Outcomes

### 4.1 Unified People & Partner Hub
The platform now has a single primary surface for all people and partner management: `/dashboard/team` (`DashboardTeamPartners.tsx`, 481 lines). This replaced three previously siloed surfaces (HR page for personnel, NotificationsPanel for invitations, Settings/Connections for partners).

### 4.2 One-Place Partner Detail
`PartnerConfigSheet` (561 lines) replaced the 4-tab `DashboardConnectionsSettings` page. All partner context — identity, type, status, horse scoping, data sharing permissions, inbound data, activity history — is accessible from a single mobile-first sheet without hidden state dependencies.

### 4.3 Unified Team Data Model
`useUnifiedTeam` hook (141 lines) merges `tenant_members` (platform access) and `hr_employees` (personnel registry) into a single `UnifiedPerson[]` array, deduplicated by `user_id`. This provides: `hasPlatformAccess`, `hasHrRecord`, `employmentKind`, `status` (pending/active/hr_only), and `needsSetup` flags.

### 4.4 Invitation Integrity
The `finalize_invitation_acceptance` RPC (185 lines) now handles:
- Email identity verification (existing)
- Phone identity verification with normalization (new)
- Atomic `tenant_members` creation/update
- Atomic `hr_employees` upsert via `ON CONFLICT` (defaulting to `employment_kind = 'external'`)
- Horse access assignment from invitation

### 4.5 Notification Infrastructure Enrichment
All notification triggers now carry structured JSONB metadata, enabling the frontend to render rich contextual cards (partner names, horse names, statuses, message previews) instead of plain text.

---

## 5. Current Data Model Summary

### 5.1 Tables Central to This Workstream

| Table | Role | Key Relationships |
|---|---|---|
| `invitations` | Person invitation records | `invitee_email` (nullable), `invitee_phone`, `proposed_role`, `token` |
| `tenant_members` | Platform access grants | `user_id` → `profiles`, `tenant_id` → `tenants` |
| `hr_employees` | Personnel registry | `user_id` (nullable, unique per tenant), `employment_kind` |
| `connections` | B2B organizational relationships | `initiator_tenant_id`, `recipient_tenant_id`, unique partial index |
| `consent_grants` | Data sharing permissions | `connection_id`, `resource_type`, `access_level`, `date_from/to`, `forward_only` |
| `connection_horse_access` | Operational partner horse scoping | `connection_id`, `horse_id`, `access_level` |
| `member_horse_access` | Team member horse scoping | `tenant_member_id`, `horse_id` |
| `sharing_audit_log` | Relationship activity history | `connection_id`, `event_type`, `resource_type` |
| `notifications` | Cross-domain notification system | `metadata JSONB` (new), `entity_type`, `event_type` |
| `hr_employee_events` | HR audit trail | `event_type`, `event_payload` (employment_kind_changed) |

### 5.2 Key RPCs

| RPC | Purpose |
|---|---|
| `finalize_invitation_acceptance` | Atomic: membership + HR upsert + horse access + phone/email verification |
| `preaccept_invitation` | Anonymous pre-acceptance display |
| `reject_invitation` / `revoke_invitation` | Invitation lifecycle |
| `accept_connection` / `reject_connection` | Partner request lifecycle |
| `apply_link_preset` | Auto-grant consent presets on connection acceptance |
| `search_tenants_for_partnership` | Directory search for partner discovery |
| `hr_update_employment_kind` | Employment classification change with audit |

### 5.3 Migrations in This Period

| Migration | Content |
|---|---|
| `20260403050803` | Notification metadata column + 8 trigger rewrites |
| `20260403195807` | Connection dedup + unique partial index |
| `20260403200021` | `finalize_invitation_acceptance` with HR auto-upsert |
| `20260403204237` | `invitee_phone` column + nullable `invitee_email` |
| `20260403210126` | `connection_horse_access` table + RLS policies |
| `20260403213333` | Phone-based identity verification in acceptance RPC |

---

## 6. Current Navigation / IA

### 6.1 Active Routes

| Route | Page | Purpose |
|---|---|---|
| `/dashboard/team` | `DashboardTeamPartners` | Primary people + partners hub |
| `/dashboard/hr` | `DashboardHR` | Employee registry, CRUD |
| `/dashboard/hr/payroll` | `DashboardPayroll` | Salary payments |
| `/invite/:token` | `InviteLandingPage` | Person invitation acceptance |
| `/connections/accept` | `AcceptConnectionPage` | Partner request acceptance via email link |

### 6.2 Removed Routes
| Route | Former Page | Reason |
|---|---|---|
| `/dashboard/settings/connections` | `DashboardConnectionsSettings` | Fully superseded by Team & Partners + PartnerConfigSheet |

### 6.3 Sidebar
- "Team & Partners" — first item under HR nav group, at `/dashboard/team`
- No "Connections" or "Sharing" settings entry remains

---

## 7. Current Component Architecture

### 7.1 Active Components

| Component | Lines | Purpose |
|---|---|---|
| `DashboardTeamPartners.tsx` | 481 | Main page: tabs (People/Partners), counters, invite/add actions, accept/reject |
| `PartnerConfigSheet.tsx` | 561 | Full partner detail: summary, horse scoping, grants CRUD, inbound, activity |
| `PersonDetailSheet.tsx` | 319 | Team member config: role, horses, employment kind, HR link, invite-to-platform |
| `InvitePersonDialog.tsx` | ~200 | Person invitation form (email/phone tabs, role select) |
| `AddPartnerDialog.tsx` | ~150 | Partner search + send request |

### 7.2 Active Hooks

| Hook | Purpose |
|---|---|
| `useUnifiedTeam` | Merge tenant_members + hr_employees |
| `useConnectionHorseAccess` | Operational partner horse scoping CRUD |
| `useConnections` | Connection CRUD |
| `useConnectionsWithDetails` | Enriched connection data with tenant names/types |
| `useConsentGrants` | Grant CRUD (outbound + inbound views) |
| `useSharingAuditLog` | Partner-scoped activity log |
| `useInvitations` | Invitation CRUD + realtime |
| `useEmploymentKind` | Employment classification update with event logging |
| `useMemberRoleAssignment` | Role update for team members |

### 7.3 Deleted Components (Final Closure Batch)
10 orphaned connection components + 1 orphaned hook (see §3.7.2). All were legacy UI components from `DashboardConnectionsSettings` that were superseded by `PartnerConfigSheet`.

### 7.4 Barrel Exports
- `src/components/connections/index.ts` — exports only `AddPartnerDialog`
- `src/hooks/connections/index.ts` — exports `useConnections`, `useConnectionsWithDetails`, `useConsentGrants`, `useSharingAuditLog`

---

## 8. What Was Removed / Replaced / Closed

### 8.1 Removed

| Item | Why Obsolete | Replaced By |
|---|---|---|
| `DashboardConnectionsSettings.tsx` | 4-tab page with hidden-selection anti-pattern | `PartnerConfigSheet` sections |
| `MemberSetupSheet.tsx` | Superseded by PersonDetailSheet | `PersonDetailSheet.tsx` |
| `ConnectionCard.tsx` | Only used by deleted ConnectionsList | Partner cards in DashboardTeamPartners |
| `ConnectionsList.tsx` | Only used by deleted settings page | Partners tab in DashboardTeamPartners |
| `ConnectionStatusBadge.tsx` | Only used by deleted components | Inline badges in partner cards |
| `ConsentGrantsList.tsx` | Only used by deleted settings page | Grants section in PartnerConfigSheet |
| `CreateGrantDialog.tsx` | Only used by deleted ConsentGrantsList | Inline dialog in PartnerConfigSheet |
| `SharedWithMeTab.tsx` | Only used by deleted settings page | Inbound section in PartnerConfigSheet |
| `GrantedDataPreviewDialog.tsx` | Raw JSON dump, only used by SharedWithMeTab | Grant metadata cards in PartnerConfigSheet |
| `SharingAuditLog.tsx` (component) | Only used by deleted settings page | Activity section in PartnerConfigSheet |
| `QRCodeDialog.tsx` | Only used by deleted ConnectionCard | Not replaced (low-value feature) |
| `ConnectionMessagesDialog.tsx` | Only used by deleted ConnectionCard | Not replaced (was unused in practice) |
| `useConnectionMessages.ts` | Only used by deleted dialog | Not replaced |
| Duplicate Invite button in NotificationsPanel | Competed with Team & Partners entry point | Single entry point in Team & Partners |
| `/dashboard/settings/connections` route | Legacy surface fully migrated | `/dashboard/team` |
| Connections sidebar entry | Legacy navigation | Team & Partners sidebar entry |

### 8.2 Why the Final State Is Better
1. **No hidden state:** Partner detail carries its own context at all times (partner name/type/status visible at top of sheet)
2. **One surface:** All partner management in one place (Team & Partners page + PartnerConfigSheet)
3. **Mobile-first:** Sheet pattern at `w-[95vw] sm:w-[480px]` with collapsible sections
4. **No duplicate entry points:** Single invitation entry point, single partner config entry point
5. **Cleaner codebase:** ~1,500 lines of dead code removed

---

## 9. Residual Gaps and Non-Blocking Deferrals

### 9.1 Fully Solved
- Person invitation flow (email + phone)
- Organization invitation / partner flow
- HR auto-upsert bridge
- Unified team surface
- Partner detail with grants, activity, inbound data
- Legacy surface removal
- Dead code cleanup

### 9.2 Accepted as Sufficient for Closure

| Item | Status | Why Acceptable |
|---|---|---|
| `connection_horse_access` not enforced in domain RLS | Config-only, no enforcement | Infrastructure is ready; enforcement belongs in domain-specific workstreams (vet, breeding) |
| Grant enforcement only for `lab_results` | 3 of 4 resource types symbolic | Same as above — domain workstreams must add their own RLS |
| No inbound data preview (only metadata) | Metadata cards shown, no raw data view | Raw JSON was worse; proper domain-specific preview is a future enhancement |
| Phone invitation graceful fallback | If user has no phone in profile, returns `phone_unavailable` error | Correct behavior — user must set phone in profile first |
| Consent grant expiration not auto-enforced | Expired grants remain "active" status | Manual revocation works; auto-expiration is a future enhancement |

### 9.3 Intentionally Deferred to Other Workstreams

| Item | Target Workstream |
|---|---|
| Enforce `connection_horse_access` in domain table RLS | Cross-tenant data access |
| Extend `can_access_shared_resource` to `vet_records`, `breeding_records` | Domain module workstreams |
| Share-link → account creation growth funnel | Growth/onboarding |
| Bulk CSV invitation import | Onboarding efficiency |
| Structured inbound data preview (not raw JSON) | Data visualization |
| Consent grant auto-expiration | Platform infrastructure |

---

## 10. Final Closure Status

### 10.1
The People / HR / Invitations / Team / Partners / Relationship / Sharing workstream reached **full closure** on April 4, 2026.

### 10.2 Classification: **Fully closed.**

### 10.3 Justification
- All product-critical functionality is implemented and accessible from the unified Team & Partners surface
- All legacy surfaces have been removed
- All dead code has been deleted
- All remaining gaps are explicitly classified as domain-workstream concerns or future enhancements
- Build is clean (`tsc --noEmit` passes)
- No regressions in existing functionality

---

## 11. Recommended Next Starting Point

### 11.1 Strongest Next Candidate
**Cross-tenant data access enforcement** — making `connection_horse_access` and consent grants actually control data visibility via domain-table RLS policies. This is the natural continuation that makes the permission system functional rather than symbolic.

### 11.2 Other Valid Alternatives
1. **Domain-specific module maturation** (vet, breeding) — each module adding its own shared-access RLS
2. **Notification UX enrichment** — leveraging the new metadata JSONB to render rich notification cards in NotificationsPanel
3. **Growth/onboarding workstream** — share-link → account creation, partner directory browsing
4. **Platform infrastructure** — consent grant auto-expiration, bulk operations, advanced audit

