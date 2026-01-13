import { supabase } from "@/integrations/supabase/client";

/**
 * Posts a ledger entry for an invoice and updates customer balance.
 * Prevents duplicate entries by checking reference_id.
 * Skips if invoice has no client_id (walk-in).
 */
export async function postLedgerForInvoice(
  invoiceId: string,
  tenantId: string
): Promise<boolean> {
  try {
    // Fetch invoice details
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id, client_id, total_amount, invoice_number, notes")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      console.error("postLedgerForInvoice: Invoice not found", invError);
      return false;
    }

    // Skip if no client (walk-in)
    if (!invoice.client_id) {
      console.log("postLedgerForInvoice: Skipping walk-in invoice (no client_id)");
      return true;
    }

    // Check for existing ledger entry to prevent duplicates
    const { data: existing, error: checkError } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("reference_type", "invoice")
      .eq("reference_id", invoiceId)
      .maybeSingle();

    if (checkError) {
      console.error("postLedgerForInvoice: Error checking existing entry", checkError);
      return false;
    }

    if (existing) {
      console.log("postLedgerForInvoice: Entry already exists, skipping");
      return true;
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    // Get current balance
    const { data: balanceRecord } = await supabase
      .from("customer_balances")
      .select("balance")
      .eq("tenant_id", tenantId)
      .eq("client_id", invoice.client_id)
      .maybeSingle();

    const currentBalance = Number((balanceRecord as any)?.balance) || 0;
    const newBalance = currentBalance + Number(invoice.total_amount);

    // Insert ledger entry
    const { error: ledgerError } = await supabase
      .from("ledger_entries")
      .insert({
        tenant_id: tenantId,
        client_id: invoice.client_id,
        entry_type: "invoice",
        reference_type: "invoice",
        reference_id: invoiceId,
        amount: invoice.total_amount,
        balance_after: newBalance,
        description: `Invoice ${invoice.invoice_number}`,
        created_by: userId,
      });

    if (ledgerError) {
      console.error("postLedgerForInvoice: Error creating ledger entry", ledgerError);
      return false;
    }

    // Upsert customer balance
    const { error: balanceError } = await supabase
      .from("customer_balances")
      .upsert({
        tenant_id: tenantId,
        client_id: invoice.client_id,
        balance: newBalance,
        last_updated: new Date().toISOString(),
      }, {
        onConflict: "tenant_id,client_id",
      });

    if (balanceError) {
      console.error("postLedgerForInvoice: Error updating balance", balanceError);
      // Entry was created, so partial success
    }

    return true;
  } catch (error) {
    console.error("postLedgerForInvoice: Unexpected error", error);
    return false;
  }
}
