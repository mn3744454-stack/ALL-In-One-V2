import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { MovementStatusBadge } from "./MovementStatusBadge";
import { useSingleHorseMovements } from "@/hooks/movement/useHorseMovements";
import { useI18n } from "@/i18n";
import { formatStandardDateTime } from "@/lib/displayHelpers";
import { ArrowRight, MapPin, Clock, Link2, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface HorseMovementTimelineProps {
  horseId: string;
}

export function HorseMovementTimeline({ horseId }: HorseMovementTimelineProps) {
  const { t, dir } = useI18n();
  const { data: movements = [], isLoading } = useSingleHorseMovements(horseId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{t('movement.timeline.title')}</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t('movement.timeline.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('movement.timeline.noMovements')}</p>
        </CardContent>
      </Card>
    );
  }

  const formatLocation = (loc: { name: string; city: string | null } | null | undefined) => {
    if (!loc) return null;
    return loc.name;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          {t('movement.timeline.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className={cn(
            "absolute top-0 bottom-0 w-px bg-border",
            dir === 'rtl' ? 'right-3' : 'left-3'
          )} />

          <div className="space-y-4">
            {movements.map((m, i) => {
              const fromName = formatLocation(m.from_location);
              const toName = formatLocation(m.to_location);
              const fromExt = m.from_external_location?.name;
              const toExt = m.to_external_location?.name;
              const isConnected = m.destination_type === 'connected';
              const isAdmission = m.reason?.includes('admission');

              return (
                <div key={m.id} className={cn("relative flex gap-3", dir === 'rtl' ? 'pr-6' : 'pl-6')}>
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute top-1 w-2.5 h-2.5 rounded-full border-2 border-background",
                    dir === 'rtl' ? 'right-[7px]' : 'left-[7px]',
                    m.movement_status === 'scheduled' ? 'bg-amber-400' :
                    m.movement_status === 'dispatched' ? 'bg-blue-400' :
                    m.movement_status === 'completed' ? 'bg-emerald-400' :
                    m.movement_status === 'cancelled' ? 'bg-red-400' :
                    'bg-primary'
                  )} />

                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MovementTypeBadge type={m.movement_type} size="sm" />
                      <MovementStatusBadge status={m.movement_status} />
                      {isConnected && (
                        <Badge variant="outline" className="text-xs gap-0.5">
                          <Link2 className="h-2.5 w-2.5" />
                          {t('movement.destination.connected')}
                        </Badge>
                      )}
                      {isAdmission && (
                        <Badge variant="secondary" className="text-xs">
                          {t('movement.timeline.admissionLinked')}
                        </Badge>
                      )}
                    </div>

                    {/* Location summary */}
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {(fromName || fromExt) && (
                        <>
                          <span className="truncate">{fromName || fromExt}</span>
                          {(toName || toExt) && (
                            <>
                              <ArrowRight className={cn("h-3 w-3 shrink-0", dir === 'rtl' && "rotate-180")} />
                              <span className="truncate font-medium text-foreground">{toName || toExt}</span>
                            </>
                          )}
                        </>
                      )}
                      {!fromName && !fromExt && (toName || toExt) && (
                        <span className="truncate font-medium text-foreground">{toName || toExt}</span>
                      )}
                    </div>

                    {m.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.reason}</p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatStandardDateTime(m.movement_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
