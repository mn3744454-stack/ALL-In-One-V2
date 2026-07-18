/**
 * Slice 2B — Client First Activity anchor.
 * Returns the earliest ledger_entries.created_at for the (tenant, client) pair.
 * Used by the scope selector to offer a one-tap "From First Activity" preset
 * and by the statement header to show the true financial history start.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { queryKeys } from "@/lib/queryKeys";

export interface ClientFirstActivity {
  firstActivityDate: string | null; // ISO date (yyyy-MM-dd) or null when no activity
  firstActivityAt: string | null;   // Full ISO timestamp
}

export function useClientFirstActivity(clientId?: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.clientFirstActivity(tenantId, clientId || undefined),
    queryFn: async (): Promise<ClientFirstActivity> => {
      if (!tenantId || !clientId) return { firstActivityDate: null, firstActivityAt: null };
      const { data: rows, error } = await supabase
        .from("ledger_entries")
        .select("created_at")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error || !rows || rows.length === 0) {
        return { firstActivityDate: null, firstActivityAt: null };
      }
      const at = rows[0].created_at as string;
      return {
        firstActivityDate: at ? at.slice(0, 10) : null,
        firstActivityAt: at ?? null,
      };
    },
    enabled: !!tenantId && !!clientId,
    staleTime: 60_000,
  });

  return {
    firstActivityDate: data?.firstActivityDate ?? null,
    firstActivityAt: data?.firstActivityAt ?? null,
    isLoading,
  };
}
