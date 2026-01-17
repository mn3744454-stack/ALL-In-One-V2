import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Package, Shield, FolderOpen, Settings, Users, CheckSquare, Square, DollarSign, Heart, FlaskConical, ClipboardList, Stethoscope, Boxes, Building } from "lucide-react";
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
  admin: <Shield className="w-5 h-5" />,
  files: <FolderOpen className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  finance: <DollarSign className="w-5 h-5" />,
  horses: <Heart className="w-5 h-5" />,
  laboratory: <FlaskConical className="w-5 h-5" />,
  orders: <ClipboardList className="w-5 h-5" />,
  vet: <Stethoscope className="w-5 h-5" />,
  inventory: <Boxes className="w-5 h-5" />,
  housing: <Building className="w-5 h-5" />,
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

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(bundle?.name || "");
      setDescription(bundle?.description || "");
      setSelectedKeys(new Set(bundlePermissions));
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const filtered = searchQuery
      ? allDefinitions.filter(
          (d) =>
            d.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleSelectAllInModule = (module: string) => {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            {isEdit ? t("permissions.editBundle") : t("permissions.createBundle")}
          </DialogTitle>
          <DialogDescription>
            {t("permissions.bundleEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
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
                dir === "rtl" ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={t("permissions.searchPermissions")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("h-12 text-base", dir === "rtl" ? "pr-11" : "pl-11")}
              />
            </div>

            {/* Progress bar and count */}
            <div className="flex items-center gap-4">
              <Progress value={progressValue} className="flex-1 h-2" />
              <Badge variant="secondary" className="text-sm px-3 py-1.5 font-medium whitespace-nowrap">
                {selectedKeys.size} / {totalPermissions} {t("permissions.permissionsSelected")}
              </Badge>
            </div>

            {/* Permissions - Direct cards without wrapper */}
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([module, permissions]) => {
                const allSelected = permissions.every((p) => selectedKeys.has(p.key));
                const selectedCount = permissions.filter((p) => selectedKeys.has(p.key)).length;
                const ModuleIcon = moduleIcons[module.toLowerCase()] || <Shield className="w-5 h-5" />;
                
                // Use Arabic module label if in RTL mode
                const moduleLabel = dir === 'rtl' 
                  ? (moduleLabelsAr[module.toLowerCase()] || module)
                  : module;

                return (
                  <Card key={module} className="overflow-hidden border shadow-sm">
                    <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm font-bold capitalize flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            {ModuleIcon}
                          </span>
                          {moduleLabel}
                          <Badge variant="outline" className="text-xs font-normal">
                            {selectedCount} / {permissions.length}
                          </Badge>
                        </CardTitle>
                        <Button
                          variant={allSelected ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-medium"
                          onClick={() => handleSelectAllInModule(module)}
                        >
                          {allSelected ? (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              {t("common.deselectAll")}
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              {t("common.selectAll")}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {permissions.map((perm) => {
                          // Use Arabic display name if available and in RTL mode
                          const permLabel = dir === 'rtl' && (perm as any).display_name_ar 
                            ? (perm as any).display_name_ar 
                            : perm.display_name;
                          const permDesc = dir === 'rtl' && (perm as any).description_ar 
                            ? (perm as any).description_ar 
                            : perm.description;
                          
                          return (
                            <label
                              key={perm.key}
                              htmlFor={perm.key}
                              className={cn(
                                "flex items-start gap-3 p-3 cursor-pointer transition-all",
                                selectedKeys.has(perm.key) 
                                  ? "bg-primary/10 hover:bg-primary/15" 
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <Checkbox
                                id={perm.key}
                                checked={selectedKeys.has(perm.key)}
                                onCheckedChange={(checked) =>
                                  handleToggle(perm.key, !!checked)
                                }
                                className="mt-0.5 h-5 w-5 shrink-0 border-2 border-primary/50 data-[state=checked]:border-primary"
                              />
                              <div className="flex-1 min-w-0">
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
                  </Card>
                );
              })}
            </div>
          </div>
        </ScrollArea>

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
