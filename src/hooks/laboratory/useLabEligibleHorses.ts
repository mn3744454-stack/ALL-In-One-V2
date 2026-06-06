/**
 * B3b — Lab-eligible horses for the active stable tenant.
 *
 * Returns a deduplicated list of horses that the active stable tenant may
 * create a lab request for, with ownership / authorization context:
 *
 *   - "stable_owned"        : horses.tenant_id === activeTenantId
 *   - "hosted_owner_horse"  : horse is currently admitted at this stable
 *                             via boarding_admissions (not checked out)
 *   - "connected_access"    : visible only through connection_horse_access
 *
 * Reads piggyback on existing RLS:
 *   - horses RLS already exposes owned horses + connection_horse_access
 *     grantees + owner_tenant_id-scoped owner reads.
 *   - boarding_admissions RLS already exposes admissions for the stable
 *     tenant member.
 *
 * No new RPC, no schema change, no RLS change.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export type LabHorseOwnershipType =
  | "stable_owned"
  | "hosted_owner_horse"
  | "connected_access";

export interface LabEligibleHorse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  avatar_url?: string | null;
  passport_number?: string | null;
  microchip_number?: string | null;
  tenant_id: string;
  owner_tenant_id?: string | null;
  ownership_type: LabHorseOwnershipType;
  owner_label?: string | null;
  /** Most recent active boarding contract under this stable, if any. */
  contract_id?: string | null;
  /** True when an active (non-checked-out) admission exists for this stable. */
  has_active_admission: boolean;
}

interface RawHorse {
  id: string;
  tenant_id: string;
  owner_tenant_id: string | null;
  name: string;
  name_ar: string | null;
  gender: string;
  avatar_url: string | null;
  passport_number: string | null;
  microchip_number: string | null;
  owner_tenant?: { id: string; name: string | null; type: string | null } | null;
  home_tenant?: { id: string; name: string | null; type: string | null } | null;
}

export function useLabEligibleHorses() {
  const { activeTenant } = useTenant();
  const tenantId =
    activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;

  const horsesQuery = useQuery({
    queryKey: ["lab-eligible-horses", "horses", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<RawHorse[]> => {
      // RLS narrows this to: stable-owned + connection-granted + owner-owned visible.
      // We deliberately omit any `.eq("tenant_id", ...)` filter.
      const { data, error } = await supabase
        .from("horses")
        .select(
          `
          id, tenant_id, owner_tenant_id,
          name, name_ar, gender, avatar_url,
          passport_number, microchip_number,
          owner_tenant:tenants!horses_owner_tenant_id_fkey(id, name, type),
          home_tenant:tenants!horses_tenant_id_fkey(id, name, type)
        `,
        )
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as RawHorse[];
    },
  });

  const admissionsQuery = useQuery({
    queryKey: ["lab-eligible-horses", "admissions", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<
      Array<{ horse_id: string; contract_id: string | null }>
    > => {
      // Active admissions hosted by this stable tenant.
      const { data, error } = await supabase
        .from("boarding_admissions")
        .select("horse_id, contract_id, checked_out_at, status")
        .eq("tenant_id", tenantId!)
        .is("checked_out_at", null);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        horse_id: r.horse_id,
        contract_id: r.contract_id ?? null,
      }));
    },
  });

  const horses: LabEligibleHorse[] = useMemo(() => {
    const rawHorses = horsesQuery.data ?? [];
    const admissions = admissionsQuery.data ?? [];
    if (!tenantId) return [];

    const admissionByHorse = new Map<string, string | null>();
    for (const a of admissions) {
      // Keep first; admissions are scoped to this stable
      if (!admissionByHorse.has(a.horse_id)) {
        admissionByHorse.set(a.horse_id, a.contract_id);
      }
    }

    const seen = new Set<string>();
    const out: LabEligibleHorse[] = [];
    for (const h of rawHorses) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);

      const stableOwned = h.tenant_id === tenantId;
      const hasActiveAdmission = admissionByHorse.has(h.id);
      const ownerName =
        h.owner_tenant?.name ?? h.home_tenant?.name ?? null;

      let ownershipType: LabHorseOwnershipType;
      if (stableOwned) {
        ownershipType = "stable_owned";
      } else if (hasActiveAdmission) {
        ownershipType = "hosted_owner_horse";
      } else {
        ownershipType = "connected_access";
      }

      out.push({
        id: h.id,
        name: h.name,
        name_ar: h.name_ar,
        gender: h.gender,
        avatar_url: h.avatar_url,
        passport_number: h.passport_number,
        microchip_number: h.microchip_number,
        tenant_id: h.tenant_id,
        owner_tenant_id: h.owner_tenant_id,
        ownership_type: ownershipType,
        owner_label: stableOwned ? null : ownerName,
        contract_id: admissionByHorse.get(h.id) ?? null,
        has_active_admission: hasActiveAdmission,
      });
    }
    return out;
  }, [horsesQuery.data, admissionsQuery.data, tenantId]);

  return {
    horses,
    loading: horsesQuery.isLoading || admissionsQuery.isLoading,
    error: horsesQuery.error ?? admissionsQuery.error ?? null,
  };
}
