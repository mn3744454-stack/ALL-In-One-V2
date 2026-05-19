import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Types
export interface HorseColor {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  is_seed: boolean;
  created_at: string;
}

export interface HorseBreed {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  is_seed: boolean;
  created_at: string;
}

export type DeleteMasterDataReason =
  | "deleted"
  | "used_by_horses"
  | "protected_seed"
  | "not_found"
  | "error";

export interface LinkedHorseRef {
  id: string;
  name: string;
  name_ar?: string | null;
}

export interface DeleteMasterDataResult {
  deleted: boolean;
  reason: DeleteMasterDataReason;
  used_count?: number;
  horses?: LinkedHorseRef[];
  error: Error | null;
}

export type UpdateMasterDataReason =
  | "updated"
  | "duplicate_name"
  | "invalid_name"
  | "not_found"
  | "error";

export interface UpdateMasterDataResult<T> {
  updated: boolean;
  reason: UpdateMasterDataReason;
  row?: T;
  error: Error | null;
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

export interface OwnerPhoneEntry {
  number: string;
  label: 'mobile' | 'work' | 'home' | 'other';
  is_whatsapp: boolean;
  is_primary: boolean;
}

export type OwnerType = 'individual' | 'organization';

export interface HorseOwner {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  /** Compatibility/derived field: mirrors the primary entry of `phones`. */
  phone: string | null;
  email: string | null;
  owner_type: OwnerType;
  phones: OwnerPhoneEntry[];
  representative_name: string | null;
  representative_name_ar: string | null;
  representative_title: string | null;
  representative_email: string | null;
  representative_phones: OwnerPhoneEntry[];
  created_at: string;
}

export interface CreateOwnerPayload {
  name: string;
  name_ar?: string | null;
  email?: string | null;
  owner_type?: OwnerType;
  phones?: OwnerPhoneEntry[];
  representative_name?: string | null;
  representative_name_ar?: string | null;
  representative_title?: string | null;
  representative_email?: string | null;
  representative_phones?: OwnerPhoneEntry[];
}

/** Returns the primary number from a phones array (or first entry, or null). */
export function getPrimaryPhoneNumber(phones: OwnerPhoneEntry[] | null | undefined): string | null {
  if (!phones || phones.length === 0) return null;
  const primary = phones.find((p) => p.is_primary && p.number?.trim());
  if (primary) return primary.number.trim();
  const first = phones.find((p) => p.number?.trim());
  return first ? first.number.trim() : null;
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
    return { data: data as unknown as HorseColor | null, error };
  };

  const createBreed = async (name: string, name_ar?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("horse_breeds" as any)
      .insert({ tenant_id: tenantId, name, name_ar: name_ar || null })
      .select()
      .single();
    if (!error) await fetchBreeds();
    return { data: data as unknown as HorseBreed | null, error };
  };

  const deleteBreed = async (id: string): Promise<DeleteMasterDataResult> => {
    try {
      const { data, error } = await supabase.rpc("delete_horse_breed" as any, { p_id: id });
      if (error) {
        return { deleted: false, reason: "error", error: error as unknown as Error };
      }
      const payload = (data ?? {}) as {
        deleted?: boolean;
        reason?: DeleteMasterDataReason;
        used_count?: number;
        horses?: LinkedHorseRef[];
      };
      const reason: DeleteMasterDataReason = payload.reason ?? "error";
      const deleted = !!payload.deleted;
      if (deleted || reason === "not_found") {
        await fetchBreeds();
      }
      return {
        deleted,
        reason,
        used_count: payload.used_count,
        horses: payload.horses,
        error: null,
      };
    } catch (err) {
      return { deleted: false, reason: "error", error: err as Error };
    }
  };

  const deleteColor = async (id: string): Promise<DeleteMasterDataResult> => {
    try {
      const { data, error } = await supabase.rpc("delete_horse_color" as any, { p_id: id });
      if (error) {
        return { deleted: false, reason: "error", error: error as unknown as Error };
      }
      const payload = (data ?? {}) as {
        deleted?: boolean;
        reason?: DeleteMasterDataReason;
        used_count?: number;
        horses?: LinkedHorseRef[];
      };
      const reason: DeleteMasterDataReason = payload.reason ?? "error";
      const deleted = !!payload.deleted;
      if (deleted || reason === "not_found") {
        await fetchColors();
      }
      return {
        deleted,
        reason,
        used_count: payload.used_count,
        horses: payload.horses,
        error: null,
      };
    } catch (err) {
      return { deleted: false, reason: "error", error: err as Error };
    }
  };

