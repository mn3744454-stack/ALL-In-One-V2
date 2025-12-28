import { VetTreatmentCard } from "./VetTreatmentCard";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope } from "lucide-react";

interface VetTreatmentsListProps {
  treatments: VetTreatment[];
  loading?: boolean;
  onView?: (treatment: VetTreatment) => void;
  onEdit?: (treatment: VetTreatment) => void;
  emptyMessage?: string;
}

export function VetTreatmentsList({ 
  treatments, 
  loading, 
  onView, 
  onEdit,
  emptyMessage = "No treatments found"
}: VetTreatmentsListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (treatments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Stethoscope className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy mb-1">No Treatments</h3>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {treatments.map((treatment) => (
        <VetTreatmentCard
          key={treatment.id}
          treatment={treatment}
          onView={onView}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
