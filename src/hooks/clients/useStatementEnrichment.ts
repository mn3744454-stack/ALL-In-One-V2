import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/i18n";
import type { StatementEntry } from "./useClientStatement";

export interface EnrichedHorse {
  horseId: string;
  horseName: string;
  samples: Array<{ sampleLabel: string }>;
  items: string[];
  /** Source domain: lab | boarding | breeding | vet | general */
  source?: "lab" | "boarding" | "breeding" | "vet" | "general";
}

export interface EnrichedStatementData {
  invoiceNumber?: string;
  paymentMethod?: string;
  horses: EnrichedHorse[];
  itemsSummary: string;
  isMultiHorse: boolean;
  /** Direct domain from invoice_items.domain (first non-null) */
  directDomain?: string;
  /** Structured boarding segment info for explicit statement display */
  boardingSegments?: Array<{
    periodStart: string;
    periodEnd: string;
    days: number;
    amount: number;
  }>;
}

/**
 * Batch-resolves structured enrichment data for statement entries.
 * Phase 1a: Uses direct invoice_items.horse_id + domain first,
 * falls back to legacy multi-hop resolution for historical rows.
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

      // 1. Batch fetch invoices (include subtotal + total_amount for tax proportioning)
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, subtotal, total_amount")
        .in("id", referenceIds);

      const invoiceNumberMap = new Map<string, string>();
      const invoiceTaxMultiplierMap = new Map<string, number>();
      invoices?.forEach((inv: any) => {
        invoiceNumberMap.set(inv.id, inv.invoice_number);
        // Compute tax multiplier: total_amount / subtotal
        // This lets us proportionally allocate tax to each boarding segment
        const subtotal = Number(inv.subtotal || 0);
        const total = Number(inv.total_amount || 0);
        if (subtotal > 0 && total > 0) {
          invoiceTaxMultiplierMap.set(inv.id, total / subtotal);
        }
      });

      // 2. Batch fetch invoice_items — now including horse_id, domain, period_start, period_end
      const { data: allItems } = await supabase
        .from("invoice_items" as any)
        .select("invoice_id, description, entity_type, entity_id, horse_id, domain, period_start, period_end, total_price, quantity")
        .in("invoice_id", referenceIds);

      const typedItems = (allItems || []) as unknown as Array<{
        invoice_id: string;
        description: string;
        entity_type: string | null;
        entity_id: string | null;
        horse_id: string | null;
        domain: string | null;
        period_start: string | null;
        period_end: string | null;
        total_price: number | null;
        quantity: number | null;
      }>;

      // Group items by invoice_id
      const itemsByInvoice = new Map<string, typeof typedItems>();
      typedItems.forEach((item) => {
        const list = itemsByInvoice.get(item.invoice_id) || [];
        list.push(item);
        itemsByInvoice.set(item.invoice_id, list);
      });

      // --- Collect IDs that need legacy multi-hop resolution ---
      // Only items WITHOUT direct horse_id need multi-hop
      const needsLegacyLab: string[] = [];
      const needsLegacyBoarding: string[] = [];
      const needsLegacyVet: string[] = [];

      for (const item of typedItems) {
        if (item.horse_id) continue; // Direct attribution available
        if (item.entity_type === "lab_sample" && item.entity_id) needsLegacyLab.push(item.entity_id);
        if (item.entity_type === "boarding" && item.entity_id) needsLegacyBoarding.push(item.entity_id);
        if (item.entity_type === "vet" && item.entity_id) needsLegacyVet.push(item.entity_id);
      }

      // --- Direct horse_id resolution: batch fetch horse names ---
      const directHorseIds = [...new Set(typedItems.map(i => i.horse_id).filter(Boolean))] as string[];
      const directHorseNameMap = new Map<string, { name: string; nameAr: string }>();
      if (directHorseIds.length > 0) {
        const { data: horses } = await supabase
          .from("horses")
          .select("id, name, name_ar")
          .in("id", directHorseIds);
        horses?.forEach((h: any) => {
          directHorseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" });
        });
      }

      // --- Legacy multi-hop: Lab samples ---
      const sampleToHorse = new Map<string, { horseId: string; horseName: string; sampleLabel: string }>();
      const uniqueLab = [...new Set(needsLegacyLab)];
      if (uniqueLab.length > 0) {
        const { data: samples } = await supabase
          .from("lab_samples")
          .select("id, daily_number, physical_sample_id, lab_horse_id")
          .in("id", uniqueLab);

        if (samples && samples.length > 0) {
          const horseIds = [...new Set((samples as any[]).map((s) => s.lab_horse_id).filter(Boolean))];
          const horseNameMap = new Map<string, { name: string; nameAr: string }>();
          if (horseIds.length > 0) {
            const { data: horses } = await supabase.from("lab_horses").select("id, name, name_ar").in("id", horseIds);
            horses?.forEach((h: any) => horseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" }));
          }
          (samples as any[]).forEach((s) => {
            const sLabel = s.daily_number ? `#${s.daily_number}` : s.physical_sample_id?.slice(0, 12) || "";
            const horseData = s.lab_horse_id ? horseNameMap.get(s.lab_horse_id) : null;
            const displayName = horseData
              ? (lang === "ar" ? (horseData.nameAr || horseData.name) : (horseData.name || horseData.nameAr))
              : "";
            sampleToHorse.set(s.id, { horseId: s.lab_horse_id || "", horseName: displayName, sampleLabel: sLabel });
          });
        }
      }

      // --- Legacy multi-hop: Boarding ---
      const boardingToHorse = new Map<string, { horseId: string; horseName: string; branchName: string }>();
      const uniqueBoarding = [...new Set(needsLegacyBoarding)];
      if (uniqueBoarding.length > 0) {
        const { data: admissions } = await supabase
          .from("boarding_admissions")
          .select("id, horse_id, branch_id")
          .in("id", uniqueBoarding);

        if (admissions && admissions.length > 0) {
          const stableHorseIds = [...new Set((admissions as any[]).map((a) => a.horse_id).filter(Boolean))];
          const branchIds = [...new Set((admissions as any[]).map((a) => a.branch_id).filter(Boolean))];
          const stableHorseNameMap = new Map<string, { name: string; nameAr: string }>();
          if (stableHorseIds.length > 0) {
            const { data: horses } = await supabase.from("horses").select("id, name, name_ar").in("id", stableHorseIds);
            horses?.forEach((h: any) => stableHorseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" }));
          }
          const branchNameMap = new Map<string, string>();
          if (branchIds.length > 0) {
            const { data: branches } = await supabase.from("branches").select("id, name").in("id", branchIds);
            branches?.forEach((b: any) => branchNameMap.set(b.id, b.name || ""));
          }
          (admissions as any[]).forEach((a) => {
            const horseData = a.horse_id ? stableHorseNameMap.get(a.horse_id) : null;
            const displayName = horseData
              ? (lang === "ar" ? (horseData.nameAr || horseData.name) : (horseData.name || horseData.nameAr))
              : "";
            boardingToHorse.set(a.id, { horseId: a.horse_id || "", horseName: displayName, branchName: branchNameMap.get(a.branch_id) || "" });
          });
        }
      }

      // --- Legacy multi-hop: Vet ---
      const vetToHorse = new Map<string, { horseId: string; horseName: string }>();
      const uniqueVet = [...new Set(needsLegacyVet)];
      if (uniqueVet.length > 0) {
        const { data: treatments } = await supabase.from("vet_treatments").select("id, horse_id").in("id", uniqueVet);
        const resolvedTreatmentIds = new Set((treatments || []).map((t: any) => t.id));
        const unresolvedIds = uniqueVet.filter(id => !resolvedTreatmentIds.has(id));
        let vaccinationRecords: any[] = [];
        if (unresolvedIds.length > 0) {
          const { data: vaccinations } = await supabase.from("horse_vaccinations").select("id, horse_id").in("id", unresolvedIds);
          vaccinationRecords = vaccinations || [];
        }
        const allVetRecords = [...(treatments || []) as any[], ...vaccinationRecords];
        const vetHorseIds = [...new Set(allVetRecords.map((r) => r.horse_id).filter(Boolean))];
        const vetHorseNameMap = new Map<string, { name: string; nameAr: string }>();
        if (vetHorseIds.length > 0) {
          const { data: horses } = await supabase.from("horses").select("id, name, name_ar").in("id", vetHorseIds);
          horses?.forEach((h: any) => vetHorseNameMap.set(h.id, { name: h.name || "", nameAr: h.name_ar || "" }));
        }
        allVetRecords.forEach((rec) => {
          const horseData = rec.horse_id ? vetHorseNameMap.get(rec.horse_id) : null;
          const displayName = horseData
            ? (lang === "ar" ? (horseData.nameAr || horseData.name) : (horseData.name || horseData.nameAr))
            : "";
          vetToHorse.set(rec.id, { horseId: rec.horse_id || "", horseName: displayName });
        });
      }

      // Helper to get display horse name from directHorseNameMap
      const getDirectHorseName = (horseId: string): string => {
        const d = directHorseNameMap.get(horseId);
        if (!d) return "";
        return lang === "ar" ? (d.nameAr || d.name) : (d.name || d.nameAr);
      };

      // 5. Build enriched data per entry
      for (const entry of entries) {
        if (!entry.reference_id) continue;

        const invoiceNumber = invoiceNumberMap.get(entry.reference_id);
        const items = itemsByInvoice.get(entry.reference_id) || [];

        // Determine direct domain from items
        const directDomains = items.map(i => i.domain).filter(Boolean);
        const directDomain = directDomains.length > 0 ? directDomains[0]! : undefined;

        // Group items by horse
        const horseGroupMap = new Map<string, EnrichedHorse>();
        const noHorseItems: string[] = [];

        for (const item of items) {
          const itemDomain = (item.domain || item.entity_type || "general") as EnrichedHorse["source"];

          // === Path A: Direct horse_id available ===
          if (item.horse_id) {
            const key = `${itemDomain}_${item.horse_id}`;
            const existing = horseGroupMap.get(key) || {
              horseId: item.horse_id,
              horseName: getDirectHorseName(item.horse_id),
              samples: [],
              items: [],
              source: (itemDomain === "lab" || itemDomain === "boarding" || itemDomain === "breeding" || itemDomain === "vet") ? itemDomain : undefined,
            };
            if (item.description) existing.items.push(item.description);
            horseGroupMap.set(key, existing);
            continue;
          }

          // === Path B: Legacy multi-hop resolution ===
          if (item.entity_type === "lab_sample" && item.entity_id) {
            const resolved = sampleToHorse.get(item.entity_id);
            if (resolved && resolved.horseId) {
              const existing = horseGroupMap.get(resolved.horseId) || {
                horseId: resolved.horseId, horseName: resolved.horseName,
                samples: [], items: [], source: "lab" as const,
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
            const resolved = boardingToHorse.get(item.entity_id);
            if (resolved && resolved.horseId) {
              const key = `boarding_${resolved.horseId}`;
              const existing = horseGroupMap.get(key) || {
                horseId: resolved.horseId, horseName: resolved.horseName,
                samples: [], items: [], source: "boarding" as const,
              };
              if (item.description) existing.items.push(item.description);
              horseGroupMap.set(key, existing);
            } else {
              if (item.description) noHorseItems.push(item.description);
            }
          } else if (item.entity_type === "breeding" && item.entity_id) {
            const key = `breeding_${item.entity_id}`;
            const existing = horseGroupMap.get(key) || {
              horseId: item.entity_id, horseName: "",
              samples: [], items: [], source: "breeding" as const,
            };
            if (item.description) existing.items.push(item.description);
            horseGroupMap.set(key, existing);
          } else if (item.entity_type === "vet" && item.entity_id) {
            const resolved = vetToHorse.get(item.entity_id);
            if (resolved && resolved.horseId) {
              const key = `vet_${resolved.horseId}`;
              const existing = horseGroupMap.get(key) || {
                horseId: resolved.horseId, horseName: resolved.horseName,
                samples: [], items: [], source: "vet" as const,
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

        // Collect structured boarding segments for explicit statement display
        // Apply tax multiplier so segment amounts are post-tax (matching ledger/cards)
        const taxMultiplier = invoiceTaxMultiplierMap.get(entry.reference_id!) || 1;
        const boardingSegments: EnrichedStatementData["boardingSegments"] = [];
        for (const item of items) {
          if ((item.domain === 'boarding' || item.entity_type === 'boarding') && item.period_start && item.period_end && (item.total_price || 0) > 0) {
            const preTaxAmount = item.total_price || 0;
            boardingSegments.push({
              periodStart: item.period_start,
              periodEnd: item.period_end,
              days: item.quantity || 0,
              amount: Math.round(preTaxAmount * taxMultiplier * 100) / 100,
            });
          }
        }

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
          directDomain,
          boardingSegments: boardingSegments.length > 0 ? boardingSegments : undefined,
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
