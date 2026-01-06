import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MovementTypeBadge } from "./MovementTypeBadge";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
import { MapPin, ArrowRight, Clock, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HorseMovement } from "@/hooks/movement/useHorseMovements";

interface MovementCardProps {
  movement: HorseMovement;
  showHorse?: boolean;
}

export function MovementCard({ movement, showHorse = true }: MovementCardProps) {
  const { t, dir } = useI18n();

  const ArrowIcon = dir === 'rtl' ? (
    <ArrowRight className="h-4 w-4 rotate-180 text-muted-foreground shrink-0" />
  ) : (
    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
  );

  const formatLocationName = (location: { name: string; city: string | null } | null) => {
    if (!location) return "—";
    return location.city ? `${location.name}` : location.name;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Horse Avatar */}
          {showHorse && movement.horse && (
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={movement.horse.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {movement.horse.name?.[0]?.toUpperCase() || "H"}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: Horse name + Badge */}
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
                {/* Movement direction */}
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
              <MovementTypeBadge type={movement.movement_type} size="sm" />
            </div>

            {/* Internal location note for same-branch transfers */}
            {movement.internal_location_note && (
              <p className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                📍 {movement.internal_location_note}
              </p>
            )}

            {/* Reason */}
            {movement.reason && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{movement.reason}</span>
              </div>
            )}

            {/* Footer: Time + Recorded by */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(movement.movement_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              {movement.is_demo && (
                <span className="text-amber-600 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded text-xs">
                  Demo
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
