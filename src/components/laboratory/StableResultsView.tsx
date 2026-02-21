import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStableLabResults, type StableLabResult } from "@/hooks/laboratory/useStableLabResults";
import { useI18n } from "@/i18n";
import { Search, FlaskConical, Calendar, Building2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { StableResultViewerDialog } from "./StableResultViewerDialog";

export function StableResultsView() {
  const { t } = useI18n();
  const { results, loading } = useStableLabResults();
  const [search, setSearch] = useState("");
  const [selectedResult, setSelectedResult] = useState<StableLabResult | null>(null);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-stable-results');

  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(
      (r) =>
        r.horse_name_snapshot?.toLowerCase().includes(q) ||
        r.horse_name?.toLowerCase().includes(q) ||
        r.template_name?.toLowerCase().includes(q) ||
        r.test_description?.toLowerCase().includes(q) ||
        r.lab_tenant_name?.toLowerCase().includes(q)
    );
  }, [results, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'final':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">{t("laboratory.results.status.final")}</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">{t("laboratory.results.status.reviewed")}</Badge>;
      default:
        return <Badge variant="secondary">{t("laboratory.results.status.draft")}</Badge>;
    }
  };

  const getFlagBadge = (flags: string | null) => {
    if (!flags) return null;
    const colors: Record<string, string> = {
      normal: "bg-green-100 text-green-800 border-green-200",
      abnormal: "bg-orange-100 text-orange-800 border-orange-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    };
    return <Badge variant="outline" className={colors[flags] || ""}>{flags}</Badge>;
  };

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
              placeholder={t("laboratory.results.searchPlaceholder")}
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">{t("laboratory.stableResults.noResults")}</p>
            <p className="text-sm">{t("laboratory.stableResults.noResultsDesc")}</p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-start">
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.createSample.horse')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.preview.testType')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.results.statusFilter')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('common.date')}</th>
                <th className="py-2 px-3 font-medium text-start">{t('laboratory.stableResults.labName')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedResult(r)}
                >
                  <td className="py-2 px-3 font-medium">{r.horse_name_snapshot || r.horse_name || "—"}</td>
                  <td className="py-2 px-3 truncate max-w-[200px]">{r.template_name || r.test_description || "—"}</td>
                  <td className="py-2 px-3">{getStatusBadge(r.status)}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {r.published_at ? format(new Date(r.published_at), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{r.lab_tenant_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedResult(r)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {r.horse_name_snapshot || r.horse_name || "—"}
                  </CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    {getFlagBadge(r.flags)}
                    {getStatusBadge(r.status)}
                  </div>
                </div>
                <CardDescription className="line-clamp-1 text-xs">
                  {r.template_name || r.test_description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {r.lab_tenant_name || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {r.published_at ? format(new Date(r.published_at), "MMM d") : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedResult && (
        <StableResultViewerDialog
          result={selectedResult}
          open={!!selectedResult}
          onOpenChange={(open) => { if (!open) setSelectedResult(null); }}
        />
      )}
    </div>
  );
}
