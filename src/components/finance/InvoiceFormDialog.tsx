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
import { SharedDateField } from "@/components/ui/shared-date-field";
import { InvoiceLineItemsEditor, type LineItem } from "./InvoiceLineItemsEditor";
import { InvoiceClientPicker } from "./InvoiceClientPicker";
import { useStableServicePlans } from "@/hooks/useStableServicePlans";
import { useI18n } from "@/i18n";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantCurrency } from "@/hooks/useTenantCurrency";
import type { Invoice, InvoiceItem } from "@/hooks/finance/useInvoices";
import { formatCurrency } from "@/lib/formatters";
import { Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useInvoiceCatalogSources, resolveInvoiceCatalogSource } from "@/hooks/finance/useInvoiceCatalogSources";
import { useInvoiceCustomerHorses } from "@/hooks/finance/useInvoiceCustomerHorses";
import { InvoiceQuickAddHorseDialog } from "./InvoiceQuickAddHorseDialog";
import { usePermissions } from "@/hooks/usePermissions";

import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import {
  createInvoiceWithItems,
  updateInvoiceWithItems,
  type InvoiceRpcItemInput,
  type InvoiceRpcPayload,
} from "@/lib/finance/invoiceRpc";




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
  const [isSaving, setIsSaving] = useState(false);
  
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
  const saveIdempotencyKeyRef = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      saveIdempotencyKeyRef.current = crypto.randomUUID();
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
        setLineItems(existingItems.map(item => {
          const raw = item as any;
          const hasPackage = !!raw.package_id;
          return {
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            horse_id: raw.horse_id ?? raw.lab_horse_id ?? null,
            domain: raw.domain ?? null,
            service_id: raw.service_id ?? null,
            service_source: raw.service_source ?? null,
            category_id: raw.category_id ?? null,
            source: hasPackage ? 'package' : (raw.service_id ? 'catalog' : 'manual'),
            package_id: raw.package_id ?? null,
            package_source: raw.package_source ?? null,
            package_name_snapshot: raw.package_name_snapshot ?? null,
            package_name_ar_snapshot: raw.package_name_ar_snapshot ?? null,
            package_price_snapshot: raw.package_price_snapshot ?? null,
            package_currency_snapshot: raw.package_currency_snapshot ?? null,
            package_services_snapshot: raw.package_services_snapshot ?? null,
          };
        }));
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


  const {
    data: customerHorses = [],
    isFetching: customerHorsesFetching,
    isError: customerHorsesError,
    refetch: refetchCustomerHorses,
  } = useInvoiceCustomerHorses({
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
      toast.error(t("common.validation.attemptedSubmit"));
      return;
    }

    if (formData.issue_date && formData.due_date && formData.due_date < formData.issue_date) {
      toast.error(t("common.dateRange.dueBeforeIssue"));
      return;
    }

    // The browser sends intent only. Prices, totals, invoice number, catalog
    // attributes, and package snapshots are resolved atomically by the RPC.
    const buildItemPayload = (item: LineItem): InvoiceRpcItemInput => {
      const horseIdOut = !isLabIssuer && item.horse_id ? item.horse_id : null;
      const labHorseIdOut = isLabIssuer && item.horse_id ? item.horse_id : null;
      const isPackageLine = item.source === 'package' && !!item.package_id;
      return {
        description: item.description,
        quantity: item.quantity,
        ...(isPackageLine || item.service_id ? {} : { unit_price: item.unit_price }),
        horse_id: horseIdOut,
        lab_horse_id: labHorseIdOut,
        domain: item.domain || null,
        service_id: isPackageLine ? null : (item.service_id || null),
        service_source: isPackageLine
          ? null
          : (item.service_id ? (item.service_source || catalogSource) : 'tenant_services'),
        category_id: isPackageLine ? null : (item.category_id || null),
        package_id: isPackageLine ? item.package_id : null,
      };
    };


    try {
      setIsSaving(true);
      const validItems = lineItems.filter((item) => item.description && item.total_price > 0);
      if (validItems.length === 0) {
        toast.error(t("finance.invoices.noItemsError") || "Please add at least one item");
        return;
      }

      const payload: InvoiceRpcPayload = {
          client_id: formData.client_id || null,
          client_name: formData.client_name || null,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          discount_amount: calculations.discountAmount,
          notes: formData.notes || null,
          items: validItems.map(buildItemPayload),
      };

      if (isEditMode && invoice) {
        await updateInvoiceWithItems(
          activeTenant.tenant.id,
          invoice.id,
          payload,
          saveIdempotencyKeyRef.current,
        );
        toast.success(t("finance.invoices.updated"));
      } else {
        await createInvoiceWithItems(
          activeTenant.tenant.id,
          payload,
          saveIdempotencyKeyRef.current,
        );
      }

      invalidateAllFinance();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save invoice:", error);
      toast.error(t("common.error"));
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isSaving;

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

              <div className="space-y-2 min-w-0">
                <Label>{t("finance.invoices.issueDate")}</Label>
                <SharedDateField
                  value={formData.issue_date}
                  onChange={(v) => {
                    // Auto-forward Due when Issue moves past it.
                    const nextDue = formData.due_date && v && formData.due_date < v ? v : formData.due_date;
                    setFormData({ ...formData, issue_date: v, due_date: nextDue });
                  }}
                  showToday
                  ariaLabel={t("finance.invoices.issueDate")}
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label>{t("finance.invoices.dueDate")}</Label>
                <SharedDateField
                  value={formData.due_date}
                  onChange={(v) => setFormData({ ...formData, due_date: v })}
                  min={formData.issue_date || undefined}
                  showToday
                  ariaLabel={t("finance.invoices.dueDate")}
                  invalid={!!(formData.due_date && formData.issue_date && formData.due_date < formData.issue_date)}
                />
                {formData.due_date && formData.issue_date && formData.due_date < formData.issue_date && (
                  <p className="text-xs text-destructive">{t("common.dateRange.dueBeforeIssue")}</p>
                )}
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
                isCustomerSelected={!!formData.client_id}
                horsesLoading={!!formData.client_id && customerHorsesFetching}
                horsesError={customerHorsesError}
                onRetryHorses={() => refetchCustomerHorses()}
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
        {issuerTenantId && (
          <InvoiceQuickAddHorseDialog
            open={quickAddOpen}
            onOpenChange={setQuickAddOpen}
            tenantId={issuerTenantId}
            tenantType={issuerTenantType}
            customerId={formData.client_id || null}
            onCreated={(h) => {
              queryClient.invalidateQueries({ queryKey: ["invoice-customer-horses"] });
            }}
          />
        )}
    </SafeFormDialog>
  );
}
