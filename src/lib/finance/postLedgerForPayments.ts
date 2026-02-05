import { supabase } from "@/integrations/supabase/client";

export interface PaymentEntry {
  amount: number; // Positive number representing payment amount
  payment_method: string;
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
 * Posts multiple payment ledger entries for an invoice (split-tender support).
 * 
 * Flow:
 * 1. Validate invoice exists and has client_id
 * 2. Compute current paid amount from ledger entries
 * 3. Validate sum(payments) <= outstanding
 * 4. Insert one ledger entry per payment (entry_type='payment', amount=-X)
 * 5. Update customer_balances
 * 6. Update invoice status: paid (if outstanding <= 0), partial (if > 0)
 */
export async function postLedgerForPayments(
  invoiceId: string,
  tenantId: string,
  payments: PaymentEntry[],
  paymentSessionId: string
): Promise<PostPaymentsResult> {
  try {
    // Validate payments
    if (!payments.length) {
      return { success: false, error: "No payments provided", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaymentAmount <= 0) {
      return { success: false, error: "Payment amount must be positive", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    // Fetch invoice
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id, client_id, total_amount, invoice_number, status")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      return { success: false, error: "Invoice not found", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    if (!invoice.client_id) {
      return { success: false, error: "Cannot record payment for walk-in invoice (no client)", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Calculate already paid amount from ledger
    const { data: existingPayments, error: paymentError } = await supabase
      .from("ledger_entries")
      .select("amount")
      .eq("tenant_id", tenantId)
      .eq("reference_type", "invoice")
      .eq("reference_id", invoiceId)
      .eq("entry_type", "payment");

    if (paymentError) {
      return { success: false, error: "Failed to fetch existing payments", paidAmount: 0, outstandingAmount: 0, invoiceStatus: "" };
    }

    const previouslyPaid = (existingPayments || []).reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
    const currentOutstanding = Number(invoice.total_amount) - previouslyPaid;

    // Validate: sum of payments cannot exceed outstanding
    if (totalPaymentAmount > currentOutstanding + 0.01) { // Allow small float tolerance
      return { 
        success: false, 
        error: `Payment amount (${totalPaymentAmount}) exceeds outstanding (${currentOutstanding.toFixed(2)})`,
        paidAmount: previouslyPaid,
        outstandingAmount: currentOutstanding,
        invoiceStatus: invoice.status
      };
    }

    // Get current customer balance
    const { data: balanceRecord } = await supabase
      .from("customer_balances")
      .select("balance")
      .eq("tenant_id", tenantId)
      .eq("client_id", invoice.client_id)
      .maybeSingle();

    let currentBalance = Number((balanceRecord as any)?.balance) || 0;

    // Insert ledger entries for each payment
    for (const payment of payments) {
      const newBalance = currentBalance - payment.amount;

      const metadataObj: Record<string, unknown> = {};
      if (payment.reference) metadataObj.reference = payment.reference;
      if (payment.notes) metadataObj.notes = payment.notes;

      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert({
          tenant_id: tenantId,
          client_id: invoice.client_id,
          entry_type: "payment",
          reference_type: "invoice",
          reference_id: invoiceId,
          amount: -payment.amount, // Negative for payments (reduces balance)
          balance_after: newBalance,
          description: `Payment for Invoice ${invoice.invoice_number}`,
          payment_method: payment.payment_method,
          payment_session_id: paymentSessionId,
          metadata: metadataObj,
          created_by: userId,
        } as any);

      if (ledgerError) {
        console.error("Error creating payment ledger entry:", ledgerError);
        return { 
          success: false, 
          error: "Failed to record payment", 
          paidAmount: previouslyPaid, 
          outstandingAmount: currentOutstanding, 
          invoiceStatus: invoice.status 
        };
      }

      currentBalance = newBalance;
    }

    // Update customer balance
    const { error: balanceError } = await supabase
      .from("customer_balances")
      .upsert({
        tenant_id: tenantId,
        client_id: invoice.client_id,
        balance: currentBalance,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: "tenant_id,client_id",
      });

    if (balanceError) {
      console.error("Error updating customer balance:", balanceError);
      // Continue - ledger entries are the source of truth
    }

    // Calculate new outstanding
    const newPaidAmount = previouslyPaid + totalPaymentAmount;
    const newOutstanding = Number(invoice.total_amount) - newPaidAmount;

    // Determine new invoice status
    let newStatus = invoice.status;
    const paymentMethods = payments.map(p => p.payment_method);
    const paymentMethodValue = paymentMethods.length > 1 ? "mixed" : paymentMethods[0];

    if (newOutstanding <= 0.01) {
      // Fully paid
      newStatus = "paid";
      const { error: statusError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_received_at: new Date().toISOString(),
          payment_method: paymentMethodValue,
        })
        .eq("id", invoiceId);

      if (statusError) {
        console.error("Error updating invoice status:", statusError);
      }
    } else if (newPaidAmount > 0) {
      // Partially paid
      newStatus = "partial";
      const { error: statusError } = await supabase
        .from("invoices")
        .update({
          status: "partial",
          payment_method: paymentMethodValue,
        })
        .eq("id", invoiceId);

      if (statusError) {
        console.error("Error updating invoice status:", statusError);
      }
    }

    return {
      success: true,
      paidAmount: newPaidAmount,
      outstandingAmount: Math.max(0, newOutstanding),
      invoiceStatus: newStatus,
    };

  } catch (error) {
    console.error("postLedgerForPayments: Unexpected error", error);
    return { 
      success: false, 
      error: "Unexpected error recording payment", 
      paidAmount: 0, 
      outstandingAmount: 0, 
      invoiceStatus: "" 
    };
  }
}
