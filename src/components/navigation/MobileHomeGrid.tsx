import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { NAV_MODULES, type NavModule } from "@/navigation/navConfig";
import { cn } from "@/lib/utils";
import { ModuleIconCard, getModuleColorScheme } from "./ModuleIconCard";

interface MobileHomeGridProps {
  className?: string;
}

export function MobileHomeGrid({ className }: MobileHomeGridProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { activeRole, activeTenant } = useTenant();
  const moduleAccess = useModuleAccess();

  // Helper to check if a module is enabled
  const isModuleEnabled = (moduleKey: string): boolean => {
    switch (moduleKey) {
      case "breeding":
        return moduleAccess.breedingEnabled;
      case "vet":
        return moduleAccess.vetEnabled;
      case "lab":
        return moduleAccess.canViewLabRequests;
      case "movement":
        return moduleAccess.movementEnabled;
      case "housing":
        return moduleAccess.housingEnabled;
      default:
        return true;
    }
  };

  // Filter modules based on role, tenant type, and module access
  // Exclude "dashboard" since user is already on dashboard
  const visibleModules = NAV_MODULES.filter((module) => {
    // Skip dashboard - user is already there
    if (module.key === "dashboard") return false;
    
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

  const handleModuleClick = (module: NavModule) => {
    if (module.children && module.children.length > 0) {
      // Navigate to a module sub-page that will show children as icons
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
