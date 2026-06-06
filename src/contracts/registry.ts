import type { ComponentType } from "react";
import type { useTenant } from "@/contexts/TenantContext";
import { BoardingContractsTab } from "./types/boarding/BoardingContractsTab";

type TenantCtx = ReturnType<typeof useTenant>;

/**
 * Frontend static registry for contract types (B2.5).
 *
 * This is the single source of truth for which contract type tabs render
 * inside /dashboard/contracts. It is intentionally frontend-only — there
 * is no DB-backed registry yet (deferred to "Contract Type Registry /
 * Administration" future phase).
 *
 * Only types with `implemented: true` are rendered as tabs. Unimplemented
 * types (Training, Reproduction, ...) MUST NOT appear here as fake
 * Coming-Soon entries — they belong to their own future phases.
 */
export type ContractTypeKey = "boarding";

export interface ContractTypeDefinition {
  /** Stable URL/storage key. Used in ?type=, view-preference key, etc. */
  key: ContractTypeKey;
  /** i18n key for the short tab label, e.g. "Boarding" / "إيواء". */
  labelKey: string;
  /** i18n key for the long "Boarding Contract" badge on individual rows. */
  badgeLabelKey: string;
  /** Whether this type has a real implementation today. */
  implemented: boolean;
  /** Lower = earlier in the tab strip. */
  order: number;
  /** Tab body component. */
  component: ComponentType;
  /**
   * Optional tenant-level gating. Default: visible to all tenants that can
   * see the Contracts module at all. Future phases may wire capability
   * flags here.
   */
  enabledForTenant?: (ctx: TenantContextValue) => boolean;
}

export const CONTRACT_TYPE_REGISTRY: ContractTypeDefinition[] = [
  {
    key: "boarding",
    labelKey: "contracts.types.boarding.label",
    badgeLabelKey: "contracts.types.boarding.badge",
    implemented: true,
    order: 10,
    component: BoardingContractsTab,
  },
  // Training, Reproduction, and any future types are intentionally NOT
  // listed here. They will be added when their tab implementations land.
];

/** How many primary tabs render inline before overflowing into "More". */
export const MAX_PRIMARY_TABS = 4;

export function getVisibleContractTypes(
  ctx: TenantContextValue,
): ContractTypeDefinition[] {
  return CONTRACT_TYPE_REGISTRY
    .filter((def) => def.implemented)
    .filter((def) => (def.enabledForTenant ? def.enabledForTenant(ctx) : true))
    .sort((a, b) => a.order - b.order);
}

export function resolveActiveContractType(
  visible: ContractTypeDefinition[],
  requested: string | null | undefined,
): ContractTypeDefinition | null {
  if (visible.length === 0) return null;
  if (requested) {
    const match = visible.find((d) => d.key === requested);
    if (match) return match;
  }
  return visible[0];
}
