/**
 * Residual Item 2 — Read/write hook for `tenant_role_preset_bindings`.
 *
 * Bindings act as a per-role override of the tenant's `default_preset` during
 * *initial* notification-preference seeding for a new member. They never
 * overwrite a user's later personal choice.
 *
 * Precedence on first-preference seeding:
 *   role binding (if matched) → tenant default_preset → hardcoded "all"
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import type { PresetId } from "@/lib/notifications/presets";

export interface TenantRolePresetBinding {
  id: string;
  tenant_id: string;
  role_key: string;
  preset_id: PresetId;
  created_at: string;
  created_by: string | null;
}

export function useTenantRolePresetBindings() {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant_id ?? null;
  const qc = useQueryClient();
  const queryKey = ["tenant-role-preset-bindings", tenantId];

  const { data: bindings = [], isLoading } = useQuery({
    queryKey,
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantRolePresetBinding[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_role_preset_bindings" as never)
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) {
        console.error("[role-preset-bindings] fetch error", error);
        return [];
      }
      return (data ?? []) as unknown as TenantRolePresetBinding[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { role_key: string; preset_id: PresetId }) => {
      if (!tenantId) throw new Error("No active tenant");
      const { error } = await supabase
        .from("tenant_role_preset_bindings" as never)
        .upsert(
          {
            tenant_id: tenantId,
            role_key: input.role_key,
            preset_id: input.preset_id,
          } as never,
          { onConflict: "tenant_id,role_key" } as never,
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_role_preset_bindings" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  /** Find the preset bound to a given role, if any. */
  const presetForRole = (roleKey: string | null | undefined): PresetId | null => {
    if (!roleKey) return null;
    const match = bindings.find((b) => b.role_key === roleKey);
    return (match?.preset_id as PresetId | undefined) ?? null;
  };

  return {
    bindings,
    isLoading,
    addBinding: add.mutateAsync,
    removeBinding: remove.mutateAsync,
    isMutating: add.isPending || remove.isPending,
    presetForRole,
  };
}
