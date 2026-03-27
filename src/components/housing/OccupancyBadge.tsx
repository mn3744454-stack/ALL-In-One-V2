import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { User, Users, Wrench, Ban } from "lucide-react";

interface OccupancyBadgeProps {
  occupancy: 'single' | 'group';
  current: number;
  capacity: number;
  status?: string;
  className?: string;
}

export function OccupancyBadge({ occupancy, current, capacity, status, className }: OccupancyBadgeProps) {
  const { t } = useI18n();

  const isMaintenance = status === 'maintenance';
  const isOutOfService = status === 'out_of_service';
  const isFull = current >= capacity;
  const isVacant = current === 0;

  let color = "bg-emerald-100 text-emerald-700 border-emerald-200";
  let statusLabel = t('housing.units.status.vacant');
  let StatusIcon: React.ElementType | null = null;

  if (isOutOfService) {
    color = "bg-red-100 text-red-700 border-red-200";
    statusLabel = t('housing.units.status.outOfService');
    StatusIcon = Ban;
  } else if (isMaintenance) {
    color = "bg-slate-100 text-slate-600 border-slate-200";
    statusLabel = t('housing.units.status.maintenance');
    StatusIcon = Wrench;
  } else if (isFull) {
    color = "bg-red-100 text-red-700 border-red-200";
    statusLabel = t('housing.units.status.full');
  } else if (!isVacant) {
    color = "bg-amber-100 text-amber-700 border-amber-200";
    statusLabel = t('housing.units.status.occupied');
  }

  const Icon = StatusIcon || (occupancy === 'single' ? User : Users);

  return (
    <Badge variant="outline" className={cn("gap-1", color, className)}>
      <Icon className="w-3 h-3" />
      {current}/{capacity} • {statusLabel}
    </Badge>
  );
}
