import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface FacilityArea {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  branch?: {
    id: string;
    name: string;
  };
}

export interface CreateAreaData {
  branch_id: string;
  name: string;
  name_ar?: string;
  code?: string;
}

export function useFacilityAreas(branchId?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const {
    data: areas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['facility-areas', tenantId, branchId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('facility_areas')
        .select('*, branch:branches(id, name)')
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false })
        .order('name');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FacilityArea[];
    },
    enabled: !!tenantId,
  });

  const activeAreas = areas.filter(a => a.is_active);

  const createMutation = useMutation({
    mutationFn: async (data: CreateAreaData) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { data: newArea, error } = await supabase
        .from('facility_areas')
        .insert({
          tenant_id: tenantId,
          branch_id: data.branch_id,
          name: data.name,
          name_ar: data.name_ar || null,
          code: data.code || null,
          is_active: true,
          is_demo: false,
        })
        .select()
        .single();

      if (error) throw error;
      return newArea;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.created'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateAreaData>) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { data: updated, error } = await supabase
        .from('facility_areas')
        .update({
          name: data.name,
          name_ar: data.name_ar,
          code: data.code,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.updated'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('facility_areas')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.updated'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    areas,
    activeAreas,
    isLoading,
    error,
    canManage,
    createArea: createMutation.mutateAsync,
    updateArea: updateMutation.mutateAsync,
    toggleAreaActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
