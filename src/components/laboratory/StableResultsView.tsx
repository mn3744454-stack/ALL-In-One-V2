import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStableLabResults, type StableResultGroup, type StableHorseGroup } from "@/hooks/laboratory/useStableLabResults";
import { useI18n } from "@/i18n";
import { Search, FlaskConical, Calendar, Building2, ChevronDown, ChevronRight, FileStack } from "lucide-react";
import { format } from "date-fns";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { StableResultViewerDialog } from "./StableResultViewerDialog";

export function StableResultsView() {
  const { t } = useI18n();
  const { horseGroups, loading } = useStableLabResults();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<StableResultGroup | null>(null);
  const [openHorses, setOpenHorses] = useState<Set<string>>(new Set());
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-stable-results');

  // Initialize all horse sections as open
  useMemo(() => {
    if (horseGroups.length > 0 && openHorses.size === 0) {
      setOpenHorses(new Set(horseGroups.map(h => h.horseId || h.horseName)));
    }
  }, [horseGroups]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return horseGroups;
    const q = search.toLowerCase();
    return horseGroups
      .map((hg) => ({
        ...hg,
        sampleGroups: hg.sampleGroups.filter((sg) =>
          sg.horseName.toLowerCase().includes(q) ||
          sg.labName.toLowerCase().includes(q) ||
          sg.testDescription?.toLowerCase().includes(q) ||
          sg.results.some(r =>
            r.template_name?.toLowerCase().includes(q)
          )
        ),
      }))
      .filter((hg) => hg.sampleGroups.length > 0);
  }, [horseGroups, search]);

  const toggleHorse = (key: string) => {
    setOpenHorses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">{t("laboratory.stableResults.noResults")}</p>
            <p className="text-sm">{t("laboratory.stableResults.noResultsDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((horseGroup) => {
            const horseKey = horseGroup.horseId || horseGroup.horseName;
            const isOpen = openHorses.has(horseKey);

            return (
              <Collapsible key={horseKey} open={isOpen} onOpenChange={() => toggleHorse(horseKey)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-start py-2 px-1 hover:bg-muted/50 rounded-lg transition-colors">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-base">{horseGroup.horseName}</span>
                  <Badge variant="outline" className="text-xs">
                    {horseGroup.sampleGroups.length} {horseGroup.sampleGroups.length === 1 ? 'report' : 'reports'}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {viewMode === 'table' ? (
                    <SampleGroupTable groups={horseGroup.sampleGroups} onSelect={setSelectedGroup} getStatusBadge={getStatusBadge} />
                  ) : (
                    <div className={getGridClass(gridColumns, viewMode)}>
                      {horseGroup.sampleGroups.map((sg) => (
                        <SampleGroupCard key={sg.groupKey} group={sg} onSelect={setSelectedGroup} getStatusBadge={getStatusBadge} />
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {selectedGroup && (
        <StableResultViewerDialog
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => { if (!open) setSelectedGroup(null); }}
        />
      )}
    </div>
  );
}

function SampleGroupCard({
  group,
  onSelect,
  getStatusBadge,
}: {
  group: StableResultGroup;
  onSelect: (g: StableResultGroup) => void;
  getStatusBadge: (s: string) => React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onSelect(group)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium truncate">
            {group.testDescription || t("laboratory.results.unknownTest")}
          </CardTitle>
          {getStatusBadge(group.overallStatus)}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Template chips */}
        <div className="flex flex-wrap gap-1">
          {group.results.map((r) => (
            <Badge key={r.id} variant="outline" className="text-xs">
              {r.template_name || "Result"}
            </Badge>
          ))}
          <Badge variant="secondary" className="text-xs">
            <FileStack className="h-3 w-3 me-1" />
            {group.results.length}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {group.labName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {group.publishedAt ? format(new Date(group.publishedAt), "MMM d") : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SampleGroupTable({
  groups,
  onSelect,
  getStatusBadge,
}: {
  groups: StableResultGroup[];
  onSelect: (g: StableResultGroup) => void;
  getStatusBadge: (s: string) => React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-start">
            <th className="py-2 px-3 font-medium text-start">{t('laboratory.preview.testType')}</th>
            <th className="py-2 px-3 font-medium text-start">{t('laboratory.results.statusFilter')}</th>
            <th className="py-2 px-3 font-medium text-start">Tests</th>
            <th className="py-2 px-3 font-medium text-start">{t('common.date')}</th>
            <th className="py-2 px-3 font-medium text-start">{t('laboratory.stableResults.labName')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((sg) => (
            <tr
              key={sg.groupKey}
              className="border-b hover:bg-muted/50 cursor-pointer"
              onClick={() => onSelect(sg)}
            >
              <td className="py-2 px-3 font-medium">{sg.testDescription || "—"}</td>
              <td className="py-2 px-3">{getStatusBadge(sg.overallStatus)}</td>
              <td className="py-2 px-3">
                <Badge variant="secondary" className="text-xs">{sg.results.length}</Badge>
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {sg.publishedAt ? format(new Date(sg.publishedAt), "MMM d, yyyy") : "—"}
              </td>
              <td className="py-2 px-3 text-muted-foreground">{sg.labName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
