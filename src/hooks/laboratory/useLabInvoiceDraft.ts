import { useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useInvoices, useInvoiceItems } from "@/hooks/finance/useInvoices";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { postLedgerForInvoice } from "@/lib/finance/postLedgerForInvoice";
import type { LabSample } from "./useLabSamples";
import type { LabRequest } from "./useLabRequests";
import type { LabTemplate } from "./useLabTemplates";

export type LabBillingSourceType = "lab_sample" | "lab_request";

export interface ExistingInvoiceInfo {
  invoiceId: string;
  invoiceNumber: string;
}

export type ExistingInvoicesResult = ExistingInvoiceInfo[];

export interface LabBillingLineItem {
  templateId?: string;
  templateName: string;
  templateNameAr?: string;
  quantity: number;
  unitPrice: number | null; // null means price is missing
  total: number;
}

export interface GenerateInvoiceInput {
  clientId: string;
  clientName: string;
  sourceType: LabBillingSourceType;
  sourceId: string;
  sourceName: string; // Horse name or description
  lineItems: LabBillingLineItem[];
  notes?: string;
}

export function useLabInvoiceDraft() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { hasPermission, isOwner } = usePermissions();
  const tenantId = activeTenant?.tenant?.id;

  const { createInvoice, isCreating } = useInvoices(tenantId);
  const { createItem } = useInvoiceItems();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Permission check: use permission keys instead of role-based
  const canCreateInvoice = isOwner || hasPermission("laboratory.billing.create") || hasPermission("finance.invoice.create");

  /**
   * Check if invoices already exist for a given lab source
   * Searches in invoice_items.description for the pattern [LAB:sourceType:sourceId]
   * Returns an array of existing invoices (up to 5)
   */
  const checkExistingInvoice = useCallback(
    async (
      sourceType: LabBillingSourceType,
      sourceId: string
    ): Promise<ExistingInvoicesResult> => {
      if (!tenantId) return [];

      setIsChecking(true);
      try {
        const searchPattern = `[LAB:${sourceType}:${sourceId}]`;

        // Search in invoice_items description
        const { data: items, error } = await supabase
          .from("invoice_items")
          .select("invoice_id, invoices!inner(id, invoice_number, tenant_id, created_at)")
          .ilike("description", `%${searchPattern}%`)
          .eq("invoices.tenant_id", tenantId)
          .order("invoices(created_at)", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error checking existing invoice:", error);
          return [];
        }

        if (items && items.length > 0) {
          // Deduplicate by invoice_id
          const seen = new Set<string>();
          const result: ExistingInvoicesResult = [];
          
          for (const item of items) {
            const invoice = item.invoices as unknown as {
              id: string;
              invoice_number: string;
            };
            if (!seen.has(invoice.id)) {
              seen.add(invoice.id);
              result.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoice_number,
              });
            }
          }
          
          return result;
        }

        return [];
      } catch (error) {
        console.error("Error checking existing invoice:", error);
        return [];
      } finally {
        setIsChecking(false);
      }
    },
    [tenantId]
  );

  /**
   * Extract pricing from template's pricing JSONB field
   * Expected structure: { base_price?: number, currency?: string }
   * Returns null if no price is set (not 0!)
   */
  const getTemplatePrice = (template: LabTemplate): number | null => {
    const pricing = template.pricing as Record<string, unknown> | null;
    if (pricing && typeof pricing.base_price === "number") {
      return pricing.base_price;
    }
    return null; // Return null instead of 0 for missing prices
  };

  /**
   * Build line items from a lab sample's templates
   * Note: unitPrice can be null if template has no price
   */
  const buildLineItemsFromSample = (
    sample: LabSample,
    templates: LabTemplate[]
  ): LabBillingLineItem[] => {
    const items: LabBillingLineItem[] = [];

    if (sample.templates && sample.templates.length > 0) {
      for (const st of sample.templates) {
        const fullTemplate = templates.find((t) => t.id === st.template.id);
        const price = fullTemplate ? getTemplatePrice(fullTemplate) : null;

        items.push({
          templateId: st.template.id,
          templateName: st.template.name,
          templateNameAr: st.template.name_ar || undefined,
          quantity: 1,
          unitPrice: price, // Keep null if price is missing - UI must block checkout
          total: price ?? 0, // For display purposes
        });
      }
    }

    return items;
  };

  /**
   * Build line items from a lab request (uses test_description as a single line)
   */
  const buildLineItemsFromRequest = (
    request: LabRequest,
    estimatedPrice: number = 0
  ): LabBillingLineItem[] => {
    return [
      {
        templateName: request.test_description,
        quantity: 1,
        unitPrice: estimatedPrice,
        total: estimatedPrice,
      },
    ];
  };

  /**
   * Generate a unique invoice number
   */
  const generateInvoiceNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-LAB-${timestamp}-${random}`;
  };

  /**
   * Main function to generate an invoice draft from lab entity
   */
  const generateInvoice = async (input: GenerateInvoiceInput): Promise<string | null> => {
    if (!tenantId || !user?.id) {
      toast.error(t("laboratory.billing.noTenant") || "No active organization");
      return null;
    }

    if (!canCreateInvoice) {
      toast.error(t("laboratory.billing.noPermission") || "You don't have permission to create invoices");
      return null;
    }

    if (input.lineItems.length === 0) {
      toast.error(t("laboratory.billing.noItems") || "No billable items found");
      return null;
    }

    setIsGenerating(true);

    try {
      // Calculate totals
      const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = 0; // Can be extended later
      const discountAmount = 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Create the invoice
      const invoice = await createInvoice({
        tenant_id: tenantId,
        invoice_number: generateInvoiceNumber(),
        client_id: input.clientId,
        client_name: input.clientName,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: "SAR",
        notes: input.notes || `[${input.sourceType.toUpperCase()}:${input.sourceId}] ${input.sourceName}`,
      });

      if (!invoice?.id) {
        throw new Error("Failed to create invoice");
      }

      // Create line items
      for (const item of input.lineItems) {
        const description = item.templateNameAr
          ? `${item.templateName} / ${item.templateNameAr}`
          : item.templateName;

        await createItem({
          invoice_id: invoice.id,
          description: `[LAB:${input.sourceType}:${input.sourceId}] ${description}`,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.total,
          entity_type: input.sourceType,
          entity_id: input.sourceId,
        });
      }

      toast.success(t("laboratory.billing.invoiceCreated") || "Invoice created successfully");

      // Post ledger entry for the invoice
      if (input.clientId && tenantId) {
        await postLedgerForInvoice(invoice.id, tenantId);
      }

      // Navigate to finance invoices page
      navigate("/dashboard/finance/invoices");

      return invoice.id;
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(t("laboratory.billing.invoiceError") || "Failed to create invoice");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Navigate to a specific invoice
   */
  const goToInvoice = useCallback(
    (invoiceId: string) => {
      navigate(`/dashboard/finance/invoices?selected=${invoiceId}`);
    },
    [navigate]
  );

  return {
    canCreateInvoice,
    isGenerating: isGenerating || isCreating,
    isChecking,
    getTemplatePrice,
    buildLineItemsFromSample,
    buildLineItemsFromRequest,
    generateInvoice,
    checkExistingInvoice,
    goToInvoice,
  };
}
