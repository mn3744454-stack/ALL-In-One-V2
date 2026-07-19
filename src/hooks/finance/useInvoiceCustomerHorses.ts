/**
 * Label 1 — Tenant-aware customer-horse resolver for Create Invoice.
 *
 * Laboratory issuers: reads `lab_horses` filtered by `party_horse_links`
 * (the same source Account Statement uses). Stable/general issuers: reads
 * `public.horses` filtered by an active `boarding_admissions` for the
 * selected customer (falls back to no horses when no admission exists).
 *
 * A null / empty `customerId` returns an empty list — invoice lines can
 * still be created against "no horse (client-level)".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveInvoiceCatalogSource } from "./useInvoiceCatalogSources";

export interface InvoiceCustomerHorse {
  id: string;
  name: string;
  name_ar: string | null;
  source: "lab_horses" | "horses";
}

interface Options {
  issuerTenantId: string | null | undefined;
  issuerTenantType: string | null | undefined;
  customerId: string | null | undefined;
}

export function useInvoiceCustomerHorses({
  issuerTenantId,
  issuerTenantType,
  customerId,
}: Options) {
  const source = resolveInvoiceCatalogSource(issuerTenantType);
  const enabled = !!issuerTenantId && !!customerId;

  return useQuery({
    queryKey: [
      "invoice-customer-horses",
      issuerTenantId,
      source,
      customerId ?? null,
    ],
    enabled,
    queryFn: async (): Promise<InvoiceCustomerHorse[]> => {
      if (!issuerTenantId || !customerId) return [];

      if (source === "lab_services") {
        // Lab issuer → junction-based lab_horses lookup
        const { data: links, error: linkErr } = await supabase
          .from("party_horse_links")
          .select("lab_horse_id")
          .eq("tenant_id", issuerTenantId)
          .eq("client_id", customerId);
        if (linkErr) throw linkErr;
        const ids = (links || []).map((l) => l.lab_horse_id);
        if (ids.length === 0) return [];
        const { data, error } = await supabase
          .from("lab_horses")
          .select("id, name, name_ar")
          .eq("tenant_id", issuerTenantId)
          .eq("is_archived", false)
          .in("id", ids)
          .order("name", { ascending: true });
        if (error) throw error;
        return (data || []).map((h) => ({
          id: h.id,
          name: h.name,
          name_ar: h.name_ar,
          source: "lab_horses" as const,
        }));
      }

      // Stable/general issuer → boarding_admissions link to public.horses
      const { data: admissions, error: admErr } = await supabase
        .from("boarding_admissions")
        .select("horse_id")
        .eq("tenant_id", issuerTenantId)
        .eq("client_id", customerId);
      if (admErr) throw admErr;
      const ids = Array.from(
        new Set(
          (admissions || [])
            .map((a) => a.horse_id)
            .filter((v): v is string => !!v),
        ),
      );
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("horses")
        .select("id, name, name_ar")
        .eq("tenant_id", issuerTenantId)
        .in("id", ids)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((h) => ({
        id: h.id,
        name: h.name,
        name_ar: h.name_ar,
        source: "horses" as const,
      }));
    },
  });
}
