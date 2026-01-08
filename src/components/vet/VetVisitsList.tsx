import { VetVisitCard } from "./VetVisitCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX2 } from "lucide-react";
import type { VetVisit } from "@/hooks/vet/useVetVisits";

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
  );
}
