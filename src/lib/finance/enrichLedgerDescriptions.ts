import { supabase } from "@/integrations/supabase/client";

export interface EnrichedDescription {
  display: string;
  horseName?: string;
  horseNameAr?: string;
  sampleLabel?: string;
  items?: string[];
  paymentMethod?: string;
  invoiceNumber?: string;
}

/**
 * Resolves enriched display descriptions for ledger entries at render time.
 * Handles BOTH old (generic) and new (already enriched) descriptions.
 */
export async function enrichLedgerDescriptions(
  entries: Array<{
    id: string;
    entry_type: string;
    description: string | null;
    reference_id: string | null;
    payment_method: string | null;
  }>
): Promise<Map<string, EnrichedDescription>> {
  const result = new Map<string, EnrichedDescription>();

  const needsEnrichment: typeof entries = [];

  for (const entry of entries) {
    const desc = entry.description || "";
    if (desc.includes(" | ")) {
      result.set(entry.id, { display: desc });
    } else {
      needsEnrichment.push(entry);
    }
  }

  if (needsEnrichment.length === 0) return result;

  const invoiceIds = [
    ...new Set(
      needsEnrichment
        .filter((e) => e.reference_id)
        .map((e) => e.reference_id!)
    ),
  ];

  if (invoiceIds.length === 0) {
    for (const entry of needsEnrichment) {
      result.set(entry.id, {
        display: entry.description || "-",
        paymentMethod: entry.payment_method || undefined,
      });
    }
    return result;
  }

  // Batch fetch invoice numbers
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .in("id", invoiceIds);

  const invoiceMap = new Map<string, string>();
  invoices?.forEach((inv: any) => invoiceMap.set(inv.id, inv.invoice_number));

  // Batch fetch invoice_items
  const { data: allItems } = await supabase
    .from("invoice_items" as any)
    .select("invoice_id, description, entity_type, entity_id")
    .in("invoice_id", invoiceIds);

  const typedItems = (allItems || []) as unknown as Array<{
    invoice_id: string;
    description: string;
    entity_type: string | null;
    entity_id: string | null;
  }>;

  const itemsByInvoice = new Map<string, typeof typedItems>();
  typedItems.forEach((item) => {
    const list = itemsByInvoice.get(item.invoice_id) || [];
    list.push(item);
    itemsByInvoice.set(item.invoice_id, list);
  });

  // Collect lab_sample entity_ids for batch horse resolution
  const sampleIds = [
    ...new Set(
      typedItems
        .filter((i) => i.entity_type === "lab_sample" && i.entity_id)
        .map((i) => i.entity_id!)
    ),
  ];

  // Batch fetch samples + horses
  let sampleToHorse = new Map<string, { horseName: string; horseNameAr: string; sampleLabel: string }>();
  if (sampleIds.length > 0) {
    const { data: samples } = await supabase
      .from("lab_samples")
      .select("id, daily_number, physical_sample_id, lab_horse_id")
      .in("id", sampleIds);

    if (samples && samples.length > 0) {
      const horseIds = [
        ...new Set(
          (samples as any[]).map((s) => s.lab_horse_id).filter(Boolean)
        ),
      ];

      let horseData = new Map<string, { name: string; nameAr: string }>();
      if (horseIds.length > 0) {
        const { data: horses } = await supabase
          .from("lab_horses")
          .select("id, name, name_ar")
          .in("id", horseIds);

        horses?.forEach((h: any) => {
          horseData.set(h.id, {
            name: h.name || "",
            nameAr: h.name_ar || "",
          });
        });
      }

      (samples as any[]).forEach((s) => {
        const sLabel = s.daily_number
          ? `#${s.daily_number}`
          : s.physical_sample_id?.slice(0, 12) || "";
        const horse = s.lab_horse_id ? horseData.get(s.lab_horse_id) : undefined;
        sampleToHorse.set(s.id, {
          horseName: horse?.name || "",
          horseNameAr: horse?.nameAr || "",
          sampleLabel: sLabel,
        });
      });
    }
  }

  // Build enriched descriptions
  for (const entry of needsEnrichment) {
    const invoiceNumber = entry.reference_id
      ? invoiceMap.get(entry.reference_id) || ""
      : "";
    const items = entry.reference_id
      ? itemsByInvoice.get(entry.reference_id) || []
      : [];

    const parts: string[] = [];
    let horseName = "";
    let horseNameAr = "";
    let sampleLabel = "";
    const itemNames: string[] = [];

    if (entry.entry_type === "payment") {
      parts.push("Payment");
      if (entry.payment_method) parts.push(`Method: ${entry.payment_method}`);
      if (invoiceNumber) parts.push(invoiceNumber);
    } else if (entry.entry_type === "invoice") {
      if (invoiceNumber) parts.push(`Invoice ${invoiceNumber}`);

      const labSampleItems = items.filter(
        (i) => i.entity_type === "lab_sample" && i.entity_id
      );
      if (labSampleItems.length > 0) {
        const resolved = sampleToHorse.get(labSampleItems[0].entity_id!);
        if (resolved?.horseName) {
          horseName = resolved.horseName;
          parts.push(`Horse: ${resolved.horseName}`);
        }
        if (resolved?.horseNameAr) {
          horseNameAr = resolved.horseNameAr;
        }
        if (resolved?.sampleLabel) {
          sampleLabel = resolved.sampleLabel;
          parts.push(`Sample: ${resolved.sampleLabel}`);
        }
      }

      const names = items
        .map((i) => i.description)
        .filter(Boolean)
        .slice(0, 3);
      itemNames.push(...names);
      if (names.length > 0) {
        parts.push(`Items: ${names.join(", ")}`);
      }
    } else {
      parts.push(entry.description || entry.entry_type);
    }

    result.set(entry.id, {
      display: parts.join(" | ") || entry.description || "-",
      invoiceNumber: invoiceNumber || undefined,
      horseName: horseName || undefined,
      horseNameAr: horseNameAr || undefined,
      sampleLabel: sampleLabel || undefined,
      items: itemNames.length > 0 ? itemNames : undefined,
      paymentMethod: entry.payment_method || undefined,
    });
  }

  return result;
}
