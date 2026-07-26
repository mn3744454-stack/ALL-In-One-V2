import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  createInvoiceWithItems,
  getRiyadhDateString,
  type InvoiceRpcItemInput,
  type InvoiceRpcPayload,
} from "@/lib/finance/invoiceRpc";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";
import {
  LAB_SOURCE_MARKER_RE,
  buildLabSourceMarker,
} from "@/lib/finance/labInvoiceMarker";

import type { LabSample } from "./useLabSamples";
import type { LabRequest, LabRequestService } from "./useLabRequests";
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

// Marker embedded in invoice.notes to preserve lab-source trace and
// duplicate-detection across the RPC path. The RPC contract does NOT accept
// entity_type / entity_id keys, so we rely on this marker + horse/lab_horse
// per-item attribution to satisfy the invariant.
// LAB_SOURCE_MARKER_RE and buildLabSourceMarker are imported from
// `@/lib/finance/labInvoiceMarker` — the single source of truth shared with
// the invoice-details display sanitizer.
function composeNotesWithMarker(
  userNotes: string | undefined,
  sourceName: string,
  marker: string,
): string {
  const base = (userNotes && userNotes.trim().length > 0) ? userNotes.trim() : sourceName;
  return `${base}\n${marker}`;
}

export function useLabInvoiceDraft() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { hasPermission, isOwner } = usePermissions();
  const tenantId = activeTenant?.tenant?.id;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Permission check: use permission keys instead of role-based
  const canCreateInvoice = isOwner || hasPermission("laboratory.billing.create") || hasPermission("finance.invoice.create");

  /**
   * Check if invoices already exist for a given lab source.
   * Primary path: match the [LAB:sourceType:sourceId] marker persisted in
   * invoices.notes by the RPC path.
   * Legacy fallback: match invoice_items.entity_type/entity_id written by
   * the pre-RPC direct-write flow (historical rows only).
   */
  const checkExistingInvoice = useCallback(
    async (
      sourceType: LabBillingSourceType,
      sourceId: string
    ): Promise<ExistingInvoicesResult> => {
      if (!tenantId) return [];

      setIsChecking(true);
      try {
        const seen = new Set<string>();
        const result: ExistingInvoicesResult = [];
        const marker = buildLabSourceMarker(sourceType, sourceId);

        // Primary: marker in invoices.notes (RPC path).
        const { data: byNotes, error: notesErr } = await supabase
          .from("invoices")
          .select("id, invoice_number, created_at")
          .eq("tenant_id", tenantId)
          .ilike("notes", `%${marker}%`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (notesErr) {
          console.error("checkExistingInvoice (notes) error:", notesErr);
        } else if (byNotes) {
          for (const inv of byNotes) {
            if (!seen.has(inv.id)) {
              seen.add(inv.id);
              result.push({ invoiceId: inv.id, invoiceNumber: inv.invoice_number });
            }
          }
        }

        // Legacy fallback: entity_type/entity_id on invoice_items (historical rows).
        const { data: items, error: itemsErr } = await supabase
          .from("invoice_items")
          .select("invoice_id, invoices!inner(id, invoice_number, tenant_id, created_at)")
          .eq("entity_type", sourceType)
          .eq("entity_id", sourceId)
          .eq("invoices.tenant_id", tenantId)
          .order("invoices(created_at)", { ascending: false })
          .limit(5);

        if (itemsErr) {
          console.error("checkExistingInvoice (legacy items) error:", itemsErr);
        } else if (items) {
          for (const item of items) {
            const inv = item.invoices as unknown as { id: string; invoice_number: string };
            if (!seen.has(inv.id)) {
              seen.add(inv.id);
              result.push({ invoiceId: inv.id, invoiceNumber: inv.invoice_number });
            }
          }
        }

        return result.slice(0, 5);
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
   * Build line items from a lab request's services using snapshot prices (preferred).
   * Falls back to service name if snapshot is missing.
   */
  const buildLineItemsFromRequestServices = (
    services: LabRequestService[]
  ): LabBillingLineItem[] => {
    return services.map((s) => {
      const name = s.service_name_snapshot || s.service?.name || "Unknown Service";
      const nameAr = s.service_name_ar_snapshot || s.service?.name_ar || undefined;
      const price = s.unit_price_snapshot ?? s.service?.price ?? null;

      return {
        templateName: name,
        templateNameAr: nameAr,
        quantity: 1,
        unitPrice: price,
        total: price ?? 0,
      };
    });
  };

  /**
   * Build line items from a lab request (legacy: uses test_description as a single line)
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
   * Main function to generate a Draft Invoice from a lab entity via the
   * atomic RPC public.create_invoice_with_items.
   *
   * - One RPC call. No direct .from("invoices"/"invoice_items").insert.
   * - Server owns invoice_number, tax, per-line frozen snapshots.
   * - Source trace persisted via marker in invoices.notes.
   * - Per-item horse_id / lab_horse_id forwarded when supported by tenant.
   */
  const generateInvoice = async (
    input: GenerateInvoiceInput,
    sourceContext?: { horseId?: string | null; labHorseId?: string | null },
  ): Promise<string | null> => {
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
      const marker = buildLabSourceMarker(input.sourceType, input.sourceId);
      const notes = composeNotesWithMarker(input.notes, input.sourceName, marker);

      const rpcItems: InvoiceRpcItemInput[] = input.lineItems.map((item) => {
        const description = item.templateNameAr
          ? `${item.templateName} / ${item.templateNameAr}`
          : item.templateName;
        const rpcItem: InvoiceRpcItemInput = {
          description,
          quantity: item.quantity,
          unit_price: item.unitPrice ?? 0,
        };
        if (sourceContext?.horseId) rpcItem.horse_id = sourceContext.horseId;
        if (sourceContext?.labHorseId) rpcItem.lab_horse_id = sourceContext.labHorseId;
        return rpcItem;
      });

      const payload: InvoiceRpcPayload = {
        client_id: input.clientId,
        client_name: input.clientName,
        issue_date: getRiyadhDateString(),
        notes,
        discount_amount: 0,
        items: rpcItems,
      };

      const result = await createInvoiceWithItems(tenantId, payload);

      if (!result?.invoice_id) {
        throw new Error("FIN_RPC_INVALID_RESPONSE");
      }

      // Invalidate finance caches; source-specific caches are refreshed by callers.
      invalidateFinanceQueries(queryClient, tenantId);
      queryClient.invalidateQueries({ queryKey: ["lab-samples"] });
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });

      toast.success(t("laboratory.billing.invoiceCreated") || "Invoice created successfully");

      // NOTE: Draft only — no ledger/payment/customer_balance rows are created.
      navigate("/dashboard/finance/invoices");

      return result.invoice_id;
    } catch (error) {
      // Preserve full technical detail for developers; show safe fallback to user.
      console.error("[useLabInvoiceDraft] create_invoice_with_items failed:", error);
      const err = error as { code?: string; message?: string };
      const code = err?.code;
      const messageMap: Record<string, string> = {
        FIN_PAYLOAD_UNKNOWN_KEY: t("laboratory.billing.invoiceError"),
        FIN_PAYLOAD_TYPE: t("laboratory.billing.invoiceError"),
        FIN_CLIENT_REQUIRED: t("laboratory.billing.invoiceError"),
      };
      const localized = (code && messageMap[code]) || t("laboratory.billing.invoiceError") || "Failed to create invoice";
      const devSuffix =
        import.meta.env.DEV && err?.message ? ` — ${err.message}` : "";
      toast.error(`${localized}${devSuffix}`);
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
    isGenerating,
    isChecking,
    getTemplatePrice,
    buildLineItemsFromSample,
    buildLineItemsFromRequest,
    buildLineItemsFromRequestServices,
    generateInvoice,
    checkExistingInvoice,
    goToInvoice,
    // Exported for tests
    __internal: { LAB_SOURCE_MARKER_RE, buildLabSourceMarker },
  };
}

