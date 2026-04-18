/**
 * Residual Item 2 — Compact Role-based presets management section embedded
 * inside the existing governance page. Owner/manager only.
 *
 * Bindings override the tenant-level `default_preset` for the matching role
 * during a member's *first* notification-preference seeding. They never
 * overwrite a member's later personal choice. (Precedence enforced by
 * `useNotificationPreferences`.)
 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCog, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { useTenantRolePresetBindings } from "@/hooks/useTenantRolePresetBindings";
import { PRESET_ORDER, type PresetId } from "@/lib/notifications/presets";

interface Props {
  canManage: boolean;
}

const SUGGESTED_ROLES = [
  "owner",
  "manager",
  "foreman",
  "vet",
  "trainer",
  "employee",
];

export function RolePresetBindingsSection({ canManage }: Props) {
  const { t } = useI18n();
  const {
    bindings,
    addBinding,
    removeBinding,
    isMutating,
    isLoading,
  } = useTenantRolePresetBindings();
  const [roleKey, setRoleKey] = useState("");
  const [presetId, setPresetId] = useState<PresetId>("all");

  const handleAdd = async () => {
    const key = roleKey.trim().toLowerCase();
    if (!key) return;
    try {
      await addBinding({ role_key: key, preset_id: presetId });
      toast.success(t("common.success"));
      setRoleKey("");
      setPresetId("all");
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeBinding(id);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="w-4 h-4 text-primary" />
          {t("notifications.governance.rolePresetsTitle")}
        </CardTitle>
        <CardDescription>
          {t("notifications.governance.rolePresetsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bindings.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("notifications.governance.rolePresetsEmpty")}
          </p>
        )}

        {bindings.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground truncate">
                {b.role_key}
              </span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-sm text-foreground">
                {t(`notifications.presets.${b.preset_id}.label` as never)}
              </span>
            </div>
            {canManage && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(b.id)}
                disabled={isMutating}
                aria-label={t("common.delete")}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-xs">
                {t("notifications.governance.rolePresetsRoleLabel")}
              </Label>
              <Input
                list="role-key-suggestions"
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
                placeholder="manager"
                disabled={isMutating}
              />
              <datalist id="role-key-suggestions">
                {SUGGESTED_ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {t("notifications.governance.rolePresetsPresetLabel")}
              </Label>
              <Select
                value={presetId}
                onValueChange={(v) => setPresetId(v as PresetId)}
                disabled={isMutating}
              >
                <SelectTrigger>
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
            </div>
            <Button
              onClick={handleAdd}
              disabled={!roleKey.trim() || isMutating}
              size="sm"
            >
              <Plus className="w-4 h-4 me-1" />
              {t("common.save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
