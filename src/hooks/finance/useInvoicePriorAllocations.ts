import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { CLIENT_LEVEL_BUCKET_KEY } from "@/lib/finance/allocationDistribution";

/**
 * Composition of an invoice for the Payment Allocation Editor.
 *
 * "buckets" combine horse-scoped and client-level scopes into one flat list:
 *   - Horse buckets: key = horseId, kind = "horse"
 *   - Client-level bucket (optional): key = "__client__", kind = "client"
 *
 * `gross` is the sum of frozen invoice_items.total_price contributions.
 * `prior` is what previous payments have already assigned to that bucket
 * (payment_horse_allocations.amount for horses, payment_allocations.client_level_amount summed for client-level).
 * `remaining = max(0, gross - prior)`.
 *
 * The hook is the single canonical read-strategy for the editor.
 */

export type BucketKind = "horse" | "client";

export interface InvoiceBucket {
  key: string;
  kind: BucketKind;
  horseId?: string;
  labHorseId?: string;
  label: string;
  labelAr?: string | null;
  /**
   * Frozen gross amount = pretax + line tax, taken from
   * `invoice_items.line_gross_amount`. Backend validation
   * (`post_payment_session`) enforces per-bucket caps against this same
   * frozen sum, so it is the sole authority for allocation capacity.
   */
  gross: number;
  pretax: number;
  tax: number;
  prior: number;
  remaining: number;
}

export interface InvoiceCompositionSummary {
  buckets: InvoiceBucket[];
  hasHorseScoped: boolean;
  hasClientLevel: boolean;
  hasLabHorseOnly: boolean; // items with lab_horse_id and no horse_id
  hasUnsupportedLabHorse: boolean;
  distinctHorses: number;
  distinctLabHorses: number;
  grossTotal: number;
  pretaxTotal: number;
  taxTotal: number;
  priorTotal: number;
  remainingTotal: number;
}


