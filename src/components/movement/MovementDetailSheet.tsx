import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { MovementStatusBadge } from "./MovementStatusBadge";
import { useI18n } from "@/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import { MapPin, Clock, FileText, ExternalLink, Calendar, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorseMovement } from "@/hooks/movement/useHorseMovements";

interface MovementDetailSheetProps {
  movement: HorseMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewAdmission?: (admissionId: string) => void;
  onDispatch?: (movementId: string) => void;
}

export function MovementDetailSheet({ movement, open, onOpenChange, onViewAdmission, onDispatch }: MovementDetailSheetProps) {
  const { t, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  const canDispatch = isOwner || hasPermission('movement.dispatch.confirm');

  if (!movement) return null;

  const formatLocationName = (location: { name: string; city: string | null } | null) => {
    if (!location) return "—";
    return location.city ? `${location.name}, ${location.city}` : location.name;
  };

  const formatExternalLocationName = (location: { name: string; name_ar: string | null; location_type: string } | null) => {
    if (!location) return null;
    return location.name;
  };

  const isAdmissionCheckin = movement.reason?.includes('admission check-in') || movement.reason?.includes('Boarding admission check-in');
  const isAdmissionCheckout = movement.reason?.includes('admission checkout') || movement.reason?.includes('Boarding admission checkout');
  const isTransfer = movement.movement_type === 'transfer';
  const isScheduled = movement.movement_status === 'scheduled';

  const getMovementCategory = () => {
    if (isAdmissionCheckin) return { label: t('housing.admissions.detail.checkin'), className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' };
    if (isAdmissionCheckout) return { label: t('housing.admissions.detail.checkout'), className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (isTransfer) return { label: t('movement.types.transfer'), className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    return { label: t('movement.types.manual'), className: '' };
  };

  const category = getMovementCategory();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('movement.detail.title')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Horse + Type */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {movement.horse && (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={movement.horse.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {movement.horse.name?.[0]?.toUpperCase() || 'H'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{movement.horse?.name || t('common.unknown')}</h3>
                  {movement.horse?.name_ar && (
                    <p className="text-xs text-muted-foreground" dir="rtl">{movement.horse.name_ar}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <MovementTypeBadge type={movement.movement_type} size="sm" />
                  {movement.movement_status !== 'completed' && (
                    <MovementStatusBadge status={movement.movement_status} />
                  )}
                  <Badge className={cn("text-xs", category.className)}>
                    {category.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movement Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* From → To */}
              <div className="space-y-2">
                {movement.from_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{t('movement.form.from')}:</span>
                    <span className="font-medium">{formatLocationName(movement.from_location)}</span>
                  </div>
                )}
                {movement.from_external_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{t('movement.form.from')}:</span>
                    <span className="font-medium">{formatExternalLocationName(movement.from_external_location)}</span>
                    <Badge variant="outline" className="text-xs">{t(`movement.destination.types.${movement.from_external_location.location_type}`)}</Badge>
                  </div>
                )}
                {movement.to_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{t('movement.form.to')}:</span>
                    <span className="font-medium">{formatLocationName(movement.to_location)}</span>
                  </div>
                )}
                {movement.to_external_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{t('movement.form.to')}:</span>
                    <span className="font-medium">{formatExternalLocationName(movement.to_external_location)}</span>
                    <Badge variant="outline" className="text-xs">{t(`movement.destination.types.${movement.to_external_location.location_type}`)}</Badge>
                  </div>
                )}
              </div>

              {/* Internal note */}
              {movement.internal_location_note && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">{t('movement.detail.internalNote')}:</span>
                    <p className="font-medium">{movement.internal_location_note}</p>
                  </div>
                </div>
              )}

              {/* Reason */}
              {movement.reason && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-muted-foreground">{t('movement.detail.reason')}:</span>
                    <p className="font-medium">{movement.reason}</p>
                  </div>
                </div>
              )}

              {/* Lifecycle timestamps */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{t('movement.detail.time')}:</span>
                  <span className="font-medium">{formatStandardDateTime(new Date(movement.movement_at))}</span>
                </div>
                {movement.scheduled_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">{t('movement.lifecycle.scheduledFor')}:</span>
                    <span className="font-medium">{formatStandardDateTime(new Date(movement.scheduled_at))}</span>
                  </div>
                )}
                {movement.dispatched_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-muted-foreground">{t('movement.lifecycle.dispatchedAt')}:</span>
                    <span className="font-medium">{formatStandardDateTime(new Date(movement.dispatched_at))}</span>
                  </div>
                )}
                {movement.completed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">{t('movement.lifecycle.completedAt')}:</span>
                    <span className="font-medium">{formatStandardDateTime(new Date(movement.completed_at))}</span>
                  </div>
                )}
              </div>

              {/* Demo badge */}
              {movement.is_demo && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Demo</Badge>
              )}
            </CardContent>
          </Card>

          {/* Dispatch action */}
          {isScheduled && canDispatch && onDispatch && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-3">
                <Button
                  className="w-full gap-2"
                  onClick={() => onDispatch(movement.id)}
                >
                  <Truck className="h-4 w-4" />
                  {t('movement.lifecycle.confirmDispatch')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Link to admission */}
          {(isAdmissionCheckin || isAdmissionCheckout) && (
            <Card className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('movement.detail.linkedAdmission')}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {t('movement.detail.viewAdmission')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
