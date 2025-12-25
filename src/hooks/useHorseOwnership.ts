import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HorseOwnership {
  id: string;
  horse_id: string;
  owner_id: string;
  ownership_percentage: number;
  is_primary: boolean;
  created_at: string;
  owner?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
}

export const useHorseOwnership = (horseId?: string) => {
  const [ownerships, setOwnerships] = useState<HorseOwnership[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOwnerships = useCallback(async () => {
    if (!horseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("horse_ownership" as any)
      .select(`
        *,
        owner:horse_owners(id, name, name_ar)
      `)
      .eq("horse_id", horseId);
    
    if (!error && data) {
      setOwnerships(data as unknown as HorseOwnership[]);
    }
    setLoading(false);
  }, [horseId]);

  const addOwnership = async (
    horse_id: string,
    owner_id: string,
    ownership_percentage: number,
    is_primary: boolean = false
  ) => {
    const { data, error } = await supabase
      .from("horse_ownership" as any)
      .insert({
        horse_id,
        owner_id,
        ownership_percentage,
        is_primary,
      })
      .select()
      .single();
    
    if (!error) {
      await fetchOwnerships();
    }
    return { data: data as unknown as HorseOwnership | null, error };
  };

  const updateOwnership = async (
    id: string,
    updates: Partial<{
      ownership_percentage: number;
      is_primary: boolean;
    }>
  ) => {
    const { data, error } = await supabase
      .from("horse_ownership" as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (!error) {
      await fetchOwnerships();
    }
    return { data: data as unknown as HorseOwnership | null, error };
  };

  const removeOwnership = async (id: string) => {
    const { error } = await supabase
      .from("horse_ownership" as any)
      .delete()
      .eq("id", id);
    
    if (!error) {
      await fetchOwnerships();
    }
    return { error };
  };

  const getTotalPercentage = () => {
    return ownerships.reduce((sum, o) => sum + Number(o.ownership_percentage), 0);
  };

  const hasPrimaryOwner = () => {
    return ownerships.some((o) => o.is_primary);
  };

  const getPrimaryOwnerCount = () => {
    return ownerships.filter((o) => o.is_primary).length;
  };

  return {
    ownerships,
    loading,
    fetchOwnerships,
    addOwnership,
    updateOwnership,
    removeOwnership,
    getTotalPercentage,
    hasPrimaryOwner,
    getPrimaryOwnerCount,
  };
};
