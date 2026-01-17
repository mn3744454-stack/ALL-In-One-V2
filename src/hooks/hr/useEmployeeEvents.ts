import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

export interface EmployeeEvent {
  id: string;
  tenant_id: string;
  employee_id: string;
  event_type: string;
  event_payload: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export type EmployeeEventType = 
  | 'created'
  | 'activated'
  | 'deactivated'
  | 'employment_kind_changed'
  | 'salary_updated'
  | 'start_date_updated';

export interface CreateEmployeeEventData {
  employee_id: string;
  event_type: EmployeeEventType;
  event_payload?: Record<string, any>;
}

export function useEmployeeEvents(employeeId?: string) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['hr-employee-events', tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId || !employeeId) return [];

      const { data, error } = await supabase
        .from('hr_employee_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeEvent[];
    },
    enabled: !!tenantId && !!employeeId,
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEmployeeEventData) => {
      if (!tenantId || !user?.id) throw new Error('No active tenant or user');

      const { data: result, error } = await supabase
        .from('hr_employee_events')
        .insert({
          tenant_id: tenantId,
          employee_id: data.employee_id,
          event_type: data.event_type,
          event_payload: data.event_payload || {},
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['hr-employee-events', tenantId, variables.employee_id] 
      });
    },
    onError: (error) => {
      console.error('Failed to create employee event:', error);
    },
  });

  return {
    events,
    isLoading,
    error,
    createEvent: createEventMutation.mutateAsync,
    isCreating: createEventMutation.isPending,
  };
}
