import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Link2, Shield, Eye, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type SharingAuditLog = Database["public"]["Tables"]["sharing_audit_log"]["Row"];

interface SharingAuditLogProps {
  logs: SharingAuditLog[];
  isLoading: boolean;
  isFetching?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const eventIcons: Record<string, typeof Activity> = {
  connection_created: Link2,
  connection_accepted: CheckCircle,
  connection_revoked: XCircle,
  grant_created: Shield,
  grant_revoked: XCircle,
  data_accessed: Eye,
};

export function SharingAuditLog({ 
  logs, 
  isLoading, 
  isFetching,
  hasMore,
  onLoadMore,
}: SharingAuditLogProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{t("connections.audit.noLogs")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {logs.map((log) => {
          const Icon = eventIcons[log.event_type] || Activity;
          return (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full p-2 bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {log.event_type.replace(/_/g, " ")}
                      </Badge>
                      {log.resource_type && (
                        <Badge variant="secondary">{log.resource_type}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                    {log.resource_ids && log.resource_ids.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.resource_ids.length} {t("connections.audit.resources")}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Load More Button */}
        {hasMore && onLoadMore && (
          <div className="pt-2 pb-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              ) : null}
              {t("connections.audit.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
