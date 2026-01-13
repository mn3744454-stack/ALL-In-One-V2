import { useState, useMemo } from "react";
import { useLabSamples, type LabSampleStatus, type LabSampleFilters, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useTenant } from "@/contexts/TenantContext";
import { SampleCard } from "./SampleCard";
import { SamplesFilterTabs, type SampleFilterTab } from "./SamplesFilterTabs";
import { ClientGroupedView } from "./ClientGroupedView";
import { CombinedResultsDialog } from "./CombinedResultsDialog";
import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FlaskConical, RotateCcw, PackageCheck, LayoutGrid, Users } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

type ViewMode = 'samples' | 'clients';

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
      return { received: true };
    case 'unreceived':
      return { received: false };
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('lab-samples-view-mode');
    return (saved === 'clients' ? 'clients' : 'samples') as ViewMode;
  });
  const [combinedResultsSample, setCombinedResultsSample] = useState<LabSample | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedSampleForInvoice, setSelectedSampleForInvoice] = useState<LabSample | null>(null);

  // Permission check for invoice creation
  const canCreateInvoice = activeRole === 'owner' || activeRole === 'manager';

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('lab-samples-view-mode', mode);
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

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter Tabs Skeleton */}
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
    <div className="space-y-4">
      {/* Quick Filter Tabs with View Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 overflow-x-auto">
          <SamplesFilterTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
        </div>
        <div className="flex gap-1 shrink-0">
          <Toggle
            pressed={viewMode === 'samples'}
            onPressedChange={() => handleViewModeChange('samples')}
            size="sm"
            aria-label={t("laboratory.clientGrouped.viewBySamples")}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <LayoutGrid className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={viewMode === 'clients'}
            onPressedChange={() => handleViewModeChange('clients')}
            size="sm"
            aria-label={t("laboratory.clientGrouped.viewByClients")}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Users className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

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
      {samples.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">{t("laboratory.samples.noSamplesFound")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab !== 'all' || statusFilter !== 'all' || search 
              ? t("laboratory.samples.adjustFilters")
              : t("laboratory.samples.createFirst")}
          </p>
          {canManage && onCreateSample && !search && statusFilter === 'all' && activeTab === 'all' && (
            <Button onClick={onCreateSample} className="mt-4">
              <Plus className="h-4 w-4 me-2" />
              {t("laboratory.samples.createSample")}
            </Button>
          )}
        </div>
      ) : viewMode === 'clients' ? (
        <ClientGroupedView 
          samples={samples} 
          onSampleClick={onSampleClick}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample) => {
            // Derive isRetest from retest_of_sample_id
            const isRetest = sample.retest_of_sample_id !== null;
            const isReceived = sample.received_at !== null;

            return (
              <div key={sample.id} className="relative">
                {/* Badges overlay */}
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
