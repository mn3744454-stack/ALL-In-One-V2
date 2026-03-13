import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; key: string }> = {
  draft: { color: "bg-gray-100 text-gray-700 border-gray-200", key: "draft" },
  reviewed: { color: "bg-indigo-100 text-indigo-700 border-indigo-200", key: "reviewed" },
  approved: { color: "bg-blue-100 text-blue-700 border-blue-200", key: "approved" },
  shared: { color: "bg-cyan-100 text-cyan-700 border-cyan-200", key: "shared" },
  issued: { color: "bg-blue-100 text-blue-700 border-blue-200", key: "issued" },
  paid: { color: "bg-green-100 text-green-700 border-green-200", key: "paid" },
  partial: { color: "bg-amber-100 text-amber-700 border-amber-200", key: "partial" },
  overdue: { color: "bg-red-100 text-red-700 border-red-200", key: "overdue" },
  cancelled: { color: "bg-slate-100 text-slate-700 border-slate-200", key: "cancelled" },
  // Legacy fallback for "sent" → show as approved
  sent: { color: "bg-blue-100 text-blue-700 border-blue-200", key: "approved" },
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
