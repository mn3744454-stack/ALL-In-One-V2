import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface InvoicePaidSummary {
  paidAmount: number;
  outstandingAmount: number;
}

/**
 * Batch-fetch paid amounts for a list of invoices from ledger_entries.
 * Avoids N+1 by querying all payment entries for the given invoice IDs at once.
 */
export function useInvoicePaymentsBatch(invoiceIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: summaryMap = new Map<string, InvoicePaidSummary>(), isLoading } = useQuery({
    queryKey: ["invoice-payments-batch", tenantId, invoiceIds.sort().join(",")],
    queryFn: async () => {
      if (!tenantId || invoiceIds.length === 0) return new Map<string, InvoicePaidSummary>();

      const { data: payments, error } = await supabase
        .from("ledger_entries")
        .select("reference_id, amount")
        .eq("tenant_id", tenantId)
        .eq("reference_type", "invoice")
        .eq("entry_type", "payment")
        .in("reference_id", invoiceIds);

      if (error) {
        console.error("Error fetching batch payments:", error);
        return new Map<string, InvoicePaidSummary>();
      }

      // Sum paid amounts per invoice
      const paidMap = new Map<string, number>();
      (payments || []).forEach((p: any) => {
        const id = p.reference_id;
        const amount = Math.abs(Number(p.amount));
        paidMap.set(id, (paidMap.get(id) || 0) + amount);
      });

      return paidMap;
    },
    enabled: !!tenantId && invoiceIds.length > 0,
  });

  const getPaidAmount = (invoiceId: string): number => {
    return (summaryMap as Map<string, number>).get(invoiceId) || 0;
  };

  return { getPaidAmount, isLoading };
}
