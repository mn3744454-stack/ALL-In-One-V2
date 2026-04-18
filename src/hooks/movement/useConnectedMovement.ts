import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useHousingInvalidation } from '@/hooks/housing/useHousingInvalidation';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface RecordConnectedMovementData {
  horse_id: string;
  connected_tenant_id: string;
  from_location_id?: string | null;
  movement_at?: string;
  reason?: string;
  notes?: string;
  is_demo?: boolean;
}

export function useConnectedMovement() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const mutation = useMutation({
    mutationFn: async (data: RecordConnectedMovementData) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      const { data: result, error } = await supabase.rpc('record_connected_movement' as any, {
        p_sender_tenant_id: tenantId,
        p_horse_id: data.horse_id,
        p_connected_tenant_id: data.connected_tenant_id,
        p_from_location_id: data.from_location_id || null,
        p_movement_at: data.movement_at || new Date().toISOString(),
        p_reason: data.reason || null,
        p_notes: data.notes || null,
        p_is_demo: data.is_demo || false,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.toasts.movementRecorded'));
      queryClient.invalidateQueries({ queryKey: ['horse-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['incoming-movements'] });
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes('No accepted connection')) {
        toast.error(tGlobal('movement.connected.noConnection'));
      } else if (msg.includes('Permission denied')) {
        toast.error(tGlobal('movement.toasts.permissionDenied'));
      } else {
        toast.error(msg || tGlobal('movement.toasts.failedToRecord'));
      }
    },
  });

  return {
    recordConnectedMovement: mutation.mutateAsync,
    isRecording: mutation.isPending,
  };
}
