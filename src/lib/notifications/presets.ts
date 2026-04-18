/**
 * Phase 3 — Personal notification presets.
 *
 * A preset is a *starting point*: it sets a delivery level for every family
 * at once. Users can then refine per-family afterwards (which switches them
 * into the "custom" preset). This is intentionally a personal/individual
 * layer — no organization governance, no role-binding (Phase 4 territory).
 *
 * Delivery levels:
 *   - "all"       → every event in the family
 *   - "important" → only events the family registry tags as warning/critical
 *   - "critical"  → only critical
 *   - "off"       → suppress entirely
 *
 * The actual *runtime suppression* of a notification (e.g. should we ring
 * the bell sound, should we push, should we drop it from the bell list)
 * is handled by readers of these preferences. Phase 3 stores the intent;
 * channel-level enforcement on push remains in the existing per-category
 * push toggles, which keep working unchanged.
 */

import type { NotificationFamily } from "@/lib/notifications/routeDescriptor";
import type { NotificationSeverity } from "@/lib/notifications/familyRegistry";

export type DeliveryLevel = "all" | "important" | "critical" | "off";

export type PresetId =
  | "all"
  | "leadership"
  | "billing"
  | "lab"
  | "operations"
  | "minimal"
  | "custom";

export interface FamilyPreference {
  level: DeliveryLevel;
}

export type FamilyPreferencesMap = Partial<
  Record<NotificationFamily, FamilyPreference>
>;

/**
 * The user-controllable families surfaced in the personal control center.
 * Kept in sync with familyRegistry.ts. "generic" is intentionally excluded —
 * it's a fallback bucket, not a user-meaningful family to toggle.
 */
export const CONTROLLABLE_FAMILIES: NotificationFamily[] = [
  "connection",
  "lab_request",
  "boarding",
  "movement",
];

interface PresetConfig {
  id: PresetId;
  /** i18n key under `notifications.presets.*.label` */
  labelKey: string;
  /** i18n key under `notifications.presets.*.description` */
  descriptionKey: string;
  /** Per-family delivery level this preset applies. */
  familyLevels: Record<NotificationFamily, DeliveryLevel>;
}

const lvl = (
  connection: DeliveryLevel,
  lab_request: DeliveryLevel,
  boarding: DeliveryLevel,
  movement: DeliveryLevel,
): Record<NotificationFamily, DeliveryLevel> => ({
  connection,
  lab_request,
  boarding,
  movement,
  generic: "all",
});

const PRESET_CONFIGS: Record<Exclude<PresetId, "custom">, PresetConfig> = {
  all: {
    id: "all",
    labelKey: "notifications.presets.all.label",
    descriptionKey: "notifications.presets.all.description",
    // Founder/bootstrap default — everything on.
    familyLevels: lvl("all", "all", "all", "all"),
  },
  leadership: {
    id: "leadership",
    labelKey: "notifications.presets.leadership.label",
    descriptionKey: "notifications.presets.leadership.description",
    // Cross-cutting, important-only on operational families.
    familyLevels: lvl("all", "important", "important", "important"),
  },
  finance: {
    id: "finance",
    labelKey: "notifications.presets.finance.label",
    descriptionKey: "notifications.presets.finance.description",
    // No dedicated finance family yet → emphasize partnerships + boarding billing
    // signals, mute clinical chatter.
    familyLevels: lvl("all", "off", "important", "off"),
  },
  lab: {
    id: "lab",
    labelKey: "notifications.presets.lab.label",
    descriptionKey: "notifications.presets.lab.description",
    familyLevels: lvl("important", "all", "off", "off"),
  },
  operations: {
    id: "operations",
    labelKey: "notifications.presets.operations.label",
    descriptionKey: "notifications.presets.operations.description",
    // Day-to-day stable floor: movements + admissions front-and-center.
    familyLevels: lvl("important", "important", "all", "all"),
  },
  minimal: {
    id: "minimal",
    labelKey: "notifications.presets.minimal.label",
    descriptionKey: "notifications.presets.minimal.description",
    familyLevels: lvl("critical", "critical", "critical", "critical"),
  },
};

export const PRESET_ORDER: PresetId[] = [
  "all",
  "leadership",
  "operations",
  "lab",
  "finance",
  "minimal",
  "custom",
];

export function getPresetConfig(id: PresetId): PresetConfig | null {
  if (id === "custom") return null;
  return PRESET_CONFIGS[id];
}

/**
 * Apply a preset → produce the family_preferences JSON to persist.
 * For "custom", returns null: caller should keep the existing per-family map.
 */
export function applyPreset(
  id: PresetId,
): FamilyPreferencesMap | null {
  if (id === "custom") return null;
  const cfg = PRESET_CONFIGS[id];
  const out: FamilyPreferencesMap = {};
  (Object.keys(cfg.familyLevels) as NotificationFamily[]).forEach((fam) => {
    out[fam] = { level: cfg.familyLevels[fam] };
  });
  return out;
}

/**
 * Resolve the effective delivery level for a family, given the stored map.
 * Defaults to "all" so legacy users who pre-date Phase 3 keep receiving
 * everything (matches the founder/bootstrap intent).
 */
export function getFamilyLevel(
  map: FamilyPreferencesMap | null | undefined,
  family: NotificationFamily,
): DeliveryLevel {
  return map?.[family]?.level ?? "all";
}

/**
 * Should an event of this severity be delivered under the given level?
 * Used by readers (bell, sound, push gate) to enforce personal preferences.
 */
export function shouldDeliver(
  level: DeliveryLevel,
  severity: NotificationSeverity,
): boolean {
  if (level === "off") return false;
  if (level === "all") return true;
  if (level === "important") {
    return severity === "warning" || severity === "critical";
  }
  // "critical"
  return severity === "critical";
}

/**
 * Detect whether the given map matches a known preset exactly. If yes,
 * returns that preset id; otherwise "custom". Used after a per-family edit.
 */
export function detectPreset(map: FamilyPreferencesMap): PresetId {
  for (const id of Object.keys(PRESET_CONFIGS) as Array<
    Exclude<PresetId, "custom">
  >) {
    const cfg = PRESET_CONFIGS[id];
    const matches = (Object.keys(cfg.familyLevels) as NotificationFamily[])
      .every((fam) => (map[fam]?.level ?? "all") === cfg.familyLevels[fam]);
    if (matches) return id;
  }
  return "custom";
}
