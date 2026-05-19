import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { MapPin, Plus, ChevronRight, Building2, DoorOpen, ArrowDownToLine } from "lucide-react";
import { formatStandardDate, displayLocationName } from "@/lib/displayHelpers";
import { cn } from "@/lib/utils";
import { useSingleHorseMovements } from "@/hooks/movement/useHorseMovements";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { RecordMovementDialog } from "./RecordMovementDialog";
import { useHorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface HorseLocationSectionProps {
  horseId: string;
  currentLocation?: {
    id: string;
    name: string;
    name_ar?: string | null;
    city?: string | null;
  } | null;
  currentArea?: {
    id: string;
    name: string;
    name_ar?: string | null;
    facility_type?: string | null;
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
    name_ar?: string | null;
    city?: string | null;
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
  const { t, dir, lang } = useI18n();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [returnPrefillOn, setReturnPrefillOn] = useState(false);

  const { data: movements = [], isLoading } = useSingleHorseMovements(horseId);
  const { state: lifecycleState } = useHorseLifecycleState(horseId);
  const isTemporarilyOut = !!lifecycleState?.is_temporarily_out;

  /**
   * Pass 1 — bilingual From/To phrasing.
   * Arrow icons (→ / ←) removed; we render localized text instead so RTL
   * users read movement direction unambiguously.
   */
  const formatDirection = (
    from: string | null,
    to: string | null,
  ): string => {
    if (from && to) {
      return t("movement.direction.fromTo")
        .replace("{{from}}", from)
        .replace("{{to}}", to);
    }
    if (to) return t("movement.direction.to").replace("{{to}}", to);
    if (from) return t("movement.direction.from").replace("{{from}}", from);
    return t("movement.direction.unspecified");
  };

  const locName = (
    loc?: { name?: string | null; name_ar?: string | null; city?: string | null } | null,
  ): string | null => {
    if (!loc) return null;
    return displayLocationName(loc.name, loc.name_ar, loc.city ?? null, lang);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {t("movement.horseSection.title")}
        </CardTitle>
        <div className="flex items-center gap-2">
          {canManage && isTemporarilyOut && (
            <Button variant="outline" size="sm" onClick={() => setReturnPrefillOn(true)} className="gap-1">
              <ArrowDownToLine className="h-4 w-4" />
              {t("movement.return.recordReturn")}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setRecordDialogOpen(true)}>
              <Plus className="h-4 w-4 me-1" />
              {t("movement.form.recordMovement")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">
            {t("movement.horseSection.currentLocation")}
          </p>
          {currentLocation ? (
            <p className="font-semibold text-lg">
              {displayLocationName(currentLocation.name, currentLocation.name_ar, currentLocation.city ?? null, lang)}
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
                  {displayLocationName(currentArea.name, currentArea.name_ar, null, lang)}
                  {currentArea.facility_type && (
                    <span className="opacity-60 text-[10px]">({t(`housing.facilityTypes.${currentArea.facility_type}`)})</span>
                  )}
                </Badge>
              )}
              {currentUnit && (
                <Badge className="gap-1">
                  <DoorOpen className="h-3 w-3" />
                  {currentUnit.code}
                  {(currentUnit.name || currentUnit.name_ar) && (
                    <span className="opacity-75">
                      — {displayLocationName(currentUnit.name, currentUnit.name_ar, null, lang)}
                    </span>
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
            <span className="font-medium">
              {displayLocationName(homeLocation.name, homeLocation.name_ar, homeLocation.city ?? null, lang)}
            </span>
          </div>
        )}

        {/* Recent Movements Timeline */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">
              {t("movement.horseSection.recentMovements")}
            </h4>
            {movements.length > 0 && (
              <Link to="/dashboard/housing?tab=movement">
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
              {movements.slice(0, 5).map((movement) => {
                const from = locName(movement.from_location);
                const to = locName(movement.to_location);
                const directionText =
                  movement.movement_type === 'in'
                    ? formatDirection(null, to)
                    : movement.movement_type === 'out'
                      ? formatDirection(from, null)
                      : formatDirection(from, to);
                return (
                  <div
                    key={movement.id}
                    className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30"
                  >
                    <MovementTypeBadge type={movement.movement_type} size="sm" />
                    <div className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{directionText}</span>
                        {movement.to_unit && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <DoorOpen className="h-2.5 w-2.5" />
                            {movement.to_unit.code}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatStandardDate(movement.movement_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Record Movement Dialog */}
      <RecordMovementDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
      />
      <RecordMovementDialog
        open={returnPrefillOn}
        onOpenChange={(o) => { if (!o) setReturnPrefillOn(false); }}
        prefill={returnPrefillOn ? { horseId, movementType: 'in', movementSubtype: 'return_from_temporary_out' } : null}
      />
    </Card>
  );
}
