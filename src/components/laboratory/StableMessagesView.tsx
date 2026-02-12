import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLabRequestThreads } from "@/hooks/laboratory/useLabRequestThreads";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface StableMessagesViewProps {
  onThreadClick?: (requestId: string) => void;
}

export function StableMessagesView({ onThreadClick }: StableMessagesViewProps) {
  const { t } = useI18n();
  const { threads, loading } = useLabRequestThreads();
  const { activeTenant } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("laboratory.messages.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("laboratory.messages.subtitle")}</p>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">{t("laboratory.messages.noThreads")}</p>
            <p className="text-sm">{t("laboratory.messages.noThreadsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const isFromPartner =
              thread.last_sender_tenant_id !== activeTenant?.tenant_id;

            return (
              <Card
                key={thread.request_id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onThreadClick?.(thread.request_id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">
                          {thread.horse_name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {thread.message_count} {t("laboratory.messages.messageCount")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {thread.test_description}
                      </p>
                      <p className="text-sm text-foreground/80 line-clamp-1">
                        {isFromPartner && (
                          <span className="text-primary font-medium">
                            {t("laboratory.requests.partner")}:{" "}
                          </span>
                        )}
                        {thread.last_message_body}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                      {formatDistanceToNow(new Date(thread.last_message_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
