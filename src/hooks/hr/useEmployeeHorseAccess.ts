import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface HorseAccessDetails {
  id: string;
  name: string;
  name_ar: string | null;
  gender: string;
  breed: string | null;
  avatar_url: string | null;
  access_level: string;
}

/**
 * Fetches horses that an employee has access to via member_horse_access.
 * This looks up the tenant_member record for the employee's user_id,
 * then fetches horses from member_horse_access.
 */
export function useEmployeeHorseAccess(employeeUserId: string | null | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const {
    data: horses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee-horse-access', tenantId, employeeUserId],
    queryFn: async () => {
      if (!tenantId || !employeeUserId) return [];

      // First find the tenant_member for this user in this tenant
      const { data: memberData, error: memberError } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', employeeUserId)
        .eq('is_active', true)
        .single();

      if (memberError || !memberData) {
        // No active tenant member found
        return [];
      }

      // Now get horse access for this tenant member
      const { data: accessData, error: accessError } = await supabase
        .from('member_horse_access')
        .select('horse_id, access_level')
        .eq('tenant_member_id', memberData.id);

      if (accessError || !accessData || accessData.length === 0) {
        return [];
      }

      // Fetch horse details
      const horseIds = accessData.map(a => a.horse_id);
      const { data: horsesData } = await supabase
        .from('horses')
        .select('id, name, name_ar, gender, breed, avatar_url')
        .in('id', horseIds);

      if (!horsesData) return [];

      // Map access level to horses
      const accessMap = new Map(accessData.map(a => [a.horse_id, a.access_level]));
      
      return horsesData.map(horse => ({
        ...horse,
        access_level: accessMap.get(horse.id) || 'view',
      })) as HorseAccessDetails[];
    },
    enabled: !!tenantId && !!employeeUserId,
  });

  return {
    horses,
    isLoading,
    error,
  };
}
