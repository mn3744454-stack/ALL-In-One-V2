import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { postLedgerForPayments, type PaymentEntry } from "@/lib/finance/postLedgerForPayments";

export interface InvoicePayment {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  description: string | null;
}

export interface InvoicePaymentSummary {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  payments: InvoicePayment[];
  isPaid: boolean;
  isPartial: boolean;
}

/**
 * Hook to fetch and manage payments for a specific invoice.
 * Computes paid/outstanding from ledger_entries (source of truth).
 */
export function useInvoicePayments(invoiceId?: string | null) {
  const { activeTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoice-payments", tenantId, invoiceId],
    queryFn: async (): Promise<InvoicePaymentSummary | null> => {
      if (!tenantId || !invoiceId) return null;

      // Fetch invoice total
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .select("id, total_amount, status")
        .eq("id", invoiceId)
        .single();

      if (invError || !invoice) {
        console.error("Error fetching invoice:", invError);
        return null;
      }

      // Fetch payment ledger entries
      const { data: payments, error: payError } = await supabase
        .from("ledger_entries")
        .select("id, amount, payment_method, payment_session_id, metadata, created_at, description")
        .eq("tenant_id", tenantId)
        .eq("reference_type", "invoice")
        .eq("reference_id", invoiceId)
        .eq("entry_type", "payment")
        .order("created_at", { ascending: true });

      if (payError) {
        console.error("Error fetching payments:", payError);
        return null;
      }

      const paymentsList: InvoicePayment[] = (payments || []).map((p: any) => ({
        id: p.id,
        amount: Math.abs(Number(p.amount)), // Convert negative to positive for display
        payment_method: p.payment_method,
        payment_session_id: p.payment_session_id,
        metadata: p.metadata || {},
        created_at: p.created_at,
        description: p.description,
      }));

      const totalAmount = Number(invoice.total_amount);
      const paidAmount = paymentsList.reduce((sum, p) => sum + p.amount, 0);
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);

      return {
        invoiceId,
        totalAmount,
        paidAmount,
        outstandingAmount,
        payments: paymentsList,
        isPaid: outstandingAmount <= 0.01,
        isPartial: paidAmount > 0 && outstandingAmount > 0.01,
      };
    },
    enabled: !!tenantId && !!invoiceId,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (payments: PaymentEntry[]) => {
      if (!tenantId || !invoiceId) {
        throw new Error("Missing tenant or invoice");
      }

      const paymentSessionId = crypto.randomUUID();
      const result = await postLedgerForPayments(invoiceId, tenantId, payments, paymentSessionId);

      if (!result.success) {
        throw new Error(result.error || "Failed to record payment");
      }

      return result;
    },
    onSuccess: (result) => {
      toast({ 
        title: result.outstandingAmount <= 0.01 
          ? "Invoice fully paid" 
          : `Payment recorded. Outstanding: ${result.outstandingAmount.toFixed(2)}` 
      });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", tenantId, invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["customer-balances", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["client-statement", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["lab-horse-financial", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (error) => {
      console.error("Payment error:", error);
      toast({ 
        title: error.message || "Failed to record payment", 
        variant: "destructive" 
      });
    },
  });

  return {
    summary: data,
    isLoading,
    refetch,
    recordPayment: recordPaymentMutation.mutateAsync,
    isRecording: recordPaymentMutation.isPending,
  };
}
