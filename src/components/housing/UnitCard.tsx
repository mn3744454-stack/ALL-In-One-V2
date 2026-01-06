import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UnitTypeBadge } from "./UnitTypeBadge";
import { OccupancyBadge } from "./OccupancyBadge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Home, Trees, BedDouble, Eye, MoreVertical } from "lucide-react";
import type { HousingUnit } from "@/hooks/housing/useHousingUnits";

interface UnitCardProps {
  unit: HousingUnit;
  onViewDetails: (unit: HousingUnit) => void;
}

export function UnitCard({ unit, onViewDetails }: UnitCardProps) {
  const { t, dir, language } = useI18n();

  const displayName = language === 'ar' && unit.name_ar ? unit.name_ar : (unit.name || unit.code);
  const occupancyPercent = unit.capacity > 0 
    ? Math.round((unit.current_occupants || 0) / unit.capacity * 100) 
    : 0;

  const iconMap: Record<string, React.ElementType> = {
    stall: Home,
    paddock: Trees,
    room: BedDouble,
  };
  const Icon = iconMap[unit.unit_type] || Home;

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all",
      !unit.is_active && "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">{unit.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unit.is_demo && (
              <Badge variant="outline" className="text-xs">Demo</Badge>
            )}
            {!unit.is_active && (
              <Badge variant="secondary" className="text-xs">{t('common.inactive')}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <UnitTypeBadge type={unit.unit_type} />
          <OccupancyBadge 
            occupancy={unit.occupancy} 
            current={unit.current_occupants || 0} 
            capacity={unit.capacity} 
          />
        </div>

        {unit.occupancy === 'group' && (
          <div className="space-y-1">
            <Progress value={occupancyPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {unit.current_occupants || 0} / {unit.capacity}
            </p>
          </div>
        )}

        {unit.area && (
          <p className="text-sm text-muted-foreground">
            {unit.area.name}
          </p>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={() => onViewDetails(unit)}
        >
          <Eye className="w-4 h-4" />
          {t('housing.units.viewDetails')}
        </Button>
      </CardContent>
    </Card>
  );
}
