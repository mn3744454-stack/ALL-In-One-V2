import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { NAV_MODULES, type NavModuleChild } from "@/navigation/navConfig";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "./MobilePageHeader";

interface MobileModuleGridProps {
  moduleKey: string;
  className?: string;
}

export function MobileModuleGrid({ moduleKey, className }: MobileModuleGridProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const moduleAccess = useModuleAccess();

  // Helper to check if a module is enabled
  const isModuleEnabled = (modKey: string): boolean => {
    switch (modKey) {
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

  // Find the parent module
  const parentModule = NAV_MODULES.find((m) => m.key === moduleKey);

  if (!parentModule || !parentModule.children) {
    return null;
  }

  // Filter children based on module access
  const visibleChildren = parentModule.children.filter((child) => {
    if (child.moduleKey && !isModuleEnabled(child.moduleKey)) {
      return false;
    }
    return true;
  });

  const handleChildClick = (child: NavModuleChild) => {
    if (child.route) {
      navigate(child.route);
    }
  };

  return (
    <div className={cn("lg:hidden min-h-dvh bg-cream", className)}>
      <MobilePageHeader title={t(parentModule.labelKey)} backTo="/dashboard" />
      
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {visibleChildren.map((child) => (
            <ChildIcon
              key={child.key}
              icon={child.icon}
              label={t(child.labelKey)}
              onClick={() => handleChildClick(child)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ChildIconProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function ChildIcon({ icon: Icon, label, onClick }: ChildIconProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-95"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <span className="text-xs font-medium text-foreground text-center line-clamp-2">
        {label}
      </span>
    </button>
  );
}
