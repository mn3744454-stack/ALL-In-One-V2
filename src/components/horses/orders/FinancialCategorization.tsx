import { useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, Calculator, Receipt } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  const {
    expenseCategories,
    incomeCategories,
    getTaxCategories,
    calculateTax,
    calculateTotal,
    getDefaultCategorization,
    getCategoryLabel,
    getTaxLabel,
  } = useFinancialCategories();

  const taxCategories = getTaxCategories();

  // Set default categorization when order category changes
  useEffect(() => {
    if (orderCategory) {
      const defaults = getDefaultCategorization(orderCategory, isExternalService);
      onCategorizationChange({
        ...categorization,
        ...defaults,
      });
    }
  }, [orderCategory, isExternalService]);

  const handleIsIncomeChange = (isIncome: boolean) => {
    onCategorizationChange({
      ...categorization,
      isIncome,
      category: isIncome ? "boarding" : "veterinary",
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
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currentCategories = categorization.isIncome ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-4">
      {/* Income/Expense Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2">
          {categorization.isIncome ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <Label className="font-medium">
            {categorization.isIncome ? "إيراد (دخل)" : "مصروف (تكلفة)"}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", !categorization.isIncome && "text-red-500 font-medium")}>
            مصروف
          </span>
          <Switch
            checked={categorization.isIncome}
            onCheckedChange={handleIsIncomeChange}
            disabled={disabled}
          />
          <span className={cn("text-sm", categorization.isIncome && "text-emerald-500 font-medium")}>
            إيراد
          </span>
        </div>
      </div>

      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            الفئة المالية
          </Label>
          <Select
            value={categorization.category}
            onValueChange={handleCategoryChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              {currentCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.labelAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <Calculator className="h-4 w-4" />
            رمز الحساب
          </Label>
          <Input
            value={categorization.accountCode}
            onChange={(e) => handleAccountCodeChange(e.target.value)}
            placeholder="مثال: 4200"
            disabled={disabled}
            dir="ltr"
            className="text-left"
          />
        </div>
      </div>

      {/* Tax Selection */}
      <div className="space-y-2">
        <Label>فئة الضريبة</Label>
        <Select
          value={categorization.taxCategory}
          onValueChange={handleTaxCategoryChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر فئة الضريبة" />
          </SelectTrigger>
          <SelectContent>
            {taxCategories.map((tax) => (
              <SelectItem key={tax.value} value={tax.value}>
                {tax.labelAr} ({tax.rate}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {estimatedCost > 0 && (
        <Card className="p-4 bg-muted/30">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ الأساسي:</span>
              <span>{formatCurrency(estimatedCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                الضريبة ({getTaxLabel(categorization.taxCategory, true)}):
              </span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>الإجمالي:</span>
              <span className={categorization.isIncome ? "text-emerald-500" : "text-red-500"}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
