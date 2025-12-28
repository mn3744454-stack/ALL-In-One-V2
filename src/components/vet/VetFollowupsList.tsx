import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VetStatusBadge } from "./VetStatusBadge";
import type { VetFollowup } from "@/hooks/vet/useVetFollowups";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface VetFollowupsListProps {
  followups: VetFollowup[];
  loading?: boolean;
  onMarkDone?: (id: string) => void;
  onCancel?: (id: string) => void;
  emptyMessage?: string;
}

const typeLabels: Record<string, string> = {
  followup: "Follow-up",
  recheck: "Recheck",
  medication_refill: "Medication Refill",
  wound_check: "Wound Check",
  suture_removal: "Suture Removal",
  lab_result: "Lab Result",
};

export function VetFollowupsList({ 
  followups, 
  loading, 
  onMarkDone, 
  onCancel,
  emptyMessage = "No follow-ups scheduled"
}: VetFollowupsListProps) {
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
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
                  {/* Horse Avatar */}
                  <Avatar className="w-10 h-10 rounded-lg">
                    <AvatarImage src={followup.treatment?.horse?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gold/20 text-gold-dark rounded-lg">
                      {followup.treatment?.horse?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-navy truncate">
                        {followup.treatment?.title || "Unknown Treatment"}
                      </h4>
                      <VetStatusBadge status={followup.status} />
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {followup.treatment?.horse?.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[followup.type] || followup.type}
                      </Badge>
                      
                      <span className={`flex items-center gap-1 text-xs ${
                        isOverdue ? "text-destructive font-medium" : 
                        isDueToday ? "text-amber-600 font-medium" : 
                        isDueTomorrow ? "text-blue-600" : 
                        "text-muted-foreground"
                      }`}>
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />
                        {isOverdue ? "Overdue: " : isDueToday ? "Today: " : isDueTomorrow ? "Tomorrow: " : ""}
                        {format(dueDate, "MMM d, yyyy")}
                      </span>
                    </div>

                    {followup.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        {followup.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
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
  );
}
