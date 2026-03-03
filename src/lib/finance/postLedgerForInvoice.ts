import { supabase } from "@/integrations/supabase/client";

/**
 * Builds an enriched description for a ledger entry by resolving
 * invoice context: horse name, sample info, and line item names.
 */
async function buildEnrichedDescription(
  invoiceId: string,
  invoiceNumber: string
): Promise<string> {
  const parts: string[] = [`Invoice ${invoiceNumber}`];

  try {
    // Fetch invoice items
    const { data: items } = await supabase
      .from("invoice_items" as any)
      .select("description, entity_type, entity_id")
      .eq("invoice_id", invoiceId);

    if (!items || items.length === 0) return parts[0];

    const typedItems = items as unknown as Array<{
      description: string;
      entity_type: string | null;
      entity_id: string | null;
    }>;

    // Try to resolve horse name from lab_sample items
    const labSampleIds = typedItems
      .filter(i => i.entity_type === "lab_sample" && i.entity_id)
      .map(i => i.entity_id!);

    let horseName: string | null = null;
    let sampleLabel: string | null = null;

    if (labSampleIds.length > 0) {
      const { data: samples } = await supabase
        .from("lab_samples")
        .select("id, daily_number, physical_sample_id, lab_horse_id")
        .in("id", labSampleIds);

      if (samples && samples.length > 0) {
        const sample = samples[0] as any;
        sampleLabel = sample.daily_number
          ? `#${sample.daily_number}`
          : sample.physical_sample_id?.slice(0, 12) || null;

        // Resolve horse name
        if (sample.lab_horse_id) {
          const { data: horse } = await supabase
            .from("lab_horses")
            .select("name, name_ar")
            .eq("id", sample.lab_horse_id)
            .maybeSingle();

          if (horse) {
            horseName = (horse as any).name || (horse as any).name_ar || null;
          }
        }
      }
    }

    if (horseName) parts.push(`Horse: ${horseName}`);
    if (sampleLabel) parts.push(`Sample: ${sampleLabel}`);

    // Add item descriptions (max 3)
    const itemNames = typedItems
      .map(i => i.description)
      .filter(Boolean)
      .slice(0, 3);
    if (itemNames.length > 0) {
      parts.push(`Items: ${itemNames.join(", ")}`);
    }
  } catch (err) {
    console.error("buildEnrichedDescription: Error enriching", err);
    // Fallback: return just invoice number
  }

  return parts.join(" | ");
}

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

    // Build enriched description
    const description = await buildEnrichedDescription(invoiceId, invoice.invoice_number);

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
        description,
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
