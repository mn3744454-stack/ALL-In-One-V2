import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ExpenseCard } from "./ExpenseCard";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Expense } from "@/hooks/finance/useExpenses";
import { Search, Receipt, Filter } from "lucide-react";

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          expense.description?.toLowerCase().includes(searchLower) ||
          expense.vendor_name?.toLowerCase().includes(searchLower) ||
          expense.notes?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== "all" && expense.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && expense.status !== statusFilter) {
        return false;
      }

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
      ) : (
        <div className="space-y-3">
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
