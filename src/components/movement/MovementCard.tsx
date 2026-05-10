import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { MovementStatusBadge } from "./MovementStatusBadge";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { formatStandardDateTime, displayLocationName } from "@/lib/displayHelpers";
import { MapPin, ArrowRightLeft, Clock, FileText, Calendar, Truck, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorseMovement } from "@/hooks/movement/useHorseMovements";
import { isLocalArrival, isLocalArrivalActionable, isInternalTransfer, isInternalTransferActionable } from "./movementRouting";
import { HorseLifecycleChip } from "@/components/horses/HorseLifecycleChip";
import type { HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import { classifyMovement } from "./movementClassification";

interface MovementCardProps {
  movement: HorseMovement;
  showHorse?: boolean;
  onClick?: () => void;
  onDispatch?: (movementId: string) => void;
  onConfirmArrival?: (movementId: string) => void;
  onConfirmTransfer?: (movementId: string) => void;
  lifecycleState?: HorseLifecycleState | null;
}

export function MovementCard({ movement, showHorse = true, onClick, onDispatch, onConfirmArrival, onConfirmTransfer, lifecycleState }: MovementCardProps) {
  const { t } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canDispatch = isOwner || hasPermission('movement.dispatch.confirm');


  const formatLocationName = (location: { name: string; name_ar?: string | null; city: string | null } | null) => {
    if (!location) return "—";
    return displayLocationName(location.name, location.name_ar ?? null, location.city);
  };

  const isAdmissionCheckin = movement.reason?.includes('admission check-in') || movement.reason?.includes('Boarding admission check-in');
  const isAdmissionCheckout = movement.reason?.includes('admission checkout') || movement.reason?.includes('Boarding admission checkout');

  const getCategoryBadge = () => {
    if (isAdmissionCheckin) return <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{t('housing.admissions.detail.checkin')}</Badge>;
    if (isAdmissionCheckout) return <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t('housing.admissions.detail.checkout')}</Badge>;
    return null;
  };

  const isScheduled = movement.movement_status === 'scheduled';
  const localArrivalActionable = isLocalArrivalActionable(movement);
  const localArrival = isLocalArrival(movement);
  const isArrivalRetry = localArrival && movement.movement_status === 'dispatched';
  const internalTransfer = isInternalTransfer(movement);
  const internalTransferActionable = isInternalTransferActionable(movement);
  const isTransferRetry = internalTransfer && movement.movement_status === 'dispatched';
  // Dispatch path is reserved for non-local-arrival, non-internal-transfer
  // scheduled rows (e.g. out / connected outgoing). Local arrivals use
  // Confirm Arrival; internal transfers use Confirm Internal Transfer.
  const showDispatchAction = isScheduled && !localArrival && !internalTransfer;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        isScheduled && "border-amber-200 dark:border-amber-800"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 overflow-hidden">
        <div className="flex items-start gap-3">
          {showHorse && movement.horse && (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={movement.horse.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {movement.horse.name?.[0]?.toUpperCase() || "H"}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="min-w-0">
              {showHorse && movement.horse && (
                <h4 className="font-semibold text-foreground truncate">
                  {movement.horse.name}
                  {movement.horse.name_ar && (
                    <span className="text-muted-foreground text-sm ms-2">
                      ({movement.horse.name_ar})
                    </span>
                  )}
                </h4>
              )}
              {lifecycleState && (
                <div className="mt-1">
                  <HorseLifecycleChip state={lifecycleState} hideUnknown size="xs" />
                </div>
              )}
            </div>

            {/* H3: classification-aware primary badge replaces raw type badge. */}
            {(() => {
              const cls = classifyMovement(movement);
              const isUnitOp = cls === 'unit_assignment' || cls === 'unit_reassignment';
              const tone =
                cls === 'arrival' || cls === 'admission_checkin' || cls === 'return_from_temporary_out'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : cls === 'checkout_departure' || cls === 'temporary_out'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : cls === 'inter_branch_transfer' || cls === 'connected_outgoing'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : isUnitOp
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  : 'bg-muted text-muted-foreground';
              return (
                <>
                  <div className="flex flex-wrap items-center gap-1 max-w-full">
                    <Badge className={cn("text-xs", tone)}>{t(`movement.class.${cls}`)}</Badge>
                    {movement.movement_status !== 'completed' && (
                      <MovementStatusBadge status={movement.movement_status} />
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    {isUnitOp ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">{t('movement.transfer.branch')}:</span>
                          <span className="truncate">{formatLocationName(movement.to_location)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">{t('movement.transfer.unitTransition')}:</span>
                          <span className="truncate">
                            {(movement.from_unit?.code || movement.from_unit?.name || '—')} → {(movement.to_unit?.code || movement.to_unit?.name || '—')}
                          </span>
                        </div>
                      </>
                    ) : movement.movement_type === 'out' ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground line-through truncate">
                          {formatLocationName(movement.from_location)}
                        </span>
                      </div>
                    ) : movement.movement_type === 'in' ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{formatLocationName(movement.to_location)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">{t('movement.route.from')}:</span>
                          <span className="truncate">{formatLocationName(movement.from_location)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-muted-foreground shrink-0">{t('movement.route.to')}:</span>
                          <span className="font-medium truncate">{formatLocationName(movement.to_location)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}


            {/* Scheduled datetime */}
            {isScheduled && movement.scheduled_at && (
              <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{t('movement.lifecycle.scheduledFor')}: {formatStandardDateTime(movement.scheduled_at)}</span>
              </div>
            )}

            {movement.internal_location_note && (
              <p className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                📍 {movement.internal_location_note}
              </p>
            )}

            {movement.reason && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{movement.reason}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatStandardDateTime(movement.movement_at)}</span>
              </div>
              {movement.is_demo && (
                <span className="text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-xs">
                  Demo
                </span>
              )}
            </div>

            {/* Confirm Arrival action — local arrival (in, not connected) */}
            {localArrivalActionable && canDispatch && onConfirmArrival && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmArrival(movement.id);
                  }}
                >
                  {isArrivalRetry ? (
                    <RefreshCw className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {isArrivalRetry
                    ? t('movement.lifecycle.retryArrival')
                    : t('movement.lifecycle.confirmArrival')}
                </Button>
              </div>
            )}

            {/* Confirm Internal Transfer action — internal transfer (scheduled or dispatched) */}
            {internalTransferActionable && canDispatch && onConfirmTransfer && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmTransfer(movement.id);
                  }}
                >
                  {isTransferRetry ? (
                    <RefreshCw className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  )}
                  {isTransferRetry
                    ? t('movement.lifecycle.completeInternalTransfer')
                    : t('movement.lifecycle.confirmInternalTransfer')}
                </Button>
              </div>
            )}

            {/* Dispatch action — non-arrival scheduled movements (out / transfer) */}
            {showDispatchAction && canDispatch && onDispatch && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDispatch(movement.id);
                  }}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {t('movement.lifecycle.confirmDispatch')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
