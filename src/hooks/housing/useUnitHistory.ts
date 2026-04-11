import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface UnitHistoryEntry {
  id: string;
  horse_id: string;
  since: string;
  until: string;
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
}

export function useUnitHistory(unitId?: string) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['unit-history', tenantId, unitId],
    queryFn: async () => {
      if (!tenantId || !unitId) return [];

      const { data, error } = await supabase
        .from('housing_unit_occupants')
        .select(`
          id, horse_id, since, until,
          horse:horses(id, name, name_ar, avatar_url)
        `)
        .eq('tenant_id', tenantId)
        .eq('unit_id', unitId)
        .not('until', 'is', null)
        .order('since', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as UnitHistoryEntry[];
    },
    enabled: !!tenantId && !!unitId,
  });

  return { history, isLoading };
}
