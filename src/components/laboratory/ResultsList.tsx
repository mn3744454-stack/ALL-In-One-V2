import { useState, useMemo } from "react";
import { useLabResults, type LabResultStatus, type LabResultFlags, type LabResult } from "@/hooks/laboratory/useLabResults";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { ResultsFilterTabs, type ResultFilterTab } from "./ResultsFilterTabs";
import { ResultsClientGroupedView } from "./ResultsClientGroupedView";
import { CombinedResultsDialog } from "./CombinedResultsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  CheckCircle2, 
  Eye,
  Calendar,
  FlaskConical,
  AlertTriangle,
  Users,
  LayoutGrid,
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

type ViewMode = 'samples' | 'clients';

export function ResultsList({ onCreateResult, onResultClick }: ResultsListProps) {
  const { t, dir } = useI18n();
  const [viewMode, setViewMode] = useState<ViewMode>('samples');
  const [activeTab, setActiveTab] = useState<ResultFilterTab>('all');
  const [flagsFilter, setFlagsFilter] = useState<LabResultFlags | 'all'>('all');
  const [search, setSearch] = useState("");
  const [selectedSample, setSelectedSample] = useState<LabSample | null>(null);

  // Get status filter from tab
  const getStatusFromTab = (tab: ResultFilterTab): LabResultStatus | undefined => {
    if (tab === 'draft') return 'draft';
    if (tab === 'reviewed') return 'reviewed';
    if (tab === 'final') return 'final';
    return undefined;
  };

  const { 
    results, 
    loading: resultsLoading, 
    canManage,
    reviewResult,
    finalizeResult,
  } = useLabResults({ 
    status: getStatusFromTab(activeTab),
    flags: flagsFilter !== 'all' ? flagsFilter : undefined,
  });

  // Also fetch samples to get template counts
  const { samples, loading: samplesLoading } = useLabSamples();

  const loading = resultsLoading || samplesLoading;

  // Group results by sample
  const samplesWithResults = useMemo((): SampleWithResults[] => {
    // Create a map of sample_id -> results
    const resultsBySample = new Map<string, LabResult[]>();
    results.forEach(r => {
      const existing = resultsBySample.get(r.sample_id) || [];
      existing.push(r);
      resultsBySample.set(r.sample_id, existing);
    });

    // Create sample groups
    const groups: SampleWithResults[] = [];
    
    // Get unique sample IDs from results
    const sampleIds = new Set(results.map(r => r.sample_id));
    
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

    // Sort by most recent result
    groups.sort((a, b) => {
      const aDate = a.results[0]?.created_at || '';
      const bDate = b.results[0]?.created_at || '';
      return bDate.localeCompare(aDate);
    });

    return groups;
  }, [results, samples]);

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

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(g => {
        const horseName = g.sample.horse?.name?.toLowerCase() || '';
        const sampleId = g.sample.physical_sample_id?.toLowerCase() || '';
        const templateNames = g.results
          .map(r => r.template?.name?.toLowerCase() || '')
          .join(' ');
        return horseName.includes(searchLower) || 
               sampleId.includes(searchLower) || 
               templateNames.includes(searchLower);
      });
    }

    return filtered;
  }, [samplesWithResults, activeTab, search]);

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
      <div className="space-y-4">
        {/* View Mode Toggle - separate row */}
        <div className="flex justify-end gap-1">
          <Toggle
            pressed={viewMode === 'samples'}
            onPressedChange={() => setViewMode('samples')}
            size="sm"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <LayoutGrid className="h-4 w-4 me-1" />
            {t("laboratory.results.viewBySamples")}
          </Toggle>
          <Toggle
            pressed={viewMode === 'clients'}
            onPressedChange={() => setViewMode('clients')}
            size="sm"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Users className="h-4 w-4 me-1" />
            {t("laboratory.results.viewByClients")}
          </Toggle>
        </div>

        {/* Filter Tabs */}
        <ResultsFilterTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />

        {/* Secondary Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              dir === 'rtl' ? 'right-3' : 'left-3'
            )} />
            <Input
              placeholder={t("laboratory.results.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(dir === 'rtl' ? 'pr-9' : 'pl-9')}
            />
          </div>
          {canManage && onCreateResult && (
            <Button onClick={onCreateResult}>
              <Plus className="h-4 w-4 me-2" />
              {t("laboratory.results.newResult")}
            </Button>
          )}
        </div>

        {/* Client Grouped View */}
        {viewMode === 'clients' && (
          <ResultsClientGroupedView 
            results={results}
            samples={samples}
            onSampleClick={(sampleId) => {
              const sample = samples.find(s => s.id === sampleId);
              if (sample) setSelectedSample(sample);
            }}
          />
        )}

        {/* Results Grid - Sample-centric */}
        {viewMode === 'samples' && filteredGroups.length === 0 && (
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

        {viewMode === 'samples' && filteredGroups.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const { sample, results: sampleResults, templateCount, completedCount } = group;
              const horseName = sample.horse?.name || t("laboratory.results.unknownHorse");
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
                      <div className="flex items-center gap-2">
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedSample(sample); }}>
                                <Eye className="h-4 w-4 me-2" />
                                {t("laboratory.samples.viewAllResults")}
                              </DropdownMenuItem>
                              {group.hasDraft && (
                                <DropdownMenuItem 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    sampleResults
                                      .filter(r => r.status === 'draft')
                                      .forEach(r => reviewResult(r.id));
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 me-2" />
                                  {t("laboratory.resultActions.markReviewed")}
                                </DropdownMenuItem>
                              )}
                              {group.hasReviewed && !group.allFinal && (
                                <DropdownMenuItem 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    sampleResults
                                      .filter(r => r.status === 'reviewed')
                                      .forEach(r => finalizeResult(r.id));
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 me-2" />
                                  {t("laboratory.resultActions.finalize")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
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