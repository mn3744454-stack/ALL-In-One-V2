/**
 * Slice 2 Correction 1 — Secure First Financial Activity.
 * Delegates to the `get_client_first_financial_activity` RPC which enforces
 * tenant membership, the `clients.statement.view` permission, and excludes
 * future-dated ledger rows plus draft/cancelled/voided invoice references.
 * The browser never queries `ledger_entries` directly for this anchor.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { queryKeys } from "@/lib/queryKeys";

export interface ClientFirstActivity {
  firstActivityDate: string | null; // yyyy-MM-dd
  firstActivityAt: string | null;   // ISO timestamp
}

export function useClientFirstActivity(clientId?: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.clientFirstActivity(tenantId, clientId || undefined),
    queryFn: async (): Promise<ClientFirstActivity> => {
      if (!tenantId || !clientId) {
        return { firstActivityDate: null, firstActivityAt: null };
      }
      const { data: at, error } = await supabase.rpc(
        "get_client_first_financial_activity" as any,
        { p_tenant_id: tenantId, p_client_id: clientId }
      );
      if (error || !at) {
        return { firstActivityDate: null, firstActivityAt: null };
      }
      const iso = String(at);
      return {
        firstActivityDate: iso ? iso.slice(0, 10) : null,
        firstActivityAt: iso,
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
