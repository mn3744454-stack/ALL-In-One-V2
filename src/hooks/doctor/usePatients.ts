import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DoctorPatient {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  gender: string | null;
  approx_age: string | null;
  breed_text: string | null;
  color_text: string | null;
  microchip_number: string | null;
  passport_number: string | null;
  ueln: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  stable_name: string | null;
  linked_horse_id: string | null;
  source: string;
  notes: string | null;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientFilters {
  search?: string;
  includeArchived?: boolean;
}

export interface CreatePatientData {
  name: string;
  name_ar?: string;
  gender?: string;
  approx_age?: string;
  breed_text?: string;
  color_text?: string;
  microchip_number?: string;
  passport_number?: string;
  ueln?: string;
  owner_name?: string;
  owner_phone?: string;
  stable_name?: string;
  notes?: string;
  linked_horse_id?: string;
  source?: string;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
  is_archived?: boolean;
}

export function usePatients(filters: PatientFilters = {}) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant?.id;

  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ["doctor-patients", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("doctor_patients" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name", { ascending: true });

      if (!filters.includeArchived) {
        query = query.eq("is_archived", false);
      }

      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(
          `name.ilike.${s},microchip_number.ilike.${s},owner_name.ilike.${s},owner_phone.ilike.${s}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DoctorPatient[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePatientData) => {
      if (!tenantId || !user?.id) throw new Error("No tenant or user");
      const { data: patient, error } = await supabase
        .from("doctor_patients" as any)
        .insert({ tenant_id: tenantId, created_by: user.id, source: data.source || "manual", ...data })
        .select()
        .single();
      if (error) throw error;
      return patient as unknown as DoctorPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients", tenantId] });
      toast.success("Patient registered successfully");
    },
    onError: (err: Error) => {
      if (err.message?.includes("uq_doctor_patients_tenant_microchip")) {
        toast.error("A patient with this microchip already exists");
      } else {
        toast.error(err.message || "Failed to register patient");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdatePatientData }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("doctor_patients" as any)
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DoctorPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients", tenantId] });
      toast.success("Patient updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update patient"),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("doctor_patients" as any)
        .update({ is_archived: archived })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients", tenantId] });
      toast.success(vars.archived ? "Patient archived" : "Patient restored");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to archive patient"),
  });

  return {
    patients,
    loading: isLoading,
    error,
    createPatient: createMutation.mutateAsync,
    updatePatient: (id: string, updates: UpdatePatientData) => updateMutation.mutateAsync({ id, updates }),
    archivePatient: (id: string, archived = true) => archiveMutation.mutateAsync({ id, archived }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
