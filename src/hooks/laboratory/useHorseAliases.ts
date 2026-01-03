import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface HorseAlias {
  id: string;
  tenant_id: string;
  horse_id: string;
  alias: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export function useHorseAliases(horseId?: string) {
  const [aliases, setAliases] = useState<HorseAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchAliases = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setAliases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("horse_aliases")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("created_at", { ascending: false });

      if (horseId) {
        query = query.eq("horse_id", horseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAliases((data || []) as HorseAlias[]);
    } catch (error) {
      console.error("Error fetching horse aliases:", error);
      toast.error("Failed to load aliases");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id, horseId]);

  useEffect(() => {
    fetchAliases();
  }, [fetchAliases]);

  // Local lookup for active alias by horse id
  const activeAliasMap = useMemo(() => {
    const map = new Map<string, HorseAlias>();
    for (const alias of aliases) {
      if (alias.is_active) {
        map.set(alias.horse_id, alias);
      }
    }
    return map;
  }, [aliases]);

  const getActiveAlias = useCallback((targetHorseId: string): HorseAlias | null => {
    return activeAliasMap.get(targetHorseId) || null;
  }, [activeAliasMap]);

  const setAlias = async (targetHorseId: string, aliasName: string): Promise<HorseAlias | null> => {
    if (!activeTenant?.tenant.id || !user?.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      // Step 1: Deactivate existing active alias for this horse
      await supabase
        .from("horse_aliases")
        .update({ is_active: false })
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("horse_id", targetHorseId)
        .eq("is_active", true);

      // Step 2: Insert new active alias
      const { data, error } = await supabase
        .from("horse_aliases")
        .insert({
          tenant_id: activeTenant.tenant.id,
          horse_id: targetHorseId,
          alias: aliasName,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === "23505" || error.message.includes("unique")) {
          toast.error("هذا الاسم مستخدم بالفعل داخل هذا الحساب");
          return null;
        }
        throw error;
      }

      toast.success("Alias set successfully");
      fetchAliases();
      return data as HorseAlias;
    } catch (error: unknown) {
      console.error("Error setting alias:", error);
      const message = error instanceof Error ? error.message : "Failed to set alias";
      toast.error(message);
      return null;
    }
  };

  const deactivateAlias = async (targetHorseId: string): Promise<boolean> => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return false;
    }

    try {
      const { error } = await supabase
        .from("horse_aliases")
        .update({ is_active: false })
        .eq("tenant_id", activeTenant.tenant.id)
        .eq("horse_id", targetHorseId)
        .eq("is_active", true);

      if (error) throw error;

      toast.success("Alias deactivated");
      fetchAliases();
      return true;
    } catch (error: unknown) {
      console.error("Error deactivating alias:", error);
      const message = error instanceof Error ? error.message : "Failed to deactivate alias";
      toast.error(message);
      return false;
    }
  };

  // Local lookup - no RPC call
  const getDisplayName = useCallback((
    targetHorseId: string,
    horseName: string,
    useAlias: boolean = false
  ): string => {
    if (!useAlias) return horseName;
    const activeAlias = activeAliasMap.get(targetHorseId);
    return activeAlias?.alias || horseName;
  }, [activeAliasMap]);

  return {
    aliases,
    loading,
    canManage,
    getActiveAlias,
    setAlias,
    deactivateAlias,
    getDisplayName,
    refresh: fetchAliases,
  };
}
