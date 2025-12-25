import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { horseSchema, safeValidate } from "@/lib/validations";

interface Horse {
  id: string;
  tenant_id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  breed?: string | null;
  color?: string | null;
  breed_id?: string | null;
  color_id?: string | null;
  birth_date?: string | null;
  registration_number?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  age_category?: string | null;
  status?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
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

interface HorseFilters {
  search?: string;
  gender?: string;
  status?: string;
  breed_id?: string;
}

export const useHorses = (filters?: HorseFilters) => {
  const { activeTenant } = useTenant();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHorses = async () => {
    if (!activeTenant) {
      setHorses([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("horses")
      .select("*")
      .eq("tenant_id", activeTenant.tenant_id)
      .order("name");

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.gender && filters.gender !== "all") {
      query = query.eq("gender", filters.gender);
    }

    const { data, error } = await query;

    if (!error && data) {
      setHorses(data as Horse[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHorses();
  }, [activeTenant?.tenant_id, filters?.status, filters?.gender]);

  const createHorse = async (horseData: CreateHorseData) => {
    if (!activeTenant) {
      return { data: null, error: new Error("No active tenant") };
    }

    const validation = safeValidate(horseSchema, horseData);
    if (!validation.success) {
      return { data: null, error: new Error(validation.errors.join(", ")) };
    }

    const validatedData = validation.data;

    const { data, error } = await supabase
      .from("horses")
      .insert({
        name: validatedData.name,
        gender: validatedData.gender,
        breed: validatedData.breed || null,
        color: validatedData.color || null,
        birth_date: validatedData.birth_date || null,
        registration_number: validatedData.registration_number || null,
        microchip_number: validatedData.microchip_number || null,
        notes: validatedData.notes || null,
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
    const partialSchema = horseSchema.partial();
    const validation = safeValidate(partialSchema, updates);
    if (!validation.success) {
      return { data: null, error: new Error(validation.errors.join(", ")) };
    }

    const { data, error } = await supabase
      .from("horses")
      .update(validation.data)
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
