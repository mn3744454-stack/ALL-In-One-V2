import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import type { Employee } from './useEmployees';

export interface HorseAssignment {
  id: string;
  tenant_id: string;
  employee_id: string;
  entity_type: 'horse';
  entity_id: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface CreateAssignmentData {
  employee_id: string;
  role: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export const ASSIGNMENT_ROLES = [
  'primary_groom',
  'secondary_groom',
  'trainer',
  'vet_contact',
  'farrier',
  'exercise_rider',
  'other',
] as const;

export type AssignmentRole = typeof ASSIGNMENT_ROLES[number];

export function useHorseAssignments(horseId: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  // Fetch assignments for this horse with employee data
  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['horse-assignments', tenantId, horseId],
    queryFn: async () => {
      if (!tenantId || !horseId) return [];

      const { data, error } = await supabase
        .from('hr_assignments')
        .select(`
          *,
          employee:hr_employees(*)
        `)
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'horse')
        .eq('entity_id', horseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as HorseAssignment[];
    },
    enabled: !!tenantId && !!horseId,
  });

  // Create assignment
  const createMutation = useMutation({
    mutationFn: async (data: CreateAssignmentData) => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      const { data: result, error } = await supabase
        .from('hr_assignments')
        .insert({
          tenant_id: tenantId,
          employee_id: data.employee_id,
          entity_type: 'horse',
          entity_id: horseId,
          role: data.role,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          notes: data.notes || null,
        })
        .select(`
          *,
          employee:hr_employees(*)
        `)
        .single();

      if (error) throw error;
      return result as HorseAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horse-assignments', tenantId, horseId] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments', tenantId] });
      toast.success(tGlobal('hr.assignments.assignmentCreated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete assignment
  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('hr_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horse-assignments', tenantId, horseId] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments', tenantId] });
      toast.success(tGlobal('hr.assignments.assignmentRemoved'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    assignments,
    isLoading,
    error,
    canManage,
    createAssignment: createMutation.mutateAsync,
    deleteAssignment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
