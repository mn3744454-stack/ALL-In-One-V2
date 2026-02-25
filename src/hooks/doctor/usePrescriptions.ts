import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface DoctorPrescription {
  id: string;
  tenant_id: string;
  consultation_id: string;
  medication_name: string;
  dose: string | null;
  frequency: string | null;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreatePrescriptionData {
  consultation_id: string;
  medication_name: string;
  dose?: string;
  frequency?: string;
  duration_days?: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
}

export function usePrescriptions(consultationId?: string) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["doctor-prescriptions", tenantId, consultationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_prescriptions" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("consultation_id", consultationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as DoctorPrescription[];
    },
    enabled: !!tenantId && !!consultationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePrescriptionData) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: rx, error } = await supabase
        .from("doctor_prescriptions" as any)
        .insert({ tenant_id: tenantId, ...data })
        .select()
        .single();
      if (error) throw error;
      return rx as unknown as DoctorPrescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions", tenantId, consultationId] });
      toast.success("Prescription added");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add prescription"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_prescriptions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions", tenantId, consultationId] });
      toast.success("Prescription removed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove prescription"),
  });

  return {
    prescriptions,
    loading: isLoading,
    createPrescription: createMutation.mutateAsync,
    deletePrescription: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
