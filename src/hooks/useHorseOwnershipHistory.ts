import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OwnershipHistoryEntry {
  id: string;
  horse_id: string;
  owner_id: string;
  ownership_percentage: number;
  is_primary: boolean;
  action: string;
  changed_at: string;
  changed_by: string | null;
  previous_percentage: number | null;
  notes: string | null;
  owner?: {
    name: string;
    name_ar: string | null;
  } | null;
}

export const useHorseOwnershipHistory = (horseId: string | undefined) => {
  const [history, setHistory] = useState<OwnershipHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!horseId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horse_ownership_history")
        .select(`
          *,
          owner:horse_owners(name, name_ar)
        `)
        .eq("horse_id", horseId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching ownership history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [horseId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refresh: fetchHistory };
};
