import { useMemo, useCallback } from 'react';

// Expense Categories
export type ExpenseCategory =
  | 'feed'
  | 'veterinary'
  | 'maintenance'
  | 'utilities'
  | 'labor'
  | 'transportation'
  | 'insurance'
  | 'equipment'
  | 'supplies'
  | 'medication'
  | 'other';

// Income Categories
export type IncomeCategory =
  | 'boarding'
  | 'veterinary-services'
  | 'transportation-services'
  | 'breeding-services'
  | 'laboratory-services'
  | 'consultation'
  | 'training'
  | 'equipment-rental'
  | 'other';

export type FinancialCategory = ExpenseCategory | IncomeCategory;

export type TaxCategory = 'vat_standard' | 'vat_reduced' | 'vat_exempt' | 'vat_zero';

export type OrderCategory = 'veterinary' | 'boarding' | 'transportation' | 'breeding' | 'laboratory';

export interface CategoryMapping {
  defaultExpense: ExpenseCategory;
  defaultIncome: IncomeCategory;
  suggestedAccount: string;
  taxCategory: TaxCategory;
}

export interface TaxInfo {
  value: TaxCategory;
  rate: number;
  label: string;
  labelAr: string;
}

export interface FinancialCategorization {
  category: FinancialCategory;
  subcategory?: string;
  isIncome: boolean;
  accountCode?: string;
  taxCategory?: TaxCategory;
  notes?: string;
}

// Default expense categories
const defaultExpenseCategories: { value: ExpenseCategory; label: string; labelAr: string }[] = [
  { value: 'feed', label: 'Feed', labelAr: 'علف' },
  { value: 'veterinary', label: 'Veterinary', labelAr: 'بيطري' },
  { value: 'maintenance', label: 'Maintenance', labelAr: 'صيانة' },
  { value: 'utilities', label: 'Utilities', labelAr: 'خدمات' },
  { value: 'labor', label: 'Labor', labelAr: 'عمالة' },
  { value: 'transportation', label: 'Transportation', labelAr: 'نقل' },
  { value: 'insurance', label: 'Insurance', labelAr: 'تأمين' },
  { value: 'equipment', label: 'Equipment', labelAr: 'معدات' },
  { value: 'supplies', label: 'Supplies', labelAr: 'مستلزمات' },
  { value: 'medication', label: 'Medication', labelAr: 'أدوية' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

// Default income categories
const defaultIncomeCategories: { value: IncomeCategory; label: string; labelAr: string }[] = [
  { value: 'boarding', label: 'Boarding', labelAr: 'إقامة' },
  { value: 'veterinary-services', label: 'Veterinary Services', labelAr: 'خدمات بيطرية' },
  { value: 'transportation-services', label: 'Transportation Services', labelAr: 'خدمات نقل' },
  { value: 'breeding-services', label: 'Breeding Services', labelAr: 'خدمات تربية' },
  { value: 'laboratory-services', label: 'Laboratory Services', labelAr: 'خدمات مختبر' },
  { value: 'consultation', label: 'Consultation', labelAr: 'استشارات' },
  { value: 'training', label: 'Training', labelAr: 'تدريب' },
  { value: 'equipment-rental', label: 'Equipment Rental', labelAr: 'تأجير معدات' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

// Tax categories with rates
const taxCategories: TaxInfo[] = [
  { value: 'vat_standard', rate: 15, label: 'VAT Standard (15%)', labelAr: 'ضريبة قيمة مضافة (15%)' },
  { value: 'vat_reduced', rate: 5, label: 'VAT Reduced (5%)', labelAr: 'ضريبة مخفضة (5%)' },
  { value: 'vat_exempt', rate: 0, label: 'VAT Exempt (0%)', labelAr: 'معفى من الضريبة (0%)' },
  { value: 'vat_zero', rate: 0, label: 'Zero Rated (0%)', labelAr: 'صفر ضريبة (0%)' },
];

// Category mappings for automatic detection
const categoryMappings: Record<OrderCategory, CategoryMapping> = {
  veterinary: {
    defaultExpense: 'veterinary',
    defaultIncome: 'veterinary-services',
    suggestedAccount: '4200',
    taxCategory: 'vat_standard',
  },
  boarding: {
    defaultExpense: 'feed',
    defaultIncome: 'boarding',
    suggestedAccount: '4100',
    taxCategory: 'vat_standard',
  },
  transportation: {
    defaultExpense: 'transportation',
    defaultIncome: 'transportation-services',
    suggestedAccount: '4300',
    taxCategory: 'vat_standard',
  },
  breeding: {
    defaultExpense: 'veterinary',
    defaultIncome: 'breeding-services',
    suggestedAccount: '4400',
    taxCategory: 'vat_reduced',
  },
  laboratory: {
    defaultExpense: 'veterinary',
    defaultIncome: 'laboratory-services',
    suggestedAccount: '4500',
    taxCategory: 'vat_standard',
  },
};

export function useFinancialCategories() {
  const expenseCategories = useMemo(() => defaultExpenseCategories, []);
  const incomeCategories = useMemo(() => defaultIncomeCategories, []);

  const getTaxCategories = useCallback(() => taxCategories, []);

  const getTaxRate = useCallback((taxCategory: TaxCategory): number => {
    const tax = taxCategories.find(t => t.value === taxCategory);
    return tax?.rate ?? 0;
  }, []);

  const calculateTax = useCallback((amount: number, taxCategory: TaxCategory): number => {
    const rate = getTaxRate(taxCategory);
    return (amount * rate) / 100;
  }, [getTaxRate]);

  const calculateTotal = useCallback((amount: number, taxCategory: TaxCategory): number => {
    return amount + calculateTax(amount, taxCategory);
  }, [calculateTax]);

  const getDefaultCategorization = useCallback((
    orderCategory: OrderCategory,
    isExternalService: boolean
  ): FinancialCategorization => {
    const mapping = categoryMappings[orderCategory];
    const isIncome = !isExternalService; // External = expense, Internal = income

    return {
      category: isIncome ? mapping.defaultIncome : mapping.defaultExpense,
      isIncome,
      accountCode: mapping.suggestedAccount,
      taxCategory: mapping.taxCategory,
    };
  }, []);

  const getCategoryMapping = useCallback((orderCategory: OrderCategory): CategoryMapping => {
    return categoryMappings[orderCategory];
  }, []);

  const getCategoryLabel = useCallback((category: FinancialCategory, isArabic: boolean = true): string => {
    const expense = expenseCategories.find(c => c.value === category);
    if (expense) return isArabic ? expense.labelAr : expense.label;
    
    const income = incomeCategories.find(c => c.value === category);
    if (income) return isArabic ? income.labelAr : income.label;
    
    return category;
  }, [expenseCategories, incomeCategories]);

  const getTaxLabel = useCallback((taxCategory: TaxCategory, isArabic: boolean = true): string => {
    const tax = taxCategories.find(t => t.value === taxCategory);
    return tax ? (isArabic ? tax.labelAr : tax.label) : taxCategory;
  }, []);

  return {
    expenseCategories,
    incomeCategories,
    getTaxCategories,
    getTaxRate,
    calculateTax,
    calculateTotal,
    getDefaultCategorization,
    getCategoryMapping,
    getCategoryLabel,
    getTaxLabel,
    categoryMappings,
  };
}
