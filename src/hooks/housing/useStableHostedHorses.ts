import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { OPERATIONAL_OPEN_ADMISSION_STATUSES } from "@/lib/housing/eligibility";

/**
 * Phase 1.e.f.7.g.4.3.1 — Stable-side custody truth for "My Horses".
 *
 * Returns horses currently under this stable tenant's operational custody,
 * sourced from `boarding_admissions` where status is in
 * OPERATIONAL_OPEN_ADMISSION_STATUSES (active | checkout_pending).
 *
 * Includes connected/B2B incoming horses whose canonical `horses` row is
 * owned by the sender tenant — identity is resolved via snapshot fallback,
 * exactly like AdmissionsList. Never exposes sensitive fields beyond what
 * the admission already displays.
 */
export interface StableHostedHorseRow {
  admission_id: string;
  horse_id: string;
  status: 'active' | 'checkout_pending';
  admitted_at: string;
  name: string | null;
  name_ar: string | null;
  avatar_url: string | null;
  branch_id: string | null;
  branch_name: string | null;
  branch_name_ar: string | null;
  unit_code: string | null;
}

export function useStableHostedHorses() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? null;
  const isStableTenant = activeTenant?.tenant?.type !== "horse_owner";

  return useQuery({
    queryKey: ["stable-hosted-horses", tenantId],
    enabled: !!tenantId && isStableTenant,
    staleTime: 30_000,
    queryFn: async (): Promise<StableHostedHorseRow[]> => {
      if (!tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("boarding_admissions")
        .select(`
          id, horse_id, status, admitted_at,
          horse_name_snapshot, horse_name_ar_snapshot, horse_avatar_url_snapshot,
          horse:horses!horse_id(id, name, name_ar, avatar_url),
          branch:branches!branch_id(id, name, name_ar),
          unit:housing_units!unit_id(id, code)
        `)
        .eq("tenant_id", tenantId)
        .in("status", OPERATIONAL_OPEN_ADMISSION_STATUSES as unknown as string[])
        .order("admitted_at", { ascending: false });

      if (error) throw error;
      const rows = (data || []) as any[];
      return rows.map((a) => ({
        admission_id: a.id,
        horse_id: a.horse_id,
        status: a.status,
        admitted_at: a.admitted_at,
        name: a.horse?.name ?? a.horse_name_snapshot ?? null,
        name_ar: a.horse?.name_ar ?? a.horse_name_ar_snapshot ?? null,
        avatar_url: a.horse?.avatar_url ?? a.horse_avatar_url_snapshot ?? null,
        branch_id: a.branch?.id ?? null,
        branch_name: a.branch?.name ?? null,
        branch_name_ar: a.branch?.name_ar ?? null,
        unit_code: a.unit?.code ?? null,
      }));
    },
  });
}

/**
 * Phase 1.e.f.7.g.4.3.1 — Stable-side historical hosted horses.
 *
 * Returns horses previously hosted (checked_out) by this stable tenant.
 * Deduplicated by horse_id — most-recent checked_out admission per horse.
 * Excludes any horse that currently has an open admission in this tenant
 * (those belong in the Current tab).
 */
export function useStableHistoricalHostedHorses() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id ?? null;
  const isStableTenant = activeTenant?.tenant?.type !== "horse_owner";

  return useQuery({
    queryKey: ["stable-historical-hosted-horses", tenantId],
    enabled: !!tenantId && isStableTenant,
    staleTime: 30_000,
    queryFn: async (): Promise<StableHostedHorseRow[]> => {
      if (!tenantId) return [];

      // 1) horses with currently open admissions — to exclude from historical
      const { data: openRows, error: openErr } = await (supabase as any)
        .from("boarding_admissions")
        .select("horse_id")
        .eq("tenant_id", tenantId)
        .in("status", OPERATIONAL_OPEN_ADMISSION_STATUSES as unknown as string[]);
      if (openErr) throw openErr;
      const openSet = new Set<string>((openRows || []).map((r: any) => r.horse_id));

      // 2) all checked_out admissions, sorted newest first
      const { data, error } = await (supabase as any)
        .from("boarding_admissions")
        .select(`
          id, horse_id, status, admitted_at, checked_out_at,
          horse_name_snapshot, horse_name_ar_snapshot, horse_avatar_url_snapshot,
          horse:horses!horse_id(id, name, name_ar, avatar_url),
          branch:branches!branch_id(id, name, name_ar),
          unit:housing_units!unit_id(id, code)
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "checked_out")
        .order("checked_out_at", { ascending: false, nullsFirst: false })
        .order("admitted_at", { ascending: false });

      if (error) throw error;
      const rows = (data || []) as any[];

      // 3) dedupe by horse_id (keep newest), drop any horse with an open admission
      const seen = new Set<string>();
      const out: StableHostedHorseRow[] = [];
      for (const a of rows) {
        if (!a.horse_id) continue;
        if (openSet.has(a.horse_id)) continue;
        if (seen.has(a.horse_id)) continue;
        seen.add(a.horse_id);
        out.push({
          admission_id: a.id,
          horse_id: a.horse_id,
          status: a.status,
          admitted_at: a.admitted_at,
          name: a.horse?.name ?? a.horse_name_snapshot ?? null,
          name_ar: a.horse?.name_ar ?? a.horse_name_ar_snapshot ?? null,
          avatar_url: a.horse?.avatar_url ?? a.horse_avatar_url_snapshot ?? null,
          branch_id: a.branch?.id ?? null,
          branch_name: a.branch?.name ?? null,
          branch_name_ar: a.branch?.name_ar ?? null,
          unit_code: a.unit?.code ?? null,
        });
      }
      return out;
    },
  });
}
