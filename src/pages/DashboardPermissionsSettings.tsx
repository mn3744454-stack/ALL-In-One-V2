import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RtlTabs, RtlTabsList, RtlTabsTrigger, RtlTabsContent } from "@/components/ui/RtlTabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Menu, Shield, Package, Plus } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionBundles } from "@/hooks/usePermissionBundles";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { MemberPermissionsPanel, BundleEditor, DelegationAuditLog } from "@/components/permissions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/BackButton";
import type { PermissionBundle } from "@/hooks/usePermissions";

const DashboardPermissionsSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bundleEditorOpen, setBundleEditorOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<PermissionBundle | null>(null);
  
  const { activeTenant, activeRole } = useTenant();
  const { allDefinitions, canDelegate, loading } = usePermissions();
  const { 
    bundles, 
    getBundlePermissions, 
    createBundle, 
    updateBundlePermissions,
    isCreating,
    isUpdating 
  } = usePermissionBundles();
  const { t } = useI18n();
  const navigate = useNavigate();

  const isOwner = activeRole === "owner";
  const canManagePermissions = isOwner || canDelegate("admin.permissions.delegate");

  const handleCreateBundle = () => {
    setEditingBundle(null);
    setBundleEditorOpen(true);
  };

  const handleEditBundle = (bundle: typeof bundles[0]) => {
    setEditingBundle(bundle);
    setBundleEditorOpen(true);
  };

  const handleSaveBundle = async (data: { name: string; description?: string; permissionKeys: string[] }) => {
    if (editingBundle) {
      await updateBundlePermissions({
        bundleId: editingBundle.id,
        permissionKeys: data.permissionKeys,
      });
    } else {
      await createBundle({
        name: data.name,
        description: data.description,
        permissionKeys: data.permissionKeys,
      });
    }
  };

  // Redirect if user doesn't have access
  if (!loading && !canManagePermissions && activeTenant) {
    return (
      <div className="flex min-h-screen bg-cream">
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50">
            <div className="flex items-center justify-between h-16 px-4 lg:px-8">
              <div className="flex items-center gap-4">
                <button
                  className="p-2 rounded-xl hover:bg-navy/5 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5 text-navy" />
                </button>
                <div>
                  <h1 className="font-display text-xl font-bold text-navy">
                    {t("settings.permissionsRoles.title")}
                  </h1>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t("permissions.accessDenied")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("settings.permissionsRoles.unauthorized")}
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard/settings")}>
                  {t("common.back")}
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {/* Mobile Header */}
        <MobilePageHeader title={t("settings.permissionsRoles.title")} backTo="/dashboard/settings" />

        <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-xl border-b border-border/50 hidden lg:block">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-display text-xl font-bold text-navy">
                  {t("settings.permissionsRoles.title")}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {activeTenant?.tenant.name}
                </p>
              </div>
            </div>
            <BackButton onClick={() => navigate("/dashboard/settings")} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Alert className="mb-6 bg-primary/5 border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <AlertDescription className="text-foreground">
              {t("settings.permissionsRoles.desc")}
            </AlertDescription>
          </Alert>

          <RtlTabs defaultValue="members" className="w-full">
            <RtlTabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <RtlTabsTrigger value="members">{t("permissions.members")}</RtlTabsTrigger>
              <RtlTabsTrigger value="bundles">{t("permissions.bundles")}</RtlTabsTrigger>
              <RtlTabsTrigger value="audit">{t("permissions.auditLog")}</RtlTabsTrigger>
            </RtlTabsList>

            <RtlTabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>{t("permissions.members")}</CardTitle>
                  <CardDescription>{t("permissions.membersDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MemberPermissionsPanel />
                </CardContent>
              </Card>
            </RtlTabsContent>

            <RtlTabsContent value="bundles">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t("permissions.bundles")}</CardTitle>
                      <CardDescription>{t("permissions.bundlesDesc")}</CardDescription>
                    </div>
                    {isOwner && (
                      <Button onClick={handleCreateBundle} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t("permissions.createBundle")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {bundles.map((bundle) => {
                        const permCount = getBundlePermissions(bundle.id).length;
                        return (
                          <div
                            key={bundle.id}
                            className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-accent/30 transition-colors cursor-pointer"
                            onClick={() => isOwner && handleEditBundle(bundle)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{bundle.name}</p>
                                {bundle.description && (
                                  <p className="text-sm text-muted-foreground">{bundle.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {permCount} {t("permissions.permissionsSelected")}
                              </Badge>
                              {bundle.is_system && (
                                <Badge variant="outline">{t("common.system")}</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {bundles.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {t("permissions.noBundles")}
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </RtlTabsContent>

            <RtlTabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>{t("permissions.auditLog")}</CardTitle>
                  <CardDescription>{t("permissions.auditLogDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <DelegationAuditLog />
                </CardContent>
              </Card>
            </RtlTabsContent>
          </RtlTabs>
        </main>
      </div>

      {/* Bundle Editor Dialog */}
      <BundleEditor
        open={bundleEditorOpen}
        onOpenChange={setBundleEditorOpen}
        bundle={editingBundle}
        bundlePermissions={editingBundle ? getBundlePermissions(editingBundle.id) : []}
        allDefinitions={allDefinitions}
        onSave={handleSaveBundle}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};

export default DashboardPermissionsSettings;
