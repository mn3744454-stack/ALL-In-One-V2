import { useState, useMemo, useCallback } from "react";
import { useLabResults, type LabResultStatus, type LabResultFlags, type LabResult } from "@/hooks/laboratory/useLabResults";
import { PublishToStableAction } from "./PublishToStableAction";
import { useLabSamples, type LabSample, type LabSampleStatus } from "@/hooks/laboratory/useLabSamples";
import { ResultsFilterTabs, type ResultFilterTab } from "./ResultsFilterTabs";
import { ResultsClientGroupedView } from "./ResultsClientGroupedView";
import { CombinedResultsDialog } from "./CombinedResultsDialog";
import { ResultsTable } from "./ResultsTable";
import { AdvancedFilters } from "./AdvancedFilters";
import { ViewSwitcher, getGridClass, type ViewMode as DisplayMode } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  FileText, 
  CheckCircle2, 
  Eye,
  Calendar,
  FlaskConical,
  AlertTriangle,
  Users,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface ResultsListProps {
  onCreateResult?: () => void;
  onResultClick?: (resultId: string) => void;
}

// Group results by sample
interface SampleWithResults {
  sample: LabSample;
  results: LabResult[];
  templateCount: number;
  completedCount: number;
  hasDraft: boolean;
  hasReviewed: boolean;
  allFinal: boolean;
}

type GroupViewMode = 'samples' | 'clients';
type SortOrder = 'asc' | 'desc';

