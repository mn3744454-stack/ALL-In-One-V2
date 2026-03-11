import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { Calendar, Truck, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovementStatusBadgeProps {
  status: string;
  className?: string;
}

export function MovementStatusBadge({ status, className }: MovementStatusBadgeProps) {
  const { t } = useI18n();

  const config: Record<string, { icon: typeof Calendar; label: string; className: string }> = {
    scheduled: {
      icon: Calendar,
      label: t('movement.lifecycle.statusScheduled'),
      className: 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    },
    dispatched: {
      icon: Truck,
      label: t('movement.lifecycle.statusDispatched'),
      className: 'text-blue-700 bg-blue-100 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    },
    completed: {
      icon: CheckCircle2,
      label: t('movement.lifecycle.statusCompleted'),
      className: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    },
    cancelled: {
      icon: XCircle,
      label: t('movement.lifecycle.statusCancelled'),
      className: 'text-red-700 bg-red-100 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    },
  };

  const c = config[status] || config.completed;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn("text-xs gap-1", c.className, className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}
