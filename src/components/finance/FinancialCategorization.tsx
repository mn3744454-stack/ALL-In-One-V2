import { useMemo, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Calculator, Receipt, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useFinancialCategories,
  OrderCategory,
  FinancialCategorization as FinancialCategorizationType,
  ExpenseCategory,
  IncomeCategory,
  TaxCategory,
} from "@/hooks/useFinancialCategories";
import { useCustomFinancialCategories } from "@/hooks/useCustomFinancialCategories";
import { AddCategoryDialog } from "@/components/horses/orders/AddCategoryDialog";
import { useI18n } from "@/i18n";

interface FinancialCategorizationProps {
  orderCategory: OrderCategory;
  estimatedCost?: number;
  isExternalService: boolean;
  categorization: FinancialCategorizationType;
  onCategorizationChange: (categorization: FinancialCategorizationType) => void;
  disabled?: boolean;
}

export function FinancialCategorization({
  orderCategory,
  estimatedCost = 0,
  isExternalService,
  categorization,
  onCategorizationChange,
  disabled = false,
}: FinancialCategorizationProps) {
  const { t } = useI18n();
  const {
    expenseCategories,
    incomeCategories,
    getTaxCategories,
    calculateTax,
    calculateTotal,
    getDefaultCategorization,
    getTaxLabel,
  } = useFinancialCategories();

  const { categories: customCategories, refresh: refreshCustomCategories } = useCustomFinancialCategories();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const taxCategories = getTaxCategories();

  // Set default categorization when order category changes
  useEffect(() => {
    if (orderCategory && ['veterinary', 'boarding', 'transportation', 'breeding', 'laboratory'].includes(orderCategory)) {
      const defaults = getDefaultCategorization(orderCategory, isExternalService);
      onCategorizationChange({
        ...categorization,
        ...defaults,
      });
    }
  }, [orderCategory, isExternalService]);

  const handleIsIncomeChange = () => {
    const newIsIncome = !categorization.isIncome;
    onCategorizationChange({
      ...categorization,
      isIncome: newIsIncome,
      category: newIsIncome ? "boarding" : "veterinary",
    });
  };

  const handleCategoryChange = (cat: string) => {
    onCategorizationChange({
      ...categorization,
      category: cat as ExpenseCategory | IncomeCategory,
    });
  };

  const handleAccountCodeChange = (accountCode: string) => {
    onCategorizationChange({
      ...categorization,
      accountCode,
    });
  };

  const handleTaxCategoryChange = (taxCategory: string) => {
    onCategorizationChange({
      ...categorization,
      taxCategory: taxCategory as TaxCategory,
    });
  };

  const taxAmount = useMemo(() => {
    return calculateTax(estimatedCost, categorization.taxCategory);
  }, [estimatedCost, categorization.taxCategory, calculateTax]);

  const totalAmount = useMemo(() => {
    return calculateTotal(estimatedCost, categorization.taxCategory);
  }, [estimatedCost, categorization.taxCategory, calculateTotal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Combine default and custom categories
  const allCategories = useMemo(() => {
    const baseCategories = categorization.isIncome ? incomeCategories : expenseCategories;
    const customFiltered = customCategories.filter(
      c => c.category_type === (categorization.isIncome ? 'income' : 'expense')
    );
    
    return [
      ...baseCategories,
      ...customFiltered.map(c => ({
        value: c.id,
        label: c.name,
        labelAr: c.name_ar || c.name,
      })),
    ];
  }, [categorization.isIncome, incomeCategories, expenseCategories, customCategories]);

  return (
    <>
      <div className="space-y-4">
        {/* Income/Expense Toggle - Improved Animation */}
        <div 
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
            categorization.isIncome 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : "bg-red-500/10 border-red-500/30"
          )}
        >
          <div className="flex items-center gap-2">
            {categorization.isIncome ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <Label className="font-medium">
              {categorization.isIncome 
                ? t("finance.categorization.income") 
                : t("finance.categorization.expense")}
            </Label>
          </div>
          <button
            type="button"
            onClick={handleIsIncomeChange}
            disabled={disabled}
            className={cn(
              "relative inline-flex h-8 w-20 shrink-0 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              categorization.isIncome 
                ? "bg-emerald-500" 
                : "bg-red-500"
            )}
          >
            <span className="sr-only">Toggle income/expense</span>
            <span
              className={cn(
                "pointer-events-none absolute top-1 left-1 flex h-6 w-8 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform duration-300",
                categorization.isIncome && "translate-x-10"
              )}
            >
              {categorization.isIncome ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </span>
            <span className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white transition-opacity duration-200",
              categorization.isIncome ? "opacity-0" : "opacity-100"
            )}>
              EXP
            </span>
            <span className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white transition-opacity duration-200",
              categorization.isIncome ? "opacity-100" : "opacity-0"
            )}>
              INC
            </span>
          </button>
        </div>

        {/* Category Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                {t("finance.categorization.category")}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t("common.add")}
              </Button>
            </div>
            <Select
              value={categorization.category}
              onValueChange={handleCategoryChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("finance.categorization.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              {t("finance.categorization.accountCode")}
            </Label>
            <Input
              value={categorization.accountCode}
              onChange={(e) => handleAccountCodeChange(e.target.value)}
              placeholder={t("finance.categorization.accountCodePlaceholder")}
              disabled={disabled}
              dir="ltr"
              className="text-left"
            />
          </div>
        </div>

        {/* Tax Selection */}
        <div className="space-y-2">
          <Label>{t("finance.categorization.taxCategory")}</Label>
          <Select
            value={categorization.taxCategory}
            onValueChange={handleTaxCategoryChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("finance.categorization.selectTax")} />
            </SelectTrigger>
            <SelectContent>
              {taxCategories.map((tax) => (
                <SelectItem key={tax.value} value={tax.value}>
                  {tax.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        {estimatedCost > 0 && (
          <Card className={cn(
            "p-4 transition-colors duration-300",
            categorization.isIncome ? "bg-emerald-500/5" : "bg-red-500/5"
          )}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("finance.categorization.baseAmount")}:</span>
                <span>{formatCurrency(estimatedCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("finance.categorization.tax")} ({getTaxLabel(categorization.taxCategory, false)}):
                </span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <span>{t("finance.categorization.total")}:</span>
                <span className={categorization.isIncome ? "text-emerald-500" : "text-red-500"}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AddCategoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultIsIncome={categorization.isIncome}
        onCategoryAdded={refreshCustomCategories}
      />
    </>
  );
}
