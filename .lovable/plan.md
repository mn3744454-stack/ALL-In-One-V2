Stable Horse Ecosystem QA / UAT Report — Final Corrective Pass

## 1. Executive Verdict

Ready with important issues.

The architecture is sound and the data flow design is correct. However, there are critical runtime defects, permission wiring gaps, and operational consistency gaps that must be fixed before production sign-off.

---

## 2. What Was Validated Successfully

| Area | Status | Evidence |

|------|--------|----------|

| Admission lifecycle state machine | Correct | `draft → active → checkout_pending → checked_out` enforced in code with guards |

| Draft-then-promote check-in consistency | Correct | Movement failure causes rollback of draft admission |

| Checkout fail-and-hold consistency | Correct | Movement failure leaves record in `checkout_pending` |

| Duplicate admission blocking | Correct | Existing active/draft/checkout_pending checked before insert |

| Status history tracking | Correct | Transitions logged to `boarding_status_history` |

| Admission checks computation | Correct | Centralized and recomputed on create/update |

| Plan selection + prefill in wizard | Correct | Prefills rate/cycle/currency from selected plan |

| Plan snapshot independence | Correct | Admission stores snapshotted values, not dynamic references |

| Billing link FK integrity | Correct | Fake placeholder billing links removed |

| Financial review zero-state | Correct | Returns zeros when no billing links exist |

| Housing tabs + routing | Correct | Tabs + URL search params + mobile nav present |

| Horse Profile admission card | Correct | Active admission summary visible |

| Dashboard widgets | Correct | Live stat widgets implemented |

| Checkout dialog two-step flow | Correct | Initiate vs confirm behavior present |

---

## 3. Defects Found

### D1: `horse_care_notes.title` is NOT NULL but code inserts NULL

- **Severity**: Critical

- **Area**: Care Notes

- **What happens**: The DB schema defines `title text NOT NULL`, while the code still sends `title: data.title || null`.

- **Why it matters**: Care note creation fails whenever title is omitted, even though UI marks title as optional.

- **Required fix**: Either:

  - change the DDL to allow NULL or default `''`

  - or change code to always send `title: data.title || ''`

---

### D2: Boarding permissions are defined but not actually wired into the existing RBAC role/bundle structure

- **Severity**: Critical

- **Area**: Permissions / RLS

- **What happens**: `boarding.admission.*` permission definitions exist, and RLS depends on permission checks, but the report indicates there is no actual role/bundle assignment for those permissions.

- **Why it matters**: Managers/staff may be fully blocked from boarding operations, and possibly even more roles depending on current RBAC configuration.

- **Required fix**: Add a migration that wires the boarding permissions into the **existing RBAC structure actually used by the project** (for example via `tenant_role_permissions`, `tenant_role_bundles`, `bundle_permissions`, or equivalent current schema — do not invent a new table name if it does not exist).

- At minimum, ensure:

  - owner has full boarding permissions

  - manager has create/view/update/checkout

  - lower roles only get what is intended

---

### D3: No UI-level permission gates in housing components

- **Severity**: High

- **Area**: Permissions / UX

- **What happens**: Action buttons appear even for users who may not actually have permission.

- **Why it matters**: Users see actions they cannot perform and then hit permission errors.

- **Required fix**: Add UI gating using the project’s existing permission-checking pattern `usePermissions`, `hasPermission`, `PermissionGuard`, or equivalent).

- At minimum gate:

  - New Admission

  - Admission edit/update actions

  - Initiate checkout

  - Confirm checkout

  - Service plan management

  - Care note destructive/edit actions where applicable

---

### D4: Realtime sync missing for boarding tables

- **Severity**: High

- **Area**: Realtime / UX

- **What happens**: Boarding-related updates do not appear live across tabs/users.

- **Why it matters**: Operational workflows become stale and inconsistent with the rest of the platform’s realtime behavior.

- **Required fix**:

  - add new boarding tables to the realtime publication where needed

  - add them to the project’s realtime sync mapping / invalidation strategy

---

### D5: Admission update mutation appears too permissive for terminal states

- **Severity**: High

- **Area**: Admissions Integrity

- **What happens**: `updateAdmission` appears able to update admissions without clearly restricting `checked_out` / `cancelled` states.

- **Why it matters**: Closed admissions should not remain broadly editable.

- **Required fix**:

  - explicitly block or tightly scope updates when admission is `checked_out`

  - define whether `checkout_pending` is editable and which fields remain editable

  - define terminal-state rules clearly in code

---

### D6: Transfer during active admission does not sync admission housing fields

- **Severity**: High

- **Area**: Data Integrity

- **What happens**: When a horse moves between units/areas during an active admission, `boarding_admissions.unit_id` and `area_id` may remain stale.

- **Why it matters**: Admission Detail can show outdated housing assignment, which is an operational data integrity issue, not just a design preference.

- **Required fix**:

  - when transfer happens during an active admission, update the active admission’s housing fields

  - or explicitly define a stronger source of truth and render from that consistently

- This must not remain a future design placeholder.

---

### D7: Potential RLS policy overlap/conflict on `horse_care_notes`

- **Severity**: Medium

- **Area**: RLS

