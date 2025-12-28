import { useState } from "react";
import { useLabSamples, type LabSampleStatus } from "@/hooks/laboratory/useLabSamples";
import { SampleCard } from "./SampleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FlaskConical } from "lucide-react";

interface SamplesListProps {
  onCreateSample?: () => void;
  onSampleClick?: (sampleId: string) => void;
}

export function SamplesList({ onCreateSample, onSampleClick }: SamplesListProps) {
  const [statusFilter, setStatusFilter] = useState<LabSampleStatus | 'all'>('all');
  const [search, setSearch] = useState("");

  const { 
    samples, 
    loading, 
    canManage,
    accessionSample,
    startProcessing,
    completeSample,
    cancelSample,
  } = useLabSamples({ 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
  });

  if (loading) {
    return (
      <div className="space-y-4">
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
      {/* Filters */}
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
            {statusFilter !== 'all' || search 
              ? "Try adjusting your filters" 
              : "Create your first sample to get started"}
          </p>
          {canManage && onCreateSample && !search && statusFilter === 'all' && (
            <Button onClick={onCreateSample} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Sample
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              canManage={canManage}
              onAccession={() => accessionSample(sample.id)}
              onStartProcessing={() => startProcessing(sample.id)}
              onComplete={() => completeSample(sample.id)}
              onCancel={() => cancelSample(sample.id)}
              onClick={() => onSampleClick?.(sample.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
