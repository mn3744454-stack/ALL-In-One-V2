import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Home, Trees, BedDouble, Box, HelpCircle } from "lucide-react";

interface UnitTypeBadgeProps {
  type: string;
  className?: string;
}

export function UnitTypeBadge({ type, className }: UnitTypeBadgeProps) {
  const { t } = useI18n();

  const config: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    stall: { icon: Home, color: "bg-blue-100 text-blue-700 border-blue-200", label: t('housing.units.types.stall') },
    paddock: { icon: Trees, color: "bg-green-100 text-green-700 border-green-200", label: t('housing.units.types.paddock') },
    room: { icon: BedDouble, color: "bg-purple-100 text-purple-700 border-purple-200", label: t('housing.units.types.room') },
    cage: { icon: Box, color: "bg-orange-100 text-orange-700 border-orange-200", label: t('housing.units.types.cage') },
    other: { icon: HelpCircle, color: "bg-gray-100 text-gray-700 border-gray-200", label: t('housing.units.types.other') },
  };

  const { icon: Icon, color, label } = config[type] || config.other;

  return (
    <Badge variant="outline" className={cn("gap-1", color, className)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