- **What happens**: The report suggests multiple UPDATE policies may exist, and permissive OR behavior could weaken the intended stricter authorship rule.

- **Why it matters**: A weaker older policy could bypass the stricter new one.

- **Required fix**:

  - audit existing UPDATE policies on `horse_care_notes`

  - remove/replace any conflicting older UPDATE policies

  - ensure the final effective policy matches the intended authorship restriction

---

### D8: Locale-aware formatting is incomplete

- **Severity**: Medium

- **Area**: i18n / UX

- **What happens**: Date formatting and some raw labels still appear English-style in Arabic mode.

- **Why it matters**: UI becomes partially bilingual in an inconsistent way.

- **Required fix**:

  - use locale-aware date formatting

  - translate raw `plan_type` / `billing_cycle` display values

  - verify Arabic mode visually across housing/admissions/plans

---

### D9: No confirmation before soft-deleting care notes

- **Severity**: Medium

- **Area**: UX

- **What happens**: Delete action can occur too quickly without confirmation.

- **Why it matters**: Easy accidental note deletion.

- **Required fix**: Add confirmation dialog before delete/deactivate.

---

### D10: `boarding_status_history` does not record initial `null → draft`

- **Severity**: Low

- **Area**: Audit Completeness

- **What happens**: History starts at `draft → active` and misses the initial creation state.

- **Why it matters**: Audit trail is slightly incomplete.

- **Required fix**: Insert initial creation history entry if full audit completeness is desired.

---

## 4. Edge Cases and Risk Areas

| Scenario | Risk |

|----------|------|

| No active branches | User may get stuck in wizard without clear guidance |

| No units in selected branch | Housing step may feel incomplete or confusing |

| Cancellation flow | `cancelled` exists conceptually but needs clear implementation/status rule |

| Multiple concurrent admission attempts | Race risk remains possible |

| Checkout override permission | Defined but must be verified/enforced in actual flow |

| Transfer during active admission | Must sync admission housing fields |

| Terminal-state edits | Must be blocked or narrowly scoped |

---

## 5. Permissions / RLS Findings

| Finding | Severity |

|---------|----------|

| Boarding permissions must be wired into the project’s actual RBAC schema | Critical |

| No UI permission guards yet | High |

| `boarding.checkout.override_balance` must be verified in actual checkout logic | Medium |

| `stable_service_plans` permission style should remain consistent with project RBAC conventions | Low |

| Care note UPDATE policy overlap must be resolved explicitly | Medium |

---

## 6. UX / i18n / Mobile Findings

| Finding | Severity |

|---------|----------|

| Mobile housing bottom nav is dense with 5 items | Low |

| Arabic date/month formatting still needs verification and likely adjustment | Medium |

| Raw plan labels need translation polish | Medium |

| No delete confirmation on care notes | Medium |

| Wizard mobile presentation is otherwise acceptable | OK |

---

## 7. Data Integrity Findings

| Area | Finding |

|------|---------|

| Admission ↔ Movement | Good |

| Admission ↔ Housing on check-in/out | Good |

| Transfer ↔ active admission sync | Must be fixed |

| Billing links | Correct after removing placeholders |

| Care note authorship | Good direction, but final RLS must be cleaned up |

| Plan snapshot behavior | Good |

---

## 8. Regression Findings

| Area | Status |

|------|--------|

| Horse Profile | No major regression observed |

| Movement module | No major regression observed |

| Finance display | No major regression observed |

| Navigation | No major regression observed |

| i18n | No major regression, but still needs polish |

| Mobile layout | No major regression observed |

---

## 9. Final Fix List Before Sign-Off

### P0 (Must fix immediately)

1. Fix `horse_care_notes.title` NOT NULL mismatch

2. Wire boarding permissions into the project’s real RBAC role/bundle structure

### P1 (Must fix before approval)

3. Add UI-level permission gates for housing/admission/plan actions

4. Add boarding tables to realtime publication + realtime sync mapping

5. Restrict admission updates for terminal states `checked_out`, etc.)

6. Fix transfer ↔ active admission housing sync

7. Verify and clean up `horse_care_notes` UPDATE RLS policy overlap

### P2 (Should fix before production if possible)

8. Add delete confirmation for care notes

9. Translate raw plan labels and improve Arabic date formatting

10. Verify `boarding.checkout.override_balance` behavior in the actual checkout flow

### P3 (Nice to complete)

11. Add `null → draft` initial status history entry

12. Define/implement cancellation flow more explicitly

---

## 10. Final Recommendation

Approve only after P0 and P1 fixes are completed.

Do not treat this as final production sign-off yet.

After the above fixes, the implementation should be considered production-ready for the agreed scope.

---

## 11. Required Next Step

Implement the P0 and P1 fixes above, then return a concise completion report with:

1. Exact files/migrations changed

2. How boarding permissions were wired into the real RBAC structure

3. How UI permission gating was added

4. How transfer now updates the active admission housing fields

5. How terminal-state admission edits are restricted

6. How care note title mismatch was fixed

7. How the `horse_care_notes` UPDATE policy conflict was resolved

8. How realtime was added for the new tables

9. Final statement: whether the system is now ready for sign-off