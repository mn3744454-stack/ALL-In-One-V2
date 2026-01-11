import { useParams, Navigate } from "react-router-dom";
import { MobileModuleGrid } from "@/components/navigation/MobileModuleGrid";
import { NAV_MODULES } from "@/navigation/navConfig";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardMobileModule() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const isMobile = useIsMobile();

  // Find the module
  const module = NAV_MODULES.find((m) => m.key === moduleKey);

  // If not mobile or module not found or module has no children, redirect
  if (!isMobile && module?.children && module.children.length > 0) {
    // On desktop, redirect to first child
    return <Navigate to={module.children[0].route} replace />;
  }

  if (!module || !module.children || module.children.length === 0) {
    // Module not found or has no children, go to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <MobileModuleGrid moduleKey={moduleKey!} />;
}
