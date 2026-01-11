import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Menu, Stethoscope, Warehouse, ArrowLeftRight, Baby, FlaskConical, Shield, ChevronRight, Key } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useI18n } from "@/i18n";

type LabMode = "none" | "requests" | "full";

const DashboardOrganizationSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="flex min-h-screen bg-cream">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobilePageHeader title={t("organizationSettings.title")} backTo="/dashboard" />

        {/* Desktop Header */}
        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-display text-xl font-bold text-navy">
                  {t("organizationSettings.title")}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {activeTenant?.tenant.name}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
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

            {/* Modules Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t("organizationSettings.modules")}</CardTitle>
                <CardDescription>
                  {t("organizationSettings.modulesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <module.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{module.title}</p>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={module.enabled}
                      onCheckedChange={(checked) => handleToggleModule(module.id, checked)}
                      disabled={!canManage || loading}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Lab Mode Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{t("organizationSettings.labMode")}</CardTitle>
                    <CardDescription>
                      {t("organizationSettings.labModeDescription")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={labMode}
                  onValueChange={(value) => handleLabModeChange(value as LabMode)}
                  disabled={!canManage || loading}
                  className="space-y-3"
                >
                  {labModes.map((mode) => (
                    <div
                      key={mode.value}
                      className="flex items-center space-x-3 rtl:space-x-reverse p-4 rounded-xl border border-border/50 bg-background/50 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => canManage && !loading && handleLabModeChange(mode.value)}
                    >
                      <RadioGroupItem value={mode.value} id={`lab-${mode.value}`} />
                      <Label htmlFor={`lab-${mode.value}`} className="flex-1 cursor-pointer">
                        {mode.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardOrganizationSettings;
