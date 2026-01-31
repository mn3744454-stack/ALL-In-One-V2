import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface CommunityRouteGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * CommunityRouteGuard - Hybrid guard for Community page
 * 
 * Behavior:
 * - Personal mode: Allow access (shows personal feed with tenant_id IS NULL)
 * - Organization mode: Require activeTenant AND community.view permission
 * 
 * This ensures:
 * - Authenticated users can always access personal community feed
 * - Organization posts require proper tenant context and permission
 */
export function CommunityRouteGuard({
  children,
  redirectTo = "/dashboard",
}: CommunityRouteGuardProps) {
  const navigate = useNavigate();
  const { workspaceMode, activeTenant, loading: tenantLoading } = useTenant();
  const { hasPermission, loading: permLoading, isOwner } = usePermissions();

  const loading = tenantLoading || permLoading;

  useEffect(() => {
    if (loading) return;

    // Personal mode: always allowed (no tenant/permission required)
    if (workspaceMode === "personal") {
      return;
    }

    // Organization mode: require activeTenant
    if (workspaceMode === "organization" && !activeTenant) {
      toast.error("يجب اختيار منشأة للوصول لهذه الصفحة");
      navigate(redirectTo, { replace: true });
      return;
    }

    // Organization mode: require community.view permission (owner bypass)
    if (workspaceMode === "organization" && !isOwner && !hasPermission("community.view")) {
      toast.error("ليس لديك صلاحية للوصول لهذه الصفحة");
      navigate(redirectTo, { replace: true });
      return;
    }
  }, [
    loading,
    workspaceMode,
    activeTenant,
    hasPermission,
    isOwner,
    navigate,
    redirectTo,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Block render if organization mode checks fail
  if (workspaceMode === "organization") {
    if (!activeTenant) {
      return null;
    }
    if (!isOwner && !hasPermission("community.view")) {
      return null;
    }
  }

  return <>{children}</>;
}
