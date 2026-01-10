import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { SecureImage } from "@/components/ui/SecureImage";
import { useI18n } from "@/i18n";
import { format } from "date-fns";
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
  Eye,
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
  const { t, dir } = useI18n();
  const Icon = categoryIcons[expense.category] || CircleDollarSign;
  const colorClass = categoryColors[expense.category] || "bg-muted text-muted-foreground";

  const formatCurrency = (amount: number, currency: string = "SAR") => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Category Icon */}
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
            <Icon className="w-6 h-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-medium text-navy truncate">
                  {expense.description || t(`finance.expenses.categories.${expense.category}`)}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {expense.vendor_name || t("finance.expenses.noVendor")}
                </p>
              </div>
              <div className="text-end shrink-0">
                <p className="text-lg font-bold text-navy">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-2">
              <ExpenseStatusBadge status={expense.status} />
              <span className="text-xs text-muted-foreground">
                {format(new Date(expense.expense_date), "MMM d, yyyy")}
              </span>
              {expense.receipt_asset_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-gold hover:text-gold-dark"
                  onClick={onViewReceipt}
                >
                  <Receipt className="w-3 h-3" />
                  {t("finance.expenses.viewReceipt")}
                </Button>
              )}
            </div>

            {expense.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {expense.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
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
        </div>
      </CardContent>
    </Card>
  );
}
