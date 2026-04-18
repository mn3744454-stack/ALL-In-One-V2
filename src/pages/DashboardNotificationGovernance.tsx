/**
 * Phase 4 — Organization-level notification governance page.
 * Owner/manager only. Sets default preset, per-family floor, self-suppression,
 * and critical escalation to leadership.
 */

import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Sparkles, Layers } from "lucide-react";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantNotificationGovernance } from "@/hooks/useTenantNotificationGovernance";
import {
  CONTROLLABLE_FAMILIES,
  PRESET_ORDER,
  type DeliveryLevel,
} from "@/lib/notifications/presets";
import {
  getFamilyConfigByName,
  SEVERITY_STYLES,
} from "@/lib/notifications/familyRegistry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TenantGovernance } from "@/lib/notifications/policy";
import { RolePresetBindingsSection } from "@/components/notifications/RolePresetBindingsSection";

const FLOOR_LEVELS: Array<DeliveryLevel | "none"> = [
  "none",
  "important",
  "critical",
  "off",
];

export default function DashboardNotificationGovernance() {
  const { t } = useI18n();
  const { activeRole } = useTenant();
  const { governance, isLoading, update, isSaving } =
    useTenantNotificationGovernance();
  const canManage = activeRole === "owner" || activeRole === "manager";

  const save = async (next: TenantGovernance) => {
    try {
      await update(next);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const setFloor = (family: string, value: string) => {
    const next = { ...governance.family_floor };
    if (value === "none") delete (next as Record<string, unknown>)[family];
    else (next as Record<string, DeliveryLevel>)[family] = value as DeliveryLevel;
    save({ ...governance, family_floor: next });
  };

  return (
    <DashboardShell>
      <MobilePageHeader
        title={t("notifications.governance.title")}
        backTo="/dashboard/settings"
      />
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("notifications.governance.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("notifications.governance.description")}
            </p>
          </div>
        </div>

        {!canManage && (
          <Alert>
            <AlertDescription>
              {t("notifications.governance.readOnlyNotice")}
            </AlertDescription>
          </Alert>
        )}

        {/* Default preset for new members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("notifications.governance.defaultPresetTitle")}
            </CardTitle>
            <CardDescription>
              {t("notifications.governance.defaultPresetDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={governance.default_preset}
              onValueChange={(v) => save({ ...governance, default_preset: v })}
              disabled={!canManage || isSaving || isLoading}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_ORDER.filter((p) => p !== "custom").map((id) => (
                  <SelectItem key={id} value={id}>
                    {t(`notifications.presets.${id}.label` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Per-family floor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {t("notifications.governance.floorTitle")}
            </CardTitle>
            <CardDescription>
              {t("notifications.governance.floorDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONTROLLABLE_FAMILIES.map((family) => {
              const cfg = getFamilyConfigByName(family);
              const sev = SEVERITY_STYLES[cfg.defaultSeverity];
              const Icon = cfg.icon;
              const current =
                (governance.family_floor as Record<string, DeliveryLevel>)[
                  family
                ] ?? "none";
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
                    <Label className="text-sm font-medium text-foreground truncate">
                      {t(cfg.labelKey as never)}
                    </Label>
                  </div>
                  <Select
                    value={current as string}
                    onValueChange={(v) => setFloor(family, v)}
                    disabled={!canManage || isSaving || isLoading}
                  >
                    <SelectTrigger className="w-[160px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOOR_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {t(
                            `notifications.governance.floorOptions.${lvl}` as never,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Routing rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("notifications.governance.routingTitle")}
            </CardTitle>
            <CardDescription>
              {t("notifications.governance.routingDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-sm font-medium">
                  {t("notifications.governance.suppressSelfActions")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("notifications.governance.suppressSelfActionsDesc")}
                </p>
              </div>
              <Switch
                checked={governance.suppress_self_actions}
                onCheckedChange={(v) =>
                  save({ ...governance, suppress_self_actions: v })
                }
                disabled={!canManage || isSaving || isLoading}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-sm font-medium">
                  {t("notifications.governance.escalateCritical")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("notifications.governance.escalateCriticalDesc")}
                </p>
              </div>
              <Switch
                checked={governance.escalate_critical_to_leadership}
                onCheckedChange={(v) =>
                  save({
                    ...governance,
                    escalate_critical_to_leadership: v,
                  })
                }
                disabled={!canManage || isSaving || isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Residual Item 2 — Role-based presets management */}
        <RolePresetBindingsSection canManage={canManage} />

        <p className="text-xs text-muted-foreground text-center">
          {t("notifications.governance.precedenceNote")}
        </p>
      </div>
    </DashboardShell>
  );
}
