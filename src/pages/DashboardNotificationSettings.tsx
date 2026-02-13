import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Menu, Smartphone, Trash2, Volume2, Moon } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useI18n } from "@/i18n";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PushDevice {
  id: string;
  device_label: string | null;
  platform: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

const TIMEZONES = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Kolkata",
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

const DashboardNotificationSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, isLoading, updatePreferences, isSaving } = useNotificationPreferences();
  const { pushState, isSubscribed, subscribe, unsubscribe, isSupported } = usePushSubscription();

  // Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["push_devices", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("push_subscriptions" as any)
        .select("id, device_label, platform, is_active, last_seen_at, created_at")
        .eq("user_id", user.id)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PushDevice[];
    },
    enabled: !!user?.id,
  });

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleQuietHoursChange = async (field: string, value: string | null) => {
    try {
      await updatePreferences({ [field]: value });
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await supabase
        .from("push_subscriptions" as any)
        .update({ is_active: false })
        .eq("id", deviceId);
      queryClient.invalidateQueries({ queryKey: ["push_devices", user?.id] });
      toast.success(t("pushNotifications.deviceRemoved"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success(t("pushNotifications.enabled"));
      queryClient.invalidateQueries({ queryKey: ["push_devices", user?.id] });
    } else {
      toast.error(t("pushNotifications.enableFailed"));
    }
  };

  const handleDisablePush = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success(t("pushNotifications.disabled"));
      queryClient.invalidateQueries({ queryKey: ["push_devices", user?.id] });
    }
  };

  const activeDevices = devices.filter((d) => d.is_active);
  const quietEnabled = !!preferences.quiet_start && !!preferences.quiet_end;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <MobilePageHeader title={t("pushNotifications.settingsTitle")} backTo="/dashboard/settings" />

        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t("pushNotifications.settingsTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("pushNotifications.settingsDesc")}
              </p>
            </div>
          </div>

          {/* Push Enable/Disable */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t("pushNotifications.pushStatus")}
              </CardTitle>
              <CardDescription>
                {isSubscribed
                  ? t("pushNotifications.pushEnabledDesc")
                  : t("pushNotifications.pushDisabledDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isSupported ? (
                <p className="text-sm text-muted-foreground">{t("pushNotifications.notSupported")}</p>
              ) : pushState === "denied" ? (
                <p className="text-sm text-destructive">{t("pushNotifications.permissionDenied")}</p>
              ) : isSubscribed ? (
                <Button variant="outline" size="sm" onClick={handleDisablePush}>
                  {t("pushNotifications.disable")}
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnablePush}>
                  {t("pushNotifications.enable")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Category Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("pushNotifications.categories")}</CardTitle>
              <CardDescription>{t("pushNotifications.categoriesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "push_messages", label: t("pushNotifications.catMessages") },
                { key: "push_results", label: t("pushNotifications.catResults") },
                { key: "push_status", label: t("pushNotifications.catStatus") },
                { key: "push_invitations", label: t("pushNotifications.catInvitations") },
                { key: "push_partnerships", label: t("pushNotifications.catPartnerships") },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch
                    checked={(preferences as any)[key] ?? true}
                    onCheckedChange={(v) => handleToggle(key, v)}
                    disabled={isSaving}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* In-App Sound */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                {t("pushNotifications.inAppSound")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("pushNotifications.inAppSoundDesc")}</Label>
                <Switch
                  checked={preferences.in_app_sound}
                  onCheckedChange={(v) => handleToggle("in_app_sound", v)}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="w-4 h-4" />
                {t("pushNotifications.quietHours")}
              </CardTitle>
              <CardDescription>{t("pushNotifications.quietHoursDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("pushNotifications.enableQuietHours")}</Label>
                <Switch
                  checked={quietEnabled}
                  onCheckedChange={(enabled) => {
                    if (enabled) {
                      handleQuietHoursChange("quiet_start", "22:00");
                      handleQuietHoursChange("quiet_end", "07:00");
                    } else {
                      handleQuietHoursChange("quiet_start", null);
                      handleQuietHoursChange("quiet_end", null);
                    }
                  }}
                />
              </div>

              {quietEnabled && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("pushNotifications.from")}
                    </Label>
                    <Select
                      value={preferences.quiet_start || "22:00"}
                      onValueChange={(v) => handleQuietHoursChange("quiet_start", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("pushNotifications.to")}
                    </Label>
                    <Select
                      value={preferences.quiet_end || "07:00"}
                      onValueChange={(v) => handleQuietHoursChange("quiet_end", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {t("pushNotifications.timezone")}
                    </Label>
                    <Select
                      value={preferences.quiet_timezone || "Asia/Riyadh"}
                      onValueChange={(v) => handleQuietHoursChange("quiet_timezone", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devices */}
          {activeDevices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  {t("pushNotifications.devices")} ({activeDevices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {device.device_label || device.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(device.last_seen_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDevice(device.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardNotificationSettings;
