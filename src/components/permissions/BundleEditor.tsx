import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Search, Package } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isEdit ? t("permissions.editBundle") : t("permissions.createBundle")}
          </DialogTitle>
          <DialogDescription>
            {t("permissions.bundleEditorDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Name & Description */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bundle-name">{t("permissions.bundleName")}</Label>
              <Input
                id="bundle-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("permissions.bundleNamePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bundle-description">{t("permissions.description")}</Label>
              <Textarea
                id="bundle-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("permissions.descriptionPlaceholder")}
                rows={2}
              />
            </div>
          </div>

          {/* Permissions selector */}
          <div className="flex-1 overflow-hidden">
            <Label className="mb-2 block">{t("permissions.selectPermissions")}</Label>
            <div className="relative mb-2">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                dir === "rtl" ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={t("permissions.searchPermissions")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
              />
            </div>

            <ScrollArea className="h-64 border rounded-lg p-2">
              {Object.entries(groupedPermissions).map(([module, permissions]) => {
                const allSelected = permissions.every((p) => selectedKeys.has(p.key));
                const someSelected = permissions.some((p) => selectedKeys.has(p.key));

                return (
                  <Card key={module} className="mb-2 last:mb-0">
                    <CardHeader className="py-2 px-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm capitalize">{module}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAllInModule(module)}
                        >
                          {allSelected ? t("common.deselectAll") : t("common.selectAll")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 px-3 space-y-2">
                      {permissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            id={perm.key}
                            checked={selectedKeys.has(perm.key)}
                            onCheckedChange={(checked) =>
                              handleToggle(perm.key, !!checked)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={perm.key}
                              className="text-sm font-medium cursor-pointer block"
                            >
                              {perm.display_name}
                            </label>
                            {perm.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {perm.description}
                              </p>
                            )}
                          </div>
                          {!perm.is_delegatable && (
                            <Badge variant="outline" className="text-xs">
                              {t("permissions.ownerOnly")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </ScrollArea>

            <p className="text-xs text-muted-foreground mt-2">
              {selectedKeys.size} {t("permissions.permissionsSelected")}
            </p>
          </div>
        </div>

        <DialogFooter>
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
