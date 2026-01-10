import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/contexts/TenantContext";
import { useInvoices } from "@/hooks/finance/useInvoices";
import { useExpenses } from "@/hooks/finance/useExpenses";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { isThisMonth } from "date-fns";
import { DollarSign, TrendingUp, TrendingDown, ChevronRight, AlertCircle } from "lucide-react";

export function FinancialSummaryWidget() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();

  const { invoices, isLoading: invoicesLoading } = useInvoices(activeTenant?.tenant.id);
  const { expenses, isLoading: expensesLoading } = useExpenses(activeTenant?.tenant.id);

  const isLoading = invoicesLoading || expensesLoading;

  const summary = useMemo(() => {
    // This month's paid invoices
    const revenue = invoices
      .filter(
        (i) =>
          i.status === "paid" && isThisMonth(new Date(i.issue_date))
      )
      .reduce((sum, i) => sum + i.total_amount, 0);

    // This month's expenses
    const expenseTotal = expenses
      .filter((e) => isThisMonth(new Date(e.expense_date)))
      .reduce((sum, e) => sum + e.amount, 0);

    // Outstanding invoices
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + i.total_amount, 0);

    return { revenue, expenses: expenseTotal, outstanding };
  }, [invoices, expenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gold" />
            {t("dashboard.widgets.financialSummary")}
          </span>
          <Link
            to="/dashboard/finance"
            className="text-sm font-normal text-gold hover:text-gold-dark flex items-center gap-1"
          >
            {t("dashboard.widgets.viewAll")}
            <ChevronRight className={cn("w-4 h-4", dir === "rtl" && "rotate-180")} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Revenue */}
          <div className="p-3 rounded-lg bg-green-50">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-700">{formatCurrency(summary.revenue)}</p>
            <p className="text-xs text-green-600">{t("dashboard.widgets.revenue")}</p>
          </div>

          {/* Expenses */}
          <div className="p-3 rounded-lg bg-red-50">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-lg font-bold text-red-700">{formatCurrency(summary.expenses)}</p>
            <p className="text-xs text-red-600">{t("dashboard.widgets.expenses")}</p>
          </div>

          {/* Outstanding */}
          <div className="p-3 rounded-lg bg-yellow-50">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-lg font-bold text-yellow-700">{formatCurrency(summary.outstanding)}</p>
            <p className="text-xs text-yellow-600">{t("dashboard.widgets.outstanding")}</p>
          </div>
        </div>

        {/* Net */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("dashboard.widgets.netThisMonth")}</span>
          <span
            className={cn(
              "text-lg font-bold",
              summary.revenue - summary.expenses >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {formatCurrency(summary.revenue - summary.expenses)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
