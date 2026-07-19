/**
 * Label 1 — Tenant-aware invoice catalog adapter.
 *
 * Returns a single normalized shape for Create Invoice's "From Catalog"
 * picker, sourced from the correct table for the issuer tenant:
 *   - Laboratory tenants  → public.lab_services
 *   - Stable / general    → public.tenant_services
 *
 * Never creates a new catalog table. Never reads legacy
 * `lab_services.category` free-text as live truth; category identity comes
 * exclusively from `tenant_service_categories` via `category_id`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServiceCategories } from "@/hooks/finance/useServiceCategories";

export type InvoiceCatalogSource = "tenant_services" | "lab_services";

export interface InvoiceCatalogItem {
  id: string;
  serviceSource: InvoiceCatalogSource;
  tenantId: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryNameAr: string | null;
  unitPrice: number | null;
  currency: string | null;
  isTaxable: boolean;
  isActive: boolean;
}

interface Options {
  issuerTenantId: string | null | undefined;
  issuerTenantType: string | null | undefined;
}

const LAB_TENANT_TYPES = new Set(["lab"]);

export function resolveInvoiceCatalogSource(
  tenantType: string | null | undefined,
): InvoiceCatalogSource {
  if (tenantType && LAB_TENANT_TYPES.has(tenantType)) return "lab_services";
  return "tenant_services";
}

export function useInvoiceCatalogSources({
  issuerTenantId,
  issuerTenantType,
}: Options) {
  const source = resolveInvoiceCatalogSource(issuerTenantType);
  const { categories } = useServiceCategories(true);

  const query = useQuery({
    queryKey: ["invoice-catalog-sources", issuerTenantId, source],
    enabled: !!issuerTenantId,
    queryFn: async (): Promise<InvoiceCatalogItem[]> => {
      if (!issuerTenantId) return [];
      if (source === "lab_services") {
        const { data, error } = await supabase
          .from("lab_services")
          .select(
            "id, tenant_id, name, name_ar, description, category_id, price, currency, is_active",
          )
          .eq("tenant_id", issuerTenantId)
          .order("name", { ascending: true });
        if (error) throw error;
        return (data || []).map((row) => ({
          id: row.id,
          serviceSource: "lab_services" as const,
          tenantId: row.tenant_id,
          name: row.name,
          nameAr: row.name_ar,
          description: row.description,
          categoryId: row.category_id,
          categoryName: null,
          categoryNameAr: null,
          unitPrice: row.price != null ? Number(row.price) : null,
          currency: row.currency,
          isTaxable: true,
          isActive: row.is_active,
        }));
      }
      const { data, error } = await supabase
        .from("tenant_services")
        .select(
          "id, tenant_id, name, name_ar, description, category_id, unit_price, is_active, is_taxable",
        )
        .eq("tenant_id", issuerTenantId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        serviceSource: "tenant_services" as const,
        tenantId: row.tenant_id,
        name: row.name,
        nameAr: row.name_ar,
        description: row.description,
        categoryId: row.category_id ?? null,
        categoryName: null,
        categoryNameAr: null,
        unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
        currency: null,
        isTaxable: row.is_taxable !== false,
        isActive: row.is_active,
      }));
    },
  });

  // Enrich with live shared category names (client-side join).
  const items: InvoiceCatalogItem[] = (query.data ?? []).map((it) => {
    if (!it.categoryId) return it;
    const cat = categories.find((c) => c.id === it.categoryId);
    if (!cat) return it;
    return {
      ...it,
      categoryName: cat.name,
      categoryNameAr: cat.name_ar,
    };
  });

  const activeItems = items.filter((i) => i.isActive);

  return {
    source,
    items,
    activeItems,
    isLoading: query.isLoading,
  };
}
