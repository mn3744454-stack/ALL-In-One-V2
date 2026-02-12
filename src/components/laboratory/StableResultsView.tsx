import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLabRequests, type LabRequest } from "@/hooks/laboratory/useLabRequests";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { Search, FileText, ExternalLink, FlaskConical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RequestDetailDialog } from "./RequestDetailDialog";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";

export function StableResultsView() {
  const { t } = useI18n();
  const { requests, loading } = useLabRequests();
  const { activeRole } = useTenant();
  const [search, setSearch] = useState("");
  const [detailRequest, setDetailRequest] = useState<LabRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-stable-results');

  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  const resultsWithData = useMemo(() => {
    const withResults = requests.filter(
      (r) => r.result_url || r.result_file_path
    );
    if (!search.trim()) return withResults;
    const q = search.toLowerCase();
    return withResults.filter(
      (r) =>
        r.horse?.name?.toLowerCase().includes(q) ||
        r.test_description?.toLowerCase().includes(q) ||
        r.external_lab_name?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("laboratory.stableResults.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("laboratory.stableResults.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("laboratory.requests.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
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
      </div>

      {resultsWithData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">{t("laboratory.stableResults.noResults")}</p>
            <p className="text-sm">{t("laboratory.stableResults.noResultsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-start">
                  <th className="py-2 px-3 font-medium text-start">{t('laboratory.createSample.horse')}</th>
                  <th className="py-2 px-3 font-medium text-start">{t('laboratory.requests.testDescription')}</th>
                  <th className="py-2 px-3 font-medium text-start">{t('laboratory.requests.externalLabName')}</th>
                  <th className="py-2 px-3 font-medium text-start">{t('common.date')}</th>
                  <th className="py-2 px-3 font-medium text-start">{t('laboratory.requests.viewResult')}</th>
                </tr>
              </thead>
              <tbody>
                {resultsWithData.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => { setDetailRequest(r); setDetailOpen(true); }}
                  >
                    <td className="py-2 px-3 font-medium">{r.horse?.name || "—"}</td>
                    <td className="py-2 px-3 truncate max-w-[200px]">{r.test_description}</td>
                    <td className="py-2 px-3">{r.external_lab_name || t("laboratory.requests.platformLab")}</td>
                    <td className="py-2 px-3 text-muted-foreground">{formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}</td>
                    <td className="py-2 px-3">
                      {r.result_url && (
                        <a href={r.result_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline text-xs flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {t("laboratory.requests.viewResult")}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {resultsWithData.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                setDetailRequest(r);
                setDetailOpen(true);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {r.horse?.name || "—"}
                  </CardTitle>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 shrink-0">
                    {t("laboratory.requests.status.ready")}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 text-xs">
                  {r.test_description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {r.external_lab_name || t("laboratory.requests.platformLab")}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                  </span>
                </div>
                {r.result_url && (
                  <a
                    href={r.result_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t("laboratory.requests.viewResult")}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        )
      )}

      {/* In-place detail dialog — no tab navigation */}
      {detailRequest && (
        <RequestDetailDialog
          request={detailRequest}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setDetailRequest(null);
          }}
          defaultTab="details"
          canCreateInvoice={canCreateInvoice}
          onGenerateInvoice={() => {}}
        />
      )}
    </div>
  );
}
