import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; key: string }> = {
  draft: { color: "bg-gray-100 text-gray-700 border-gray-200", key: "draft" },
  sent: { color: "bg-blue-100 text-blue-700 border-blue-200", key: "sent" },
  paid: { color: "bg-green-100 text-green-700 border-green-200", key: "paid" },
  overdue: { color: "bg-red-100 text-red-700 border-red-200", key: "overdue" },
  cancelled: { color: "bg-slate-100 text-slate-700 border-slate-200", key: "cancelled" },
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant="outline" className={cn(config.color, className)}>
      {t(`finance.invoices.statuses.${config.key}`)}
    </Badge>
  );
}
