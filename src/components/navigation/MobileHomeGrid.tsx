import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { NAV_MODULES, type NavModule } from "@/navigation/navConfig";
import { LAB_NAV_SECTIONS } from "@/navigation/labNavConfig";
import { cn } from "@/lib/utils";
import { ModuleIconCard, getModuleColorScheme } from "./ModuleIconCard";
import { toast } from "sonner";

interface MobileHomeGridProps {
  className?: string;
}

export function MobileHomeGrid({ className }: MobileHomeGridProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { activeRole, activeTenant, workspaceMode } = useTenant();
  const { isLabTenant, labMode, breedingEnabled, vetEnabled, canViewLabRequests, movementEnabled, housingEnabled } = useModuleAccess();

  // Determine if this tenant type "owns" horses (stable-centric feature)
  const tenantType = activeTenant?.tenant.type;
  const isHorseOwningTenant = !tenantType || tenantType === 'stable' || tenantType === 'academy';

  // Helper to check if a module is enabled
  const isModuleEnabled = (moduleKey: string): boolean => {
    switch (moduleKey) {
      case "breeding":
        return breedingEnabled;
      case "vet":
        return vetEnabled;
      case "lab":
        return canViewLabRequests;
      case "movement":
        return movementEnabled;
      case "housing":
        return housingEnabled;
      default:
        return true;
    }
  };

  // For Lab tenants with full mode, show Lab sections directly instead of modules
  if (isLabTenant && labMode === 'full') {
    return (
      <div className={cn("lg:hidden", className)}>
        <div className="grid grid-cols-3 gap-3">
          {LAB_NAV_SECTIONS.map((section, index) => (
            <ModuleIconCard
              key={section.key}
              icon={section.icon}
              label={t(section.labelKey)}
              colorScheme={getModuleColorScheme('lab')}
              onClick={() => navigate(section.route)}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  }

  // Filter modules based on role, tenant type, and module access
  // Exclude "dashboard" since user is already on dashboard
  const visibleModules = NAV_MODULES.filter((module) => {
    // Skip dashboard - user is already there
    if (module.key === "dashboard") return false;

    // Check workspace mode visibility
    const moduleVisibility = module.visibleIn || "both";
    if (moduleVisibility !== "both" && moduleVisibility !== workspaceMode) {
      return false;
    }

    // Hide "horses" module for non-horse-owning tenants (Lab, Clinic, etc.)
    if (module.key === "horses" && !isHorseOwningTenant) return false;
    
    // Check role restriction
    if (module.roles && !module.roles.includes(activeRole || "")) {
      return false;
    }
    
    // Check tenant type restriction
    if (module.tenantType && activeTenant?.tenant.type !== module.tenantType) {
      return false;
    }
    
    // Check module access
    if (module.moduleKey && !isModuleEnabled(module.moduleKey)) {
      return false;
    }
    
    return true;
  });

  // Placeholder routes that show "Coming Soon"
  const comingSoonRoutes = ["/dashboard/favorites", "/dashboard/my-purchases"];

  const handleModuleClick = (module: NavModule) => {
    if (module.route && comingSoonRoutes.includes(module.route)) {
      toast.info(t("common.comingSoon"));
      return;
    }
    if (module.children && module.children.length > 0) {
      navigate(`/dashboard/mobile/${module.key}`);
    } else if (module.route) {
      navigate(module.route);
    }
  };

  return (
    <div className={cn("lg:hidden", className)}>
      <div className="grid grid-cols-3 gap-3">
        {visibleModules.map((module, index) => (
          <ModuleIconCard
            key={module.key}
            icon={module.icon}
            label={t(module.labelKey)}
            colorScheme={getModuleColorScheme(module.key)}
            onClick={() => handleModuleClick(module)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
