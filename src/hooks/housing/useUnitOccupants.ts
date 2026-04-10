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

  /**
   * Orphan-only repair mutation.
   * Pre-validates that the horse has NO active admission before allowing removal.
   * This is NOT a normal vacate path — it is a constrained safety-net for legacy data.
   */
  const removeOrphanOccupantMutation = useMutation({
    mutationFn: async ({ occupantId, horseId }: { occupantId: string; horseId: string }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));
      if (!canManage) throw new Error('Insufficient permissions for orphan cleanup');

      // Pre-validate: horse must NOT have an active admission
      const { data: activeAdmission, error: admErr } = await supabase
        .from('boarding_admissions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .eq('status', 'active')
        .maybeSingle();

      if (admErr) throw admErr;
      if (activeAdmission) {
        throw new Error('Cannot remove: horse has an active admission. Use Move/Checkout instead.');
      }

      // Safe to close orphan occupancy row
      const { error } = await supabase
        .from('housing_unit_occupants')
        .update({ until: new Date().toISOString() })
        .eq('id', occupantId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.occupants.orphanRemoved'));
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['inline-facility-units', tenantId] });
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
    removeOrphanOccupant: removeOrphanOccupantMutation.mutateAsync,
    isRemovingOrphan: removeOrphanOccupantMutation.isPending,
  };
}
