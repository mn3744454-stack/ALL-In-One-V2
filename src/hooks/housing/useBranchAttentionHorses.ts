import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { HORSE_LIFECYCLE_SELECT, type HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import {
  getHorseAdmissionEligibility,
  groupByHorseId,
  OPERATIONAL_OPEN_ADMISSION_STATUSES,
} from "@/lib/housing/eligibility";

/**
 * B2.3d-UI-S1 — Cross-tenant Needs Placement correction.
 *
 * Needs Placement is now sourced from `boarding_admissions` owned by the
 * hosting tenant (active or checkout_pending, unit_id IS NULL, branch-scoped)
 * so that owner-created hosted horses (e.g. Drama hosted by Al Qemmah) appear
 * here. Horse identity is resolved through the `horses` RLS path via the
 * embedded join; rows where the horse cannot be read by RLS are dropped.
 *
 * Needs Admission keeps its prior horses-table sourcing (branch-scoped,
 * tenant-owned). This avoids regressing the existing Needs Admission surface
 * while the cross-tenant admission case is handled in a later slice.
 *
 * Read-only: this hook does not mutate any data and does not change schema,
 * RLS, RPCs, or vw_horse_lifecycle_state.
 */
export interface BranchAttentionHorse {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
  lifecycle: HorseLifecycleState;
}

export function useBranchAttentionHorses(branchId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const query = useQuery({
    queryKey: ["branch-attention-horses", tenantId, branchId],
    enabled: !!tenantId && !!branchId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId || !branchId) return { needsPlacement: [], needsAdmission: [] };

      // ── Needs Placement: cross-tenant safe ──
      // Source from boarding_admissions (hosting tenant), then resolve horse
      // identity through the joined `horses` row (RLS-safe). Owner-created
      // hosted horses are visible because the admission lives in the hosting
      // tenant and B2.3d-RLS grants the hosting tenant SELECT on the horse.
      const { data: placementAdmissions, error: paErr } = await supabase
        .from("boarding_admissions")
        .select(
          "id, horse_id, branch_id, unit_id, status, horse:horses!horse_id(id, name, name_ar, avatar_url)"
        )
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId)
        .is("unit_id", null)
        .in("status", OPERATIONAL_OPEN_ADMISSION_STATUSES as unknown as string[]);
      if (paErr) throw paErr;

      // ── Needs Admission: preserved prior behavior (tenant-owned horses at
      // this branch with no active admission). Cross-tenant Needs Admission
      // remains a deferred residual.
      const { data: horses, error: horsesErr } = await supabase
        .from("horses")
        .select("id, name, name_ar, avatar_url, current_location_id, status")
        .eq("tenant_id", tenantId)
        .eq("current_location_id", branchId);
      if (horsesErr) throw horsesErr;

      const placementHorseIds = (placementAdmissions || [])
        .map((a: any) => a.horse?.id)
        .filter((id: string | undefined): id is string => !!id);
      const admissionHorseIds = (horses || []).map((h: any) => h.id);
      const allIds = Array.from(new Set([...placementHorseIds, ...admissionHorseIds]));

      let stateByHorse = new Map<string, HorseLifecycleState>();
      if (allIds.length > 0) {
        const { data: states, error: stateErr } = await supabase
          .from("vw_horse_lifecycle_state" as any)
          .select(HORSE_LIFECYCLE_SELECT)
          .in("horse_id", allIds);
        if (stateErr) throw stateErr;
        ((states as unknown as HorseLifecycleState[]) || []).forEach((s) =>
          stateByHorse.set(s.horse_id, s)
        );
      }

      // Build Needs Placement rows. Cross-check vw_horse_lifecycle_state when
      // a row is available; if the view row is missing (rare), trust the
      // admission predicate (status + unit_id IS NULL) rather than dropping
      // the horse silently.
      const needsPlacement: BranchAttentionHorse[] = [];
      const seenPlacement = new Set<string>();
      (placementAdmissions || []).forEach((a: any) => {
        const h = a.horse;
        if (!h?.id) return; // horse not readable via RLS — drop safely
        if (seenPlacement.has(h.id)) return;
        const lc = stateByHorse.get(h.id);
        if (lc && lc.needs_placement === false) return; // lifecycle disagrees
        seenPlacement.add(h.id);
        needsPlacement.push({
          id: h.id,
          name: h.name,
          name_ar: h.name_ar,
          avatar_url: h.avatar_url ?? null,
          lifecycle:
            lc ?? ({
              horse_id: h.id,
              tenant_id: null,
              open_admission_id: a.id,
              open_admission_status: a.status,
              needs_admission: false,
              needs_placement: true,
              is_temporarily_out: false,
              latest_movement_status: null,
              latest_movement_subtype: null,
              latest_movement_id: null,
              is_housed: false,
              is_in_transit: false,
              is_departed: false,
              departed_at: null,
              active_movement_id: null,
              active_movement_status: null,
              active_movement_subtype: null,
              latest_completed_movement_id: null,
              latest_completed_movement_status: null,
              latest_completed_movement_subtype: null,
              next_scheduled_movement_id: null,
              next_scheduled_movement_at: null,
              is_admission_draft: false,
            } as HorseLifecycleState),
        });
      });

      // Needs Admission: lifecycle-driven, branch-scoped, tenant-owned.
      // Phase 1.e.f.7.g.3 — defensively cross-check against the shared
      // eligibility contract so historical-only / departed / transferred-away
      // horses are never surfaced as branch Needs Admission even if a stale
      // view row ever disagreed.
      const needsAdmission: BranchAttentionHorse[] = [];
      (horses || []).forEach((h: any) => {
        const lc = stateByHorse.get(h.id);
        if (!lc) return;
        if (!lc.needs_admission) return;
        if (seenPlacement.has(h.id)) return;
        const eligibility = getHorseAdmissionEligibility({
          horse: { id: h.id, status: (h as any).status ?? null },
          admissions: [],
          occupants: [],
          lifecycle: lc,
        });
        if (!eligibility.isEligibleForNewAdmission) return;
        needsAdmission.push({
          id: h.id,
          name: h.name,
          name_ar: h.name_ar,
          avatar_url: h.avatar_url ?? null,
          lifecycle: lc,
        });
      });

      return { needsPlacement, needsAdmission };
    },
  });

  return {
    needsPlacementHorses: query.data?.needsPlacement ?? [],
    needsAdmissionHorses: query.data?.needsAdmission ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Phase 1.e.f.7.f.3 — Tenant-wide "Unassigned" Needs Admission bucket.
 * Phase 1.e.f.7.g.3 — Now driven by the shared Housing eligibility contract
 * (src/lib/housing/eligibility.ts) so historical-only / departed /
 * transferred-away horses are filtered out of this readiness surface.
 *
 * Restores visibility for local same-tenant horses that have no
 * `current_location_id` (no branch) and are eligible for a new admission.
 * Frontend-only; does not modify `vw_horse_lifecycle_state`.
 * Strict `horses.tenant_id = currentTenant` filter ensures connected/B2B
 * horses (owned by a different tenant) are never included.
 */
export interface UnassignedNeedsAdmissionHorse {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
}

export function useUnassignedNeedsAdmission() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const query = useQuery({
    queryKey: ["unassigned-needs-admission", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<UnassignedNeedsAdmissionHorse[]> => {
      if (!tenantId) return [];

      // Candidate local horses: tenant-owned, no branch.
      const { data: horses, error: hErr } = await supabase
        .from("horses")
        .select("id, name, name_ar, avatar_url, status")
        .eq("tenant_id", tenantId)
        .is("current_location_id", null);
      if (hErr) throw hErr;
      if (!horses || horses.length === 0) return [];

      const candidateIds = horses.map((h: any) => h.id);

      // Batch the same eligibility inputs the AdmissionWizard uses.
      const [admissionsRes, occupantsRes, lifecycleRes] = await Promise.all([
        supabase
          .from("boarding_admissions")
          .select("horse_id, status")
          .eq("tenant_id", tenantId)
          .in("horse_id", candidateIds),
        supabase
          .from("housing_unit_occupants")
          .select("horse_id, until")
          .eq("tenant_id", tenantId)
          .in("horse_id", candidateIds),
        supabase
          .from("vw_horse_lifecycle_state" as any)
          .select(HORSE_LIFECYCLE_SELECT)
          .in("horse_id", candidateIds),
      ]);
      if (admissionsRes.error) throw admissionsRes.error;
      if (occupantsRes.error) throw occupantsRes.error;
      if (lifecycleRes.error) throw lifecycleRes.error;

      const admissionsByHorse = groupByHorseId(
        (admissionsRes.data as Array<{ horse_id: string; status: string }>) ?? []
      );
      const occupantsByHorse = groupByHorseId(
        (occupantsRes.data as Array<{ horse_id: string; until: string | null }>) ?? []
      );
      const lifecycleByHorse = new Map<string, HorseLifecycleState>();
      ((lifecycleRes.data as unknown as HorseLifecycleState[]) || []).forEach((s) =>
        lifecycleByHorse.set(s.horse_id, s)
      );

      return (horses as any[])
        .filter((h) => {
          const eligibility = getHorseAdmissionEligibility({
            horse: { id: h.id, status: h.status ?? null },
            admissions: admissionsByHorse.get(h.id) ?? [],
            occupants: occupantsByHorse.get(h.id) ?? [],
            lifecycle: lifecycleByHorse.get(h.id) ?? null,
          });
          return eligibility.isEligibleForNewAdmission;
        })
        .map((h) => ({
          id: h.id,
          name: h.name,
          name_ar: h.name_ar ?? null,
          avatar_url: h.avatar_url ?? null,
        }));
    },
  });

  return {
    unassignedNeedsAdmission: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
