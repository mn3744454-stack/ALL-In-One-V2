import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface HorseSearchResult {
  id: string;
  name: string;
  name_ar: string | null;
  gender: string;
  microchip_number: string | null;
  passport_number: string | null;
  ueln: string | null;
  avatar_url: string | null;
  breed_data: { name: string } | null;
}

export const useHorseSearch = () => {
  const { activeTenant } = useTenant();
  const [results, setResults] = useState<HorseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !activeTenant?.tenant_id) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("horses")
        .select(`
          id,
          name,
          name_ar,
          gender,
          microchip_number,
          passport_number,
          ueln,
          avatar_url,
          breed_data:horse_breeds(name)
        `)
        .eq("tenant_id", activeTenant.tenant_id)
        .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,microchip_number.ilike.%${query}%,passport_number.ilike.%${query}%,ueln.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Error searching horses:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant_id]);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clear };
};
