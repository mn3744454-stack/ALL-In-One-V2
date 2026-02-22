import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface WorkspaceRouteGuardProps {
  children: React.ReactNode;
  requiredMode?: "personal" | "organization";
  requiredPermission?: string;
  redirectTo?: string;
}

export function WorkspaceRouteGuard({
  children,
  requiredMode,
  requiredPermission,
  redirectTo = "/dashboard",
}: WorkspaceRouteGuardProps) {
  const navigate = useNavigate();
  const { workspaceMode, activeTenant, loading: tenantLoading, tenantHydrated } = useTenant();
  const { hasPermission, loading: permLoading } = usePermissions();

  // Wait until tenant context is fully hydrated before making any decisions
  const isReady = tenantHydrated && !tenantLoading && !permLoading;

  useEffect(() => {
    if (!isReady) return;

    // Check workspace mode requirement
    if (requiredMode && workspaceMode !== requiredMode) {
      toast.error("ليس لديك صلاحية للوصول لهذه الصفحة");
      navigate(redirectTo, { replace: true });
      return;
    }

    // For organization mode, require an active tenant
    if (requiredMode === "organization" && !activeTenant) {
      toast.error("يجب اختيار منشأة للوصول لهذه الصفحة");
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check permission requirement (only in organization mode)
    if (requiredPermission && workspaceMode === "organization") {
      if (!hasPermission(requiredPermission)) {
        toast.error("ليس لديك صلاحية للوصول لهذه الصفحة");
        navigate(redirectTo, { replace: true });
        return;
      }
    }
  }, [
    isReady,
    requiredMode,
    requiredPermission,
    workspaceMode,
    activeTenant,
    hasPermission,
    navigate,
    redirectTo,
  ]);

  // Show loading spinner until fully hydrated
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Block render if checks fail (effect will redirect)
  if (requiredMode && workspaceMode !== requiredMode) {
    return null;
  }

  if (requiredMode === "organization" && !activeTenant) {
    return null;
  }

  if (
    requiredPermission &&
    workspaceMode === "organization" &&
    !hasPermission(requiredPermission)
  ) {
    return null;
  }

  return <>{children}</>;
}
