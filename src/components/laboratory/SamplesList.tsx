import { useState, useMemo, useCallback } from "react";
import { useLabSamples, type LabSampleStatus, type LabSampleFilters, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useTenant } from "@/contexts/TenantContext";
import { SampleCard } from "./SampleCard";
import { SamplesTable } from "./SamplesTable";
import { SamplesFilterTabs, type SampleFilterTab } from "./SamplesFilterTabs";
import { ClientGroupedView } from "./ClientGroupedView";
import { CombinedResultsDialog } from "./CombinedResultsDialog";
import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import { AdvancedFilters } from "./AdvancedFilters";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FlaskConical, RotateCcw, PackageCheck, LayoutGrid, Users, ArrowUp, ArrowDown } from "lucide-react";
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
  
  // Advanced filters
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [horseId, setHorseId] = useState<string | undefined>(undefined);
  const [selectedStatuses, setSelectedStatuses] = useState<LabSampleStatus[]>([]);
  
  // View preference (Grid/List/Table)
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-samples');

  // Permission check for invoice creation
  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  // Status options for multi-select
  const statusOptions: { value: LabSampleStatus; label: string }[] = [
    { value: 'draft', label: t("laboratory.sampleStatus.draft") },
    { value: 'accessioned', label: t("laboratory.sampleStatus.accessioned") },
    { value: 'processing', label: t("laboratory.sampleStatus.processing") },
    { value: 'completed', label: t("laboratory.sampleStatus.completed") },
    { value: 'cancelled', label: t("laboratory.sampleStatus.cancelled") },
  ];

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

  const handleClearAllFilters = useCallback(() => {
    setSearch("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setClientId(undefined);
    setHorseId(undefined);
    setSelectedStatuses([]);
  }, []);

  // Get tab-based filters
  const tabFilters = getFiltersForTab(activeTab);

  // Build combined filters
  const combinedFilters: LabSampleFilters = useMemo(() => ({
    search: search || undefined,
    dateFrom,
    dateTo,
    horse_id: horseId,
    // Status filter: use multi-select if any selected, otherwise use tab filter
    status: selectedStatuses.length === 1 ? selectedStatuses[0] : tabFilters.status,
    ...tabFilters,
  }), [search, dateFrom, dateTo, horseId, selectedStatuses, tabFilters]);

  const { 
    samples: rawSamples, 
    loading, 
    canManage,
    accessionSample,
    startProcessing,
    completeSample,
    cancelSample,
    createRetest,
    deleteSample,
  } = useLabSamples(combinedFilters);

  // Handler for sample deletion
  const handleDeleteSample = async (sample: LabSample) => {
    await deleteSample(sample.id);
  };

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

  // Apply client filter on client-side (since hook doesn't support it directly)
  const filteredSamples = useMemo(() => {
    let filtered = rawSamples;
    
    // Client filter
    if (clientId) {
      filtered = filtered.filter(s => s.client_id === clientId);
    }
    
    // Multi-status filter (if more than 1 status selected)
    if (selectedStatuses.length > 1) {
      filtered = filtered.filter(s => selectedStatuses.includes(s.status));
    }
    
    return filtered;
  }, [rawSamples, clientId, selectedStatuses]);

  // Sort samples based on daily_number
  const sortedSamples = useMemo(() => {
    return [...filteredSamples].sort((a, b) => {
      const aNum = (a as any).daily_number || 0;
      const bNum = (b as any).daily_number || 0;
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [filteredSamples, sortOrder]);

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

        <div className="flex items-center gap-2">
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
          
          {canManage && onCreateSample && (
            <Button onClick={onCreateSample} size="sm" className="h-9">
              <Plus className="h-4 w-4 me-2" />
              <span className="hidden sm:inline">{t("laboratory.samples.newSample")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <SamplesFilterTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />

      {/* Advanced Filters */}
      <AdvancedFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("laboratory.samples.searchPlaceholder")}
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

      {/* Content based on view mode */}
      {sortedSamples.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t("laboratory.samples.noSamplesFound")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab !== 'all' || selectedStatuses.length > 0 || search || dateFrom || dateTo || clientId || horseId
              ? t("laboratory.samples.adjustFilters")
              : t("laboratory.samples.createFirst")}
          </p>
          {canManage && onCreateSample && !search && selectedStatuses.length === 0 && activeTab === 'all' && !dateFrom && !dateTo && !clientId && !horseId && (
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
          onEdit={(sample) => {
            // TODO: Open edit dialog for sample
            console.log("Edit sample:", sample.id);
          }}
          onDelete={handleDeleteSample}
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
