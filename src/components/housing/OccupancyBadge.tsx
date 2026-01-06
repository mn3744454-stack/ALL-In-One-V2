import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { User, Users } from "lucide-react";

interface OccupancyBadgeProps {
  occupancy: 'single' | 'group';
  current: number;
  capacity: number;
  className?: string;
}

export function OccupancyBadge({ occupancy, current, capacity, className }: OccupancyBadgeProps) {
  const { t } = useI18n();

  const isFull = current >= capacity;
  const isVacant = current === 0;

  let color = "bg-emerald-100 text-emerald-700 border-emerald-200";
  let statusLabel = t('housing.units.status.vacant');

  if (isFull) {
    color = "bg-red-100 text-red-700 border-red-200";
    statusLabel = t('housing.units.status.full');
  } else if (!isVacant) {
    color = "bg-amber-100 text-amber-700 border-amber-200";
    statusLabel = t('housing.units.status.occupied');
  }

  const Icon = occupancy === 'single' ? User : Users;

  return (
    <Badge variant="outline" className={cn("gap-1", color, className)}>
      <Icon className="w-3 h-3" />
      {current}/{capacity} • {statusLabel}
    </Badge>
  );
}
