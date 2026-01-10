import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_by?: string;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ledger-entries", tenantId, clientId],
    queryFn: async (): Promise<LedgerEntry[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("ledger_entries" as any)
        .select("*")
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

  const createEntry = useMutation({
    mutationFn: async (input: CreateLedgerEntryInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get current balance for the client
      const { data: currentBalance } = await supabase
        .from("customer_balances" as any)
        .select("balance")
        .eq("tenant_id", input.tenant_id)
        .eq("client_id", input.client_id)
        .single();

      const balanceRecord = currentBalance as unknown as { balance: number } | null;
      const previousBalance = balanceRecord?.balance || 0;
      const newBalance = previousBalance + input.amount;

      // Create ledger entry
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .insert({
          ...input,
          balance_after: newBalance,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Upsert customer balance
      const { error: balanceError } = await supabase
        .from("customer_balances" as any)
        .upsert({
          tenant_id: input.tenant_id,
          client_id: input.client_id,
          balance: newBalance,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: "tenant_id,client_id",
        });

      if (balanceError) {
        console.error("Error updating balance:", balanceError);
      }

      return data as unknown as LedgerEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-entries", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customer-balances", tenantId] });
      toast({ title: "Ledger entry created" });
    },
    onError: (error) => {
      console.error("Error creating ledger entry:", error);
      toast({ title: "Failed to create entry", variant: "destructive" });
    },
  });

  return {
    entries,
    isLoading,
    createEntry: createEntry.mutateAsync,
    isCreating: createEntry.isPending,
  };
}
