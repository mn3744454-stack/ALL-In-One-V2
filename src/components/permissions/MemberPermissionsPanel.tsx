import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Shield, Key, Check, X, ChevronDown, Search, FolderOpen, Settings, Users as UsersIcon } from "lucide-react";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { usePermissionBundles } from "@/hooks/usePermissionBundles";
import { useDelegationScopes } from "@/hooks/useDelegationScopes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

interface TenantMember {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  is_active: boolean;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

const moduleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />,
  files: <FolderOpen className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  users: <UsersIcon className="w-4 h-4" />,
};

export function MemberPermissionsPanel() {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const { activeTenant, activeRole } = useTenant();
  const { allDefinitions, canDelegate, loading: loadingPerms } = usePermissions();
  const {
    bundles,
    loading: loadingBundles,
    assignBundle,
    removeBundle,
    setMemberPermission,
    isUpdating,
  } = usePermissionBundles();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const tenantId = activeTenant?.tenant_id;
  const isOwner = activeRole === "owner";
  const canManagePermissions = isOwner || canDelegate("admin.permissions.delegate");
  const isRTL = dir === "rtl";

  // Delegation scopes for the selected member (owner-only feature)
  const {
    scopeMap: delegationScopeMap,
    toggleScope,
    isUpdating: isUpdatingScopes,
  } = useDelegationScopes(selectedMemberId || undefined);

  // Fetch tenant members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["tenant-members-permissions", tenantId],
    queryFn: async (): Promise<TenantMember[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_members")
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          is_active,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .neq("role", "owner")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching members:", error);
        return [];
      }
      return (data || []) as unknown as TenantMember[];
    },
    enabled: !!tenantId,
  });

  // Fetch selected member's bundles
  const { data: memberBundles = [] } = useQuery({
    queryKey: ["member-bundles", selectedMemberId],
    queryFn: async (): Promise<{ bundle_id: string }[]> => {
      if (!selectedMemberId) return [];

      const { data, error } = await supabase
        .from("member_permission_bundles" as any)
        .select("*")
        .eq("tenant_member_id", selectedMemberId);

      if (error) return [];
      return (data || []) as unknown as { bundle_id: string }[];
    },
    enabled: !!selectedMemberId,
  });

  // Fetch selected member's permission overrides
  const { data: memberOverrides = [] } = useQuery({
    queryKey: ["member-overrides", selectedMemberId],
    queryFn: async (): Promise<{ permission_key: string; granted: boolean }[]> => {
      if (!selectedMemberId) return [];

      const { data, error } = await supabase
        .from("member_permissions" as any)
        .select("*")
        .eq("tenant_member_id", selectedMemberId);

      if (error) return [];
      return (data || []) as unknown as { permission_key: string; granted: boolean }[];
    },
    enabled: !!selectedMemberId,
  });

  const memberBundleIds = useMemo(
    () => new Set(memberBundles.map((b) => b.bundle_id)),
    [memberBundles]
  );

  const memberOverrideMap = useMemo(
    () => new Map(memberOverrides.map((o) => [o.permission_key, o.granted])),
    [memberOverrides]
  );

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const isSelectedMemberManager = selectedMember?.role === "manager";

  // Helper to get localized permission name
  const getPermissionName = (perm: { display_name: string; display_name_ar?: string | null }) => {
    if (isRTL && perm.display_name_ar) {
      return perm.display_name_ar;
    }
    return perm.display_name;
  };

  // Group permissions by module with search filtering
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
    }, {} as Record<string, typeof allDefinitions>);
  }, [allDefinitions, searchQuery]);

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

  const handleToggleBundle = async (bundleId: string, assigned: boolean) => {
    if (!selectedMemberId) return;

    if (assigned) {
      await removeBundle({ memberId: selectedMemberId, bundleId });
    } else {
      await assignBundle({ memberId: selectedMemberId, bundleId });
    }
  };

  const handleTogglePermission = async (key: string, currentState: boolean | undefined) => {
    if (!selectedMemberId) return;

    let newGranted: boolean;
    if (currentState === undefined) {
      newGranted = true;
    } else if (currentState === true) {
      newGranted = false;
    } else {
      await supabase
        .from("member_permissions" as any)
        .delete()
        .eq("tenant_member_id", selectedMemberId)
        .eq("permission_key", key);
      
      queryClient.invalidateQueries({ queryKey: ["member-overrides", selectedMemberId] });
      queryClient.invalidateQueries({ queryKey: ["delegation-audit-log", tenantId] });
      return;
    }

    await setMemberPermission({
      memberId: selectedMemberId,
      permissionKey: key,
      granted: newGranted,
    });
  };

  const handleToggleDelegationScope = async (permissionKey: string) => {
    const currentValue = delegationScopeMap.get(permissionKey) ?? false;
    await toggleScope({ permissionKey, canDelegate: !currentValue });
  };

  if (loadingMembers || loadingPerms || loadingBundles) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">{t("permissions.noMembers")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("permissions.noMembersDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedMemberId || ""}
          onValueChange={setSelectedMemberId}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue placeholder={t("permissions.selectMember")} />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    {(member.profiles as any)?.full_name || (member.profiles as any)?.email || "Unknown"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMember && (
        <div className="space-y-6">
          {/* Bundles Section - Full width, no scroll */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                {t("permissions.assignedBundles")}
              </CardTitle>
              <CardDescription>
                {t("permissions.assignedBundlesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bundles.map((bundle) => {
                  const isAssigned = memberBundleIds.has(bundle.id);
                  return (
                    <div
                      key={bundle.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        isAssigned && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{bundle.name}</p>
                        {bundle.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {bundle.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isAssigned}
                        onCheckedChange={() => handleToggleBundle(bundle.id, isAssigned)}
                        disabled={!canManagePermissions || isUpdating}
                        dir="ltr"
                      />
                    </div>
                  );
                })}
                {bundles.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 col-span-full">
                    {t("permissions.noBundles")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permission Overrides - Wide layout with collapsible modules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t("permissions.overrides")}
              </CardTitle>
              <CardDescription>
                {t("permissions.overridesDesc")}
              </CardDescription>
              {/* Search */}
              <div className="relative mt-3">
                <Search className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                  isRTL ? "right-3" : "left-3"
                )} />
                <Input
                  placeholder={t("permissions.searchPermissions")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(groupedPermissions).map(([module, permissions]) => {
                  const isExpanded = expandedModules.has(module);
                  const ModuleIcon = moduleIcons[module.toLowerCase()] || <Shield className="w-4 h-4" />;
                  
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
                                {module}
                                <Badge variant="outline" className="text-xs font-normal">
                                  {permissions.length}
                                </Badge>
                              </CardTitle>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3">
                            <div className="divide-y">
                              {permissions.map((perm) => {
                                const override = memberOverrideMap.get(perm.key);
                                const canDelegateThis = canDelegate(perm.key);

                                return (
                                  <div
                                    key={perm.key}
                                    className="flex items-center justify-between py-2.5 gap-3"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {getPermissionName(perm)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {perm.module}.{perm.resource}.{perm.action}
                                      </p>
                                    </div>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleTogglePermission(perm.key, override)}
                                          disabled={!canDelegateThis || isUpdating}
                                          className={cn(
                                            "w-24 justify-center shrink-0",
                                            override === true && "text-green-600",
                                            override === false && "text-red-600"
                                          )}
                                        >
                                          {override === true && (
                                            <>
                                              <Check className="w-4 h-4 me-1" />
                                              {t("permissions.granted")}
                                            </>
                                          )}
                                          {override === false && (
                                            <>
                                              <X className="w-4 h-4 me-1" />
                                              {t("permissions.revoked")}
                                            </>
                                          )}
                                          {override === undefined && (
                                            <span className="text-muted-foreground">
                                              {t("permissions.inherit")}
                                            </span>
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {!canDelegateThis
                                          ? t("permissions.cannotDelegate")
                                          : t("permissions.clickToToggle")}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
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
            </CardContent>
          </Card>

          {/* Delegation Scopes - Owner only, for managers */}
          {isOwner && isSelectedMemberManager && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {t("permissions.delegationScopes")}
                </CardTitle>
                <CardDescription>
                  {t("permissions.delegationScopesDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(groupedPermissions).map(([module, permissions]) => {
                    const delegatablePerms = permissions.filter((p) => p.is_delegatable !== false);
                    if (delegatablePerms.length === 0) return null;
                    
                    const ModuleIcon = moduleIcons[module.toLowerCase()] || <Shield className="w-4 h-4" />;
                    
                    return (
                      <Card key={module} className="border shadow-sm">
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm font-semibold capitalize flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                              {ModuleIcon}
                            </span>
                            {module}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="divide-y">
                            {delegatablePerms.map((perm) => {
                              const canDelegateThis = delegationScopeMap.get(perm.key) ?? false;

                              return (
                                <div
                                  key={perm.key}
                                  className="flex items-center justify-between py-2.5"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">
                                      {getPermissionName(perm)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {t("permissions.allowDelegate")}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={canDelegateThis}
                                    onCheckedChange={() => handleToggleDelegationScope(perm.key)}
                                    disabled={isUpdatingScopes}
                                    dir="ltr"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}