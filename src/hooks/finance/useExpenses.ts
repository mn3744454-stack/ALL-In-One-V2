import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Expense {
  id: string;
  tenant_id: string;
  category: string;
  description?: string;
  amount: number;
  currency: string;
  expense_date: string;
  vendor_name?: string;
  vendor_id?: string;
  status: "pending" | "approved" | "paid" | "rejected";
  receipt_asset_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  tenant_id: string;
  category: string;
  description?: string;
  amount: number;
  currency?: string;
  expense_date?: string;
  vendor_name?: string;
  vendor_id?: string;
  status?: string;
  receipt_asset_id?: string;
  notes?: string;
}

export function useExpenses(tenantId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", tenantId],
    queryFn: async (): Promise<Expense[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("expenses" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("expense_date", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          console.warn("expenses table does not exist yet");
          return [];
        }
        console.error("Error fetching expenses:", error);
        return [];
      }

      return (data || []) as unknown as Expense[];
    },
    enabled: !!tenantId,
  });

  const createExpense = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("expenses" as any)
        .insert({
          ...input,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
      toast({ title: "Expense created successfully" });
    },
    onError: (error) => {
      console.error("Error creating expense:", error);
      toast({ title: "Failed to create expense", variant: "destructive" });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
      toast({ title: "Expense updated successfully" });
    },
    onError: (error) => {
      console.error("Error updating expense:", error);
      toast({ title: "Failed to update expense", variant: "destructive" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from("expenses" as any)
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", tenantId] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: (error) => {
      console.error("Error deleting expense:", error);
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  // Get expense statistics
  const stats = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    pending: expenses.filter((e) => e.status === "pending").length,
    approved: expenses.filter((e) => e.status === "approved").length,
    paid: expenses.filter((e) => e.status === "paid").length,
  };

  return {
    expenses,
    isLoading,
    stats,
    createExpense: createExpense.mutateAsync,
    updateExpense: updateExpense.mutateAsync,
    deleteExpense: deleteExpense.mutateAsync,
    isCreating: createExpense.isPending,
    isUpdating: updateExpense.isPending,
    isDeleting: deleteExpense.isPending,
  };
}

// Expense categories for selection
export const EXPENSE_CATEGORIES = [
  "feed",
  "veterinary",
  "equipment",
  "labor",
  "utilities",
  "maintenance",
  "transportation",
  "insurance",
  "other",
] as const;