  const updateBreed = async (
    id: string,
    payload: { name: string; name_ar?: string | null }
  ): Promise<UpdateMasterDataResult<HorseBreed>> => {
    try {
      const { data, error } = await supabase.rpc("update_horse_breed" as any, {
        p_id: id,
        p_name: payload.name,
        p_name_ar: payload.name_ar ?? null,
      });
      if (error) {
        return { updated: false, reason: "error", error: error as unknown as Error };
      }
      const r = (data ?? {}) as { updated?: boolean; reason?: UpdateMasterDataReason; row?: HorseBreed };
      const reason: UpdateMasterDataReason = r.reason ?? "error";
      const updated = !!r.updated;
      if (updated || reason === "not_found") {
        await fetchBreeds();
      }
      return { updated, reason, row: r.row, error: null };
    } catch (err) {
      return { updated: false, reason: "error", error: err as Error };
    }
  };

  const updateColor = async (
    id: string,
    payload: { name: string; name_ar?: string | null }
  ): Promise<UpdateMasterDataResult<HorseColor>> => {
    try {
      const { data, error } = await supabase.rpc("update_horse_color" as any, {
        p_id: id,
        p_name: payload.name,
        p_name_ar: payload.name_ar ?? null,
      });
      if (error) {
        return { updated: false, reason: "error", error: error as unknown as Error };
      }
      const r = (data ?? {}) as { updated?: boolean; reason?: UpdateMasterDataReason; row?: HorseColor };
      const reason: UpdateMasterDataReason = r.reason ?? "error";
      const updated = !!r.updated;
      if (updated || reason === "not_found") {
        await fetchColors();
      }
      return { updated, reason, row: r.row, error: null };
    } catch (err) {
      return { updated: false, reason: "error", error: err as Error };
    }
  };

  const createBranch = async (name: string, address?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("branches" as any)
      .insert({ tenant_id: tenantId, name, address: address || null })
      .select()
      .single();
    if (!error) await fetchBranches();
    return { data: data as unknown as Branch | null, error };
  };

  const createStable = async (name: string, branch_id?: string) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };
    const { data, error } = await supabase
      .from("stables" as any)
      .insert({ tenant_id: tenantId, name, branch_id: branch_id || null })
      .select()
      .single();
    if (!error) await fetchStables();
    return { data: data as unknown as Stable | null, error };
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
    return { data: data as unknown as HousingUnit | null, error };
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
    return { data: data as unknown as Breeder | null, error };
  };

  /**
   * Create an owner. Accepts either a full payload object, or legacy positional
   * args (name, name_ar, phone, email) for back-compat with older callers.
   * Note: scalar `phone` is a derived compatibility field, mirrored from the
   * primary entry of `phones`.
   */
  const createOwner = async (
    nameOrPayload: string | CreateOwnerPayload,
    name_ar?: string,
    phone?: string,
    email?: string
  ) => {
    if (!tenantId) return { data: null, error: new Error("No active tenant") };

    const payload: CreateOwnerPayload =
      typeof nameOrPayload === "string"
        ? {
            name: nameOrPayload,
            name_ar: name_ar || null,
            email: email || null,
            phones: phone && phone.trim()
              ? [{ number: phone.trim(), label: "mobile", is_whatsapp: false, is_primary: true }]
              : [],
          }
        : nameOrPayload;

    const ownerPhones = (payload.phones || []).filter((p) => p.number?.trim());
    const repPhones = (payload.representative_phones || []).filter((p) => p.number?.trim());
    const scalarPhone = getPrimaryPhoneNumber(ownerPhones);

    const { data, error } = await supabase
      .from("horse_owners" as any)
      .insert({
        tenant_id: tenantId,
        name: payload.name,
        name_ar: payload.name_ar || null,
        phone: scalarPhone,
        email: payload.email || null,
        owner_type: payload.owner_type || "individual",
        phones: ownerPhones,
        representative_name: payload.representative_name || null,
        representative_name_ar: payload.representative_name_ar || null,
        representative_title: payload.representative_title || null,
        representative_email: payload.representative_email || null,
        representative_phones: repPhones,
      })
      .select()
      .single();
    if (!error) await fetchOwners();
    return { data: data as unknown as HorseOwner | null, error };
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
    deleteBreed,
    deleteColor,
    updateBreed,
    updateColor,
    createBranch,
    createStable,
    createHousingUnit,
    createBreeder,
    createOwner,
    fetchOwners,
    refresh: fetchAll,
  };
};
