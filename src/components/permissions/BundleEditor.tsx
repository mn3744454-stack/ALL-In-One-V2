import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { Search, Package, Shield, FolderOpen, Settings, Users, CheckSquare, Square, DollarSign, Heart, FlaskConical, ClipboardList, Stethoscope, Boxes, Building, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PermissionDefinition, PermissionBundle } from "@/hooks/usePermissions";

interface BundleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: PermissionBundle | null;
  bundlePermissions?: string[];
  allDefinitions: PermissionDefinition[];
  onSave: (data: { name: string; description?: string; permissionKeys: string[] }) => Promise<void>;
  isLoading?: boolean;
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

export function BundleEditor({
  open,
  onOpenChange,
  bundle,
  bundlePermissions = [],
  allDefinitions,
  onSave,
  isLoading,
}: BundleEditorProps) {
  const { t, dir } = useI18n();
  const [name, setName] = useState(bundle?.name || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(bundlePermissions)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(bundle?.name || "");
      setDescription(bundle?.description || "");
      setSelectedKeys(new Set(bundlePermissions));
      setSearchQuery("");
      // Start with all modules expanded for better UX
      setExpandedModules(new Set(Object.keys(moduleLabelsAr)));
    }
    onOpenChange(newOpen);
  };

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const filtered = searchQuery
      ? allDefinitions.filter(
          (d) =>
            d.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.display_name_ar && d.display_name_ar.toLowerCase().includes(searchQuery.toLowerCase())) ||
            d.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.module.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allDefinitions;

    return filtered.reduce((acc, def) => {
      if (!acc[def.module]) {
        acc[def.module] = [];
      }
      acc[def.module].push(def);
      return acc;
    }, {} as Record<string, PermissionDefinition[]>);
  }, [allDefinitions, searchQuery]);

  const handleToggle = (key: string, checked: boolean) => {
    const newSet = new Set(selectedKeys);
    if (checked) {
      newSet.add(key);
    } else {
      newSet.delete(key);
    }
    setSelectedKeys(newSet);
  };

  const handleSelectAllInModule = (module: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent collapsible toggle
    const newSet = new Set(selectedKeys);
    const modulePerms = groupedPermissions[module] || [];
    const allSelected = modulePerms.every((p) => selectedKeys.has(p.key));

    modulePerms.forEach((p) => {
      if (allSelected) {
        newSet.delete(p.key);
      } else {
        newSet.add(p.key);
      }
    });

    setSelectedKeys(newSet);
  };

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

  const handleSave = async () => {
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      permissionKeys: Array.from(selectedKeys),
    });

    handleOpenChange(false);
  };

  const isEdit = !!bundle;
  const totalPermissions = allDefinitions.length;
  const progressValue = totalPermissions > 0 ? (selectedKeys.size / totalPermissions) * 100 : 0;
  const isRTL = dir === "rtl";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            {isEdit ? t("permissions.editBundle") : t("permissions.createBundle")}
          </DialogTitle>
          <DialogDescription>
            {t("permissions.bundleEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Name & Description - side by side */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bundle-name" className="font-medium">{t("permissions.bundleName")}</Label>
                <Input
                  id="bundle-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("permissions.bundleNamePlaceholder")}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bundle-description" className="font-medium">{t("permissions.description")}</Label>
                <Input
                  id="bundle-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("permissions.descriptionPlaceholder")}
                  className="h-11"
                />
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
                isRTL ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={t("permissions.searchPermissions")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("h-12 text-base", isRTL ? "pr-11" : "pl-11")}
              />
            </div>

            {/* Progress bar and count */}
            <div className="flex items-center gap-4">
              <Progress value={progressValue} className="flex-1 h-2" />
              <Badge variant="secondary" className="text-sm px-3 py-1.5 font-medium whitespace-nowrap">
                {selectedKeys.size} / {totalPermissions} {t("permissions.permissionsSelected")}
              </Badge>
            </div>

            {/* Permissions - Collapsible categories matching Members tab */}
            <div className="space-y-3">
              {Object.entries(groupedPermissions).map(([module, permissions]) => {
                const isExpanded = expandedModules.has(module);
                const allSelected = permissions.every((p) => selectedKeys.has(p.key));
                const selectedCount = permissions.filter((p) => selectedKeys.has(p.key)).length;
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
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold capitalize flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                {ModuleIcon}
                              </span>
                              {moduleLabel}
                              <Badge variant="outline" className="text-xs font-normal">
                                {selectedCount} / {permissions.length}
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={allSelected ? "secondary" : "outline"}
                                size="sm"
                                className="h-7 gap-1.5 text-xs font-medium"
                                onClick={(e) => handleSelectAllInModule(module, e)}
                              >
                                {allSelected ? (
                                  <>
                                    <Square className="w-3 h-3" />
                                    {t("common.deselectAll")}
                                  </>
                                ) : (
                                  <>
                                    <CheckSquare className="w-3 h-3" />
                                    {t("common.selectAll")}
                                  </>
                                )}
                              </Button>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform text-muted-foreground",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
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
                                  // Fallback: show a generic Arabic placeholder instead of English
                                  permDesc = t("permissions.noDescriptionAvailable");
                                }
                              }
                              
                              return (
                                <label
                                  key={perm.key}
                                  htmlFor={`bundle-${perm.key}`}
                                  className={cn(
                                    "flex items-start gap-3 py-2.5 cursor-pointer transition-all rounded-md px-2 -mx-2",
                                    selectedKeys.has(perm.key) 
                                      ? "bg-primary/10" 
                                      : "hover:bg-muted/50"
                                  )}
                                >
                                  <Checkbox
                                    id={`bundle-${perm.key}`}
                                    checked={selectedKeys.has(perm.key)}
                                    onCheckedChange={(checked) =>
                                      handleToggle(perm.key, !!checked)
                                    }
                                    className="mt-0.5 h-5 w-5 shrink-0 border-2 border-primary/50 data-[state=checked]:border-primary"
                                  />
                                  <div className="flex-1 min-w-0 text-start">
                                    <div className="flex items-center gap-2 flex-wrap">
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
                                </label>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? t("common.loading") : isEdit ? t("common.update") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
