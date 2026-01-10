import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface ExpenseStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; key: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", key: "pending" },
  approved: { color: "bg-blue-100 text-blue-700 border-blue-200", key: "approved" },
  paid: { color: "bg-green-100 text-green-700 border-green-200", key: "paid" },
  rejected: { color: "bg-red-100 text-red-700 border-red-200", key: "rejected" },
};

export function ExpenseStatusBadge({ status, className }: ExpenseStatusBadgeProps) {
  const { t } = useI18n();
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant="outline" className={cn(config.color, className)}>
      {t(`finance.expenses.statuses.${config.key}`)}
    </Badge>
  );
}
