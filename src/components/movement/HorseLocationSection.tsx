import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { MapPin, ArrowRight, Clock, Plus, ChevronRight, Building2, DoorOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSingleHorseMovements, type HorseMovement } from "@/hooks/movement/useHorseMovements";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { RecordMovementDialog } from "./RecordMovementDialog";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface HorseLocationSectionProps {
  horseId: string;
  currentLocation?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  currentArea?: {
    id: string;
    name: string;
    name_ar?: string | null;
  } | null;
  currentUnit?: {
    id: string;
    name: string | null;
    name_ar?: string | null;
    code: string;
  } | null;
  homeLocation?: {
    id: string;
    name: string;
  } | null;
  canManage?: boolean;
}

export function HorseLocationSection({
  horseId,
  currentLocation,
  currentArea,
  currentUnit,
  homeLocation,
  canManage = false,
}: HorseLocationSectionProps) {
  const { t, dir } = useI18n();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  
  const { data: movements = [], isLoading } = useSingleHorseMovements(horseId);

  const ArrowIcon = dir === 'rtl' ? (
    <ArrowRight className="h-3 w-3 rotate-180 text-muted-foreground shrink-0" />
  ) : (
    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {t("movement.horseSection.title")}
        </CardTitle>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setRecordDialogOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("movement.form.recordMovement")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">
            {t("movement.horseSection.currentLocation")}
          </p>
          {currentLocation ? (
            <p className="font-semibold text-lg">
              {currentLocation.name}
              {currentLocation.city && (
                <span className="text-muted-foreground text-sm ms-2">
                  ({currentLocation.city})
                </span>
              )}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              {t("movement.horseSection.noLocation")}
            </p>
          )}
        </div>

        {/* Current Housing (Area/Unit) */}
        {(currentArea || currentUnit) && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-2">
              {t("movement.labels.currentHousing")}
            </p>
            <div className={cn(
              "flex flex-wrap items-center gap-2",
              dir === 'rtl' && "justify-end"
            )}>
              {currentArea && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {dir === 'rtl' && currentArea.name_ar ? currentArea.name_ar : currentArea.name}
                </Badge>
              )}
              {currentUnit && (
                <Badge className="gap-1">
                  <DoorOpen className="h-3 w-3" />
                  {currentUnit.code}
                  {currentUnit.name && currentUnit.name !== currentUnit.code && (
                    <span className="opacity-75">- {currentUnit.name}</span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Home Location (branch_id) */}
        {homeLocation && homeLocation.id !== currentLocation?.id && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t("movement.horseSection.homeLocation")}: </span>
            <span className="font-medium">{homeLocation.name}</span>
          </div>
        )}

        {/* Recent Movements Timeline */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">
              {t("movement.horseSection.recentMovements")}
            </h4>
            {movements.length > 0 && (
              <Link to="/dashboard/movement">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  {t("movement.horseSection.viewAll")}
                  {dir === 'rtl' ? (
                    <ChevronRight className="h-3 w-3 ms-1 rotate-180" />
                  ) : (
                    <ChevronRight className="h-3 w-3 ms-1" />
                  )}
                </Button>
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("movement.horseSection.noMovements")}
            </p>
          ) : (
            <div className="space-y-2">
              {movements.slice(0, 5).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30"
                >
                  <MovementTypeBadge type={movement.movement_type} size="sm" />
                  <div className="flex-1 min-w-0">
                    {movement.movement_type === 'transfer' ? (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-muted-foreground truncate">
                          {movement.from_location?.name || "—"}
                        </span>
                        {ArrowIcon}
                        <span className="font-medium truncate">
                          {movement.to_location?.name || "—"}
                        </span>
                        {/* Show unit if present */}
                        {movement.to_unit && (
                          <Badge variant="secondary" className="text-xs gap-1 ms-1">
                            <DoorOpen className="h-2.5 w-2.5" />
                            {movement.to_unit.code}
                          </Badge>
                        )}
                      </span>
                    ) : movement.movement_type === 'in' ? (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium truncate">
                          {movement.to_location?.name || "—"}
                        </span>
                        {movement.to_unit && (
                          <Badge variant="secondary" className="text-xs gap-1 ms-1">
                            <DoorOpen className="h-2.5 w-2.5" />
                            {movement.to_unit.code}
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground truncate">
                        {movement.from_location?.name || "—"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(movement.movement_at), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Record Movement Dialog */}
      <RecordMovementDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
      />
    </Card>
  );
}
