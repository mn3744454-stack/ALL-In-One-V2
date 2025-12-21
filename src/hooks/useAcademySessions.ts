import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface AcademySession {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  location_text: string | null;
  start_at: string;
  end_at: string;
  capacity: number;
  price_display: string | null;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CreateSessionInput {
  title: string;
  description?: string;
  location_text?: string;
  start_at: string;
  end_at: string;
  capacity: number;
  price_display?: string;
  is_public?: boolean;
  is_active?: boolean;
}

export interface UpdateSessionInput extends Partial<CreateSessionInput> {
  id: string;
}

// Fetch all sessions for the active tenant (for management)
export const useAcademySessions = () => {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ["academy-sessions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("academy_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data as AcademySession[];
    },
    enabled: !!tenantId,
  });
};

// Fetch public active sessions for a tenant (for public page)
export const usePublicSessions = (tenantId: string | undefined) => {
  return useQuery({
    queryKey: ["public-sessions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from("academy_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_public", true)
        .eq("is_active", true)
        .gte("start_at", now)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data as AcademySession[];
    },
    enabled: !!tenantId,
  });
};

// Create a new session
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!tenantId) throw new Error("No active tenant");

      const { data, error } = await supabase
        .from("academy_sessions")
        .insert({
          tenant_id: tenantId,
          title: input.title,
          description: input.description || null,
          location_text: input.location_text || null,
          start_at: input.start_at,
          end_at: input.end_at,
          capacity: input.capacity,
          price_display: input.price_display || null,
          is_public: input.is_public ?? true,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-sessions", tenantId] });
      toast.success("Session created successfully");
    },
    onError: (error) => {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    },
  });
};

// Update a session
export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (input: UpdateSessionInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("academy_sessions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-sessions", tenantId] });
      toast.success("Session updated successfully");
    },
    onError: (error) => {
      console.error("Error updating session:", error);
      toast.error("Failed to update session");
    },
  });
};

// Delete a session
export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("academy_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-sessions", tenantId] });
      toast.success("Session deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    },
  });
};

// Toggle session active status
export const useToggleSessionActive = () => {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("academy_sessions")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["academy-sessions", tenantId] });
      toast.success(data.is_active ? "Session enabled" : "Session disabled");
    },
    onError: (error) => {
      console.error("Error toggling session:", error);
      toast.error("Failed to update session");
    },
  });
};
