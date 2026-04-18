import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { tGlobal } from '@/i18n';
import { useHousingInvalidation } from './useHousingInvalidation';

interface InternalMoveParams {
  horseId: string;
  admissionId: string;
  fromUnitId: string | null;
  fromAreaId: string | null;
  toUnitId: string;
  toAreaId: string;
  toBranchId: string;
}

/**
 * Mutation for internal unit reassignment within an existing admission.
 * 1. Calls the movement RPC (physical occupancy ledger update)
 * 2. Updates boarding_admissions.unit_id and area_id AFTER RPC success
 */
export function useInternalMove() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;
  const { invalidate } = useHousingInvalidation();

  const mutation = useMutation({
    mutationFn: async (params: InternalMoveParams) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      // Step 1: Call movement RPC for physical occupancy update
      const { error: mvError } = await supabase.rpc(
        'record_horse_movement_with_housing',
        {
          p_tenant_id: tenantId,
          p_horse_id: params.horseId,
          p_movement_type: 'transfer',
          p_from_location_id: params.toBranchId,
          p_to_location_id: params.toBranchId,
          p_from_area_id: params.fromAreaId || null,
          p_from_unit_id: params.fromUnitId || null,
          p_to_area_id: params.toAreaId,
          p_to_unit_id: params.toUnitId,
          p_movement_at: new Date().toISOString(),
          p_reason: 'Internal unit reassignment',
          p_notes: null,
          p_internal_location_note: null,
          p_is_demo: false,
          p_clear_housing: false,
          p_destination_type: 'internal',
          p_from_external_location_id: null,
          p_to_external_location_id: null,
          p_movement_status: 'completed',
        }
      );

      if (mvError) throw new Error(`Movement failed: ${mvError.message}`);

      // Step 2: Update admission record ONLY after RPC success
      const { error: admError } = await supabase
        .from('boarding_admissions')
        .update({
          unit_id: params.toUnitId,
          area_id: params.toAreaId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.admissionId)
        .eq('tenant_id', tenantId);

      if (admError) throw new Error(`Admission update failed: ${admError.message}`);
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.occupants.moved'));
      // Internal move = physical occupancy change + admission unit_id update + movement record.
      invalidate(['occupancy', 'movement', 'admission']);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    moveHorse: mutation.mutateAsync,
    isMoving: mutation.isPending,
  };
}
