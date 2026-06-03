/**
 * Phase B2 — Partner Eligibility Utility
 *
 * Centralizes which tenant types are eligible for a given partnership context,
 * and (critically) WHERE candidates should be sourced from.
 *
 * Two source modes:
 *  - tenant_search                   → ok to use search_tenants_for_partnership RPC.
 *                                      That RPC only surfaces is_public=true tenants OR
 *                                      tenants the caller is already a member of, so it
 *                                      cannot leak private Horse Owner tenants.
 *  - linked_clients_and_connections  → MUST NOT use search_tenants_for_partnership.
 *                                      Sourced from local clients.linked_tenant_id and
 *                                      accepted b2c connections only. Used for Horse
 *                                      Owner selection from a Stable, so privacy of
 *                                      Horse Owner workspaces is preserved.
 */

export type PartnerContext =
  | "general_partner"
  | "lab_request"
  | "horse_movement_destination"
  | "boarding_destination"
  | "boarding_owner_counterparty";

export type EligibilitySource = "tenant_search" | "linked_clients_and_connections";

export interface PartnerEligibility {
  tenantTypes: string[];
  source: EligibilitySource;
}

const ELIGIBILITY: Record<PartnerContext, PartnerEligibility> = {
  general_partner: {
    source: "tenant_search",
    tenantTypes: ["stable", "lab", "laboratory", "clinic", "doctor", "vet_clinic", "trainer"],
  },
  lab_request: {
    source: "tenant_search",
    tenantTypes: ["laboratory", "lab"],
  },
  horse_movement_destination: {
    source: "tenant_search",
    tenantTypes: ["stable", "clinic"],
  },
  // Used by Horse Owner selecting a Stable for a new Boarding Contract.
  boarding_destination: {
    source: "tenant_search",
    tenantTypes: ["stable"],
  },
  // Used by Stable selecting a Horse Owner counterparty.
  // MUST NOT be fed into search_tenants_for_partnership — Horse Owner workspaces
  // are private and must be sourced from local clients + accepted b2c connections.
  boarding_owner_counterparty: {
    source: "linked_clients_and_connections",
    tenantTypes: ["horse_owner"],
  },
};

/**
 * Contexts that exist conceptually but are deliberately NOT enabled in B2.
 * Kept here as documentation so future phases (B3, etc.) don't accidentally
 * reinvent them.
 *
 *  - provider_preference_lab     → B3 (Provider Preferences)
 *  - doctor_or_clinic_provider   → deferred
 *  - reproduction_provider       → Phase L+ (Scientific Reproduction)
 */
export const DEFERRED_CONTEXTS = [
  "provider_preference_lab",
  "doctor_or_clinic_provider",
  "reproduction_provider",
] as const;

export function getEligibleTenantTypes(ctx: PartnerContext): string[] {
  return ELIGIBILITY[ctx].tenantTypes;
}

export function getEligibilitySource(ctx: PartnerContext): EligibilitySource {
  return ELIGIBILITY[ctx].source;
}

export function getPartnerEligibility(ctx: PartnerContext): PartnerEligibility {
  return ELIGIBILITY[ctx];
}

/**
 * Guard for the Stable → Horse Owner discovery path.
 * Throws if a caller attempts to discover Horse Owner tenants via global tenant
 * search. Use this defensively in any new "owner picker" code.
 */
export function assertNotGlobalSearchForOwners(ctx: PartnerContext): void {
  if (ctx === "boarding_owner_counterparty") {
    throw new Error(
      "boarding_owner_counterparty must be sourced from linked clients and accepted b2c connections, not global tenant search",
    );
  }
}
