import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Phase D — Team Directory Responsibilities column.
 *
 * Aggregates structured horse-backed responsibility counts per employee
 * for the active tenant in a single light query. Returns a Map keyed by
 * employee_id → count of horse assignments (entity_type='horse').
 *
 * No task/duty model exists yet, so this is intentionally horse-only.
 */
export function useEmployeesAssignmentCounts(employeeIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const sortedIds = [...employeeIds].sort();

  const { data: countsMap = new Map<string, number>(), isLoading } = useQuery({
    queryKey: ['employees-assignment-counts', tenantId, sortedIds],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (!tenantId || sortedIds.length === 0) return map;

      const { data, error } = await supabase
        .from('hr_assignments')
        .select('employee_id')
        .eq('tenant_id', tenantId)
        .eq('entity_type', 'horse')
        .in('employee_id', sortedIds);

      if (error) throw error;

      for (const row of data ?? []) {
        map.set(row.employee_id, (map.get(row.employee_id) ?? 0) + 1);
      }
      return map;
    },
    enabled: !!tenantId && sortedIds.length > 0,
    staleTime: 30_000,
  });

  return { countsMap, isLoading };
}
