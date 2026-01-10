import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, Shield, ArrowRight, Plus, Loader2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionBundles } from "@/hooks/usePermissionBundles";
import { 
  useTenantRoles, 
  useTenantRoleBundles, 
  useTenantRolePermissions,
  useMemberRoleAssignment 
} from "@/hooks/roles";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { RoleEditorDialog, RolesList, MemberRoleAssignment } from "@/components/roles";
import { toast } from "sonner";

const DashboardRolesSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { activeTenant, activeRole } = useTenant();
  const { allDefinitions, loading: loadingPermissions } = usePermissions();
  const { bundles, getBundlePermissions, loading: loadingBundles } = usePermissionBundles();
  const { 
    roles, 
    isLoading: loadingRoles, 
    createRole, 
    updateRole, 
    deleteRole,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTenantRoles();
  const { 
    getRoleBundles, 
    setRoleBundles, 
    isUpdating: updatingBundles 
  } = useTenantRoleBundles();
  const { 
    getRolePermissions, 
    setRolePermissions, 
    isUpdating: updatingPermissions 
  } = useTenantRolePermissions();
  const {
    members,
    updateMemberRole,
    isUpdating: updatingMemberRole,
    isOwner,
  } = useMemberRoleAssignment();

  const { t, dir } = useI18n();
  const navigate = useNavigate();

  const isOwnerRole = activeRole === "owner";
  const loading = loadingPermissions || loadingBundles || loadingRoles;

  const handleCreateRole = () => {
    setSelectedRoleKey(null);
    setIsNew(true);
    setEditorOpen(true);
  };

  const handleEditRole = (role: typeof roles[0]) => {
    setSelectedRoleKey(role.role_key);
    setIsNew(false);
    setEditorOpen(true);
  };

  const handleDeleteRole = (roleKey: string) => {
    if (confirm(t("roles.confirmDelete"))) {
      deleteRole(roleKey);
    }
  };

  const handleSaveRole = async (data: {
    role_key: string;
    name: string;
    name_ar?: string;
    description?: string;
    description_ar?: string;
    permissionKeys: string[];
    bundleIds: string[];
  }) => {
    try {
      if (isNew) {
        createRole({
          role_key: data.role_key,
          name: data.name,
          name_ar: data.name_ar,
          description: data.description,
          description_ar: data.description_ar,
        });
      } else {
        updateRole({
          role_key: data.role_key,
          name: data.name,
          name_ar: data.name_ar,
          description: data.description,
          description_ar: data.description_ar,
        });
      }

      // Set permissions and bundles for the role
      setRolePermissions({ roleKey: data.role_key, permissionKeys: data.permissionKeys });
      setRoleBundles({ roleKey: data.role_key, bundleIds: data.bundleIds });

      setEditorOpen(false);
    } catch (error) {
      console.error("Error saving role:", error);
    }
  };

  const getRolePermissionCount = (roleKey: string) => {
    const directPerms = getRolePermissions(roleKey).length;
    const bundlePerms = new Set<string>();
    getRoleBundles(roleKey).forEach((bundleId) => {
      getBundlePermissions(bundleId).forEach((key) => bundlePerms.add(key));
    });
    return new Set([...getRolePermissions(roleKey), ...bundlePerms]).size;
  };

  const getRoleBundleCount = (roleKey: string) => {
    return getRoleBundles(roleKey).length;
  };

  const getMemberCount = (roleKey: string) => {
    return members.filter((m) => m.role === roleKey).length;
  };

  const selectedRole = roles.find((r) => r.role_key === selectedRoleKey) || null;

  // Redirect if not owner
  if (!loading && !isOwnerRole && activeTenant) {
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
                <h1 className="font-display text-xl font-bold text-navy">
                  {t("roles.title")}
                </h1>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t("permissions.accessDenied")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("roles.ownerOnlyPage")}
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
                  {t("roles.title")}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {activeTenant?.tenant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwnerRole && (
                <Button onClick={handleCreateRole} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t("roles.createRole")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/settings")}
                className="gap-2"
              >
                <ArrowRight className={dir === "rtl" ? "rotate-180" : ""} />
                {t("common.back")}
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Alert className="mb-6 bg-primary/5 border-primary/20">
                <Shield className="w-4 h-4 text-primary" />
                <AlertDescription className="text-foreground">
                  {t("roles.desc")}
                </AlertDescription>
              </Alert>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Roles List */}
                <RolesList
                  roles={roles}
                  selectedRoleKey={selectedRoleKey}
                  onSelectRole={setSelectedRoleKey}
                  onEditRole={handleEditRole}
                  onDeleteRole={handleDeleteRole}
                  getRolePermissionCount={getRolePermissionCount}
                  getRoleBundleCount={getRoleBundleCount}
                  getMemberCount={getMemberCount}
                  isOwner={isOwnerRole}
                />

                {/* Member Role Assignment */}
                <MemberRoleAssignment
                  members={members}
                  roles={roles}
                  onUpdateRole={updateMemberRole}
                  isUpdating={updatingMemberRole}
                  isOwner={isOwnerRole}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* Role Editor Dialog */}
      <RoleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        role={selectedRole}
        rolePermissions={selectedRole ? getRolePermissions(selectedRole.role_key) : []}
        roleBundles={selectedRole ? getRoleBundles(selectedRole.role_key) : []}
        allDefinitions={allDefinitions}
        allBundles={bundles}
        getBundlePermissions={getBundlePermissions}
        onSave={handleSaveRole}
        isLoading={isCreating || isUpdating || updatingPermissions || updatingBundles}
        isNew={isNew}
      />
    </div>
  );
};

export default DashboardRolesSettings;
