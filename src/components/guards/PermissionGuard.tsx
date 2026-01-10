import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";

interface PermissionGuardProps {
  permissionKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({
  permissionKey,
  children,
  fallback,
  showFallback = true,
}: PermissionGuardProps) {
  const { hasPermission, loading, isOwner } = usePermissions();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="p-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasAccess = isOwner || hasPermission(permissionKey);

  if (!hasAccess) {
    if (!showFallback) {
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-semibold text-amber-900 mb-2">
            {t("permissions.accessDenied")}
          </h3>
          <p className="text-sm text-amber-700">
            {t("permissions.accessDeniedDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

// Hook variant for conditional rendering
export function usePermissionCheck(permissionKey: string): boolean {
  const { hasPermission, isOwner } = usePermissions();
  return isOwner || hasPermission(permissionKey);
}
