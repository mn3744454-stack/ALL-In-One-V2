import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  city?: string;
}

export function useLocations() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  // Fetch locations
  const {
    data: locations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['locations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as Location[];
    },
    enabled: !!tenantId,
  });

  // Active locations only
  const activeLocations = locations.filter(l => l.is_active);

  // Create location
  const createMutation = useMutation({
    mutationFn: async (data: CreateLocationData) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      const { data: newLocation, error } = await supabase
        .from('branches')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          address: data.address || null,
          city: data.city || null,
          is_active: true,
          is_demo: false,
        })
        .select()
        .single();

      if (error) throw error;
      return newLocation;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.toasts.locationCreated'));
      queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update location
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateLocationData>) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      const { data: updated, error } = await supabase
        .from('branches')
        .update({
          name: data.name,
          address: data.address,
          city: data.city,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.toasts.locationUpdated'));
      queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('branches')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.toasts.locationUpdated'));
      queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    locations,
    activeLocations,
    isLoading,
    error,
    canManage,
    createLocation: createMutation.mutateAsync,
    updateLocation: updateMutation.mutateAsync,
    toggleLocationActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
