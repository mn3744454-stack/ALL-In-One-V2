import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Plus, Loader2 } from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionBundles } from "@/hooks/usePermissionBundles";
import { 
  useTenantRoles, 
  useTenantRoleBundles, 
  useTenantRolePermissions,
  useMemberRoleAssignment,
  useSetTenantRoleAccess
} from "@/hooks/roles";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { RoleEditorDialog, RolesList, MemberRoleAssignment } from "@/components/roles";
import { toast } from "sonner";

const DashboardRolesSettings = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { activeTenant, activeRole } = useTenant();
  const { allDefinitions, loading: loadingPermissions } = usePermissions();
  const { bundles, getBundlePermissions, loading: loadingBundles } = usePermissionBundles();
  const { 
    roles, 
    isLoading: loadingRoles, 
    createRoleAsync, 
    updateRoleAsync, 
    deleteRole,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTenantRoles();
  const { getRoleBundles } = useTenantRoleBundles();
  const { getRolePermissions } = useTenantRolePermissions();
  const {
    setRoleAccessAsync,
    isUpdating: updatingRoleAccess,
  } = useSetTenantRoleAccess();
  const {
    members,
    updateMemberRole,
    isUpdating: updatingMemberRole,
    isOwner,
  } = useMemberRoleAssignment();

  const { t } = useI18n();
  const navigate = useNavigate();

  const isOwnerRole = activeRole === "owner";
  const loading = loadingPermissions || loadingBundles || loadingRoles;

  const handleCreateRole = () => {
    toast.info("الأدوار المخصصة ستُفعّل بعد Patch 3 (تحويل tenant_members.role إلى text)");
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
        await createRoleAsync({
          role_key: data.role_key,
          name: data.name,
          name_ar: data.name_ar,
          description: data.description,
          description_ar: data.description_ar,
        });
      } else {
        await updateRoleAsync({
          role_key: data.role_key,
          name: data.name,
          name_ar: data.name_ar,
          description: data.description,
          description_ar: data.description_ar,
        });
      }

      await setRoleAccessAsync({ 
        roleKey: data.role_key, 
        permissionKeys: data.permissionKeys, 
        bundleIds: data.bundleIds 
      });

      toast.success(isNew ? "تم إنشاء الدور بنجاح" : "تم تحديث الدور بنجاح");
      setEditorOpen(false);
    } catch (error: any) {
      console.error("Error saving role:", error);
      toast.error(error.message || "فشل في حفظ الدور");
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

  // CTA: "Create Role" → headerRight
  const createRoleCTA = isOwnerRole ? (
    <Button onClick={handleCreateRole} className="gap-2" size="sm">
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">{t("roles.createRole")}</span>
    </Button>
  ) : undefined;

  // Access denied view
  if (!loading && !isOwnerRole && activeTenant) {
    return (
      <DashboardShell>
        <div className="flex-1 p-4 lg:p-8 flex items-center justify-center">
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
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell headerRight={createRoleCTA}>
      {/* Mobile Header */}
      <MobilePageHeader title={t("roles.title")} backTo="/dashboard/settings" />

      {/* Content */}
      <div className="flex-1 p-4 lg:p-8">
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
        isLoading={isCreating || isUpdating || updatingRoleAccess}
        isNew={isNew}
      />
    </DashboardShell>
  );
};

export default DashboardRolesSettings;
