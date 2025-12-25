import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Types
export interface HorseColor {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  created_at: string;
}

export interface HorseBreed {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Stable {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  name: string;
  created_at: string;
}

export interface HousingUnit {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  stable_id: string | null;
  code: string;
  unit_type: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Breeder {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface HorseOwner {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export const useHorseMasterData = () => {
  const { activeTenant } = useTenant();
  const [colors, setColors] = useState<HorseColor[]>([]);
  const [breeds, setBreeds] = useState<HorseBreed[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stables, setStables] = useState<Stable[]>([]);
  const [housingUnits, setHousingUnits] = useState<HousingUnit[]>([]);
  const [breeders, setBreeders] = useState<Breeder[]>([]);
  const [owners, setOwners] = useState<HorseOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = activeTenant?.tenant_id;

  const fetchColors = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("horse_colors" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setColors(data as unknown as HorseColor[]);
  };

  const fetchBreeds = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("horse_breeds" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setBreeds(data as unknown as HorseBreed[]);
  };

  const fetchBranches = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("branches" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setBranches(data as unknown as Branch[]);
  };

  const fetchStables = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("stables" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setStables(data as unknown as Stable[]);
  };

  const fetchHousingUnits = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("housing_units" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("code");
    if (data) setHousingUnits(data as unknown as HousingUnit[]);
  };

  const fetchBreeders = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("breeders" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setBreeders(data as unknown as Breeder[]);
  };

  const fetchOwners = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("horse_owners" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name");
    if (data) setOwners(data as unknown as HorseOwner[]);
  };

  const fetchAll = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await Promise.all([
      fetchColors(),
      fetchBreeds(),
      fetchBranches(),
      fetchStables(),
      fetchHousingUnits(),
      fetchBreeders(),
      fetchOwners(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [tenantId]);

  // Create functions
  const createColor = async (name: string, name_ar?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("horse_colors" as any)
      .insert({ tenant_id: tenantId, name, name_ar: name_ar || null })
      .select()
      .single();
    if (!error) await fetchColors();
    return { data: data as HorseColor | null, error };
  };

  const createBreed = async (name: string, name_ar?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("horse_breeds" as any)
      .insert({ tenant_id: tenantId, name, name_ar: name_ar || null })
      .select()
      .single();
    if (!error) await fetchBreeds();
    return { data: data as HorseBreed | null, error };
  };

  const createBranch = async (name: string, address?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("branches" as any)
      .insert({ tenant_id: tenantId, name, address: address || null })
      .select()
      .single();
    if (!error) await fetchBranches();
    return { data: data as Branch | null, error };
  };

  const createStable = async (name: string, branch_id?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("stables" as any)
      .insert({ tenant_id: tenantId, name, branch_id: branch_id || null })
      .select()
      .single();
    if (!error) await fetchStables();
    return { data: data as Stable | null, error };
  };

  const createHousingUnit = async (
    code: string,
    unit_type: string = "stall",
    branch_id?: string,
    stable_id?: string
  ) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("housing_units" as any)
      .insert({
        tenant_id: tenantId,
        code,
        unit_type,
        branch_id: branch_id || null,
        stable_id: stable_id || null,
      })
      .select()
      .single();
    if (!error) await fetchHousingUnits();
    return { data: data as HousingUnit | null, error };
  };

  const createBreeder = async (
    name: string,
    name_ar?: string,
    phone?: string,
    email?: string
  ) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("breeders" as any)
      .insert({
        tenant_id: tenantId,
        name,
        name_ar: name_ar || null,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();
    if (!error) await fetchBreeders();
    return { data: data as Breeder | null, error };
  };

  const createOwner = async (
    name: string,
    name_ar?: string,
    phone?: string,
    email?: string
  ) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("horse_owners" as any)
      .insert({
        tenant_id: tenantId,
        name,
        name_ar: name_ar || null,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();
    if (!error) await fetchOwners();
    return { data: data as HorseOwner | null, error };
  };

  return {
    colors,
    breeds,
    branches,
    stables,
    housingUnits,
    breeders,
    owners,
    loading,
    createColor,
    createBreed,
    createBranch,
    createStable,
    createHousingUnit,
    createBreeder,
    createOwner,
    refresh: fetchAll,
  };
};
