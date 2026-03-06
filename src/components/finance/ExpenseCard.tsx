import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Utensils,
  Stethoscope,
  Wrench,
  Users,
  Zap,
  Hammer,
  Truck,
  Shield,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  CheckCircle,
  XCircle,
  CircleDollarSign,
} from "lucide-react";
import type { Expense } from "@/hooks/finance/useExpenses";

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onViewReceipt?: () => void;
  canManage?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  feed: Utensils,
  veterinary: Stethoscope,
  equipment: Wrench,
  labor: Users,
  utilities: Zap,
  maintenance: Hammer,
  transportation: Truck,
  insurance: Shield,
  other: CircleDollarSign,
};

const categoryColors: Record<string, string> = {
  feed: "bg-orange-100 text-orange-600",
  veterinary: "bg-green-100 text-green-600",
  equipment: "bg-blue-100 text-blue-600",
  labor: "bg-purple-100 text-purple-600",
  utilities: "bg-yellow-100 text-yellow-600",
  maintenance: "bg-gray-100 text-gray-600",
  transportation: "bg-indigo-100 text-indigo-600",
  insurance: "bg-pink-100 text-pink-600",
  other: "bg-slate-100 text-slate-600",
};

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onViewReceipt,
  canManage = false,
}: ExpenseCardProps) {
  const { t } = useI18n();
  const Icon = categoryIcons[expense.category] || CircleDollarSign;
  const colorClass = categoryColors[expense.category] || "bg-muted text-muted-foreground";

  return (
    <Card className="hover:shadow-md transition-shadow relative">
      <CardContent className="p-3 sm:p-4">
        {/* Actions menu — absolute positioned */}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 end-2 h-8 w-8 shrink-0 z-10">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {expense.status === "pending" && (
                <>
                  <DropdownMenuItem onClick={onApprove}>
                    <CheckCircle className="w-4 h-4 me-2 text-success" />
                    {t("finance.expenses.approve")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onReject}>
                    <XCircle className="w-4 h-4 me-2 text-destructive" />
                    {t("finance.expenses.reject")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 me-2" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 me-2" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className={cn("flex items-start gap-3", canManage && "pe-8")}>
          {/* Category Icon */}
          <div className={cn("w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0", colorClass)}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-navy text-sm sm:text-base line-clamp-1">
              {expense.description || t(`finance.expenses.categories.${expense.category}`)}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {expense.vendor_name || t("finance.expenses.noVendor")}
            </p>

            {/* Amount — below title */}
            <p className="text-base sm:text-lg font-bold text-navy font-mono tabular-nums mt-1" dir="ltr">
              {formatCurrency(expense.amount, expense.currency)}
            </p>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-2">
              <ExpenseStatusBadge status={expense.status} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(expense.expense_date), "MMM d, yyyy")}
              </span>
              {expense.receipt_asset_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-gold hover:text-gold-dark px-1.5"
                  onClick={onViewReceipt}
                >
                  <Receipt className="w-3 h-3" />
                  <span className="hidden xs:inline">{t("finance.expenses.viewReceipt")}</span>
                </Button>
              )}
            </div>

            {expense.notes && !expense.notes.includes('[DEMO]') && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                {expense.notes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
