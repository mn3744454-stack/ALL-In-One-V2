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
import { Search, Package, Shield, FolderOpen, Settings, Users, CheckSquare, Square } from "lucide-react";
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
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            {isEdit ? t("permissions.editBundle") : t("permissions.createBundle")}
          </DialogTitle>
          <DialogDescription>
            {t("permissions.bundleEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-5 p-6">
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

          {/* Progress bar and count */}
          <div className="flex items-center gap-4 px-1">
            <Progress value={progressValue} className="flex-1 h-2" />
            <Badge variant="secondary" className="text-sm px-3 py-1.5 font-medium">
              {selectedKeys.size} / {totalPermissions} {t("permissions.permissionsSelected")}
            </Badge>
          </div>

          {/* Permissions selector */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-semibold text-base">{t("permissions.selectPermissions")}</Label>
            </div>
            
            {/* Search bar */}
            <div className="relative mb-4">
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

            {/* Permissions - Full width cards, scrollable */}
            <div className="flex-1 border-2 rounded-xl bg-muted/10 overflow-hidden min-h-0">
              <ScrollArea className="h-[450px]">
                <div className="p-5 space-y-5">
                  {Object.entries(groupedPermissions).map(([module, permissions]) => {
                    const allSelected = permissions.every((p) => selectedKeys.has(p.key));
                    const selectedCount = permissions.filter((p) => selectedKeys.has(p.key)).length;
                    const ModuleIcon = moduleIcons[module.toLowerCase()] || <Shield className="w-5 h-5" />;

                    return (
                      <Card key={module} className="overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="py-4 px-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold capitalize flex items-center gap-3">
                              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                                {ModuleIcon}
                              </span>
                              {module}
                              <Badge variant="outline" className="text-xs font-normal">
                                {selectedCount} / {permissions.length}
                              </Badge>
                            </CardTitle>
                            <Button
                              variant={allSelected ? "secondary" : "outline"}
                              size="sm"
                              className="h-9 gap-2 text-sm font-medium"
                              onClick={() => handleSelectAllInModule(module)}
                            >
                              {allSelected ? (
                                <>
                                  <Square className="w-4 h-4" />
                                  {t("common.deselectAll")}
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="w-4 h-4" />
                                  {t("common.selectAll")}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="grid md:grid-cols-2">
                            {permissions.map((perm, idx) => (
                              <label
                                key={perm.key}
                                htmlFor={perm.key}
                                className={cn(
                                  "flex items-start gap-4 p-4 cursor-pointer transition-all border-b md:border-b-0",
                                  idx % 2 === 0 && "md:border-e",
                                  Math.floor(idx / 2) < Math.ceil(permissions.length / 2) - 1 && "md:border-b",
                                  idx < permissions.length - 1 && "border-b",
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
                                  className="mt-1 h-5 w-5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold">
                                      {perm.display_name}
                                    </span>
                                    {!perm.is_delegatable && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                        {t("permissions.ownerOnly")}
                                      </Badge>
                                    )}
                                  </div>
                                  {perm.description && (
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
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
