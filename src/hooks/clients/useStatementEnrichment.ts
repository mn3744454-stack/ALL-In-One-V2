import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/i18n";
import type { StatementEntry } from "./useClientStatement";

export interface EnrichedHorse {
  horseId: string;
  horseName: string;
  samples: Array<{ sampleLabel: string }>;
  items: string[];
  /** Source domain: lab | boarding | breeding */
  source?: "lab" | "boarding" | "breeding";
}

export interface EnrichedStatementData {
  invoiceNumber?: string;
  paymentMethod?: string;
  horses: EnrichedHorse[];
  itemsSummary: string;
  isMultiHorse: boolean;
}

/**
 * Batch-resolves structured enrichment data for statement entries.
 * Returns a Map<entryId, EnrichedStatementData> for invoice/payment rows.
 * Supports both lab_sample and boarding entity types.
 */
export function useStatementEnrichment(entries: StatementEntry[]) {
  const lang = getCurrentLanguage();

  const referenceIds = [
    ...new Set(
      entries
        .filter((e) => e.reference_id && (e.entry_type === "invoice" || e.entry_type === "payment"))
        .map((e) => e.reference_id!)
    ),
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["statement-enrichment", referenceIds.join(","), lang],
    queryFn: async (): Promise<Map<string, EnrichedStatementData>> => {
      const result = new Map<string, EnrichedStatementData>();
      if (referenceIds.length === 0) return result;

      // 1. Batch fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .in("id", referenceIds);

      const invoiceNumberMap = new Map<string, string>();
      invoices?.forEach((inv: any) => invoiceNumberMap.set(inv.id, inv.invoice_number));

      // 2. Batch fetch invoice_items
      const { data: allItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, description, entity_type, entity_id")
        .in("invoice_id", referenceIds);

      const typedItems = (allItems || []) as unknown as Array<{
        invoice_id: string;
        description: string;
        entity_type: string | null;
        entity_id: string | null;
      }>;

      // Group items by invoice_id
      const itemsByInvoice = new Map<string, typeof typedItems>();
      typedItems.forEach((item) => {
        const list = itemsByInvoice.get(item.invoice_id) || [];
        list.push(item);
        itemsByInvoice.set(item.invoice_id, list);
      });

      // 3. Collect all lab_sample entity_ids
      const sampleIds = [
        ...new Set(
          typedItems
            .filter((i) => i.entity_type === "lab_sample" && i.entity_id)
            .map((i) => i.entity_id!)
        ),
      ];

      // 3b. Collect all boarding entity_ids
      const boardingIds = [
        ...new Set(
          typedItems
            .filter((i) => i.entity_type === "boarding" && i.entity_id)
            .map((i) => i.entity_id!)
        ),
      ];

      // 4. Batch fetch samples + lab horses
      const sampleToHorse = new Map<string, { horseId: string; horseName: string; sampleLabel: string }>();
      
      if (sampleIds.length > 0) {
        const { data: samples } = await supabase
          .from("lab_samples")
          .select("id, daily_number, physical_sample_id, lab_horse_id")
          .in("id", sampleIds);

        if (samples && samples.length > 0) {
          const horseIds = [...new Set((samples as any[]).map((s) => s.lab_horse_id).filter(Boolean))];
          
          const horseNameMap = new Map<string, { name: string; nameAr: string }>();
          if (horseIds.length > 0) {
            const { data: horses } = await supabase
              .from("lab_horses")
              .select("id, name, name_ar")
              .in("id", horseIds);

            horses?.forEach((h: any) => {
              horseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" });
            });
          }

          (samples as any[]).forEach((s) => {
            const sLabel = s.daily_number
              ? `#${s.daily_number}`
              : s.physical_sample_id?.slice(0, 12) || "";
            const horseData = s.lab_horse_id ? horseNameMap.get(s.lab_horse_id) : null;
            const displayName = horseData
              ? (lang === "ar" ? (horseData.nameAr || horseData.name) : (horseData.name || horseData.nameAr))
              : "";
            sampleToHorse.set(s.id, {
              horseId: s.lab_horse_id || "",
              horseName: displayName,
              sampleLabel: sLabel,
            });
          });
        }
      }

      // 4b. Batch fetch boarding admissions + stable horses
      const boardingToHorse = new Map<string, { horseId: string; horseName: string; branchName: string }>();

      if (boardingIds.length > 0) {
        const { data: admissions } = await supabase
          .from("boarding_admissions")
          .select("id, horse_id, branch_id")
          .in("id", boardingIds);

        if (admissions && admissions.length > 0) {
          const stableHorseIds = [...new Set((admissions as any[]).map((a) => a.horse_id).filter(Boolean))];
          const branchIds = [...new Set((admissions as any[]).map((a) => a.branch_id).filter(Boolean))];

          // Fetch horse names
          const stableHorseNameMap = new Map<string, { name: string; nameAr: string }>();
          if (stableHorseIds.length > 0) {
            const { data: horses } = await supabase
              .from("horses")
              .select("id, name, name_ar")
              .in("id", stableHorseIds);

            horses?.forEach((h: any) => {
              stableHorseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" });
            });
          }

          // Fetch branch names
          const branchNameMap = new Map<string, string>();
          if (branchIds.length > 0) {
            const { data: branches } = await supabase
              .from("branches")
              .select("id, name")
              .in("id", branchIds);

            branches?.forEach((b: any) => {
              branchNameMap.set(b.id, b.name || "");
            });
          }

          (admissions as any[]).forEach((a) => {
            const horseData = a.horse_id ? stableHorseNameMap.get(a.horse_id) : null;
            const displayName = horseData
              ? (lang === "ar" ? (horseData.nameAr || horseData.name) : (horseData.name || horseData.nameAr))
              : "";
            boardingToHorse.set(a.id, {
              horseId: a.horse_id || "",
              horseName: displayName,
              branchName: branchNameMap.get(a.branch_id) || "",
            });
          });
        }
      }

      // 5. Build enriched data per entry
      for (const entry of entries) {
        if (!entry.reference_id) continue;

        const invoiceNumber = invoiceNumberMap.get(entry.reference_id);
        const items = itemsByInvoice.get(entry.reference_id) || [];

        // Group items by horse
        const horseGroupMap = new Map<string, EnrichedHorse>();
        const noHorseItems: string[] = [];

        for (const item of items) {
          if (item.entity_type === "lab_sample" && item.entity_id) {
            const resolved = sampleToHorse.get(item.entity_id);
            if (resolved && resolved.horseId) {
              const existing = horseGroupMap.get(resolved.horseId) || {
                horseId: resolved.horseId,
                horseName: resolved.horseName,
                samples: [],
                items: [],
                source: "lab" as const,
              };
              if (!existing.samples.some((s) => s.sampleLabel === resolved.sampleLabel)) {
                existing.samples.push({ sampleLabel: resolved.sampleLabel });
              }
              if (item.description) existing.items.push(item.description);
              horseGroupMap.set(resolved.horseId, existing);
            } else {
              if (item.description) noHorseItems.push(item.description);
            }
          } else if (item.entity_type === "boarding" && item.entity_id) {
            // Resolve boarding admission -> horse
            const resolved = boardingToHorse.get(item.entity_id);
            if (resolved && resolved.horseId) {
              const key = `boarding_${resolved.horseId}`;
              const existing = horseGroupMap.get(key) || {
                horseId: resolved.horseId,
                horseName: resolved.horseName,
                samples: [],
                items: [],
                source: "boarding" as const,
              };
              if (item.description) existing.items.push(item.description);
              horseGroupMap.set(key, existing);
            } else {
              if (item.description) noHorseItems.push(item.description);
            }
          } else {
            if (item.description) noHorseItems.push(item.description);
          }
        }

        const horses = Array.from(horseGroupMap.values());

        // Build items summary
        const allItemNames = items.map((i) => i.description).filter(Boolean);
        let itemsSummary = "";
        if (allItemNames.length <= 3) {
          itemsSummary = allItemNames.join(", ");
        } else {
          itemsSummary = `${allItemNames.slice(0, 3).join(", ")} (+${allItemNames.length - 3})`;
        }

        result.set(entry.id, {
          invoiceNumber: invoiceNumber || undefined,
          paymentMethod: entry.payment_method || undefined,
          horses,
          itemsSummary,
          isMultiHorse: horses.length > 1,
        });
      }

      return result;
    },
    enabled: referenceIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    enrichment: data || new Map<string, EnrichedStatementData>(),
    isEnriching: isLoading,
  };
}
