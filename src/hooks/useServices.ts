import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface TenantService {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  service_type: string | null;
  price_display: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  service_type?: string;
  price_display?: string;
  is_active?: boolean;
  is_public?: boolean;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}

export const useServices = () => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantService[];
    },
    enabled: !!tenantId,
  });
};

export const usePublicServices = (tenantId: string | undefined) => {
  return useQuery({
    queryKey: ["public-services", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantService[];
    },
    enabled: !!tenantId,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      if (!tenantId) throw new Error("No active tenant");

      const { data, error } = await supabase
        .from("tenant_services")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          description: input.description || null,
          service_type: input.service_type || null,
          price_display: input.price_display || null,
          is_active: input.is_active ?? true,
          is_public: input.is_public ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success("Service created successfully");
    },
    onError: (error) => {
      console.error("Error creating service:", error);
      toast.error("Failed to create service");
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (input: UpdateServiceInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("tenant_services")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success("Service updated successfully");
    },
    onError: (error) => {
      console.error("Error updating service:", error);
      toast.error("Failed to update service");
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from("tenant_services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success("Service deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting service:", error);
      toast.error("Failed to delete service");
    },
  });
};

export const useToggleServiceActive = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("tenant_services")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast.success(data.is_active ? "Service enabled" : "Service disabled");
    },
    onError: (error) => {
      console.error("Error toggling service:", error);
      toast.error("Failed to update service");
    },
  });
};
