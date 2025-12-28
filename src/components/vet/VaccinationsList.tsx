import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import type { HorseVaccination } from "@/hooks/vet/useHorseVaccinations";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Calendar, CheckCircle, XCircle, Syringe, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface VaccinationsListProps {
  vaccinations: HorseVaccination[];
  loading?: boolean;
  onMarkAdministered?: (id: string) => void;
  onCancel?: (id: string) => void;
  emptyMessage?: string;
}

export function VaccinationsList({ 
  vaccinations, 
  loading, 
  onMarkAdministered, 
  onCancel,
  emptyMessage = "No vaccinations scheduled"
}: VaccinationsListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (vaccinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Syringe className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vaccinations.map((vaccination) => {
        const dueDate = new Date(vaccination.due_date);
        const isOverdue = isPast(dueDate) && vaccination.status === 'due';
        const isDueToday = isToday(dueDate);
        const isDueTomorrow = isTomorrow(dueDate);

        return (
          <Card key={vaccination.id} className={isOverdue ? "border-destructive/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Horse Avatar */}
                  <Avatar className="w-10 h-10 rounded-lg">
                    <AvatarImage src={vaccination.horse?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gold/20 text-gold-dark rounded-lg">
                      {vaccination.horse?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-navy truncate">
                        {vaccination.program?.name || "Unknown Vaccine"}
                      </h4>
                      <VetStatusBadge status={vaccination.status} />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {vaccination.horse?.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {vaccination.service_mode === 'internal' ? 'Internal' : 'External'}
                      </Badge>
                      
                      <span className={`flex items-center gap-1 text-xs ${
                        isOverdue ? "text-destructive font-medium" : 
                        isDueToday ? "text-amber-600 font-medium" : 
                        isDueTomorrow ? "text-blue-600" : 
                        "text-muted-foreground"
                      }`}>
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? "Overdue: " : isDueToday ? "Due Today: " : isDueTomorrow ? "Tomorrow: " : "Due: "}
                        {format(dueDate, "MMM d, yyyy")}
                      </span>

                      {vaccination.administered_date && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="w-3 h-3" />
                          Administered: {format(new Date(vaccination.administered_date), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>

                    {vaccination.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        {vaccination.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {(vaccination.status === 'due' || vaccination.status === 'overdue') && (
                  <div className="flex gap-1 shrink-0">
                    {onMarkAdministered && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                        onClick={() => onMarkAdministered(vaccination.id)}
                        title="Mark as administered"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {onCancel && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onCancel(vaccination.id)}
                        title="Cancel vaccination"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
