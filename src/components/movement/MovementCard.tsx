import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { MovementStatusBadge } from "./MovementStatusBadge";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import { MapPin, ArrowRight, Clock, FileText, Calendar, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorseMovement } from "@/hooks/movement/useHorseMovements";

interface MovementCardProps {
  movement: HorseMovement;
  showHorse?: boolean;
  onClick?: () => void;
  onDispatch?: (movementId: string) => void;
}

export function MovementCard({ movement, showHorse = true, onClick, onDispatch }: MovementCardProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canDispatch = isOwner || hasPermission('movement.dispatch.confirm');

  const ArrowIcon = dir === 'rtl' ? (
    <ArrowRight className="h-4 w-4 rotate-180 text-muted-foreground shrink-0" />
  ) : (
    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
  );

  const formatLocationName = (location: { name: string; city: string | null } | null) => {
    if (!location) return "—";
    return location.city ? `${location.name}` : location.name;
  };

  const isAdmissionCheckin = movement.reason?.includes('admission check-in') || movement.reason?.includes('Boarding admission check-in');
  const isAdmissionCheckout = movement.reason?.includes('admission checkout') || movement.reason?.includes('Boarding admission checkout');
  const isTransfer = movement.movement_type === 'transfer';

  const getCategoryBadge = () => {
    if (isAdmissionCheckin) return <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{t('housing.admissions.detail.checkin')}</Badge>;
    if (isAdmissionCheckout) return <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t('housing.admissions.detail.checkout')}</Badge>;
    if (isTransfer) return <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t('movement.types.transfer')}</Badge>;
    return null;
  };

  const isScheduled = movement.movement_status === 'scheduled';

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        onClick && "cursor-pointer",
        isScheduled && "border-amber-200 dark:border-amber-800"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
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
            <div className="flex items-start justify-between gap-2">
              <div>
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
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className={cn(
                    "truncate",
                    movement.movement_type === 'out' ? "text-muted-foreground line-through" : ""
                  )}>
                    {movement.movement_type === 'out' 
                      ? formatLocationName(movement.from_location)
                      : movement.movement_type === 'in'
                        ? formatLocationName(movement.to_location)
                        : (
                          <span className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">
                              {formatLocationName(movement.from_location)}
                            </span>
                            {ArrowIcon}
                            <span className="font-medium">
                              {formatLocationName(movement.to_location)}
                            </span>
                          </span>
                        )
                    }
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <MovementTypeBadge type={movement.movement_type} size="sm" />
                {movement.movement_status !== 'completed' && (
                  <MovementStatusBadge status={movement.movement_status} />
                )}
                {getCategoryBadge()}
              </div>
            </div>

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

            {/* Dispatch action for scheduled movements */}
            {isScheduled && canDispatch && onDispatch && (
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
