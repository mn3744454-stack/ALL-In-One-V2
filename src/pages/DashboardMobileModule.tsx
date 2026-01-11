import { useParams, Navigate } from "react-router-dom";
import { MobileModuleGrid } from "@/components/navigation/MobileModuleGrid";
import { NAV_MODULES } from "@/navigation/navConfig";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function DashboardMobileModule() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  // Use 1024px breakpoint to match Tailwind's lg: breakpoint
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Find the module
  const module = NAV_MODULES.find((m) => m.key === moduleKey);

  // Only redirect on desktop (>= 1024px), show grid on mobile/tablet
  if (isDesktop && module?.children && module.children.length > 0) {
    // On desktop, redirect to first child
    return <Navigate to={module.children[0].route} replace />;
  }

  if (!module || !module.children || module.children.length === 0) {
    // Module not found or has no children, go to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <MobileModuleGrid moduleKey={moduleKey!} />;
}
