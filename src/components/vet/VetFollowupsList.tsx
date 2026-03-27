import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import type { VetFollowup } from "@/hooks/vet/useVetFollowups";
import { isToday, isTomorrow, isPast } from "date-fns";
import { formatStandardDate } from "@/lib/displayHelpers";
import { Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useI18n } from "@/i18n";

interface VetFollowupsListProps {
  followups: VetFollowup[];
  loading?: boolean;
  onMarkDone?: (id: string) => void;
  onCancel?: (id: string) => void;
  emptyMessage?: string;
}

export function VetFollowupsList({ 
  followups, 
  loading, 
  onMarkDone, 
  onCancel,
  emptyMessage,
}: VetFollowupsListProps) {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('vet-followups');

  const getTypeLabel = (type: string): string => {
    return t(`vet.followupType.${type}`);
  };

  const getTimeLabel = (dueDate: Date, isOverdue: boolean, isDueToday: boolean, isDueTomorrow: boolean): string => {
    if (isOverdue) return `${t("vet.timeLabels.overdue")}: `;
    if (isDueToday) return `${t("vet.timeLabels.dueToday")}: `;
    if (isDueTomorrow) return `${t("vet.timeLabels.tomorrow")}: `;
    return "";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (followups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage || t("vet.emptyMessages.followups")}</p>
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
              <TableHead>{t("vet.form.horse")}</TableHead>
              <TableHead>{t("vet.form.title")}</TableHead>
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="whitespace-nowrap">{t("vet.vaccination.dueDate")}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {followups.map((followup) => {
              const isOverdue = isPast(new Date(followup.due_at)) && followup.status === 'open';
              return (
                <TableRow key={followup.id} className={isOverdue ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={followup.treatment?.horse?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{followup.treatment?.horse?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">{followup.treatment?.horse?.name || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{followup.treatment?.title || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{getTypeLabel(followup.type)}</Badge></TableCell>
                  <TableCell><VetStatusBadge status={followup.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {isOverdue && <AlertTriangle className="h-3 w-3 inline me-1" />}
                      {formatStandardDate(followup.due_at)}
                    </span>
                  </TableCell>
                  <TableCell className="w-[60px]">
                    {followup.status === 'open' && (
                      <div className="flex gap-1">
                        {onMarkDone && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => onMarkDone(followup.id)}>
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onCancel && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => onCancel(followup.id)}>
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
          {followups.map((followup) => {
            const dueDate = new Date(followup.due_at);
            const isOverdue = isPast(dueDate) && followup.status === 'open';
            const isDueToday = isToday(dueDate);
            const isDueTomorrow = isTomorrow(dueDate);

            return (
              <Card key={followup.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 rounded-lg">
                        <AvatarImage src={followup.treatment?.horse?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gold/20 text-gold-dark rounded-lg">
                          {followup.treatment?.horse?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground truncate">
                            {followup.treatment?.title || "—"}
                          </h4>
                          <VetStatusBadge status={followup.status} />
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {followup.treatment?.horse?.name}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(followup.type)}
                          </Badge>
                          
                          <span className={`flex items-center gap-1 text-xs ${
                            isOverdue ? "text-destructive font-medium" : 
                            isDueToday ? "text-amber-600 font-medium" : 
                            isDueTomorrow ? "text-blue-600" : 
                            "text-muted-foreground"
                          }`}>
                            {isOverdue && <AlertTriangle className="w-3 h-3" />}
                            <Calendar className="w-3 h-3" />
                            {getTimeLabel(dueDate, isOverdue, isDueToday, isDueTomorrow)}
                            {formatStandardDate(dueDate)}
                          </span>
                        </div>

                        {followup.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {followup.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {followup.status === 'open' && (
                      <div className="flex gap-1 shrink-0">
                        {onMarkDone && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => onMarkDone(followup.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {onCancel && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onCancel(followup.id)}
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
