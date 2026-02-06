import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface SampleInvoiceInfo {
  invoiceId: string;
  invoiceNumber: string;
}

export type SampleInvoiceMap = Record<string, SampleInvoiceInfo>;

/**
 * Fetches a map of sample IDs to their invoice info.
 * Uses entity_type='lab_sample' and entity_id in invoice_items.
 */
export function useSampleInvoiceMap(sampleIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["sample-invoice-map", tenantId, sampleIds.sort().join(",")],
    queryFn: async (): Promise<SampleInvoiceMap> => {
      if (!tenantId || sampleIds.length === 0) return {};

      // Fetch invoice items linked to these samples
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("entity_id, invoice_id, invoices!inner(id, invoice_number, tenant_id)")
        .eq("entity_type", "lab_sample")
        .in("entity_id", sampleIds)
        .eq("invoices.tenant_id", tenantId);

      if (error) {
        console.error("Error fetching sample invoice map:", error);
        return {};
      }

      const map: SampleInvoiceMap = {};
      for (const item of items || []) {
        const invoice = item.invoices as unknown as { id: string; invoice_number: string };
        if (item.entity_id && invoice) {
          map[item.entity_id] = {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
          };
        }
      }

      return map;
    },
    enabled: !!tenantId && sampleIds.length > 0,
    staleTime: 30000, // 30 seconds
  });

  return {
    sampleInvoiceMap: data || {},
    isLoading,
  };
}
