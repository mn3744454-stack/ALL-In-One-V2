import { useState, useMemo, useEffect, useRef } from "react";
import { DialogClose, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InvoiceLineItemsEditor, type LineItem } from "./InvoiceLineItemsEditor";
import { InvoiceClientPicker } from "./InvoiceClientPicker";
import { useStableServicePlans } from "@/hooks/useStableServicePlans";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import { useInvoices, type CreateInvoiceInput, type Invoice, type InvoiceItem } from "@/hooks/finance/useInvoices";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2 } from "lucide-react";
import { addDays, format, parse, type Locale } from "date-fns";
import { ar as arLocale, enUS as enLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useInvoiceCatalogSources, resolveInvoiceCatalogSource } from "@/hooks/finance/useInvoiceCatalogSources";
import { useInvoiceCustomerHorses } from "@/hooks/finance/useInvoiceCustomerHorses";
import { InvoiceQuickAddHorseDialog } from "./InvoiceQuickAddHorseDialog";
import { usePermissions } from "@/hooks/usePermissions";

import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";


/**
 * Local date field used inside the Create Invoice dialog.
 * - Display format: dd-MM-yyyy (e.g. 18-05-2026)
 * - Internal value: yyyy-MM-dd (unchanged from previous native <input type="date">)
 * - Footer actions: Today / Clear
 */
