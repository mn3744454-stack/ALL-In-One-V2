import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Package, 
  Search, 
  CheckSquare, 
  Square,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useI18n } from "@/i18n";
import { PermissionDefinition, PermissionBundle } from "@/hooks/usePermissions";

interface TenantRole {
  tenant_id: string;
  role_key: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_system: boolean;
}

interface RoleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: TenantRole | null;
  rolePermissions: string[];
  roleBundles: string[];
  allDefinitions: PermissionDefinition[];
  allBundles: PermissionBundle[];
  getBundlePermissions: (bundleId: string) => string[];
  onSave: (data: {
    role_key: string;
    name: string;
    name_ar?: string;
    description?: string;
    description_ar?: string;
    permissionKeys: string[];
    bundleIds: string[];
  }) => void;
  isLoading?: boolean;
  isNew?: boolean;
}

export function RoleEditorDialog({
  open,
  onOpenChange,
  role,
  rolePermissions,
  roleBundles,
  allDefinitions,
  allBundles,
  getBundlePermissions,
  onSave,
  isLoading,
  isNew,
}: RoleEditorDialogProps) {
  const { t, language, dir } = useI18n();
  const isRTL = dir === "rtl";
  const isArabic = language === "ar";

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"bundles" | "permissions">("bundles");

  // Reset form when role changes
  useEffect(() => {
    if (role) {
      setName(role.name);
      setNameAr(role.name_ar || "");
      setDescription(role.description || "");
      setDescriptionAr(role.description_ar || "");
      setRoleKey(role.role_key);
      setSelectedPermissions(new Set(rolePermissions));
      setSelectedBundles(new Set(roleBundles));
    } else {
      setName("");
      setNameAr("");
      setDescription("");
      setDescriptionAr("");
      setRoleKey("");
      setSelectedPermissions(new Set());
      setSelectedBundles(new Set());
    }
    setSearchQuery("");
  }, [role, rolePermissions, roleBundles, open]);

  // Group permissions by module
  const groupedPermissions = allDefinitions.reduce((acc, perm) => {
    const module = perm.module || "other";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, PermissionDefinition[]>);

  // Filter by search
  const filteredGrouped = Object.entries(groupedPermissions).reduce((acc, [module, perms]) => {
    const filtered = perms.filter(
      (p) =>
        p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[module] = filtered;
    return acc;
  }, {} as Record<string, PermissionDefinition[]>);

  const togglePermission = (key: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedPermissions(newSet);
  };

  const toggleBundle = (id: string) => {
    const newSet = new Set(selectedBundles);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBundles(newSet);
  };

  const toggleAllInModule = (perms: PermissionDefinition[]) => {
    const allSelected = perms.every((p) => selectedPermissions.has(p.key));
    const newSet = new Set(selectedPermissions);
    perms.forEach((p) => {
      if (allSelected) {
        newSet.delete(p.key);
      } else {
        newSet.add(p.key);
      }
    });
    setSelectedPermissions(newSet);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const finalRoleKey = isNew 
      ? roleKey.trim() || name.toLowerCase().replace(/\s+/g, "_")
      : role!.role_key;

    onSave({
      role_key: finalRoleKey,
      name: name.trim(),
      name_ar: nameAr.trim() || undefined,
      description: description.trim() || undefined,
      description_ar: descriptionAr.trim() || undefined,
      permissionKeys: Array.from(selectedPermissions),
      bundleIds: Array.from(selectedBundles),
    });
  };

  // Calculate effective permissions count (from bundles + direct)
  const bundlePermissionKeys = new Set<string>();
  selectedBundles.forEach((bundleId) => {
    getBundlePermissions(bundleId).forEach((key) => bundlePermissionKeys.add(key));
  });
  const effectiveCount = new Set([...selectedPermissions, ...bundlePermissionKeys]).size;

  const moduleIcons: Record<string, string> = {
    admin: "⚙️",
    horses: "🐴",
    files: "📁",
    finance: "💰",
    vet: "🩺",
    breeding: "🧬",
    laboratory: "🔬",
    housing: "🏠",
    hr: "👥",
    movement: "🚚",
    orders: "📋",
    academy: "🎓",
    other: "📦",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0" dir={dir}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            {isNew ? t("roles.createRole") : t("roles.editRole")}
          </DialogTitle>
          <DialogDescription>
            {isNew ? t("roles.createRoleDesc") : t("roles.editRoleDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Role Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{t("roles.roleName")} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("roles.roleNamePlaceholder")}
                disabled={role?.is_system}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("roles.roleNameAr")}</Label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={t("roles.roleNameArPlaceholder")}
                disabled={role?.is_system}
                dir="rtl"
              />
            </div>
            {isNew && (
              <div className="space-y-2">
                <Label>{t("roles.roleKey")}</Label>
                <Input
                  value={roleKey}
                  onChange={(e) => setRoleKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  placeholder={t("roles.roleKeyPlaceholder")}
                />
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>{t("roles.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("roles.descriptionPlaceholder")}
                rows={2}
                disabled={role?.is_system}
              />
            </div>
          </div>

          {/* System role warning */}
          {role?.is_system && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{t("roles.systemRoleWarning")}</span>
            </div>
          )}

          {/* Progress Summary */}
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{t("roles.effectivePermissions")}</span>
                <span className="text-muted-foreground">
                  {effectiveCount} / {allDefinitions.length}
                </span>
              </div>
              <Progress value={(effectiveCount / allDefinitions.length) * 100} className="h-2" />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                <Package className="w-3 h-3" />
                {selectedBundles.size} {t("roles.bundles")}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                {selectedPermissions.size} {t("roles.direct")}
              </Badge>
            </div>
          </div>

          {/* Tabs for Bundles and Permissions */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="bundles" className="gap-2">
                <Package className="w-4 h-4" />
                {t("roles.bundles")}
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Shield className="w-4 h-4" />
                {t("roles.permissions")}
              </TabsTrigger>
            </TabsList>

            {/* Bundles Tab */}
            <TabsContent value="bundles" className="flex-1 mt-0">
              <ScrollArea className="h-[280px] border-2 rounded-xl bg-muted/20 p-4">
                <div className="grid md:grid-cols-2 gap-3">
                  {allBundles.map((bundle) => {
                    const isSelected = selectedBundles.has(bundle.id);
                    const permCount = getBundlePermissions(bundle.id).length;
                    return (
                      <label
                        key={bundle.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-accent/30"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleBundle(bundle.id)}
                          className="mt-1 h-5 w-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bundle.name}</span>
                            {bundle.is_system && (
                              <Badge variant="secondary" className="text-xs">
                                {t("common.system")}
                              </Badge>
                            )}
                          </div>
                          {bundle.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {bundle.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {permCount} {t("permissions.permissionsSelected")}
                          </Badge>
                        </div>
                      </label>
                    );
                  })}
                  {allBundles.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                      {t("permissions.noBundles")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="flex-1 mt-0">
              {/* Search */}
              <div className="relative mb-3">
                <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>

              <ScrollArea className="h-[240px] border-2 rounded-xl bg-muted/20">
                <div className="p-4 space-y-4">
                  {Object.entries(filteredGrouped).map(([module, perms]) => {
                    const allSelected = perms.every((p) => selectedPermissions.has(p.key));
                    const someSelected = perms.some((p) => selectedPermissions.has(p.key));

                    return (
                      <Card key={module} className="overflow-hidden border-2">
                        <CardHeader className="py-3 px-4 bg-gradient-to-r from-muted/80 to-muted/40">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <span className="text-lg">{moduleIcons[module] || "📦"}</span>
                              {module.charAt(0).toUpperCase() + module.slice(1)}
                              <Badge variant="secondary" className="text-xs">
                                {perms.length}
                              </Badge>
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAllInModule(perms)}
                              className="gap-2 text-xs h-8"
                            >
                              {allSelected ? (
                                <>
                                  <CheckSquare className="w-4 h-4" />
                                  {t("common.deselectAll")}
                                </>
                              ) : (
                                <>
                                  <Square className="w-4 h-4" />
                                  {t("common.selectAll")}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="grid md:grid-cols-2">
                            {perms.map((perm, idx) => {
                              const isSelected = selectedPermissions.has(perm.key);
                              const isFromBundle = bundlePermissionKeys.has(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-b md:border-b-0 ${
                                    idx % 2 === 0 ? "md:border-e" : ""
                                  } ${
                                    isSelected
                                      ? "bg-primary/5"
                                      : isFromBundle
                                      ? "bg-amber-50"
                                      : "hover:bg-accent/30"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => togglePermission(perm.key)}
                                    className="h-5 w-5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">
                                        {perm.display_name}
                                      </span>
                                      {isFromBundle && !isSelected && (
                                        <Badge variant="outline" className="text-xs bg-amber-100">
                                          {t("roles.fromBundle")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {perm.key}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {Object.keys(filteredGrouped).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("common.noResults")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
