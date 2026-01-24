import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { User, Building, Warehouse, Stethoscope } from "lucide-react";
import type { ClientType } from "@/hooks/useClients";

interface ClientTypeBadgeProps {
  type: ClientType;
  className?: string;
  showIcon?: boolean;
}

const typeConfig: Record<ClientType, { icon: React.ElementType; colorClass: string }> = {
  individual: { icon: User, colorClass: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  organization: { icon: Building, colorClass: "bg-purple-500/15 text-purple-700 border-purple-500/30" },
  farm: { icon: Warehouse, colorClass: "bg-green-500/15 text-green-700 border-green-500/30" },
  clinic: { icon: Stethoscope, colorClass: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
};

export function ClientTypeBadge({ type, className, showIcon = true }: ClientTypeBadgeProps) {
  const { t } = useI18n();

  const config = typeConfig[type] || typeConfig.individual;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.colorClass, className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {t(`clients.types.${type}`)}
    </Badge>
  );
}

export function getClientTypeIcon(type: ClientType) {
  return typeConfig[type]?.icon || User;
}