export function useInvoicePriorAllocations(invoiceId?: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ["invoice-composition-with-prior", tenantId, invoiceId],
    enabled: !!tenantId && !!invoiceId,
    queryFn: async (): Promise<InvoiceCompositionSummary | null> => {
      if (!tenantId || !invoiceId) return null;

      const { data: items, error: itemsErr } = await supabase
        .from("invoice_items")
        .select(
          "id, description, total_price, line_pretax_amount, line_tax_amount, line_gross_amount, horse_id, lab_horse_id",
        )
        .eq("invoice_id", invoiceId);
      if (itemsErr) {
        console.error("useInvoicePriorAllocations items", itemsErr);
        return null;
      }

      type Row = {
        id: string;
        description: string;
        total_price: number;
        line_pretax_amount: number | string | null;
        line_tax_amount: number | string | null;
        line_gross_amount: number | string | null;
        horse_id: string | null;
        lab_horse_id: string | null;
      };
      const rows = (items ?? []) as Row[];

      // Aggregate GROSS per bucket key (frozen line_gross_amount is the
      // canonical financial authority). Pretax and tax are aggregated in
      // parallel purely for display inside the allocation editor.
      const grossByKey = new Map<string, number>();
      const pretaxByKey = new Map<string, number>();
      const taxByKey = new Map<string, number>();
      const horseIds = new Set<string>();
      const labHorseIds = new Set<string>();
      let hasClientLevel = false;
      let hasLabHorseOnly = false;

      for (const r of rows) {
        // Prefer frozen line_gross_amount. Fall back to total_price only for
        // pre-J1 legacy rows (identity check enforces gross = pretax + tax
        // on all rows written after the tax freeze).
        const gross =
          r.line_gross_amount != null
            ? Number(r.line_gross_amount)
            : Number(r.total_price) || 0;
        const pretax =
          r.line_pretax_amount != null
            ? Number(r.line_pretax_amount)
            : Number(r.total_price) || 0;
        const tax = r.line_tax_amount != null ? Number(r.line_tax_amount) : 0;
        if (gross <= 0) continue;
        const addTo = (map: Map<string, number>, key: string, v: number) =>
          map.set(key, (map.get(key) ?? 0) + v);
        if (r.horse_id) {
          horseIds.add(r.horse_id);
          addTo(grossByKey, r.horse_id, gross);
          addTo(pretaxByKey, r.horse_id, pretax);
          addTo(taxByKey, r.horse_id, tax);
        } else if (r.lab_horse_id) {
          labHorseIds.add(r.lab_horse_id);
          hasLabHorseOnly = true;
          const key = `lab:${r.lab_horse_id}`;
          addTo(grossByKey, key, gross);
          addTo(pretaxByKey, key, pretax);
          addTo(taxByKey, key, tax);
        } else {
          hasClientLevel = true;
          addTo(grossByKey, CLIENT_LEVEL_BUCKET_KEY, gross);
          addTo(pretaxByKey, CLIENT_LEVEL_BUCKET_KEY, pretax);
          addTo(taxByKey, CLIENT_LEVEL_BUCKET_KEY, tax);
        }
      }


      // Prior allocations from payment tables.
      const priorByKey = new Map<string, number>();
      const { data: prior, error: priorErr } = await supabase
        .from("payment_allocations")
        .select("id, client_level_amount, payment_horse_allocations(horse_id, amount)")
        .eq("tenant_id", tenantId)
        .eq("invoice_id", invoiceId);
      if (priorErr) {
        console.error("useInvoicePriorAllocations prior", priorErr);
      }
      for (const p of (prior ?? []) as Array<{
        client_level_amount: number | string;
        payment_horse_allocations: Array<{ horse_id: string; amount: number | string }> | null;
      }>) {
        const cl = Number(p.client_level_amount) || 0;
        if (cl > 0) {
          priorByKey.set(
            CLIENT_LEVEL_BUCKET_KEY,
            (priorByKey.get(CLIENT_LEVEL_BUCKET_KEY) ?? 0) + cl,
          );
        }
        for (const ha of p.payment_horse_allocations ?? []) {
          const amt = Number(ha.amount) || 0;
          if (amt > 0) {
            priorByKey.set(ha.horse_id, (priorByKey.get(ha.horse_id) ?? 0) + amt);
          }
        }
      }

      // Resolve horse names.
      const horseNameMap = new Map<string, { name: string; name_ar: string | null }>();
      if (horseIds.size > 0) {
        const { data: horses } = await supabase
          .from("horses")
          .select("id, name, name_ar")
          .in("id", Array.from(horseIds));
        for (const h of horses ?? []) {
          horseNameMap.set(h.id, {
            name: h.name ?? h.id.slice(0, 8),
            name_ar: h.name_ar ?? null,
          });
        }
      }
      const labHorseNameMap = new Map<string, { name: string; name_ar: string | null }>();
      if (labHorseIds.size > 0) {
        const { data: labs } = await supabase
          .from("lab_horses")
          .select("id, name, name_ar")
          .in("id", Array.from(labHorseIds));
        for (const h of labs ?? []) {
          labHorseNameMap.set(h.id, {
            name: h.name ?? h.id.slice(0, 8),
            name_ar: h.name_ar ?? null,
          });
        }
      }

      // Build buckets.
      const buckets: InvoiceBucket[] = [];
      // Horse buckets first, deterministic by name.
      const horseKeys = Array.from(horseIds).sort((a, b) => {
        const na = horseNameMap.get(a)?.name ?? a;
        const nb = horseNameMap.get(b)?.name ?? b;
        return na.localeCompare(nb);
      });
      for (const hid of horseKeys) {
        const gross = grossByKey.get(hid) ?? 0;
        const pretax = pretaxByKey.get(hid) ?? 0;
        const tax = taxByKey.get(hid) ?? 0;
        const prior = priorByKey.get(hid) ?? 0;
        const info = horseNameMap.get(hid);
        buckets.push({
          key: hid,
          kind: "horse",
          horseId: hid,
          label: info?.name ?? hid.slice(0, 8),
          labelAr: info?.name_ar ?? null,
          gross,
          pretax,
          tax,
          prior,
          remaining: Math.max(0, gross - prior),
        });
      }
      // Client-level bucket.
      if (hasClientLevel) {
        const gross = grossByKey.get(CLIENT_LEVEL_BUCKET_KEY) ?? 0;
        const pretax = pretaxByKey.get(CLIENT_LEVEL_BUCKET_KEY) ?? 0;
        const tax = taxByKey.get(CLIENT_LEVEL_BUCKET_KEY) ?? 0;
        const prior = priorByKey.get(CLIENT_LEVEL_BUCKET_KEY) ?? 0;
        buckets.push({
          key: CLIENT_LEVEL_BUCKET_KEY,
          kind: "client",
          label: "Client-Level",
          gross,
          pretax,
          tax,
          prior,
          remaining: Math.max(0, gross - prior),
        });
      }

      // Lab-horse-only: unsupported by RPC when combined with horse-scoped or multi-lab.
      const hasUnsupportedLabHorse =
        labHorseIds.size > 1 || (labHorseIds.size >= 1 && (horseIds.size > 0 || hasClientLevel));

      const grossTotal = Array.from(grossByKey.values()).reduce((s, v) => s + v, 0);
      const pretaxTotal = Array.from(pretaxByKey.values()).reduce((s, v) => s + v, 0);
      const taxTotal = Array.from(taxByKey.values()).reduce((s, v) => s + v, 0);
      const priorTotal = Array.from(priorByKey.values()).reduce((s, v) => s + v, 0);
      const remainingTotal = buckets.reduce((s, b) => s + b.remaining, 0);

      return {
        buckets,
        hasHorseScoped: horseIds.size > 0,
        hasClientLevel,
        hasLabHorseOnly,
        hasUnsupportedLabHorse,
        distinctHorses: horseIds.size,
        distinctLabHorses: labHorseIds.size,
        grossTotal,
        pretaxTotal,
        taxTotal,
        priorTotal,
        remainingTotal,
      };

    },
  });
}
