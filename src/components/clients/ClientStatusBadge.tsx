import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/hooks/useClients";

interface ClientStatusBadgeProps {
  status: ClientStatus;
  className?: string;
}

export function ClientStatusBadge({ status, className }: ClientStatusBadgeProps) {
  const { t } = useI18n();

  const statusConfig: Record<ClientStatus, { label: string; classes: string }> = {
    active: {
      label: t("clients.status.active"),
      classes: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    },
    inactive: {
      label: t("clients.status.inactive"),
      classes: "bg-slate-500/15 text-slate-600 border-slate-500/30",
    },
    pending: {
      label: t("clients.status.pending"),
      classes: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    },
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <Badge variant="outline" className={cn(config.classes, className)}>
      {config.label}
    </Badge>
  );
}
