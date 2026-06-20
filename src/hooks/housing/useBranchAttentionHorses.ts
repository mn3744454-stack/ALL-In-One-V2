import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { HORSE_LIFECYCLE_SELECT, type HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";

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
        .in("status", ["active", "checkout_pending"]);
      if (paErr) throw paErr;

      // ── Needs Admission: preserved prior behavior (tenant-owned horses at
      // this branch with no active admission). Cross-tenant Needs Admission
      // remains a deferred residual.
      const { data: horses, error: horsesErr } = await supabase
        .from("horses")
        .select("id, name, name_ar, avatar_url, current_location_id")
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

      // Needs Admission preserved: lifecycle-driven, branch-scoped, tenant-owned.
      const needsAdmission: BranchAttentionHorse[] = [];
      (horses || []).forEach((h: any) => {
        const lc = stateByHorse.get(h.id);
        if (!lc) return;
        if (!lc.needs_admission) return;
        // Do not duplicate a horse already shown in Needs Placement.
        if (seenPlacement.has(h.id)) return;
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
 *
 * Restores visibility for local same-tenant horses that have no
 * `current_location_id` (no branch) and no active admission. Frontend-only;
 * does not modify `vw_horse_lifecycle_state` (whose `needs_admission` predicate
 * intentionally excludes null-location horses to suppress B2B/owner-side
 * noise). Strict `horses.tenant_id = currentTenant` filter ensures connected/
 * B2B horses (owned by a different tenant) are never included.
 */
export interface UnassignedNeedsAdmissionHorse {
  id: string;
  name: string;
  name_ar: string | null;
  avatar_url: string | null;
}

const EXCLUDED_HORSE_STATUSES = [
  "archived",
  "sold",
  "deceased",
  "transferred",
  "inactive",
] as const;

const ACTIVE_LIKE_ADMISSION_STATUSES = ["draft", "active", "checkout_pending"] as const;

export function useUnassignedNeedsAdmission() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const query = useQuery({
    queryKey: ["unassigned-needs-admission", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async (): Promise<UnassignedNeedsAdmissionHorse[]> => {
      if (!tenantId) return [];

      // Candidate local horses: tenant-owned, active-ish, no branch.
      const { data: horses, error: hErr } = await supabase
        .from("horses")
        .select("id, name, name_ar, avatar_url, status")
        .eq("tenant_id", tenantId)
        .is("current_location_id", null);
      if (hErr) throw hErr;

      const candidates = (horses || []).filter(
        (h: any) =>
          !EXCLUDED_HORSE_STATUSES.includes(
            (h.status ?? "").toString().toLowerCase() as (typeof EXCLUDED_HORSE_STATUSES)[number]
          )
      );
      if (candidates.length === 0) return [];

      const candidateIds = candidates.map((h: any) => h.id);

      // Exclude any horse with an active-like admission in this tenant.
      const { data: admissions, error: aErr } = await supabase
        .from("boarding_admissions")
        .select("horse_id")
        .eq("tenant_id", tenantId)
        .in("horse_id", candidateIds)
        .in("status", ACTIVE_LIKE_ADMISSION_STATUSES as unknown as string[]);
      if (aErr) throw aErr;
      const admittedHorseIds = new Set(
        (admissions || []).map((a: any) => a.horse_id).filter(Boolean)
      );

      // Exclude any horse with an active occupancy row (defensive — should be
      // implied by the admission check, but cheap to verify).
      const { data: occupants, error: oErr } = await supabase
        .from("housing_unit_occupants")
        .select("horse_id")
        .eq("tenant_id", tenantId)
        .in("horse_id", candidateIds)
        .is("until", null);
      if (oErr) throw oErr;
      const housedHorseIds = new Set(
        (occupants || []).map((o: any) => o.horse_id).filter(Boolean)
      );

      return candidates
        .filter(
          (h: any) => !admittedHorseIds.has(h.id) && !housedHorseIds.has(h.id)
        )
        .map((h: any) => ({
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
