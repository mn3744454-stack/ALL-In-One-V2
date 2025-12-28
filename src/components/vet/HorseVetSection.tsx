import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Stethoscope, 
  Syringe, 
  CalendarClock, 
  Plus, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useVetTreatments } from "@/hooks/vet/useVetTreatments";
import { useHorseVaccinations } from "@/hooks/vet/useHorseVaccinations";
import { useVetFollowups } from "@/hooks/vet/useVetFollowups";
import { VetStatusBadge } from "./VetStatusBadge";
import { VetPriorityBadge } from "./VetPriorityBadge";
import { VetCategoryBadge } from "./VetCategoryBadge";
import { CreateVetTreatmentDialog } from "./CreateVetTreatmentDialog";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";

interface HorseVetSectionProps {
  horseId: string;
  horseName: string;
}

export function HorseVetSection({ horseId, horseName }: HorseVetSectionProps) {
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { treatments, loading: treatmentsLoading, canManage, refresh: refreshTreatments } = useVetTreatments({ 
    horse_id: horseId 
  });
  const { vaccinations, loading: vaccinationsLoading, refresh: refreshVaccinations } = useHorseVaccinations({ 
    horse_id: horseId 
  });
  const { followups, loading: followupsLoading, refresh: refreshFollowups } = useVetFollowups({ 
    horse_id: horseId 
  });

  const recentTreatments = treatments.slice(0, 5);
  const upcomingVaccinations = vaccinations
    .filter(v => v.status === 'due' || v.status === 'overdue')
    .slice(0, 5);
  const openFollowups = followups
    .filter(f => f.status === 'open')
    .slice(0, 5);

  const loading = treatmentsLoading || vaccinationsLoading || followupsLoading;

  const handleSuccess = () => {
    refreshTreatments();
    refreshVaccinations();
    refreshFollowups();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-gold" />
            Vet & Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNoData = recentTreatments.length === 0 && upcomingVaccinations.length === 0 && openFollowups.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-gold" />
            Vet & Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                New Treatment
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard/vet')}
              className="gap-1.5"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasNoData ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No health records yet</p>
              {canManage && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Add First Treatment
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Recent Treatments */}
              {recentTreatments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Recent Treatments
                  </h4>
                  <div className="space-y-2">
                    {recentTreatments.map((treatment) => (
                      <div 
                        key={treatment.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <VetCategoryBadge category={treatment.category} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{treatment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(treatment.requested_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <VetPriorityBadge priority={treatment.priority} />
                          <VetStatusBadge status={treatment.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Vaccinations */}
              {upcomingVaccinations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Syringe className="w-4 h-4" />
                    Upcoming Vaccinations
                  </h4>
                  <div className="space-y-2">
                    {upcomingVaccinations.map((vaccination) => {
                      const dueDate = new Date(vaccination.due_date);
                      const isOverdue = vaccination.status === 'overdue' || isPast(dueDate);
                      const isDueToday = isToday(dueDate);
                      
                      return (
                        <div 
                          key={vaccination.id} 
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isOverdue 
                              ? 'bg-destructive/10 border border-destructive/20' 
                              : isDueToday 
                                ? 'bg-warning/10 border border-warning/20' 
                                : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isOverdue && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {vaccination.program?.name || 'Unknown Program'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due: {format(dueDate, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={isOverdue ? 'destructive' : isDueToday ? 'secondary' : 'outline'}
                            className="shrink-0"
                          >
                            {isOverdue 
                              ? 'Overdue' 
                              : isDueToday 
                                ? 'Today' 
                                : formatDistanceToNow(dueDate, { addSuffix: true })
                            }
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Open Follow-ups */}
              {openFollowups.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Open Follow-ups
                  </h4>
                  <div className="space-y-2">
                    {openFollowups.map((followup) => {
                      const dueDate = new Date(followup.due_at);
                      const isOverdue = isPast(dueDate);
                      
                      return (
                        <div 
                          key={followup.id} 
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            isOverdue 
                              ? 'bg-destructive/10 border border-destructive/20' 
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isOverdue && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium truncate capitalize">
                                {followup.type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due: {format(dueDate, 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={isOverdue ? 'destructive' : 'outline'}
                            className="shrink-0"
                          >
                            {isOverdue 
                              ? 'Overdue' 
                              : formatDistanceToNow(dueDate, { addSuffix: true })
                            }
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateVetTreatmentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        preselectedHorseId={horseId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
