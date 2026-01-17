import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Skeleton } from "@/components/ui/skeleton";
import { User, Package, Shield, Key, Check, X } from "lucide-react";
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

export function MemberPermissionsPanel() {
  const { t } = useI18n();
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

  const tenantId = activeTenant?.tenant_id;
  const isOwner = activeRole === "owner";
  const canManagePermissions = isOwner || canDelegate("admin.permissions.delegate");

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
        .neq("role", "owner") // Don't show owner in list
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

    // Toggle between: undefined (inherit) -> true (grant) -> false (revoke) -> undefined
    let newGranted: boolean;
    if (currentState === undefined) {
      newGranted = true;
    } else if (currentState === true) {
      newGranted = false;
    } else {
      // Remove override - audit is handled by trigger
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
    <div className="space-y-4">
      {/* Member selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedMemberId || ""}
          onValueChange={setSelectedMemberId}
        >
          <SelectTrigger className="w-full sm:w-64">
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
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Assigned Bundles */}
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
                <ScrollArea className="h-[min(50vh,20rem)] min-h-[12rem]">
                  <div className="space-y-2">
                    {bundles.map((bundle) => {
                      const isAssigned = memberBundleIds.has(bundle.id);
                      return (
                        <div
                          key={bundle.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            isAssigned && "border-primary bg-primary/5"
                          )}
                        >
                          <div>
                            <p className="font-medium text-sm">{bundle.name}</p>
                            {bundle.description && (
                              <p className="text-xs text-muted-foreground">
                                {bundle.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={isAssigned}
                            onCheckedChange={() =>
                              handleToggleBundle(bundle.id, isAssigned)
                            }
                            disabled={!canManagePermissions || isUpdating}
                          />
                        </div>
                      );
                    })}
                    {bundles.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("permissions.noBundles")}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Permission Overrides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t("permissions.overrides")}
                </CardTitle>
                <CardDescription>
                  {t("permissions.overridesDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[min(50vh,20rem)] min-h-[12rem]">
                  <div className="space-y-1">
                    {allDefinitions.map((perm) => {
                      const override = memberOverrideMap.get(perm.key);
                      const canDelegateThis = canDelegate(perm.key);

                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {perm.display_name}
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
                                onClick={() =>
                                  handleTogglePermission(perm.key, override)
                                }
                                disabled={!canDelegateThis || isUpdating}
                                className={cn(
                                  "w-20 justify-center",
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
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

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
                <ScrollArea className="h-[min(50vh,20rem)] min-h-[12rem]">
                  <div className="space-y-1">
                    {allDefinitions
                      .filter((perm) => perm.is_delegatable !== false)
                      .map((perm) => {
                        const canDelegateThis = delegationScopeMap.get(perm.key) ?? false;

                        return (
                          <div
                            key={perm.key}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {perm.display_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("permissions.allowDelegate")}
                              </p>
                            </div>
                            <Switch
                              checked={canDelegateThis}
                              onCheckedChange={() => handleToggleDelegationScope(perm.key)}
                              disabled={isUpdatingScopes}
                            />
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
