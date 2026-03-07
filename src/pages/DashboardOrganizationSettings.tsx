import { useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stethoscope, Warehouse, ArrowLeftRight, Baby, FlaskConical, Shield, ChevronRight, Key, Link2, BellRing } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";

type LabMode = "none" | "requests" | "full";

const DashboardOrganizationSettings = () => {
  const navigate = useNavigate();
  const { activeTenant, activeRole } = useTenant();
  const { 
    vetEnabled, 
    housingEnabled, 
    movementEnabled, 
    breedingEnabled,
    labMode,
    setLabMode,
    toggleModule,
    loading 
  } = useModuleAccess();
  const { t } = useI18n();

  const isOwner = activeRole === "owner";
  const canManage = activeRole === "owner" || activeRole === "manager";

  const handleToggleModule = async (module: string, enabled: boolean) => {
    await toggleModule(module, enabled);
  };

  const handleLabModeChange = async (mode: LabMode) => {
    await setLabMode(mode);
  };

  const modules = [
    {
      id: "vet",
      icon: Stethoscope,
      title: t("organizationSettings.vet.title"),
      description: t("organizationSettings.vet.description"),
      enabled: vetEnabled,
    },
    {
      id: "housing",
      icon: Warehouse,
      title: t("organizationSettings.housing.title"),
      description: t("organizationSettings.housing.description"),
      enabled: housingEnabled,
    },
    {
      id: "movement",
      icon: ArrowLeftRight,
      title: t("organizationSettings.movement.title"),
      description: t("organizationSettings.movement.description"),
      enabled: movementEnabled,
    },
    {
      id: "breeding",
      icon: Baby,
      title: t("organizationSettings.breeding.title"),
      description: t("organizationSettings.breeding.description"),
      enabled: breedingEnabled,
    },
  ];

  const labModes: { value: LabMode; label: string }[] = [
    { value: "none", label: t("organizationSettings.labModes.none") },
    { value: "requests", label: t("organizationSettings.labModes.requests") },
    { value: "full", label: t("organizationSettings.labModes.full") },
  ];

  return (
    <DashboardShell>
      <MobilePageHeader title={t("organizationSettings.title")} backTo="/dashboard" />
      <PageToolbar title={t("organizationSettings.title")} />

      <div className="flex-1 p-4 lg:p-8">
        {!canManage && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <Shield className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {t("organizationSettings.ownerOnly")}
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-3xl space-y-6">
          {/* Permissions & Roles Card */}
          {(activeRole === "owner" || activeRole === "manager") && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t("settings.permissionsRoles.title")}</CardTitle>
                      <CardDescription>
                        {t("settings.permissionsRoles.desc")}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/dashboard/settings/permissions")}
                    className="gap-2"
                  >
                    {t("settings.permissionsRoles.open")}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Notification Settings Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BellRing className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t("settings.notifications.title")}</CardTitle>
                    <CardDescription>
                      {t("settings.notifications.desc")}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/settings/notifications")}
                  className="gap-2"
                >
                  {t("settings.notifications.open")}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Connections Card */}
          {canManage && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t("connections.title")}</CardTitle>
                      <CardDescription>
                        {t("connections.description")}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard/settings/connections")}
                    className="gap-2"
                  >
                    {t("connections.manage")}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Modules Card */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>{t("organizationSettings.modules")}</CardTitle>
                <CardDescription>
                  {t("organizationSettings.modulesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{module.title}</p>
                          <p className="text-sm text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={module.enabled}
                        onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Laboratory Mode */}
          {canManage && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>{t("organizationSettings.laboratory.title")}</CardTitle>
                    <CardDescription>{t("organizationSettings.laboratory.description")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={labMode}
                  onValueChange={(value) => handleLabModeChange(value as LabMode)}
                  disabled={loading}
                >
                  {labModes.map((mode) => (
                    <div key={mode.value} className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={mode.value} id={`lab-${mode.value}`} />
                      <Label htmlFor={`lab-${mode.value}`} className="cursor-pointer flex-1">
                        {mode.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
};

export default DashboardOrganizationSettings;
