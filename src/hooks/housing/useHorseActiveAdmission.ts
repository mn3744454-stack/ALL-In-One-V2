import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Fetches the active boarding admission for a given horse.
 * Returns admission_id and client_id for financial gate use.
 */
export function useHorseActiveAdmission(horseId: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['horse-active-admission', tenantId, horseId],
    queryFn: async () => {
      if (!tenantId || !horseId) return null;

      const { data, error } = await supabase
        .from('boarding_admissions')
        .select('id, client_id, horse_id, status')
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!horseId,
  });
}
