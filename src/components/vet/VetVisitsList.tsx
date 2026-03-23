import { VetVisitCard } from "./VetVisitCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX2 } from "lucide-react";
import type { VetVisit } from "@/hooks/vet/useVetVisits";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { VetStatusBadge } from "./VetStatusBadge";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatStandardDate } from "@/lib/displayHelpers";

interface VetVisitsListProps {
  visits: VetVisit[];
  horses?: { id: string; name: string; avatar_url?: string | null }[];
  loading?: boolean;
  emptyMessage?: string;
  onConfirm?: (id: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onVisitClick?: (visit: VetVisit) => void;
}

export function VetVisitsList({
  visits,
  horses = [],
  loading,
  emptyMessage = "No visits scheduled",
  onConfirm,
  onStart,
  onComplete,
  onCancel,
  onVisitClick,
}: VetVisitsListProps) {
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('vet-visits');

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <CalendarX2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:flex justify-end">
        <ViewSwitcher
          viewMode={viewMode}
          gridColumns={gridColumns}
          onViewModeChange={setViewMode}
          onGridColumnsChange={setGridColumns}
          showTable={true}
        />
      </div>
      {viewMode === 'table' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Scheduled</TableHead>
              <TableHead className="whitespace-nowrap">Est. Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.id} className="cursor-pointer" onClick={() => onVisitClick?.(visit)}>
                <TableCell className="font-medium">{visit.title}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{visit.visit_type.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{visit.vet_name || '—'}</TableCell>
                <TableCell><VetStatusBadge status={visit.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{formatStandardDate(visit.scheduled_date)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{visit.estimated_cost != null ? visit.estimated_cost : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {visits.map((visit) => (
            <VetVisitCard
              key={visit.id}
              visit={visit}
              horses={horses}
              onConfirm={onConfirm}
              onStart={onStart}
              onComplete={onComplete}
              onCancel={onCancel}
              onClick={onVisitClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
