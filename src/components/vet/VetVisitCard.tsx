import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  Play, 
  XCircle,
  AlertTriangle,
  Stethoscope,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { VetVisit, VetVisitStatus, VetVisitType } from "@/hooks/vet/useVetVisits";

interface VetVisitCardProps {
  visit: VetVisit;
  horses?: { id: string; name: string; avatar_url?: string | null }[];
  onConfirm?: (id: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
  onClick?: (visit: VetVisit) => void;
}

const statusConfig: Record<VetVisitStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  scheduled: { label: "Scheduled", variant: "outline", icon: Calendar },
  confirmed: { label: "Confirmed", variant: "secondary", icon: CheckCircle2 },
  in_progress: { label: "In Progress", variant: "default", icon: Play },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
  no_show: { label: "No Show", variant: "destructive", icon: AlertTriangle },
};

const typeConfig: Record<VetVisitType, { label: string; color: string }> = {
  routine: { label: "Routine", color: "bg-blue-100 text-blue-800" },
  emergency: { label: "Emergency", color: "bg-red-100 text-red-800" },
  follow_up: { label: "Follow-up", color: "bg-amber-100 text-amber-800" },
  inspection: { label: "Inspection", color: "bg-purple-100 text-purple-800" },
};

export function VetVisitCard({
  visit,
  horses = [],
  onConfirm,
  onStart,
  onComplete,
  onCancel,
  onClick,
}: VetVisitCardProps) {
  const { t } = useI18n();
  const status = statusConfig[visit.status] || statusConfig.scheduled;
  const type = typeConfig[visit.visit_type] || typeConfig.routine;
  const StatusIcon = status.icon;

  const visitHorses = horses.filter(h => visit.horse_ids?.includes(h.id));
  const isActive = ["scheduled", "confirmed", "in_progress"].includes(visit.status);

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        visit.status === "completed" && "opacity-75"
      )}
      onClick={() => onClick?.(visit)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{visit.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={status.variant} className="text-xs gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {t(`vetVisits.status.${visit.status}`)}
                </Badge>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", type.color)}>
                  {t(`vetVisits.types.${visit.visit_type}`)}
                </span>
              </div>
            </div>
          </div>

          {isActive && (onConfirm || onStart || onComplete || onCancel) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {visit.status === "scheduled" && onConfirm && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onConfirm(visit.id); }}>
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t("vetVisits.actions.confirm")}
                  </DropdownMenuItem>
                )}
                {["scheduled", "confirmed"].includes(visit.status) && onStart && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStart(visit.id); }}>
                    <Play className="w-4 h-4 me-2" />
                    {t("vetVisits.actions.start")}
                  </DropdownMenuItem>
                )}
                {visit.status === "in_progress" && onComplete && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete(visit.id); }}>
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t("vetVisits.actions.complete")}
                  </DropdownMenuItem>
                )}
                {isActive && onCancel && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onCancel(visit.id); }}
                    className="text-destructive"
                  >
                    <XCircle className="w-4 h-4 me-2" />
                    {t("vetVisits.actions.cancel")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(visit.scheduled_date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(visit.scheduled_date), "h:mm a")}</span>
          </div>
        </div>

        {/* Vet Info */}
        {visit.vet_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{visit.vet_name}</span>
            {visit.vet_phone && (
              <>
                <Phone className="w-3.5 h-3.5 text-muted-foreground ms-2" />
                <span className="text-muted-foreground">{visit.vet_phone}</span>
              </>
            )}
          </div>
        )}

        {/* Horses */}
        {visitHorses.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {visitHorses.slice(0, 3).map((horse) => (
                <Avatar key={horse.id} className="w-7 h-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {horse.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {visitHorses.length === 1 
                ? visitHorses[0].name 
                : `${visitHorses.length} ${t("vetVisits.horsesCount")}`}
            </span>
          </div>
        )}

        {/* Notes Preview */}
        {visit.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{visit.notes}</p>
        )}

        {(visit.estimated_cost || visit.actual_cost) && (
          <div className="flex items-center gap-4 text-sm pt-2 border-t border-border/50">
            {visit.estimated_cost && (
              <span className="text-muted-foreground">
                {t("vetVisits.estimated")} <span className="font-medium text-foreground">${visit.estimated_cost}</span>
              </span>
            )}
            {visit.actual_cost && (
              <span className="text-muted-foreground">
                {t("vetVisits.actual")} <span className="font-medium text-foreground">${visit.actual_cost}</span>
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
