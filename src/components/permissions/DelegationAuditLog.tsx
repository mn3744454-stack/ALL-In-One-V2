import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, User, ArrowRight, Check, X, Package } from "lucide-react";
import { useI18n } from "@/i18n";
import { usePermissionBundles, type DelegationAuditLog as AuditLogEntry } from "@/hooks/usePermissionBundles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function DelegationAuditLog() {
  const { t } = useI18n();
  const { auditLog, loading } = usePermissionBundles();

  // Fetch profile names for actors and targets
  const userIds = [
    ...new Set([
      ...auditLog.map((e) => e.actor_user_id),
      ...auditLog.map((e) => e.target_member_id),
    ]),
  ];

  const { data: profiles = {} } = useQuery({
    queryKey: ["audit-log-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      // Get actor profiles
      const { data: actorData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", auditLog.map((e) => e.actor_user_id));

      // Get target member profiles via tenant_members
      const { data: memberData } = await supabase
        .from("tenant_members")
        .select("id, profiles:user_id(full_name, email)")
        .in("id", auditLog.map((e) => e.target_member_id));

      const profileMap: Record<string, string> = {};

      (actorData || []).forEach((p) => {
        profileMap[`actor_${p.id}`] = p.full_name || p.email || "Unknown";
      });

      (memberData || []).forEach((m) => {
        const profile = m.profiles as any;
        profileMap[`target_${m.id}`] = profile?.full_name || profile?.email || "Unknown";
      });

      return profileMap;
    },
    enabled: auditLog.length > 0,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "granted":
        return <Check className="w-4 h-4 text-green-600" />;
      case "revoked":
        return <X className="w-4 h-4 text-red-600" />;
      case "bundle_assigned":
        return <Package className="w-4 h-4 text-blue-600" />;
      case "bundle_removed":
        return <Package className="w-4 h-4 text-orange-600" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "granted":
        return "default" as const;
      case "revoked":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          {t("permissions.auditLog")}
        </CardTitle>
        <CardDescription>
          {t("permissions.auditLogDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {auditLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("permissions.noAuditLogs")}</p>
          </div>
        ) : (
          <ScrollArea className="h-72">
            <div className="space-y-3">
              {auditLog.map((entry) => {
                const actorName = profiles[`actor_${entry.actor_user_id}`] || "Unknown";
                const targetName = profiles[`target_${entry.target_member_id}`] || "Unknown";

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-background"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{actorName}</span>
                        <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                          {t(`permissions.actions.${entry.action}`)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {entry.permission_key}
                        </code>
                        {" "}
                        {t("permissions.to")} <span className="font-medium">{targetName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
