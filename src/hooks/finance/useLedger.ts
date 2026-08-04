import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerBalance {
  id: string;
  tenant_id: string;
  client_id: string;
  balance: number;
  currency: string;
  last_updated: string;
}

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  client_id: string;
  entry_type: "invoice" | "payment" | "credit" | "adjustment";
  reference_type?: string;
  reference_id?: string;
  amount: number;
  balance_after: number;
  description?: string;
  payment_method?: string;
  created_by?: string;
  /**
   * Stage C · Slice B — business (economic) date, date-only `yyyy-MM-dd`.
   * Drives ledger list filtering, ordering and display.
   */
  effective_date: string;
  /** Audit timestamp — tie-break only, never the displayed business date. */
  created_at: string;
}


export interface CreateLedgerEntryInput {
  tenant_id: string;
  client_id: string;
  entry_type: "invoice" | "payment" | "credit" | "adjustment";
  reference_type?: string;
  reference_id?: string;
  amount: number;
  description?: string;
}

export function useCustomerBalances(tenantId?: string) {
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["customer-balances", tenantId],
    queryFn: async (): Promise<CustomerBalance[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("customer_balances" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_updated", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          console.warn("customer_balances table does not exist yet");
          return [];
        }
        console.error("Error fetching customer balances:", error);
        return [];
      }

      return (data || []) as unknown as CustomerBalance[];
    },
    enabled: !!tenantId,
  });

  return { balances, isLoading };
}

export function useLedgerEntries(tenantId?: string, clientId?: string) {

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries", tenantId, clientId],
    queryFn: async (): Promise<LedgerEntry[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("ledger_entries" as any)
        .select("id, tenant_id, client_id, entry_type, reference_type, reference_id, amount, balance_after, description, payment_method, created_by, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === "42P01") {
          console.warn("ledger_entries table does not exist yet");
          return [];
        }
        console.error("Error fetching ledger entries:", error);
        return [];
      }

      return (data || []) as unknown as LedgerEntry[];
    },
    enabled: !!tenantId,
  });

  // Stage B: browser-side ledger mutation removed. Ledger writes are performed
  // exclusively by canonical backend RPCs. This hook is read-only.
  return {
    entries,
    isLoading,
  };
}

