import { useState, useMemo } from "react";
import { useLabSamples, type LabSampleStatus, type LabSampleFilters, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useTenant } from "@/contexts/TenantContext";
import { SampleCard } from "./SampleCard";
import { SamplesTable } from "./SamplesTable";
import { SamplesFilterTabs, type SampleFilterTab } from "./SamplesFilterTabs";
import { ClientGroupedView } from "./ClientGroupedView";
import { CombinedResultsDialog } from "./CombinedResultsDialog";
import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import { DateRangeFilter } from "./DateRangeFilter";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FlaskConical, RotateCcw, PackageCheck, LayoutGrid, Users, ArrowUp, ArrowDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

type GroupViewMode = 'samples' | 'clients';
type SortOrder = 'asc' | 'desc';

interface SamplesListProps {
  onCreateSample?: () => void;
  onSampleClick?: (sampleId: string) => void;
}

// Map filter tabs to useLabSamples filters
const getFiltersForTab = (tab: SampleFilterTab): Partial<LabSampleFilters> => {
  switch (tab) {
    case 'today':
      return { collectionDateToday: true };
    case 'received':
      return { status: 'accessioned' };
    case 'unreceived':
      return { status: 'draft' };
    case 'retest':
      return { isRetest: true };
    case 'all':
    default:
      return {};
  }
};

