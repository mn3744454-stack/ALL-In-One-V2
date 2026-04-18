/**
 * Phase 3 — Personal Notification Control Center.
 *
 * Two stacked sections:
 *   1. Starting preset (radio-card grid) — applies a full per-family map at once.
 *   2. Per-area control (one row per family with a Select for delivery level).
 *
 * Editing any family row switches the active preset to "custom" automatically
 * (detected via detectPreset). Picking a non-custom preset rewrites the
 * per-family map on the spot.
 *
 * Pure presentation + persistence. No governance, no role-binding, no admin —
 * Phase 4 territory.
 */

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import {
  CONTROLLABLE_FAMILIES,
  PRESET_ORDER,
  applyPreset,
  detectPreset,
  getFamilyLevel,
  type DeliveryLevel,
  type PresetId,
  type FamilyPreferencesMap,
} from "@/lib/notifications/presets";
import {
  getFamilyConfigByName,
  SEVERITY_STYLES,
} from "@/lib/notifications/familyRegistry";
import type { NotificationFamily } from "@/lib/notifications/routeDescriptor";

const LEVELS: DeliveryLevel[] = ["all", "important", "critical", "off"];

export function NotificationControlCenter() {
  const { t } = useI18n();
  const { preferences, updatePreferences, isSaving } =
    useNotificationPreferences();

  const currentPreset: PresetId =
    (preferences.preset as PresetId) ?? "all";
  const familyMap: FamilyPreferencesMap =
    preferences.family_preferences ?? {};

  const handlePresetSelect = async (id: PresetId) => {
    if (id === "custom") return; // custom is observed, not chosen
    const map = applyPreset(id);
    if (!map) return;
    try {
      await updatePreferences({
        preset: id,
        family_preferences: map,
      } as any);
      toast.success(t("notifications.controlCenter.presetApplied"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleFamilyChange = async (
    family: NotificationFamily,
    level: DeliveryLevel,
  ) => {
    const next: FamilyPreferencesMap = {
      ...familyMap,
      [family]: { level },
    };
    const detected = detectPreset(next);
    try {
      await updatePreferences({
        preset: detected,
        family_preferences: next,
      } as any);
      if (detected === "custom" && currentPreset !== "custom") {
        toast.success(t("notifications.controlCenter.switchedToCustom"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="space-y-6">
      <PresetSection
        currentPreset={currentPreset}
        onSelect={handlePresetSelect}
        disabled={isSaving}
      />
      <FamilySection
        familyMap={familyMap}
        onChange={handleFamilyChange}
        disabled={isSaving}
      />
    </div>
  );
}

/* ---------- Preset section ---------- */

function PresetSection({
  currentPreset,
  onSelect,
  disabled,
}: {
  currentPreset: PresetId;
  onSelect: (id: PresetId) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {t("notifications.controlCenter.presetSection")}
        </CardTitle>
        <CardDescription>
          {t("notifications.controlCenter.presetSectionDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESET_ORDER.map((id) => {
            const isActive = id === currentPreset;
            const isCustom = id === "custom";
            return (
              <button
                key={id}
                type="button"
                disabled={disabled || isCustom}
                onClick={() => onSelect(id)}
                className={cn(
                  "text-start rounded-lg border p-4 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40",
                  isCustom && !isActive && "opacity-60 cursor-not-allowed",
                  disabled && "pointer-events-none opacity-70",
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <span className="font-medium text-sm text-foreground">
                    {t(`notifications.presets.${id}.label` as any)}
                  </span>
                  {isActive && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/15 text-primary border-primary/20 gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {t("notifications.controlCenter.activePreset")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`notifications.presets.${id}.description` as any)}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Family section ---------- */

function FamilySection({
  familyMap,
  onChange,
  disabled,
}: {
  familyMap: FamilyPreferencesMap;
  onChange: (family: NotificationFamily, level: DeliveryLevel) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  const rows = useMemo(
    () =>
      CONTROLLABLE_FAMILIES.map((family) => {
        const cfg = getFamilyConfigByName(family);
        const sev = SEVERITY_STYLES[cfg.defaultSeverity];
        return { family, cfg, sev };
      }),
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("notifications.controlCenter.familySection")}
        </CardTitle>
        <CardDescription>
          {t("notifications.controlCenter.familySectionDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ family, cfg, sev }) => {
          const Icon = cfg.icon;
          const level = getFamilyLevel(familyMap, family);
          return (
            <div
              key={family}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    sev.iconBg,
                  )}
                >
                  <Icon className={cn("w-4 h-4", sev.iconFg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <Label className="text-sm font-medium text-foreground block truncate">
                    {t(cfg.labelKey as any)}
                  </Label>
                  <p className="text-xs text-muted-foreground truncate">
                    {t(`notifications.levels.${level}Desc` as any)}
                  </p>
                </div>
              </div>
              <Select
                value={level}
                onValueChange={(v) => onChange(family, v as DeliveryLevel)}
                disabled={disabled}
              >
                <SelectTrigger className="w-[160px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {t(`notifications.levels.${lvl}` as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default NotificationControlCenter;
