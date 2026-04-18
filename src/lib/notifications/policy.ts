/**
 * Phase 4 — Notification governance policy resolver.
 *
 * The platform has four layers of notification policy. This module owns the
 * precedence and gives readers (bell list, sound gate, push gate) a single
 * function to ask: "given this notification + this user's prefs + this org's
 * governance, should it be delivered, and at what level?".
 *
 * Precedence (highest authority first when computing the final delivery gate):
 *
 *   1. Platform floor       — hardcoded, never silenceable
 *                            (e.g. critical incoming-movement events always go
 *                             through; left intentionally minimal in Phase 4).
 *   2. Org governance       — per-tenant `family_floor` + `suppress_self_actions`
 *                            + `escalate_critical_to_leadership`. The floor is
 *                            a *minimum*: org cannot be louder than user wants
 *                            for an area, but the user cannot be quieter than
 *                            the org's floor for that area either.
 *   3. Preset / default     — Phase 3 personal preset (or org default for new
 *                            members; binding at apply-time, not enforce-time).
 *   4. Personal preference  — Phase 3 per-family `family_preferences` map.
 *
 * What this module does NOT do:
 *   - It does not decide *who* gets a notification (that's the trigger layer).
 *   - It does not write anything; it's pure resolution.
 *   - It does not understand role-strings as policy truth (per the Phase 4
 *     investigative conclusion); escalation is governed by an explicit boolean,
 *     not by hardcoded role names.
 */

import type { NotificationFamily } from "@/lib/notifications/routeDescriptor";
import type { NotificationSeverity } from "@/lib/notifications/familyRegistry";
import {
  getFamilyLevel,
  shouldDeliver,
  type DeliveryLevel,
  type FamilyPreferencesMap,
} from "@/lib/notifications/presets";

/** Strictness ordering — higher = quieter. */
const LEVEL_RANK: Record<DeliveryLevel, number> = {
  all: 0,
  important: 1,
  critical: 2,
  off: 3,
};

/** Pick the louder (less strict) of two levels. */
function louder(a: DeliveryLevel, b: DeliveryLevel): DeliveryLevel {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

/** Pick the quieter (stricter) of two levels. */
function quieter(a: DeliveryLevel, b: DeliveryLevel): DeliveryLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

/** Org governance shape — mirrors `tenant_notification_governance`. */
export interface TenantGovernance {
  default_preset: string;
  /** family → minimum DeliveryLevel the org enforces. */
  family_floor: Partial<Record<NotificationFamily, DeliveryLevel>>;
  suppress_self_actions: boolean;
  escalate_critical_to_leadership: boolean;
}

export const DEFAULT_GOVERNANCE: TenantGovernance = {
  default_preset: "all",
  family_floor: {},
  suppress_self_actions: true,
  escalate_critical_to_leadership: true,
};

export interface PolicyContext {
  family: NotificationFamily;
  severity: NotificationSeverity;
  /** The signed-in user we are evaluating delivery for. */
  viewerUserId: string | null | undefined;
  /** Who triggered the underlying event. May be null for system events. */
  actorUserId: string | null | undefined;
  /** Viewer's role in this tenant — used only for the escalation rule. */
  viewerIsLeadership: boolean;
  preferences: FamilyPreferencesMap | null | undefined;
  governance: TenantGovernance;
}

export interface PolicyDecision {
  deliver: boolean;
  /** The effective level used for the decision (after floor + escalation). */
  effectiveLevel: DeliveryLevel;
  /** Why we suppressed (or null if delivered). Useful for debugging/UI hints. */
  suppressedReason:
    | null
    | "self_action"
    | "personal_preference"
    | "org_floor_off";
}

/**
 * Resolve final delivery for a single notification.
 *
 * The flow:
 *   a) Self-action suppression (if org enabled and viewer == actor) → drop.
 *   b) Personal level for this family.
 *   c) Org floor: the floor is a *minimum*; the effective level is the
 *      stricter of (personal, floor) — i.e. the user cannot drop below the
 *      org's chosen minimum for that area.
 *      → Subtle point: if floor is "important" and user is "all", effective
 *        is still "all" (louder). If user is "off" and floor is "important",
 *        effective becomes "important" (org wins to enforce its floor).
 *   d) Escalation: if the event is critical and org has escalation on, leaders
 *      always receive it regardless of personal preference.
 *   e) shouldDeliver(effective, severity).
 */
export function resolveDelivery(ctx: PolicyContext): PolicyDecision {
  // (a) Self-action suppression
  if (
    ctx.governance.suppress_self_actions &&
    ctx.actorUserId &&
    ctx.viewerUserId &&
    ctx.actorUserId === ctx.viewerUserId
  ) {
    return {
      deliver: false,
      effectiveLevel: "off",
      suppressedReason: "self_action",
    };
  }

  // (b) Personal
  const personal = getFamilyLevel(ctx.preferences ?? {}, ctx.family);

  // (c) Org floor
  const floor = ctx.governance.family_floor[ctx.family];
  // Floor of "off" is a hard org-level mute for that area.
  if (floor === "off") {
    return {
      deliver: false,
      effectiveLevel: "off",
      suppressedReason: "org_floor_off",
    };
  }
  // Otherwise floor enforces a minimum loudness: effective = louder(personal, floor)
  // (louder = less strict, so user can't go quieter than the org floor).
  const enforced: DeliveryLevel = floor
    ? louder(personal, floor)
    : personal;

  // (d) Escalation: leadership always gets criticals when org enabled.
  let effective = enforced;
  if (
    ctx.governance.escalate_critical_to_leadership &&
    ctx.severity === "critical" &&
    ctx.viewerIsLeadership
  ) {
    effective = louder(effective, "critical");
  }

  // (e) Final gate
  const deliver = shouldDeliver(effective, ctx.severity);
  return {
    deliver,
    effectiveLevel: effective,
    suppressedReason: deliver ? null : "personal_preference",
  };
}

/** Convenience: just the boolean. */
export function shouldDeliverWithPolicy(ctx: PolicyContext): boolean {
  return resolveDelivery(ctx).deliver;
}

export { quieter, louder };
