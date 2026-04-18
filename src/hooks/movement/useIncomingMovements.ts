import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useHousingInvalidation } from '@/hooks/housing/useHousingInvalidation';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface IncomingMovement {
  id: string;
  tenant_id: string;
  sender_tenant_id: string;
  sender_movement_id: string;
  horse_id: string;
  horse_name: string;
  horse_name_ar: string | null;
  horse_avatar_url: string | null;
  sender_tenant_name: string | null;
  movement_type: string;
  status: 'pending' | 'completed' | 'cancelled';
  reason: string | null;
  notes: string | null;
  scheduled_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  local_movement_id: string | null;
  created_at: string;
  updated_at: string;
}

const fromTable = (table: string) => (supabase as any).from(table);

export function useIncomingMovements(statusFilter?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const { invalidate } = useHousingInvalidation();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const { data: incomingMovements = [], isLoading, error } = useQuery({
    queryKey: ['incoming-movements', tenantId, statusFilter],
    queryFn: async (): Promise<IncomingMovement[]> => {
      if (!tenantId) return [];

      let query = fromTable('incoming_horse_movements')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as IncomingMovement[];
    },
    enabled: !!tenantId,
  });

  const pendingCount = incomingMovements.filter(m => m.status === 'pending').length;

  const confirmMutation = useMutation({
    mutationFn: async ({ incomingId, notes }: { incomingId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('confirm_incoming_movement' as any, {
        p_incoming_id: incomingId,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.incoming.confirmed'));
      // Confirming an incoming movement materializes the inbound housing leg
      // and may auto-create/activate a local admission for the arriving horse.
      invalidate(['movement', 'occupancy', 'admission']);
    },
    onError: (error: Error) => {
      toast.error(error.message || tGlobal('movement.incoming.confirmFailed'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ incomingId, reason }: { incomingId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_incoming_movement' as any, {
        p_incoming_id: incomingId,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.incoming.cancelled'));
      // Cancellation only affects the incoming pipeline + eligibility surfaces;
      // no occupancy or admission state changes.
      invalidate(['movement']);
    },
    onError: (error: Error) => {
      toast.error(error.message || tGlobal('movement.incoming.cancelFailed'));
    },
  });

  return {
    incomingMovements,
    pendingCount,
    isLoading,
    error,
    canManage,
    confirmIncoming: confirmMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    cancelIncoming: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
