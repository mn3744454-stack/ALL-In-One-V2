import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DoctorConsultation {
  id: string;
  tenant_id: string;
  stable_tenant_id: string | null;
  patient_id: string;
  consultation_type: string;
  status: string;
  priority: string;
  scheduled_for: string | null;
  completed_at: string | null;
  chief_complaint: string | null;
  findings: string | null;
  diagnosis: string | null;
  recommendations: string | null;
  actual_cost: number | null;
  currency: string;
  horse_name_snapshot: string | null;
  horse_name_ar_snapshot: string | null;
  stable_name_snapshot: string | null;
  horse_snapshot: Record<string, unknown> | null;
  published_to_stable: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationFilters {
  status?: string;
  priority?: string;
  patientId?: string;
  search?: string;
}

export interface CreateConsultationData {
  patient_id: string;
  consultation_type?: string;
  status?: string;
  priority?: string;
  scheduled_for?: string;
  chief_complaint?: string;
  findings?: string;
  diagnosis?: string;
  recommendations?: string;
  actual_cost?: number;
  currency?: string;
}

export interface UpdateConsultationData extends Partial<CreateConsultationData> {
  completed_at?: string | null;
}

export function useConsultations(filters: ConsultationFilters = {}) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.tenant?.id;

  const { data: consultations = [], isLoading, error } = useQuery({
    queryKey: ["doctor-consultations", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("doctor_consultations" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.priority) query = query.eq("priority", filters.priority);
      if (filters.patientId) query = query.eq("patient_id", filters.patientId);
      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(`horse_name_snapshot.ilike.${s},chief_complaint.ilike.${s},diagnosis.ilike.${s}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DoctorConsultation[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateConsultationData) => {
      if (!tenantId || !user?.id) throw new Error("No tenant or user");
      const { data: consultation, error } = await supabase
        .from("doctor_consultations" as any)
        .insert({ tenant_id: tenantId, created_by: user.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return consultation as unknown as DoctorConsultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-consultations", tenantId] });
      toast.success("Consultation created");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create consultation"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateConsultationData }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("doctor_consultations" as any)
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DoctorConsultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-consultations", tenantId] });
      toast.success("Consultation updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update consultation"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("doctor_consultations" as any)
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-consultations", tenantId] });
      toast.success("Consultation deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete consultation"),
  });

  return {
    consultations,
    loading: isLoading,
    error,
    createConsultation: createMutation.mutateAsync,
    updateConsultation: (id: string, updates: UpdateConsultationData) => updateMutation.mutateAsync({ id, updates }),
    deleteConsultation: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

export function useConsultation(id?: string) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: consultation, isLoading, error } = useQuery({
    queryKey: ["doctor-consultation", tenantId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_consultations" as any)
        .select("*")
        .eq("id", id!)
        .eq("tenant_id", tenantId!)
        .single();
      if (error) throw error;
      return data as unknown as DoctorConsultation;
    },
    enabled: !!tenantId && !!id,
  });

  return { consultation, loading: isLoading, error };
}
