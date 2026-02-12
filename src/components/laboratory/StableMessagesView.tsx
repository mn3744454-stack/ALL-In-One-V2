import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLabRequestThreads } from "@/hooks/laboratory/useLabRequestThreads";
import { useLabRequests, type LabRequest } from "@/hooks/laboratory/useLabRequests";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { RequestDetailDialog } from "./RequestDetailDialog";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";

export function StableMessagesView() {
  const { t } = useI18n();
  const { threads, loading } = useLabRequestThreads();
  const { activeTenant, activeRole } = useTenant();
  const { requests } = useLabRequests();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-messages');

  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  const detailRequest: LabRequest | null = useMemo(() => {
    if (!selectedRequestId) return null;
    return requests.find(r => r.id === selectedRequestId) || null;
  }, [selectedRequestId, requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("laboratory.messages.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("laboratory.messages.subtitle")}</p>
        </div>
        <div className="hidden lg:flex">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable
            showLabels={false}
          />
        </div>
      </div>

      {threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">{t("laboratory.messages.noThreads")}</p>
            <p className="text-sm">{t("laboratory.messages.noThreadsDesc")}</p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-start">
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.createSample.horse')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.requests.testDescription')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.requests.messages')}</th>
                <th className="py-2 px-3 font-medium text-start">#</th>
                <th className="py-2 px-3 font-medium text-start">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr
                  key={thread.request_id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => { setSelectedRequestId(thread.request_id); setDetailOpen(true); }}
                >
                  <td className="py-2 px-3 font-medium">{thread.horse_name}</td>
                  <td className="py-2 px-3 truncate max-w-[200px]">{thread.test_description}</td>
                  <td className="py-2 px-3 truncate max-w-[250px] text-muted-foreground">{thread.last_message_body}</td>
                  <td className="py-2 px-3">
                    <Badge variant="secondary" className="text-[10px]">{thread.message_count}</Badge>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {threads.map((thread) => {
            const isFromPartner =
              thread.last_sender_tenant_id !== activeTenant?.tenant_id;

            return (
              <Card
                key={thread.request_id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedRequestId(thread.request_id);
                  setDetailOpen(true);
                }}
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

      {/* In-place detail dialog — opens on thread tab, no tab navigation */}
      {detailRequest && (
        <RequestDetailDialog
          request={detailRequest}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedRequestId(null);
          }}
          defaultTab="thread"
          canCreateInvoice={canCreateInvoice}
          onGenerateInvoice={() => {}}
        />
      )}
    </div>
  );
}
