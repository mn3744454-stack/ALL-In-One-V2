import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export type PayableStatus = "received" | "reviewed" | "approved" | "partially_paid" | "paid" | "cancelled" | "disputed";

export interface SupplierPayable {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_id: string | null;
  source_type: string | null;
  source_reference: string | null;
  description: string | null;
  amount: number;
  amount_paid: number;
  currency: string;
  due_date: string | null;
  status: PayableStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupplierPayables() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["supplier-payables", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("supplier_payables")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching payables:", error);
        return [];
      }
      return data as SupplierPayable[];
    },
    enabled: !!tenantId,
  });

  const createPayable = useMutation({
    mutationFn: async (input: {
      supplier_name: string;
      supplier_id?: string | null;
      source_type?: string;
      source_reference?: string;
      description?: string;
      amount: number;
      currency?: string;
      due_date?: string | null;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("supplier_payables")
        .insert({
          tenant_id: tenantId,
          supplier_name: input.supplier_name,
          supplier_id: input.supplier_id || null,
          source_type: input.source_type || null,
          source_reference: input.source_reference || null,
          description: input.description || null,
          amount: input.amount,
          amount_paid: 0,
          currency: input.currency || "SAR",
          due_date: input.due_date || null,
          notes: input.notes || null,
          status: "received",
          created_by: user?.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payables", tenantId] });
      toast.success(t("finance.payables.toasts.created"));
    },
    onError: (err: any) => {
      toast.error(err.message || t("common.error"));
    },
  });

  const updatePayableStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PayableStatus }) => {
      const { error } = await supabase
        .from("supplier_payables")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payables", tenantId] });
    },
  });

  const recordPayablePayment = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // Get current payable
      const { data: payable, error: fetchError } = await supabase
        .from("supplier_payables")
        .select("amount, amount_paid, status")
        .eq("id", id)
        .single();
      if (fetchError || !payable) throw fetchError || new Error("Not found");

      const newAmountPaid = (payable.amount_paid || 0) + amount;
      const remaining = payable.amount - newAmountPaid;
      const newStatus: PayableStatus = remaining <= 0.01 ? "paid" : "partially_paid";

      const { error } = await supabase
        .from("supplier_payables")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payables", tenantId] });
      toast.success(t("finance.payables.toasts.paymentRecorded"));
    },
    onError: (err: any) => {
      toast.error(err.message || t("common.error"));
    },
  });

  const deletePayable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_payables")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payables", tenantId] });
      toast.success(t("finance.payables.toasts.deleted"));
    },
  });

  // Summary stats
  const stats = {
    totalCount: payables.length,
    totalAmount: payables.reduce((s, p) => s + Number(p.amount), 0),
    totalPaid: payables.reduce((s, p) => s + Number(p.amount_paid), 0),
    totalOutstanding: payables.reduce((s, p) => s + (Number(p.amount) - Number(p.amount_paid)), 0),
    receivedCount: payables.filter((p) => p.status === "received").length,
    approvedCount: payables.filter((p) => ["approved", "partially_paid"].includes(p.status)).length,
    paidCount: payables.filter((p) => p.status === "paid").length,
  };

  return {
    payables,
    isLoading,
    stats,
    createPayable,
    updatePayableStatus,
    recordPayablePayment,
    deletePayable,
  };
}
