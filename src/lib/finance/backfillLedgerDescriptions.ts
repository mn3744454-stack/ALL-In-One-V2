import { supabase } from "@/integrations/supabase/client";

/**
 * One-time backfill utility: enriches old ledger_entries descriptions
 * that only contain "Invoice INV-..." without context segments.
 * 
 * Safe to run multiple times (idempotent - skips already enriched entries).
 * Only updates description text, never touches amounts.
 */
export async function backfillLedgerDescriptions(tenantId: string): Promise<{ updated: number; skipped: number; errors: number }> {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Find invoice ledger entries with generic descriptions
  const { data: entries, error } = await supabase
    .from("ledger_entries")
    .select("id, reference_id, description")
    .eq("tenant_id", tenantId)
    .eq("entry_type", "invoice")
    .order("created_at", { ascending: true });

  if (error || !entries) {
    console.error("backfillLedgerDescriptions: Failed to fetch entries", error);
    return { updated: 0, skipped: 0, errors: 1 };
  }

  // Filter to only generic descriptions (no " | " segments)
  const genericEntries = (entries as any[]).filter(
    (e) => e.description && e.description.startsWith("Invoice ") && !e.description.includes(" | ")
  );

  console.log(`backfillLedgerDescriptions: Found ${genericEntries.length} generic entries out of ${entries.length} total`);

  // Process in batches of 10
  for (let i = 0; i < genericEntries.length; i += 10) {
    const batch = genericEntries.slice(i, i + 10);

    for (const entry of batch) {
      try {
        const invoiceId = entry.reference_id;
        if (!invoiceId) { skipped++; continue; }

        // Fetch invoice number
        const { data: invoice } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("id", invoiceId)
          .maybeSingle();

        if (!invoice) { skipped++; continue; }

        const parts: string[] = [`Invoice ${invoice.invoice_number}`];

        // Fetch invoice items for context
        const { data: items } = await supabase
          .from("invoice_items" as any)
          .select("description, entity_type, entity_id")
          .eq("invoice_id", invoiceId);

        if (items && items.length > 0) {
          const typedItems = items as unknown as Array<{
            description: string;
            entity_type: string | null;
            entity_id: string | null;
          }>;

          // Resolve horse/sample from lab_sample items
          const labSampleIds = typedItems
            .filter(i => i.entity_type === "lab_sample" && i.entity_id)
            .map(i => i.entity_id!);

          if (labSampleIds.length > 0) {
            const { data: samples } = await supabase
              .from("lab_samples")
              .select("id, daily_number, physical_sample_id, lab_horse_id")
              .in("id", labSampleIds);

            if (samples && samples.length > 0) {
              const sample = samples[0] as any;
              const sampleLabel = sample.daily_number
                ? `#${sample.daily_number}`
                : sample.physical_sample_id?.slice(0, 12) || null;

              if (sample.lab_horse_id) {
                const { data: horse } = await supabase
                  .from("lab_horses")
                  .select("name, name_ar")
                  .eq("id", sample.lab_horse_id)
                  .maybeSingle();

                if (horse) {
                  const horseName = (horse as any).name || (horse as any).name_ar;
                  if (horseName) parts.push(`Horse: ${horseName}`);
                }
              }
              if (sampleLabel) parts.push(`Sample: ${sampleLabel}`);
            }
          }

          // Add item descriptions (max 3)
          const itemNames = typedItems.map(i => i.description).filter(Boolean).slice(0, 3);
          if (itemNames.length > 0) {
            parts.push(`Items: ${itemNames.join(", ")}`);
          }
        }

        const newDescription = parts.join(" | ");

        // Only update if we actually enriched beyond the original
        if (newDescription === entry.description) {
          skipped++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("ledger_entries")
          .update({ description: newDescription })
          .eq("id", entry.id);

        if (updateError) {
          console.error(`backfillLedgerDescriptions: Failed to update entry ${entry.id}`, updateError);
          errors++;
        } else {
          updated++;
        }
      } catch (err) {
        console.error(`backfillLedgerDescriptions: Error processing entry ${entry.id}`, err);
        errors++;
      }
    }
  }

  console.log(`backfillLedgerDescriptions: Done. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
  return { updated, skipped, errors };
}
