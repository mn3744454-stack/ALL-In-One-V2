import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { horseSchema, horseSchemaBase, safeValidate } from "@/lib/validations";

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
  breed_data?: { name: string | null; name_ar: string | null } | null;
  color_data?: { name: string | null; name_ar: string | null } | null;
  birth_date?: string | null;
  birth_at?: string | null;
  registration_number?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
  age_category?: string | null;
  status?: string | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
  current_location_id?: string | null;
  current_area_id?: string | null;
  housing_unit_id?: string | null;
  mother_id?: string | null;
  mother_name?: string | null;
  father_id?: string | null;
  father_name?: string | null;
  /** PostgREST embed: horse_ownership(count) — may be number or [{count}] */
  owners_count?: number | { count: number }[] | { count: number } | null;
  /**
   * Phase 1.e.f.7.c: actual ownership rows for the list owner column.
   * Detail surfaces continue to use `useHorseOwnership` directly.
   */
  owners?: Array<{
    is_primary: boolean | null;
    ownership_percentage: number | null;
    created_at: string | null;
    owner: { id: string; name: string | null; name_ar: string | null } | null;
  }> | null;
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

/**
 * AD-1 Pass 2-G: Horse list is now backed by TanStack Query keyed
 * `['horses', tenantId]` so the canonical Housing invalidation map
 * (`useHousingInvalidation` → 'horses' under occupancy/admission/movement)
 * and the realtime sync layer (`useTenantRealtimeSync`) actually refresh
 * every consumer (RecordMovementDialog, useEligibleHorses, profile lists,
 * etc.) after movement / placement / admission mutations.
 *
 * Public return shape preserved. Status/gender filtering remains
 * client-side over the single tenant-scoped cache so we don't fragment
 * the cache key family.
 */
export const useHorses = (filters?: HorseFilters) => {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;

  const query = useQuery({
    queryKey: ["horses", tenantId],
    queryFn: async (): Promise<Horse[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("horses")
        .select(`
          *,
          breed_data:horse_breeds!breed_id(name, name_ar),
          color_data:horse_colors!color_id(name, name_ar),
          owners_count:horse_ownership(count),
          owners:horse_ownership(
            is_primary,
            ownership_percentage,
            created_at,
            owner:horse_owners(id, name, name_ar)
          )
        `)
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Horse[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const horses = useMemo(() => {
    let list = query.data ?? [];
    if (filters?.status && filters.status !== "all") {
      list = list.filter((h) => h.status === filters.status);
    }
    if (filters?.gender && filters.gender !== "all") {
      list = list.filter((h) => h.gender === filters.gender);
    }
    return list;
  }, [query.data, filters?.status, filters?.gender]);

  const invalidateHorses = () =>
    queryClient.invalidateQueries({ queryKey: ["horses", tenantId] });

  const createMutation = useMutation({
    mutationFn: async (horseData: CreateHorseData) => {
      if (!tenantId) throw new Error("No active tenant");
      const validation = safeValidate(horseSchema, horseData);
      if (!validation.success) throw new Error(validation.errors.join(", "));
      const v = validation.data;
      const { data, error } = await supabase
        .from("horses")
        .insert({
          name: v.name,
          gender: v.gender,
          breed: v.breed || null,
          color: v.color || null,
          birth_date: v.birth_date || null,
          registration_number: v.registration_number || null,
          microchip_number: v.microchip_number || null,
          notes: v.notes || null,
          tenant_id: tenantId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Horse;
    },
    onSuccess: () => invalidateHorses(),
  });

  const createHorse = async (horseData: CreateHorseData) => {
    try {
      const data = await createMutation.mutateAsync(horseData);
      return { data, error: null as Error | null };
    } catch (e) {
      return { data: null as Horse | null, error: e as Error };
    }
  };

  const updateHorse = async (id: string, updates: Partial<CreateHorseData>) => {
    const partialSchema = horseSchemaBase.partial();
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
    if (!error) await invalidateHorses();
    return { data: data as Horse | null, error };
  };

  const deleteHorse = async (id: string) => {
    const { error } = await supabase.from("horses").delete().eq("id", id);
    if (!error) await invalidateHorses();
    return { error };
  };

  return {
    horses,
    loading: query.isLoading,
    createHorse,
    updateHorse,
    deleteHorse,
    refresh: invalidateHorses,
  };
};
