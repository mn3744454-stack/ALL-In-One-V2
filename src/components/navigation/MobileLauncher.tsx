import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useHorses } from "@/hooks/useHorses";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { PERSONAL_NAV_MODULES, ORG_NAV_MODULES, type WorkspaceNavModule, type NavModuleChild } from "@/navigation/workspaceNavConfig";
import { LAB_NAV_SECTIONS } from "@/navigation/labNavConfig";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface MobileLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileLauncher({ open, onOpenChange }: MobileLauncherProps) {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { activeTenant, activeRole, workspaceMode } = useTenant();
  const { horses } = useHorses();
  const { hasPermission } = usePermissions();
  const { breedingEnabled, vetEnabled, labMode, movementEnabled, housingEnabled, isLabTenant } = useModuleAccess();
  const [selectedModule, setSelectedModule] = useState<WorkspaceNavModule | null>(null);

  const isRTL = dir === "rtl";
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  // Get nav modules based on workspace mode
  const navModules = workspaceMode === "personal" ? PERSONAL_NAV_MODULES : ORG_NAV_MODULES;

  // Filter modules based on role, tenant type, module access, and permissions
  const visibleModules = navModules.filter((mod) => {
    // For Lab tenants in org mode, hide horses and show lab sections instead
    if (workspaceMode === "organization" && isLabTenant && labMode === 'full') {
      if (mod.key === 'horses') return false;
    }

    // In org mode, require activeTenant
    if (workspaceMode === "organization" && !activeTenant) {
      // Only show dashboard in org mode without tenant
      return mod.key === "dashboard";
    }

    // Role check
    if (mod.roles && workspaceMode === "organization") {
      if (!mod.roles.includes(activeRole || "")) return false;
    }

    // Tenant type check
    if (mod.tenantType && workspaceMode === "organization") {
      if (activeTenant?.tenant.type !== mod.tenantType) return false;
    }

    // Module access check
    if (mod.moduleKey && workspaceMode === "organization") {
      switch (mod.moduleKey) {
        case "breeding":
          if (!breedingEnabled) return false;
          break;
        case "vet":
          if (!vetEnabled) return false;
          break;
        case "lab":
          if (labMode === "none") return false;
          break;
        case "movement":
          if (!movementEnabled) return false;
          break;
        case "housing":
          if (!housingEnabled) return false;
          break;
      }
    }

    // Permission check (only in organization mode)
    if (mod.permissionKey && workspaceMode === "organization") {
      if (!hasPermission(mod.permissionKey)) return false;
    }

    return true;
  });

  // Filter children based on module access
  const getVisibleChildren = (children: NavModuleChild[]): NavModuleChild[] => {
    return children.filter((child) => {
      if (child.moduleKey) {
        switch (child.moduleKey) {
          case "breeding":
            return breedingEnabled;
          case "vet":
            return vetEnabled;
          case "lab":
            return labMode !== "none";
          case "movement":
            return movementEnabled;
          case "housing":
            return housingEnabled;
        }
      }
      // Permission check for children
      if (child.permissionKey && workspaceMode === "organization") {
        if (!hasPermission(child.permissionKey)) return false;
      }
      return true;
    });
  };

  const handleModuleClick = (mod: WorkspaceNavModule) => {
    if (mod.children && mod.children.length > 0) {
      setSelectedModule(mod);
    } else if (mod.route) {
      navigate(mod.route);
      onOpenChange(false);
      setSelectedModule(null);
    }
  };

  const handleChildClick = (child: NavModuleChild) => {
    navigate(child.route);
    onOpenChange(false);
    setSelectedModule(null);
  };

  const handleBack = () => {
    setSelectedModule(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedModule(null);
  };

  // Module grid view
  const ModuleGrid = () => (
    <div className="grid grid-cols-3 gap-3 p-4">
      {/* For Lab tenants in org mode, show Lab sections first */}
      {workspaceMode === "organization" && isLabTenant && labMode === 'full' && LAB_NAV_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={`lab-${section.key}`}
            onClick={() => {
              navigate(section.route);
              onOpenChange(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all min-h-[100px] gap-2",
              "active:scale-95"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              {t(section.labelKey)}
            </span>
          </button>
        );
      })}
      
      {/* Regular modules */}
      {visibleModules.map((mod) => {
        const Icon = mod.icon;

        return (
          <button
            key={mod.key}
            onClick={() => handleModuleClick(mod)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-all min-h-[100px] gap-2",
              "active:scale-95"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              {t(mod.labelKey)}
            </span>
            {mod.badgeKey === "horsesCount" && horses.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {horses.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  // Children list view
  const ChildrenList = () => {
    if (!selectedModule?.children) return null;

    const visibleChildren = getVisibleChildren(selectedModule.children);

    return (
      <div className="p-4 space-y-2">
        {visibleChildren.map((child) => {
          const Icon = child.icon;

          return (
            <button
              key={child.key}
              onClick={() => handleChildClick(child)}
              className={cn(
                "flex items-center gap-4 w-full p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all",
                "active:scale-[0.98]"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 text-start font-medium">
                {t(child.labelKey)}
              </span>
              <ChevronIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          {selectedModule ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                {isRTL ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
              <DrawerTitle className="flex items-center gap-2">
                <selectedModule.icon className="w-5 h-5 text-primary" />
                {t(selectedModule.labelKey)}
              </DrawerTitle>
            </div>
          ) : (
            <DrawerTitle>{t("nav.menu")}</DrawerTitle>
          )}
        </DrawerHeader>
        <ScrollArea className="flex-1 max-h-[60vh]">
          {selectedModule ? <ChildrenList /> : <ModuleGrid />}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}