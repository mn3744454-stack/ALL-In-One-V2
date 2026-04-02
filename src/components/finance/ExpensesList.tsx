import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExpenseCard } from "./ExpenseCard";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Expense } from "@/hooks/finance/useExpenses";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { formatCurrency } from "@/lib/formatters";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import {
  Search,
  Receipt,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";

interface ExpensesListProps {
  expenses: Expense[];
  loading: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => Promise<void>;
  onUpdateStatus?: (expenseId: string, status: string) => Promise<void>;
  onViewReceipt?: (expense: Expense) => void;
  canManage?: boolean;
}

export function ExpensesList({
  expenses,
  loading,
  onEdit,
  onDelete,
  onUpdateStatus,
  onViewReceipt,
  canManage = false,
}: ExpensesListProps) {
  const { t, dir } = useI18n();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('finance-expenses');
  const tenantCurrency = useTenantCurrency();
  const formatAmount = (amount: number) => formatCurrency(amount, tenantCurrency);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          expense.description?.toLowerCase().includes(searchLower) ||
          expense.vendor_name?.toLowerCase().includes(searchLower) ||
          expense.notes?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
      if (statusFilter !== "all" && expense.status !== statusFilter) return false;
      return true;
    });
  }, [expenses, search, categoryFilter, statusFilter]);

  const handleDelete = async () => {
    if (deleteId && onDelete) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const renderExpenseActions = (expense: Expense) => {
    if (!canManage) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {expense.status === "pending" && (
            <>
              <DropdownMenuItem onClick={() => onUpdateStatus?.(expense.id, "approved")}>
                <CheckCircle className="w-4 h-4 me-2 text-success" />
                {t("finance.expenses.approve")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus?.(expense.id, "rejected")}>
                <XCircle className="w-4 h-4 me-2 text-destructive" />
                {t("finance.expenses.reject")}
              </DropdownMenuItem>
            </>
          )}
          {expense.receipt_asset_id && (
            <DropdownMenuItem onClick={() => onViewReceipt?.(expense)}>
              <Eye className="w-4 h-4 me-2" />
              {t("finance.expenses.viewReceipt")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onEdit?.(expense)}>
            <Pencil className="w-4 h-4 me-2" />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteId(expense.id)} className="text-destructive">
            <Trash2 className="w-4 h-4 me-2" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              dir === "rtl" ? "right-3" : "left-3"
            )}
          />
          <Input
            placeholder={t("finance.expenses.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t("finance.expenses.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`finance.expenses.categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t("hr.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="pending">{t("finance.expenses.statuses.pending")}</SelectItem>
            <SelectItem value="approved">{t("finance.expenses.statuses.approved")}</SelectItem>
            <SelectItem value="paid">{t("finance.expenses.statuses.paid")}</SelectItem>
            <SelectItem value="rejected">{t("finance.expenses.statuses.rejected")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden md:block">
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable={true}
          />
        </div>
      </div>

      {/* Results */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy mb-1">
            {expenses.length === 0
              ? t("finance.expenses.empty")
              : t("common.noResults")}
          </h3>
          {expenses.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("finance.expenses.tryDifferentFilters")}
            </p>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px] whitespace-nowrap">{t("common.date")}</TableHead>
                <TableHead className="min-w-[120px] text-start">{t("finance.expenses.vendor")}</TableHead>
                <TableHead className="min-w-[100px] text-start">{t("finance.expenses.category")}</TableHead>
                <TableHead className="text-center w-[110px] whitespace-nowrap">{t("finance.expenses.amount")}</TableHead>
                <TableHead className="text-center w-[100px] whitespace-nowrap">{t("common.status")}</TableHead>
                {canManage && <TableHead className="w-[50px] text-center">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onEdit?.(expense)}>
                  <TableCell className="font-mono text-sm" dir="ltr">
                    {format(new Date(expense.expense_date), "dd-MM-yyyy")}
                  </TableCell>
                  <TableCell>{expense.vendor_name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`finance.expenses.categories.${expense.category}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono tabular-nums" dir="ltr">
                    {formatAmount(expense.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                      {t(`finance.expenses.statuses.${expense.status}`)}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {renderExpenseActions(expense)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? getGridClass(gridColumns, viewMode) : 'space-y-3'}>
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={() => onEdit?.(expense)}
              onDelete={() => setDeleteId(expense.id)}
              onApprove={() => onUpdateStatus?.(expense.id, "approved")}
              onReject={() => onUpdateStatus?.(expense.id, "rejected")}
              onViewReceipt={() => onViewReceipt?.(expense)}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("finance.expenses.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("finance.expenses.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
