import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface UnitOccupant {
  id: string;
  tenant_id: string;
  unit_id: string;
  horse_id: string;
  since: string;
  until: string | null;
  is_demo: boolean;
  created_at: string;
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
}

export function useUnitOccupants(unitId?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const {
    data: occupants = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['unit-occupants', tenantId, unitId],
    queryFn: async () => {
      if (!tenantId || !unitId) return [];

      const { data, error } = await supabase
        .from('housing_unit_occupants')
        .select(`
          *,
          horse:horses(id, name, name_ar, avatar_url)
        `)
        .eq('tenant_id', tenantId)
        .eq('unit_id', unitId)
        .is('until', null)
        .order('since', { ascending: false });

      if (error) throw error;
      return data as UnitOccupant[];
    },
    enabled: !!tenantId && !!unitId,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ unitId, horseId }: { unitId: string; horseId: string }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      // Close any existing assignment for this horse
      await supabase
        .from('housing_unit_occupants')
        .update({ until: new Date().toISOString() })
        .eq('horse_id', horseId)
        .eq('tenant_id', tenantId)
        .is('until', null);

      // Create new assignment
      const { data, error } = await supabase
        .from('housing_unit_occupants')
        .insert({
          tenant_id: tenantId,
          unit_id: unitId,
          horse_id: horseId,
          since: new Date().toISOString(),
          is_demo: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update horse's housing_unit_id
      await supabase
        .from('horses')
        .update({ housing_unit_id: unitId })
        .eq('id', horseId);

      return data;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.occupants.assigned'));
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const vacateMutation = useMutation({
    mutationFn: async ({ occupantId, horseId }: { occupantId: string; horseId: string }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('housing_unit_occupants')
        .update({ until: new Date().toISOString() })
        .eq('id', occupantId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Clear horse's housing_unit_id
      await supabase
        .from('horses')
        .update({ housing_unit_id: null })
        .eq('id', horseId);
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.occupants.vacated'));
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    occupants,
    isLoading,
    error,
    canManage,
    assignHorse: assignMutation.mutateAsync,
    vacateHorse: vacateMutation.mutateAsync,
    isAssigning: assignMutation.isPending,
    isVacating: vacateMutation.isPending,
  };
}