function InvoiceDateField({
  value,
  onChange,
  todayLabel,
  clearLabel,
  placeholder,
  locale,
}: {
  value: string;
  onChange: (next: string) => void;
  todayLabel: string;
  clearLabel: string;
  placeholder?: string;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-start font-normal",
            !parsed && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4 opacity-70" />
          {parsed ? format(parsed, "dd-MM-yyyy", { locale }) : <span>{placeholder || "dd-MM-yyyy"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[70]" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          locale={locale}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            {clearLabel}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              onChange(format(new Date(), "yyyy-MM-dd"));
              setOpen(false);
            }}
          >
            {todayLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  invoice?: Invoice | null;
  existingItems?: InvoiceItem[];
}

export function InvoiceFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  mode = "create",
  invoice,
  existingItems = [],
}: InvoiceFormDialogProps) {
  const { t, dir, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantCurrency = useTenantCurrency();
  const { createInvoice, updateInvoice, isCreating, isUpdating } = useInvoices(activeTenant?.tenant.id);
  
  const issuerTenantId = activeTenant?.tenant?.id ?? null;
  const issuerTenantType = activeTenant?.tenant?.type ?? null;
  const catalogSource = resolveInvoiceCatalogSource(issuerTenantType);
  const isLabIssuer = catalogSource === "lab_services";
  const { hasPermission, isOwner } = usePermissions();
  const canWriteHorse = isOwner
    || hasPermission(isLabIssuer ? "laboratory.horses.write" : "horses.write")
    || hasPermission("horses.write");

  const { activeItems: catalogItems } = useInvoiceCatalogSources({
    issuerTenantId,
    issuerTenantType,
  });
  const { plans: allPlans = [] } = useStableServicePlans();
  const queryClient = useQueryClient();

  const [quickAddOpen, setQuickAddOpen] = useState(false);


  const isEditMode = mode === "edit" && invoice;

  // Use tenant default tax rate (fallback to "15" if not set)
  const defaultTaxRate = String(activeTenant?.tenant?.default_tax_rate ?? 15);

  const [formData, setFormData] = useState({
    client_id: "",
    client_name: "",
    issue_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    tax_rate: defaultTaxRate,
    discount_amount: "0",
    notes: "",
  });
  // Phase 7: Start with no line items — operator explicitly adds via buttons
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Populate form once per dialog open — ref prevents re-init on every render
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (isEditMode && invoice) {
      setFormData({
        client_id: invoice.client_id || "",
        client_name: invoice.client_name || "",
        issue_date: invoice.issue_date ? format(new Date(invoice.issue_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        due_date: invoice.due_date ? format(new Date(invoice.due_date), "yyyy-MM-dd") : format(addDays(new Date(), 30), "yyyy-MM-dd"),
        tax_rate: invoice.tax_amount > 0 && invoice.subtotal > 0 
          ? String(Math.round((invoice.tax_amount / invoice.subtotal) * 100)) 
          : defaultTaxRate,
        discount_amount: String(invoice.discount_amount || 0),
        notes: invoice.notes || "",
      });
      
      if (existingItems.length > 0) {
        setLineItems(existingItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          horse_id: (item as any).horse_id ?? null,
          domain: (item as any).domain ?? null,
          service_id: (item as any).service_id ?? null,
          service_source: (item as any).service_source ?? null,
          category_id: (item as any).category_id ?? null,
        })));
      }
    } else {
      setFormData({
        client_id: "",
        client_name: "",
        issue_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        tax_rate: defaultTaxRate,
        discount_amount: "0",
        notes: "",
      });
      // Phase 7: Empty start — no starter row
      setLineItems([]);
    }
  }, [open]);

  const pricesTaxInclusive = Boolean(activeTenant?.tenant?.prices_tax_inclusive);

  const calculations = useMemo(() => {
    let taxableTotal = 0;
    let nonTaxableTotal = 0;
    for (const item of lineItems) {
      if (item.service_id) {
        const svc = catalogItems.find(s => s.id === item.service_id);
        if (svc && svc.isTaxable === false) {
          nonTaxableTotal += item.total_price;
        } else {
          taxableTotal += item.total_price;
        }
      } else {
        taxableTotal += item.total_price;
      }
    }

    const lineTotal = taxableTotal + nonTaxableTotal;
    const taxRate = parseFloat(formData.tax_rate) || 0;
    const discountAmount = parseFloat(formData.discount_amount) || 0;

    let subtotal: number;
    let taxAmount: number;

    if (pricesTaxInclusive) {
      const taxFromTaxable = taxRate > 0 ? Math.round(taxableTotal * taxRate / (100 + taxRate) * 100) / 100 : 0;
      taxAmount = taxFromTaxable;
      subtotal = Math.round((lineTotal - taxAmount) * 100) / 100;
    } else {
      subtotal = lineTotal;
      taxAmount = Math.round(taxableTotal * taxRate / 100 * 100) / 100;
    }

    const totalAmount = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, discountAmount, totalAmount, taxableTotal, nonTaxableTotal };
  }, [lineItems, formData.tax_rate, formData.discount_amount, pricesTaxInclusive, catalogItems]);


  const generateInvoiceNumber = () => {
    const prefix = activeTenant?.tenant.name?.substring(0, 3).toUpperCase() || "INV";
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${year}${month}-${random}`;
  };

  const { data: customerHorses = [] } = useInvoiceCustomerHorses({
    issuerTenantId,
    issuerTenantType,
    customerId: formData.client_id || null,
  });

  const handleClientChange = (clientId: string, client: { name?: string; name_ar?: string | null } | null) => {
    // Change-customer dependency: clear line-level horses that aren't valid
    // for the new customer (fresh customer -> unknown horses; we clear all
    // horse selections; issuer categories / services stay intact).
    setLineItems((prev) => prev.map((li) => (li.horse_id ? { ...li, horse_id: null } : li)));
    setFormData({
      ...formData,
      client_id: clientId,
      client_name: client?.name || "",
    });
  };

  const invalidateAllFinance = () => invalidateFinanceQueries(queryClient, activeTenant?.tenant.id);


  // Build the missing-requirements list. Computed every render; cheap.
  const missingIssues = useMemo<string[]>(() => {
    const issues: string[] = [];
    if (!formData.client_id) issues.push(t("finance.invoices.missing.client"));
    if (!formData.issue_date) issues.push(t("finance.invoices.missing.issueDate"));
    if (!formData.due_date) issues.push(t("finance.invoices.missing.dueDate"));
    const validItems = lineItems.filter(
      (i) => i.description && i.quantity > 0 && i.unit_price >= 0 && i.total_price > 0
    );
    if (validItems.length === 0) {
      issues.push(t("finance.invoices.missing.lineItems"));
    } else {
      if (lineItems.some((i) => !i.description?.trim())) {
        issues.push(t("finance.invoices.missing.lineItemDescription"));
      }
      if (lineItems.some((i) => i.quantity <= 0)) {
        issues.push(t("finance.invoices.missing.lineItemQuantity"));
      }
      if (lineItems.some((i) => i.unit_price < 0)) {
        issues.push(t("finance.invoices.missing.lineItemUnitPrice"));
      }
    }
    return issues;
  }, [formData.client_id, formData.issue_date, formData.due_date, lineItems, t]);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { isDirty } = useDirtyForm({ formData, lineItems }, open);
  // Reset attempted-submit flag when dialog reopens.
  useEffect(() => {
    if (!open) setAttemptedSubmit(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.tenant.id) return;
    setAttemptedSubmit(true);

    if (missingIssues.length > 0) {
      // In-surface guidance is now shown via MissingRequirementsBar; toast kept as supplemental.
      toast.error(t("common.validation.attemptedSubmit"));
      return;
    }

    try {
      const validItems = lineItems.filter((item) => item.description && item.total_price > 0);
      if (validItems.length === 0) {
        toast.error(t("finance.invoices.noItemsError") || "Please add at least one item");
        return;
      }

      if (isEditMode && invoice) {
        await updateInvoice({
          id: invoice.id,
          client_id: formData.client_id || undefined,
          client_name: formData.client_name || undefined,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          subtotal: calculations.subtotal,
          tax_amount: calculations.taxAmount,
          discount_amount: calculations.discountAmount,
          total_amount: calculations.totalAmount,
          notes: formData.notes || undefined,
        });

        await supabase
          .from("invoice_items" as any)
          .delete()
          .eq("invoice_id", invoice.id);

        for (let index = 0; index < validItems.length; index++) {
          const item = validItems[index];
          await supabase.from("invoice_items" as any).insert({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            horse_id: item.horse_id || null,
            domain: item.domain || null,
            service_id: item.service_id || null,
            service_source: item.service_id ? (item.service_source || catalogSource) : 'tenant_services',
            category_id: item.category_id || null,
            position: index,
          });
        }


        toast.success(t("finance.invoices.updated"));
      } else {
        const invoiceNumber = generateInvoiceNumber();

        const input: CreateInvoiceInput = {
          tenant_id: activeTenant.tenant.id,
          invoice_number: invoiceNumber,
          client_id: formData.client_id || undefined,
          client_name: formData.client_name || undefined,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          subtotal: calculations.subtotal,
          tax_amount: calculations.taxAmount,
          discount_amount: calculations.discountAmount,
          total_amount: calculations.totalAmount,
          notes: formData.notes || undefined,
          status: "draft",
        };

        const newInvoice = await createInvoice(input);

        if (newInvoice) {
          for (let index = 0; index < validItems.length; index++) {
            const item = validItems[index];
            await supabase.from("invoice_items" as any).insert({
              invoice_id: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              entity_type: item.entity_type,
              entity_id: item.entity_id,
              horse_id: item.horse_id || null,
              domain: item.domain || null,
              service_id: item.service_id || null,
              service_source: item.service_id ? (item.service_source || catalogSource) : 'tenant_services',
              category_id: item.category_id || null,
              position: index,

            });
          }
          // NOTE: Ledger posting now happens at APPROVAL time (InvoiceDetailsSheet.handleApprove),
          // NOT at creation time. Draft invoices have zero financial impact.
        }
      }

      invalidateAllFinance();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(t("common.error"));
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="sm:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0"
    >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>
            {isEditMode ? t("finance.invoices.edit") : t("finance.invoices.create")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 overflow-y-auto overflow-x-hidden flex-1 px-6 py-4">
            {/* Client and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("finance.invoices.client")}</Label>
                <InvoiceClientPicker
                  selectedClientId={formData.client_id}
                  onSelect={handleClientChange}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("finance.invoices.issueDate")}</Label>
                <InvoiceDateField
                  value={formData.issue_date}
                  onChange={(v) => setFormData({ ...formData, issue_date: v })}
                  todayLabel={t("finance.invoices.dateToday")}
                  clearLabel={t("finance.invoices.dateClear")}
                  locale={lang === "ar" ? arLocale : enLocale}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("finance.invoices.dueDate")}</Label>
                <InvoiceDateField
                  value={formData.due_date}
                  onChange={(v) => setFormData({ ...formData, due_date: v })}
                  todayLabel={t("finance.invoices.dateToday")}
                  clearLabel={t("finance.invoices.dateClear")}
                  locale={lang === "ar" ? arLocale : enLocale}
                />
              </div>
            </div>


            {/* Line Items */}
            <div className="space-y-2">
              <Label>{t("finance.invoices.lineItems")}</Label>
              <InvoiceLineItemsEditor
                items={lineItems}
                onChange={setLineItems}
                currency={invoice?.currency || tenantCurrency}
                horses={customerHorses.map(h => ({ id: h.id, name: h.name, name_ar: h.name_ar }))}
                services={catalogItems}
                plans={allPlans}
                disablePackages={isLabIssuer}
                onQuickAddHorse={canWriteHorse ? () => setQuickAddOpen(true) : undefined}
                canQuickAddHorse={!!formData.client_id}
                quickAddDisabledReason={t("finance.invoices.selectCustomerFirst")}
              />
            </div>


            {/* Financial Summary Card */}
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{t("finance.invoices.financialSummary")}</Label>
                <Badge
                  variant="outline"
                  className="text-xs"
                >
                  {pricesTaxInclusive ? t("finance.tax.inclTax") : t("finance.tax.exclTax")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {t("finance.invoices.taxRate")} (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("finance.invoices.discount")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("finance.invoices.tax")}</Label>
                  <div className="h-10 flex items-center px-3 bg-background border border-border rounded-md font-medium font-mono tabular-nums text-sm" dir="ltr">
                    {formatCurrency(calculations.taxAmount)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-primary">{t("finance.invoices.totalAmount")}</Label>
                  <div className="h-10 flex items-center px-3 bg-primary/10 border border-primary/20 rounded-md font-bold font-mono tabular-nums text-sm" dir="ltr">
                    {formatCurrency(calculations.totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t("finance.invoices.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("finance.invoices.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <MissingRequirementsBar
              issues={attemptedSubmit ? missingIssues : []}
              attempted={attemptedSubmit}
              className="flex-1 w-full sm:w-auto"
            />
            <div className="flex gap-2 sm:ms-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {isEditMode ? t("common.save") : t("finance.invoices.createDraft")}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </SafeFormDialog>
  );
}
