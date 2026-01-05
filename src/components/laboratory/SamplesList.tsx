import { useState } from "react";
import { useLabSamples, type LabSampleStatus, type LabSampleFilters } from "@/hooks/laboratory/useLabSamples";
import { SampleCard } from "./SampleCard";
import { SamplesFilterTabs, type SampleFilterTab } from "./SamplesFilterTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FlaskConical, RotateCcw, PackageCheck } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<SampleFilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<LabSampleStatus | 'all'>('all');
  const [search, setSearch] = useState("");

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
      {/* Quick Filter Tabs */}
      <SamplesFilterTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />

      {/* Secondary Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search samples..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LabSampleStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="accessioned">Accessioned</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage && onCreateSample && (
          <Button onClick={onCreateSample}>
            <Plus className="h-4 w-4 mr-2" />
            New Sample
          </Button>
        )}
      </div>

      {/* Samples Grid */}
      {samples.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No samples found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab !== 'all' || statusFilter !== 'all' || search 
              ? "Try adjusting your filters" 
              : "Create your first sample to get started"}
          </p>
          {canManage && onCreateSample && !search && statusFilter === 'all' && activeTab === 'all' && (
            <Button onClick={onCreateSample} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Sample
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample) => {
            // Derive isRetest from retest_of_sample_id
            const isRetest = sample.retest_of_sample_id !== null;
            const isReceived = sample.received_at !== null;

            return (
              <div key={sample.id} className="relative">
                {/* Badges overlay */}
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  {isReceived && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                      <PackageCheck className="h-3 w-3 mr-1" />
                      Received
                    </Badge>
                  )}
                  {isRetest && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Retest
                    </Badge>
                  )}
                </div>
                <SampleCard
                  sample={sample}
                  canManage={canManage}
                  onAccession={() => accessionSample(sample.id)}
                  onStartProcessing={() => startProcessing(sample.id)}
                  onComplete={() => completeSample(sample.id)}
                  onCancel={() => cancelSample(sample.id)}
                  onRetest={() => createRetest(sample.id)}
                  onClick={() => onSampleClick?.(sample.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
