import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface CreateEmployeeHorseAssignmentData {
  horse_id: string;
  role: string;
  notes?: string | null;
}

/**
 * Employee-side mutation hook for managing horse assignments.
 * Writes to the same `hr_assignments` table used by the horse-side flow,
 * preserving a single source of truth for bidirectional Horse ↔ Employee
 * assignment management. Invalidates query keys for both directions so
 * either surface stays coherent.
 */
export function useEmployeeHorseAssignment(employeeId: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const invalidateBothSides = (horseId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['employee-assignments', tenantId, employeeId] });
    queryClient.invalidateQueries({ queryKey: ['employee-assignments', tenantId] });
    if (horseId) {
      queryClient.invalidateQueries({ queryKey: ['horse-assignments', tenantId, horseId] });
    }
    queryClient.invalidateQueries({ queryKey: ['horse-assignments', tenantId] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeHorseAssignmentData) => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      const { data: result, error } = await supabase
        .from('hr_assignments')
        .insert({
          tenant_id: tenantId,
          employee_id: employeeId,
          entity_type: 'horse',
          entity_id: data.horse_id,
          role: data.role,
          notes: data.notes || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      invalidateBothSides(result?.entity_id as string | undefined);
      toast.success(tGlobal('hr.assignments.assignmentCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (params: { assignmentId: string; horseId: string }) => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('hr_assignments')
        .delete()
        .eq('id', params.assignmentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return params;
    },
    onSuccess: (params) => {
      invalidateBothSides(params.horseId);
      toast.success(tGlobal('hr.assignments.assignmentRemoved'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    canManage,
    createAssignment: createMutation.mutateAsync,
    deleteAssignment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
