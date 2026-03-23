import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import type { HorseVaccination } from "@/hooks/vet/useHorseVaccinations";
import { isPast, isToday, isTomorrow } from "date-fns";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Calendar, CheckCircle, XCircle, Syringe, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

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
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('vet-vaccinations');

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
              <TableHead>Vaccine</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Due Date</TableHead>
              <TableHead className="whitespace-nowrap">Administered</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaccinations.map((vaccination) => {
              const isOverdue = isPast(new Date(vaccination.due_date)) && vaccination.status === 'due';
              return (
                <TableRow key={vaccination.id} className={isOverdue ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={vaccination.horse?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{vaccination.horse?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">{vaccination.horse?.name || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{vaccination.program?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{vaccination.service_mode === 'internal' ? 'Internal' : 'External'}</Badge></TableCell>
                  <TableCell><VetStatusBadge status={vaccination.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {isOverdue && <AlertTriangle className="h-3 w-3 inline me-1" />}
                      {formatStandardDate(vaccination.due_date)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{vaccination.administered_date ? formatStandardDate(vaccination.administered_date) : '—'}</TableCell>
                  <TableCell className="w-[60px]">
                    {vaccination.status === 'due' && (
                      <div className="flex gap-1">
                        {onMarkAdministered && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => onMarkAdministered(vaccination.id)}>
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onCancel && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onCancel(vaccination.id)}>
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
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
                      <Avatar className="w-10 h-10 rounded-lg">
                        <AvatarImage src={vaccination.horse?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gold/20 text-gold-dark rounded-lg">
                          {vaccination.horse?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground truncate">
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
                            {formatStandardDate(dueDate)}
                          </span>

                          {vaccination.administered_date && (
                            <span className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle className="w-3 h-3" />
                              Administered: {formatStandardDate(vaccination.administered_date)}
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

                    {vaccination.status === 'due' && (
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
      )}
    </div>
  );
}
