import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

/**
 * B2.4 — Owner Hosted Horses MVB.
 *
 * Returns curated, owner-safe summary rows for horses owned by the active
 * Horse Owner tenant that are (or were) hosted at other stable tenants.
 *
 * Backed by `public.get_owner_hosted_horses` (SECURITY DEFINER). The RPC
 * itself verifies the caller is an active member of the owner tenant.
 *
 * IMPORTANT (Skill 05 / Skill 19 boundary):
 * - This hook MUST NOT be used to surface unit/branch labels, lab results,
 *   vet notes, internal movements, or billing line items. The RPC does not
 *   return those fields; do not derive them client-side either.
 */
export interface OwnerHostedHorseRow {
  horse_id: string;
  horse_name: string;
  horse_name_ar: string | null;
  avatar_url: string | null;
  contract_id: string;
  contract_status: string;
  /** Owner-visible contract phase. */
  operational_phase: string;
  expected_arrival_at: string | null;
  admitted_at: string | null;
  checked_out_at: string | null;
  stable_tenant_id: string;
  stable_name: string;
  stable_name_ar: string | null;
  open_service_requests_count: number;
  last_owner_visible_update_at: string | null;
  visibility_source: string;
}

export function useOwnerHostedHorses() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const isOwnerTenant = activeTenant?.tenant?.type === "horse_owner";

  return useQuery({
    queryKey: ["owner-hosted-horses", tenantId],
    enabled: !!tenantId && isOwnerTenant,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OwnerHostedHorseRow[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase.rpc("get_owner_hosted_horses", {
        p_owner_tenant_id: tenantId,
      });
      if (error) throw error;
      return (data ?? []) as OwnerHostedHorseRow[];
    },
  });
}
