import { supabase } from "@/integrations/supabase/client";

export interface PaymentEntry {
  amount: number; // Positive number representing payment amount
  payment_method: string;
  idempotency_key: string;
  reference?: string;
  notes?: string;
}

export interface PostPaymentsResult {
  success: boolean;
  error?: string;
  paidAmount: number;
  outstandingAmount: number;
  invoiceStatus: string;
}

/**
 * Posts a complete split-tender session through one atomic database RPC.
 * The server owns overpayment validation, ledger/balance rebuild, payment
 * intents, billing links, and the final invoice status.
 */
export async function postLedgerForPayments(
  invoiceId: string,
  tenantId: string,
  payments: PaymentEntry[],
  paymentSessionId: string,
  paymentDate: string,
): Promise<PostPaymentsResult> {
  try {
    if (!payments.length) {
      return { success: false, error: "No payments provided", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaymentAmount <= 0) {
      return { success: false, error: "Payment amount must be positive", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    const { data: account, error: accountError } = await supabase
      .from("payment_accounts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("owner_type", "tenant")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (accountError || !account) {
      return { success: false, error: "Active payment account not found", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    const { data, error } = await supabase.rpc("post_invoice_payments", {
      p_tenant_id: tenantId,
      p_idempotency_key: paymentSessionId,
      p_invoice_id: invoiceId,
      p_account_id: account.id,
      p_payment_date: paymentDate,
      p_payments: payments.map((payment) => ({
        idempotency_key: payment.idempotency_key,
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_note: payment.notes ?? null,
        external_reference: payment.reference ?? null,
      })),
    });
    if (error) throw error;

    const response = data && typeof data === "object" && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    const newOutstanding = Math.max(0, Number(response.remaining_after) || 0);
    const newStatus = String(response.invoice_status || "");

    const { data: invoice } = await supabase
      .from("invoices")
      .select("total_amount")
      .eq("id", invoiceId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const invoiceTotal = Number(invoice?.total_amount) || totalPaymentAmount + newOutstanding;

    return {
      success: true,
      paidAmount: Math.max(0, invoiceTotal - newOutstanding),
      outstandingAmount: newOutstanding,
      invoiceStatus: newStatus,
    };

  } catch (error) {
    console.error("postLedgerForPayments: RPC error", error);
    return { 
      success: false, 
      error: "Unexpected error recording payment", 
      paidAmount: 0, 
      outstandingAmount: 0, 
      invoiceStatus: "" 
    };
  }
}
