import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface Horse {
  id: string;
  tenant_id: string;
  name: string;
  gender: string;
  breed: string | null;
  color: string | null;
  birth_date: string | null;
  registration_number: string | null;
  microchip_number: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateHorseData {
  name: string;
  gender: "male" | "female";
  breed?: string;
  color?: string;
  birth_date?: string;
  registration_number?: string;
  microchip_number?: string;
  notes?: string;
}

export const useHorses = () => {
  const { activeTenant } = useTenant();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHorses = async () => {
    if (!activeTenant) {
      setHorses([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("horses")
      .select("*")
      .eq("tenant_id", activeTenant.tenant_id)
      .order("name");

    if (!error && data) {
      setHorses(data as Horse[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHorses();
  }, [activeTenant?.tenant_id]);

  const createHorse = async (horseData: CreateHorseData) => {
    if (!activeTenant) {
      return { data: null, error: new Error("No active tenant") };
    }

    const { data, error } = await supabase
      .from("horses")
      .insert({
        ...horseData,
        tenant_id: activeTenant.tenant_id,
      })
      .select()
      .single();

    if (!error) {
      await fetchHorses();
    }

    return { data: data as Horse | null, error };
  };

  const updateHorse = async (id: string, updates: Partial<CreateHorseData>) => {
    const { data, error } = await supabase
      .from("horses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error) {
      await fetchHorses();
    }

    return { data: data as Horse | null, error };
  };

  const deleteHorse = async (id: string) => {
    const { error } = await supabase
      .from("horses")
      .delete()
      .eq("id", id);

    if (!error) {
      await fetchHorses();
    }

    return { error };
  };

  return {
    horses,
    loading,
    createHorse,
    updateHorse,
    deleteHorse,
    refresh: fetchHorses,
  };
};
