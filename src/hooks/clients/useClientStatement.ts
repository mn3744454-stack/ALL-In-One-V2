import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface StatementEntry {
  id: string;
  date: string;
  entry_type: "invoice" | "payment" | "credit" | "adjustment";
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  debit: number; // Amount added to balance (invoice)
  credit: number; // Amount subtracted from balance (payment)
  balance: number; // Running balance (balance_after)
  payment_method: string | null;
}

export interface ClientStatementSummary {
  clientId: string;
  clientName?: string;
  entries: StatementEntry[];
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  openingBalance: number;
}

/**
 * Hook to fetch client statement from ledger_entries.
 * Provides chronological list of all financial transactions with running balance.
 */
export function useClientStatement(
  clientId?: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client-statement", tenantId, clientId, dateFrom, dateTo],
    queryFn: async (): Promise<ClientStatementSummary | null> => {
      if (!tenantId || !clientId) return null;

      // Build query
      let query = supabase
        .from("ledger_entries")
        .select("id, created_at, entry_type, description, reference_type, reference_id, amount, balance_after, payment_method")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      const { data: entries, error } = await query;

      if (error) {
        console.error("Error fetching client statement:", error);
        return null;
      }

      // Fetch client name
      const { data: client } = await supabase
        .from("clients")
        .select("name, name_ar")
        .eq("id", clientId)
        .single();

      // Transform entries
      let totalDebits = 0;
      let totalCredits = 0;
      let openingBalance = 0;
      let currentBalance = 0;

      const statementEntries: StatementEntry[] = (entries || []).map((e: any, index: number) => {
        const amount = Number(e.amount);
        const isDebit = amount > 0;
        const debit = isDebit ? amount : 0;
        const credit = isDebit ? 0 : Math.abs(amount);

        totalDebits += debit;
        totalCredits += credit;

        // Track balance
        if (index === 0) {
          openingBalance = Number(e.balance_after) - amount;
        }
        currentBalance = Number(e.balance_after);

        return {
          id: e.id,
          date: e.created_at,
          entry_type: e.entry_type as StatementEntry["entry_type"],
          description: e.description,
          reference_type: e.reference_type,
          reference_id: e.reference_id,
          debit,
          credit,
          balance: Number(e.balance_after),
          payment_method: e.payment_method,
        };
      });

      return {
        clientId,
        clientName: client?.name,
        entries: statementEntries,
        totalDebits,
        totalCredits,
        currentBalance,
        openingBalance,
      };
    },
    enabled: !!tenantId && !!clientId,
  });

  return {
    statement: data,
    isLoading,
    refetch,
  };
}