export function SamplesList({ onCreateSample, onSampleClick }: SamplesListProps) {
  const { t, dir } = useI18n();
  const { activeRole } = useTenant();
  const [activeTab, setActiveTab] = useState<SampleFilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<LabSampleStatus | 'all'>('all');
  const [search, setSearch] = useState("");
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>(() => {
    const saved = localStorage.getItem('lab-samples-group-view-mode');
    return (saved === 'clients' ? 'clients' : 'samples') as GroupViewMode;
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem('lab-samples-sort-order');
    return (saved === 'asc' ? 'asc' : 'desc') as SortOrder;
  });
  const [combinedResultsSample, setCombinedResultsSample] = useState<LabSample | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedSampleForInvoice, setSelectedSampleForInvoice] = useState<LabSample | null>(null);
  
  // Date range filters
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  
  // View preference (Grid/List/Table)
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-samples');

  // Permission check for invoice creation
  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  const handleGroupViewModeChange = (mode: GroupViewMode) => {
    setGroupViewMode(mode);
    localStorage.setItem('lab-samples-group-view-mode', mode);
  };

  const handleSortOrderChange = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    localStorage.setItem('lab-samples-sort-order', newOrder);
  };

  const handleGenerateInvoice = (sample: LabSample) => {
    setSelectedSampleForInvoice(sample);
    setInvoiceDialogOpen(true);
  };

  // Get tab-based filters
  const tabFilters = getFiltersForTab(activeTab);

  const { 
    samples, 
    loading, 
    canManage,
    accessionSample,
    startProcessing,
    completeSample,
    cancelSample,
    createRetest,
  } = useLabSamples({ 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
    dateFrom,
    dateTo,
    ...tabFilters,
  });

  // Fetch all results to calculate progress per sample
  const { results, reviewResult, finalizeResult } = useLabResults();

  // Create a map of sample_id -> results count
  const resultsCountBySample = useMemo(() => {
    const countMap: Record<string, number> = {};
    results.forEach(r => {
      countMap[r.sample_id] = (countMap[r.sample_id] || 0) + 1;
    });
    return countMap;
  }, [results]);

  // Sort samples based on daily_number
  const sortedSamples = useMemo(() => {
    return [...samples].sort((a, b) => {
      const aNum = (a as any).daily_number || 0;
      const bNum = (b as any).daily_number || 0;
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [samples, sortOrder]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-40" />
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
    <div className="space-y-3">
      {/* View Mode Toggle + Sort */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ToggleGroup 
            type="single" 
            value={groupViewMode}
            onValueChange={(v) => v && handleGroupViewModeChange(v as GroupViewMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="samples" 
              aria-label={t("laboratory.clientGrouped.viewBySamples")}
              className="flex-1 h-9 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <LayoutGrid className="h-4 w-4 me-1.5" />
              <span className="text-sm hidden sm:inline">{t("laboratory.clientGrouped.viewBySamples")}</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="clients" 
              aria-label={t("laboratory.clientGrouped.viewByClients")}
              className="flex-1 h-9 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Users className="h-4 w-4 me-1.5" />
              <span className="text-sm hidden sm:inline">{t("laboratory.clientGrouped.viewByClients")}</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          {/* ViewSwitcher for Grid/List/Table */}
          {groupViewMode === 'samples' && (
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={handleSortOrderChange}
        >
          {sortOrder === 'asc' ? (
            <>
              <ArrowUp className="h-4 w-4 me-1.5" />
              <span className="hidden sm:inline">{t("laboratory.clientGrouped.sortAsc")}</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 me-1.5" />
              <span className="hidden sm:inline">{t("laboratory.clientGrouped.sortDesc")}</span>
            </>
          )}
        </Button>
      </div>

      {/* Quick Filter Tabs */}
      <SamplesFilterTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />

      {/* Date Range Filters */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {/* Secondary Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              dir === 'rtl' ? 'right-3' : 'left-3'
            )} />
            <Input
              placeholder={t("laboratory.samples.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(dir === 'rtl' ? 'pr-9' : 'pl-9')}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LabSampleStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("laboratory.samples.statusFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("laboratory.samples.allStatus")}</SelectItem>
              <SelectItem value="draft">{t("laboratory.sampleStatus.draft")}</SelectItem>
              <SelectItem value="accessioned">{t("laboratory.sampleStatus.accessioned")}</SelectItem>
              <SelectItem value="processing">{t("laboratory.sampleStatus.processing")}</SelectItem>
              <SelectItem value="completed">{t("laboratory.sampleStatus.completed")}</SelectItem>
              <SelectItem value="cancelled">{t("laboratory.sampleStatus.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage && onCreateSample && (
          <Button onClick={onCreateSample}>
            <Plus className="h-4 w-4 me-2" />
            {t("laboratory.samples.newSample")}
          </Button>
        )}
      </div>

      {/* Content based on view mode */}
      {sortedSamples.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t("laboratory.samples.noSamplesFound")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab !== 'all' || statusFilter !== 'all' || search || dateFrom || dateTo
              ? t("laboratory.samples.adjustFilters")
              : t("laboratory.samples.createFirst")}
          </p>
          {canManage && onCreateSample && !search && statusFilter === 'all' && activeTab === 'all' && !dateFrom && !dateTo && (
            <Button onClick={onCreateSample} className="mt-4">
              <Plus className="h-4 w-4 me-2" />
              {t("laboratory.samples.createSample")}
            </Button>
          )}
        </div>
      ) : groupViewMode === 'clients' ? (
        <ClientGroupedView 
          samples={sortedSamples} 
          onSampleClick={onSampleClick}
        />
      ) : viewMode === 'table' ? (
        <SamplesTable
          samples={sortedSamples}
          canManage={canManage}
          canCreateInvoice={canCreateInvoice}
          resultsCountBySample={resultsCountBySample}
          onSampleClick={onSampleClick}
          onAccession={(sample) => accessionSample(sample.id)}
          onStartProcessing={(sample) => startProcessing(sample.id)}
          onComplete={(sample) => completeSample(sample.id)}
          onCancel={(sample) => cancelSample(sample.id)}
          onRetest={(sample) => createRetest(sample.id)}
          onViewAllResults={(sample) => setCombinedResultsSample(sample)}
          onGenerateInvoice={handleGenerateInvoice}
        />
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {sortedSamples.map((sample) => {
            const isRetest = sample.retest_of_sample_id !== null;
            const isReceived = sample.received_at !== null;

            return (
              <div key={sample.id} className="relative">
                <div className={cn(
                  "absolute top-2 z-10 flex gap-1",
                  dir === 'rtl' ? 'left-2' : 'right-2'
                )}>
                  {isReceived && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      <PackageCheck className="h-3 w-3 me-1" />
                      {t("laboratory.samples.received")}
                    </Badge>
                  )}
                  {isRetest && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
                      <RotateCcw className="h-3 w-3 me-1" />
                      {t("laboratory.samples.retest")}
                    </Badge>
                  )}
                </div>
                <SampleCard
                  sample={sample}
                  canManage={canManage}
                  canCreateInvoice={canCreateInvoice}
                  completedResultsCount={resultsCountBySample[sample.id] || 0}
                  onAccession={() => accessionSample(sample.id)}
                  onStartProcessing={() => startProcessing(sample.id)}
                  onComplete={() => completeSample(sample.id)}
                  onCancel={() => cancelSample(sample.id)}
                  onRetest={() => createRetest(sample.id)}
                  onClick={() => onSampleClick?.(sample.id)}
                  onViewAllResults={() => setCombinedResultsSample(sample)}
                  onGenerateInvoice={() => handleGenerateInvoice(sample)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Combined Results Dialog */}
      <CombinedResultsDialog
        open={!!combinedResultsSample}
        onOpenChange={(open) => !open && setCombinedResultsSample(null)}
        sample={combinedResultsSample}
        onReviewResult={reviewResult}
        onFinalizeResult={finalizeResult}
      />

      {/* Generate Invoice Dialog */}
      {selectedSampleForInvoice && (
        <GenerateInvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          sourceType="lab_sample"
          sample={selectedSampleForInvoice}
        />
      )}
    </div>
  );
}