export function ResultsList({ onCreateResult, onResultClick }: ResultsListProps) {
  const { t, dir } = useI18n();
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>('samples');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeTab, setActiveTab] = useState<ResultFilterTab>('all');
  const [search, setSearch] = useState("");
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(null);
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [horseId, setHorseId] = useState<string | undefined>(undefined);
  const [selectedStatuses, setSelectedStatuses] = useState<LabSampleStatus[]>([]);
  
  // View preference (Grid/List/Table)
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-results');

  // Status options for result statuses (different from sample)
  const statusOptions: { value: LabSampleStatus; label: string }[] = [
    { value: 'draft' as LabSampleStatus, label: t("laboratory.resultStatus.draft") },
    { value: 'processing' as LabSampleStatus, label: t("laboratory.resultStatus.reviewed") },
    { value: 'completed' as LabSampleStatus, label: t("laboratory.resultStatus.final") },
  ];

  // Get status filter from tab
  const getStatusFromTab = (tab: ResultFilterTab): LabResultStatus | undefined => {
    if (tab === 'draft') return 'draft';
    if (tab === 'reviewed') return 'reviewed';
    if (tab === 'final') return 'final';
    return undefined;
  };

  const handleClearAllFilters = useCallback(() => {
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setClientId(undefined);
    setHorseId(undefined);
    setSelectedStatuses([]);
  }, []);

  const { 
    results: rawResults, 
    loading: resultsLoading, 
    canManage,
    reviewResult,
    finalizeResult,
    publishToStable,
  } = useLabResults({ 
    status: getStatusFromTab(activeTab),
    dateFrom,
    dateTo,
  });

  // Also fetch samples to get template counts
  const { samples, loading: samplesLoading } = useLabSamples();

  const loading = resultsLoading || samplesLoading;

  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Apply client/horse filters client-side and group results by sample
  const samplesWithResults = useMemo((): SampleWithResults[] => {
    // Filter results first
    let filteredResults = rawResults;
    
    // Client filter
    if (clientId) {
      filteredResults = filteredResults.filter(r => {
        const sample = samples.find(s => s.id === r.sample_id);
        return sample?.client_id === clientId;
      });
    }
    
    // Horse filter
    if (horseId) {
      filteredResults = filteredResults.filter(r => {
        const sample = samples.find(s => s.id === r.sample_id);
        return sample?.horse_id === horseId;
      });
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResults = filteredResults.filter(r => {
        const sample = samples.find(s => s.id === r.sample_id);
        const horseName = sample?.horse?.name?.toLowerCase() || (sample as any)?.horse_name?.toLowerCase() || '';
        const sampleId = sample?.physical_sample_id?.toLowerCase() || '';
        const templateName = r.template?.name?.toLowerCase() || '';
        return horseName.includes(searchLower) || 
               sampleId.includes(searchLower) || 
               templateName.includes(searchLower);
      });
    }
    
    // Create a map of sample_id -> results
    const resultsBySample = new Map<string, LabResult[]>();
    filteredResults.forEach(r => {
      const existing = resultsBySample.get(r.sample_id) || [];
      existing.push(r);
      resultsBySample.set(r.sample_id, existing);
    });

    // Create sample groups
    const groups: SampleWithResults[] = [];
    
    // Get unique sample IDs from results
    const sampleIds = new Set(filteredResults.map(r => r.sample_id));
    
    sampleIds.forEach(sampleId => {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;

      const sampleResults = resultsBySample.get(sampleId) || [];
      const templateCount = sample.templates?.length || 0;
      const completedCount = sampleResults.length;
      
      groups.push({
        sample,
        results: sampleResults,
        templateCount,
        completedCount,
        hasDraft: sampleResults.some(r => r.status === 'draft'),
        hasReviewed: sampleResults.some(r => r.status === 'reviewed'),
        allFinal: sampleResults.length > 0 && sampleResults.every(r => r.status === 'final'),
      });
    });

    // Sort by daily_number
    groups.sort((a, b) => {
      const aNum = (a.sample as any).daily_number || 0;
      const bNum = (b.sample as any).daily_number || 0;
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return groups;
  }, [rawResults, samples, sortOrder, clientId, horseId, search]);

  // Filter by "today" tab
  const filteredGroups = useMemo(() => {
    let filtered = samplesWithResults;

    // Filter by today
    if (activeTab === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(g => {
        const resultDate = new Date(g.results[0]?.created_at || '');
        resultDate.setHours(0, 0, 0, 0);
        return resultDate.getTime() === today.getTime();
      });
    }

    return filtered;
  }, [samplesWithResults, activeTab]);

  const getOverallStatus = (group: SampleWithResults): { label: string; color: string } => {
    if (group.allFinal) {
      return { label: t("laboratory.resultStatus.final"), color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
    }
    if (group.hasReviewed) {
      return { label: t("laboratory.resultStatus.reviewed"), color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" };
    }
    if (group.hasDraft) {
      return { label: t("laboratory.resultStatus.draft"), color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" };
    }
    return { label: t("laboratory.resultStatus.draft"), color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* View Mode Toggle + Sort - aligned with filter tabs */}
        <div className="flex items-center justify-between gap-2">
          <ToggleGroup 
            type="single" 
            value={groupViewMode}
            onValueChange={(v) => v && setGroupViewMode(v as GroupViewMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="samples" 
              aria-label={t("laboratory.results.viewBySamples")}
              className="flex-1 h-9 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4 me-1.5" />
              <span className="text-sm">{t("laboratory.results.viewBySamples")}</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="clients" 
              aria-label={t("laboratory.results.viewByClients")}
              className="flex-1 h-9 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Users className="h-4 w-4 me-1.5" />
              <span className="text-sm">{t("laboratory.results.viewByClients")}</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={handleSortOrderChange}
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowUp className="h-4 w-4 me-1.5" />
                <span className="hidden sm:inline">{t("common.sortAsc")}</span>
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4 me-1.5" />
                <span className="hidden sm:inline">{t("common.sortDesc")}</span>
              </>
            )}
          </Button>
        </div>

        {/* Filter Tabs */}
        <ResultsFilterTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />

        {/* Advanced Filters */}
        <AdvancedFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("laboratory.results.searchPlaceholder")}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          clientId={clientId}
          onClientChange={setClientId}
          horseId={horseId}
          onHorseChange={setHorseId}
          selectedStatuses={selectedStatuses}
          onStatusesChange={setSelectedStatuses}
          statusOptions={statusOptions}
          onClearAll={handleClearAllFilters}
        />

        {/* Create Button */}
        {canManage && onCreateResult && (
          <div className="flex justify-end">
            <Button onClick={onCreateResult}>
              <Plus className="h-4 w-4 me-2" />
              {t("laboratory.results.newResult")}
            </Button>
          </div>
        )}

        {/* Client Grouped View */}
        {groupViewMode === 'clients' && (
          <ResultsClientGroupedView 
            results={rawResults}
            samples={samples}
            onSampleClick={(sampleId) => {
              const sample = samples.find(s => s.id === sampleId);
              if (sample) setSelectedSample(sample);
            }}
          />
        )}

        {/* Results Grid - Sample-centric */}
        {groupViewMode === 'samples' && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t("laboratory.results.noResultsFound")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab !== 'all' || search 
                ? t("laboratory.results.adjustFilters")
                : t("laboratory.results.createFirst")}
            </p>
            {canManage && onCreateResult && !search && activeTab === 'all' && (
              <Button onClick={onCreateResult} className="mt-4">
                <Plus className="h-4 w-4 me-2" />
                {t("laboratory.results.enterResult")}
              </Button>
            )}
          </div>
        )}

        {groupViewMode === 'samples' && filteredGroups.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const { sample, results: sampleResults, templateCount, completedCount } = group;
              const horseName = sample.horse?.name || (sample as any).horse_name || t("laboratory.results.unknownHorse");
              const horseInitials = horseName.slice(0, 2).toUpperCase();
              const progressPercent = templateCount > 0 ? (completedCount / templateCount) * 100 : 0;
              const status = getOverallStatus(group);

              return (
                <Card 
                  key={sample.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedSample(sample)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Daily Number Badge */}
                        {(sample as any).daily_number && (
                          <div className="flex items-center justify-center min-w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                            #{(sample as any).daily_number}
                          </div>
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={sample.horse?.avatar_url || undefined} alt={horseName} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {horseInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm">{horseName}</h3>
                          {sample.physical_sample_id && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {sample.physical_sample_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Templates badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {sampleResults.map((result) => (
                        <Badge 
                          key={result.id} 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            result.status === 'final' && "border-green-300 bg-green-50 dark:bg-green-900/20",
                            result.status === 'reviewed' && "border-blue-300 bg-blue-50 dark:bg-blue-900/20",
                            result.status === 'draft' && "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20"
                          )}
                        >
                          <FileText className="h-3 w-3 me-1" />
                          {result.template?.name_ar || result.template?.name}
                          {result.flags && result.flags !== 'normal' && (
                            <AlertTriangle className="h-3 w-3 ms-1 text-orange-500" />
                          )}
                        </Badge>
                      ))}
                    </div>

                    {/* Progress */}
                    {templateCount > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">{t("laboratory.samples.resultsProgress")}</span>
                          <span className="text-xs text-muted-foreground">
                            {completedCount}/{templateCount}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(sampleResults[0]?.created_at || sample.collection_date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" />
                        <span>{sampleResults.length} {t("laboratory.results.newResult").toLowerCase()}</span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Action Buttons - visible instead of dropdown */}
                  {canManage && (
                    <CardFooter className="pt-3 border-t flex flex-wrap gap-1.5 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedSample(sample); }}
                      >
                        <Eye className="h-3 w-3 me-1" />
                        {t("laboratory.samples.viewAllResults")}
                      </Button>
                      {group.hasDraft && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            sampleResults
                              .filter(r => r.status === 'draft')
                              .forEach(r => reviewResult(r.id));
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 me-1" />
                          {t("laboratory.resultActions.markReviewed")}
                        </Button>
                      )}
                      {group.hasReviewed && !group.allFinal && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            sampleResults
                              .filter(r => r.status === 'reviewed')
                              .forEach(r => finalizeResult(r.id));
                          }}
                        >
                          <Lock className="h-3 w-3 me-1" />
                          {t("laboratory.resultActions.finalize")}
                        </Button>
                      )}
                      {/* Publish to Stable - per result */}
                      {sampleResults
                        .filter(r => (r.status === 'reviewed' || r.status === 'final') && !!r.sample?.lab_request_id && !r.published_to_stable)
                        .length > 0 && (
                        <PublishToStableAction
                          resultId={sampleResults.filter(r => (r.status === 'reviewed' || r.status === 'final') && !!r.sample?.lab_request_id && !r.published_to_stable)[0].id}
                          status={sampleResults.filter(r => (r.status === 'reviewed' || r.status === 'final') && !!r.sample?.lab_request_id && !r.published_to_stable)[0].status}
                          published_to_stable={false}
                          sample_lab_request_id={sampleResults[0]?.sample?.lab_request_id}
                          onPublish={async (id) => {
                            // Publish all eligible results for this sample
                            const eligible = sampleResults.filter(r => (r.status === 'reviewed' || r.status === 'final') && !!r.sample?.lab_request_id && !r.published_to_stable);
                            let allOk = true;
                            for (const r of eligible) {
                              const ok = await publishToStable(r.id);
                              if (!ok) allOk = false;
                            }
                            return allOk;
                          }}
                          compact
                        />
                      )}
                      {/* Show published badge if all eligible are published */}
                      {sampleResults.some(r => r.published_to_stable) && 
                       !sampleResults.some(r => (r.status === 'reviewed' || r.status === 'final') && !!r.sample?.lab_request_id && !r.published_to_stable) && (
                        <PublishToStableAction
                          resultId={sampleResults[0].id}
                          status={sampleResults[0].status}
                          published_to_stable={true}
                          sample_lab_request_id={sampleResults[0]?.sample?.lab_request_id}
                          onPublish={publishToStable}
                          compact
                        />
                      )}
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Combined Results Dialog */}
      <CombinedResultsDialog
        open={!!selectedSample}
        onOpenChange={(open) => !open && setSelectedSample(null)}
        sample={selectedSample}
        onReviewResult={reviewResult}
        onFinalizeResult={finalizeResult}
      />
    </>
  );
}
