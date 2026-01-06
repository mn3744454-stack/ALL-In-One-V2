import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface EmployeeAssignment {
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
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    gender: string;
    breed: string | null;
    avatar_url: string | null;
  };
}

export function useEmployeeAssignments(employeeId: string) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee-assignments', tenantId, employeeId],
    queryFn: async () => {
      if (!tenantId || !employeeId) return [];

      // Fetch assignments first
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('hr_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('employee_id', employeeId)
        .eq('entity_type', 'horse')
        .order('created_at', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      if (!assignmentsData || assignmentsData.length === 0) return [];

      // Fetch horses separately
      const horseIds = assignmentsData.map(a => a.entity_id);
      const { data: horses } = await supabase
        .from('horses')
        .select('id, name, name_ar, gender, breed, avatar_url')
        .in('id', horseIds);

      const horsesMap = new Map(horses?.map(h => [h.id, h]) || []);
      
      return assignmentsData.map(a => ({
        ...a,
        entity_type: 'horse' as const,
        horse: horsesMap.get(a.entity_id) || undefined,
      })) as EmployeeAssignment[];
    },
    enabled: !!tenantId && !!employeeId,
  });

  return {
    assignments,
    isLoading,
    error,
  };
}
