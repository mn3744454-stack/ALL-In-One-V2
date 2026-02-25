import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface DoctorService {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  base_price: number;
  currency: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceData {
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  base_price?: number;
  currency?: string;
  category?: string;
  is_active?: boolean;
}

export interface UpdateServiceData extends Partial<CreateServiceData> {}

export function useDoctorServices(showInactive = false) {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["doctor-services", tenantId, showInactive],
    queryFn: async () => {
      let query = supabase
        .from("doctor_services" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name", { ascending: true });

      if (!showInactive) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DoctorService[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateServiceData) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: svc, error } = await supabase
        .from("doctor_services" as any)
        .insert({ tenant_id: tenantId, ...data })
        .select()
        .single();
      if (error) throw error;
      return svc as unknown as DoctorService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-services", tenantId] });
      toast.success("Service created");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create service"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateServiceData }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("doctor_services" as any)
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DoctorService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-services", tenantId] });
      toast.success("Service updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update service"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("doctor_services" as any)
        .update({ is_active })
        .eq("id", id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-services", tenantId] });
      toast.success(vars.is_active ? "Service activated" : "Service deactivated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to toggle service"),
  });

  return {
    services,
    loading: isLoading,
    createService: createMutation.mutateAsync,
    updateService: (id: string, updates: UpdateServiceData) => updateMutation.mutateAsync({ id, updates }),
    toggleActive: (id: string, is_active: boolean) => toggleActiveMutation.mutateAsync({ id, is_active }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
