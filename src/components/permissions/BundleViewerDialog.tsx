import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Package, Shield, FolderOpen, Settings, Users, DollarSign, Heart, FlaskConical, ClipboardList, Stethoscope, Boxes, Building, ChevronDown, Pencil, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PermissionDefinition, PermissionBundle } from "@/hooks/usePermissions";
import { useState } from "react";

interface BundleViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: PermissionBundle | null;
  bundlePermissions: string[];
  allDefinitions: PermissionDefinition[];
  onEditClick: () => void;
}

const moduleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />,
  files: <FolderOpen className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  finance: <DollarSign className="w-4 h-4" />,
  horses: <Heart className="w-4 h-4" />,
  laboratory: <FlaskConical className="w-4 h-4" />,
  orders: <ClipboardList className="w-4 h-4" />,
  vet: <Stethoscope className="w-4 h-4" />,
  inventory: <Boxes className="w-4 h-4" />,
  housing: <Building className="w-4 h-4" />,
};

// Arabic translations for module names
const moduleLabelsAr: Record<string, string> = {
  admin: "الإدارة",
  finance: "المالية",
  files: "الملفات",
  horses: "الخيول",
  inventory: "المخزون",
  laboratory: "المختبر",
  orders: "الطلبات",
  vet: "العيادة",
  settings: "الإعدادات",
  users: "المستخدمين",
  housing: "الإسكان",
};

export function BundleViewerDialog({
  open,
  onOpenChange,
  bundle,
  bundlePermissions,
  allDefinitions,
  onEditClick,
}: BundleViewerDialogProps) {
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(Object.keys(moduleLabelsAr)));

  // Get only selected permissions grouped by module
  const groupedSelectedPermissions = useMemo(() => {
    const selectedDefs = allDefinitions.filter(d => bundlePermissions.includes(d.key));
    
    return selectedDefs.reduce((acc, def) => {
      if (!acc[def.module]) {
        acc[def.module] = [];
      }
      acc[def.module].push(def);
      return acc;
    }, {} as Record<string, PermissionDefinition[]>);
  }, [allDefinitions, bundlePermissions]);

  const toggleModuleExpanded = (module: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0"
        dir={dir}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            {t("permissions.viewBundle")}
          </DialogTitle>
          <DialogDescription>
            {t("permissions.viewBundleDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Bundle Info */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("permissions.bundleName")}</p>
                    <p className="font-medium text-lg">{bundle.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("permissions.description")}</p>
                    <p className="font-medium">{bundle.description || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Badge variant="secondary" className="text-sm px-3 py-1.5 font-medium">
                    {bundlePermissions.length} {t("permissions.permissionsSelected")}
                  </Badge>
                  {bundle.is_system && (
                    <Badge variant="outline">{t("common.system")}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Permissions - Read-only */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">{t("permissions.selectedPermissionsList")}</h3>
              
              {Object.keys(groupedSelectedPermissions).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("permissions.noPermissionsInBundle")}
                </p>
              ) : (
                Object.entries(groupedSelectedPermissions).map(([module, permissions]) => {
                  const isExpanded = expandedModules.has(module);
                  const ModuleIcon = moduleIcons[module.toLowerCase()] || <Shield className="w-4 h-4" />;
                  
                  // Use Arabic module label if in RTL mode
                  const moduleLabel = isRTL 
                    ? (moduleLabelsAr[module.toLowerCase()] || module)
                    : module;

                  return (
                    <Collapsible
                      key={module}
                      open={isExpanded}
                      onOpenChange={() => toggleModuleExpanded(module)}
                    >
                      <Card className="border shadow-sm">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className={cn(
                              "flex items-center justify-between",
                              isRTL && "flex-row-reverse"
                            )}>
                              <CardTitle className={cn(
                                "text-sm font-semibold capitalize flex items-center gap-2",
                                isRTL && "flex-row-reverse"
                              )}>
                                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                  {ModuleIcon}
                                </span>
                                {moduleLabel}
                                <Badge variant="outline" className="text-xs font-normal">
                                  {permissions.length}
                                </Badge>
                              </CardTitle>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform text-muted-foreground",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 px-4">
                            <div className="divide-y">
                              {permissions.map((perm) => {
                                // Use Arabic display name if available and in RTL mode
                                const permLabel = isRTL && perm.display_name_ar 
                                  ? perm.display_name_ar 
                                  : perm.display_name;
                                
                                // Use Arabic description if available, otherwise fallback
                                let permDesc = perm.description;
                                if (isRTL) {
                                  if (perm.description_ar) {
                                    permDesc = perm.description_ar;
                                  } else if (perm.description) {
                                    permDesc = t("permissions.noDescriptionAvailable");
                                  }
                                }
                                
                                return (
                                  <div
                                    key={perm.key}
                                    className={cn(
                                      "flex items-start gap-3 py-2.5 px-2 -mx-2",
                                      isRTL && "flex-row-reverse text-end"
                                    )}
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className={cn(
                                        "flex items-center gap-2 flex-wrap",
                                        isRTL && "flex-row-reverse"
                                      )}>
                                        <span className="text-sm font-medium">
                                          {permLabel}
                                        </span>
                                        {!perm.is_delegatable && (
                                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                            {t("permissions.ownerOnly")}
                                          </Badge>
                                        )}
                                      </div>
                                      {permDesc && (
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                          {permDesc}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className={cn(
          "px-6 py-4 border-t bg-muted/30 shrink-0",
          isRTL && "flex-row-reverse"
        )}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          <Button onClick={onEditClick} className="gap-2">
            <Pencil className="w-4 h-4" />
            {t("common.edit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
