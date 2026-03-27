import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

/**
 * Fetches a supplier_payable linked to a specific source record
 * (e.g., source_type='vet_treatment', source_reference=treatmentId).
 * Used to show provider cost reference in billing dialogs.
 */
export function useSupplierPayableForSource(sourceType: string, sourceId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: payable } = useQuery({
    queryKey: ["supplier-payable-for-source", tenantId, sourceType, sourceId],
    queryFn: async () => {
      if (!tenantId || !sourceId) return null;
      const { data, error } = await supabase
        .from("supplier_payables")
        .select("id, supplier_name, amount, currency, status")
        .eq("tenant_id", tenantId)
        .eq("source_type", sourceType)
        .eq("source_reference", sourceId)
        .maybeSingle();
      if (error) {
        console.error("useSupplierPayableForSource:", error);
        return null;
      }
      return data;
    },
    enabled: !!tenantId && !!sourceId,
    staleTime: 30_000,
  });

  return { payable: payable ?? null };
}
