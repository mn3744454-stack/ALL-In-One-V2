/**
 * Phase 4 — Read/write hook for tenant notification governance.
 *
 * Reads via the `get_tenant_notification_governance` RPC (returns sensible
 * defaults when no row exists, so callers always have something to layer on).
 * Writes via `set_tenant_notification_governance` (owner/manager only — the
 * RPC enforces this; the UI also gates the write controls).
 *
 * This is the single client entry point for the governance row. The bell
 * list, sound gate, and the governance settings page all read from here, so
 * cache invalidation is centralised.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  DEFAULT_GOVERNANCE,
  type TenantGovernance,
} from "@/lib/notifications/policy";

interface RawGovernanceRow {
  tenant_id: string;
  default_preset: string;
  family_floor: TenantGovernance["family_floor"];
  suppress_self_actions: boolean;
  escalate_critical_to_leadership: boolean;
}

export function useTenantNotificationGovernance() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["tenant-notification-governance", tenantId];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantGovernance> => {
      if (!tenantId) return DEFAULT_GOVERNANCE;
      const { data, error } = await supabase.rpc(
        "get_tenant_notification_governance",
        { _tenant_id: tenantId } as never,
      );
      if (error) throw error;
      const row = (data as unknown as RawGovernanceRow[] | null)?.[0];
      if (!row) return DEFAULT_GOVERNANCE;
      return {
        default_preset: row.default_preset ?? "all",
        family_floor:
          (row.family_floor as TenantGovernance["family_floor"]) ?? {},
        suppress_self_actions: row.suppress_self_actions ?? true,
        escalate_critical_to_leadership:
          row.escalate_critical_to_leadership ?? true,
      };
    },
  });

  const update = useMutation({
    mutationFn: async (next: TenantGovernance) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.rpc(
        "set_tenant_notification_governance",
        {
          _tenant_id: tenantId,
          _default_preset: next.default_preset,
          _family_floor: next.family_floor as never,
          _suppress_self_actions: next.suppress_self_actions,
          _escalate_critical_to_leadership: next.escalate_critical_to_leadership,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    governance: data ?? DEFAULT_GOVERNANCE,
    isLoading,
    update: update.mutateAsync,
    isSaving: update.isPending,
  };
}
