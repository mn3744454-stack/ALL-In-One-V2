/**
 * Slice 2B — Unallocated payments card (presentation-only).
 *
 * A payment is considered "unallocated" for statement UX purposes when its
 * ledger entry has no reference to an invoice (reference_id is NULL). This
 * surfaces credits that were recorded on the customer ledger but not linked to
 * a specific invoice line.
 *
 * NOTE: This is READ-ONLY. It does not implement a Payment Allocation Engine.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface UnallocatedPaymentsSummary {
  count: number;
  totalAmount: number; // sum of |amount| for unallocated payment ledger entries
}

export function useUnallocatedPayments(clientId?: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["client-unallocated-payments", tenantId, clientId],
    queryFn: async (): Promise<UnallocatedPaymentsSummary> => {
      if (!tenantId || !clientId) return { count: 0, totalAmount: 0 };
      const { data: rows, error } = await supabase
        .from("ledger_entries")
        .select("amount")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .eq("entry_type", "payment")
        .is("reference_id", null);
      if (error || !rows) return { count: 0, totalAmount: 0 };
      const total = rows.reduce(
        (sum: number, r: any) => sum + Math.abs(Number(r.amount || 0)),
        0
      );
      return { count: rows.length, totalAmount: total };
    },
    enabled: !!tenantId && !!clientId,
    staleTime: 60_000,
  });

  return {
    unallocated: data ?? { count: 0, totalAmount: 0 },
    isLoading,
  };
}
