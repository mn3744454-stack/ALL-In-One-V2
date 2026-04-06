import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  is_archived: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  name: string;
  name_ar?: string;
  address?: string;
  city?: string;
}

export function useLocations() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;
  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const { data: locations = [], isLoading, error } = useQuery({
    queryKey: ['locations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('branches').select('*').eq('tenant_id', tenantId)
        .order('is_active', { ascending: false }).order('name');
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!tenantId,
  });

  const activeLocations = locations.filter(l => l.is_active && !l.is_archived);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['locations', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['branch-overview-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateLocationData) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { data: newLocation, error } = await supabase
        .from('branches').insert({
          tenant_id: tenantId, name: data.name, name_ar: data.name_ar || null,
          address: data.address || null, city: data.city || null,
          is_active: true, is_demo: false,
        } as any).select().single();
      if (error) throw error;
      return newLocation;
    },
    onSuccess: () => { toast.success(tGlobal('movement.toasts.locationCreated')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateLocationData>) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { data: updated, error } = await supabase
        .from('branches').update({ name: data.name, name_ar: data.name_ar, address: data.address, city: data.city } as any)
        .eq('id', id).eq('tenant_id', tenantId).select().single();
      if (error) throw error;
      return updated;
    },
    onSuccess: () => { toast.success(tGlobal('movement.toasts.locationUpdated')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { error } = await supabase.from('branches').update({ is_active: isActive }).eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(tGlobal('movement.toasts.locationUpdated')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { error } = await supabase.from('branches')
        .update({ is_archived: true, is_active: false } as any)
        .eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      // Cascade: archive child facilities
      await supabase.from('facility_areas')
        .update({ is_archived: true, is_active: false } as any)
        .eq('branch_id', id).eq('tenant_id', tenantId);
      // Cascade: archive child units
      await supabase.from('housing_units')
        .update({ is_archived: true, is_active: false } as any)
        .eq('branch_id', id).eq('tenant_id', tenantId);
    },
    onSuccess: () => { toast.success(tGlobal('housing.lifecycle.archivedBadge')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { error } = await supabase.from('branches')
        .update({ is_archived: false, is_active: true } as any)
        .eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(tGlobal('movement.toasts.locationUpdated')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      const { error } = await supabase.from('branches').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(tGlobal('common.delete')); invalidateAll(); },
    onError: (error) => { toast.error(error.message); },
  });

  return {
    locations, activeLocations, isLoading, error, canManage,
    createLocation: createMutation.mutateAsync,
    updateLocation: updateMutation.mutateAsync,
    toggleLocationActive: toggleActiveMutation.mutateAsync,
    archiveLocation: archiveMutation.mutateAsync,
    restoreLocation: restoreMutation.mutateAsync,
    deleteLocation: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
