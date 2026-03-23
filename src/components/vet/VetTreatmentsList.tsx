import { VetTreatmentCard } from "./VetTreatmentCard";
import type { VetTreatment } from "@/hooks/vet/useVetTreatments";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope } from "lucide-react";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { VetStatusBadge } from "./VetStatusBadge";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { BilingualName } from "@/components/ui/BilingualName";

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
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('vet-treatments');

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
        <h3 className="font-semibold text-foreground mb-1">No Treatments</h3>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
              <TableHead>Horse</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="whitespace-nowrap">Requested</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatments.map((treatment) => (
              <TableRow key={treatment.id} className="cursor-pointer" onClick={() => onView?.(treatment)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={treatment.horse?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{treatment.horse?.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <BilingualName name={treatment.horse?.name} nameAr={(treatment.horse as any)?.name_ar} primaryClassName="text-sm" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{treatment.title}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{treatment.category}</Badge></TableCell>
                <TableCell><VetStatusBadge status={treatment.status} /></TableCell>
                <TableCell>
                  <Badge variant={treatment.priority === 'urgent' ? 'destructive' : treatment.priority === 'high' ? 'default' : 'secondary'} className="text-xs capitalize">
                    {treatment.priority}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{formatStandardDate(treatment.requested_at)}</TableCell>
                <TableCell className="w-[60px]">
                  <div className="flex gap-1">
                    {onView && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(treatment); }}><Eye className="h-3.5 w-3.5" /></Button>}
                    {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(treatment); }}><Edit className="h-3.5 w-3.5" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {treatments.map((treatment) => (
            <VetTreatmentCard
              key={treatment.id}
              treatment={treatment}
              onView={onView}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
