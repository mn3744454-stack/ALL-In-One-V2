import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { subDays } from 'date-fns';

// Demo locations
const DEMO_LOCATIONS = [
  { name: 'Al Qimmah - Riyadh', city: 'Riyadh' },
  { name: 'Al Qimmah - Taif', city: 'Taif' },
];

export function useMovementDemo() {
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManageDemo = activeRole === 'owner' || activeRole === 'manager';

  // Check if demo data exists
  const {
    data: demoExists,
    isLoading: isCheckingDemo,
  } = useQuery({
    queryKey: ['movement-demo-exists', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;

      const { count } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      return (count ?? 0) > 0;
    },
    enabled: !!tenantId && canManageDemo,
  });

  // Load demo data
  const loadMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !user?.id) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      // Check if demo already exists
      const { count: existingCount } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      if ((existingCount ?? 0) > 0) {
        toast.info(tGlobal('movement.demo.alreadyLoaded'));
        return { alreadyExists: true };
      }

      // 1. Create demo locations
      const locationsToCreate = DEMO_LOCATIONS.map(loc => ({
        ...loc,
        tenant_id: tenantId,
        is_active: true,
        is_demo: true,
      }));

      const { data: locations, error: locError } = await supabase
        .from('branches')
        .insert(locationsToCreate)
        .select();

      if (locError) throw locError;
      if (!locations || locations.length < 2) throw new Error('Failed to create demo locations');

      const riyadhId = locations[0].id;
      const taifId = locations[1].id;

      // 2. Get or create demo horses
      let horseIds: string[] = [];
      
      const { data: existingHorses } = await supabase
        .from('horses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .limit(2);

      if (existingHorses && existingHorses.length >= 2) {
        horseIds = existingHorses.map(h => h.id);
      } else {
        // Create demo horses if needed
        const { data: newHorses, error: horseError } = await supabase
          .from('horses')
          .insert([
            { name: 'Storm', name_ar: 'عاصفة', gender: 'male', tenant_id: tenantId, status: 'active' },
            { name: 'Luna', name_ar: 'لونا', gender: 'female', tenant_id: tenantId, status: 'active' },
          ])
          .select();

        if (horseError || !newHorses) {
          // Continue without movements
          return { success: true, noHorses: true };
        }
        horseIds = newHorses.map(h => h.id);
      }

      // 3. Create demo movements (in/out/transfer flow)
      const now = new Date();
      const movements = [
        // Horse 1 enters Riyadh 7 days ago
        {
          tenant_id: tenantId,
          horse_id: horseIds[0],
          movement_type: 'in' as const,
          to_location_id: riyadhId,
          movement_at: subDays(now, 7).toISOString(),
          recorded_by: user.id,
          reason: 'Training program',
          is_demo: true,
        },
        // Horse 2 enters Taif 5 days ago
        {
          tenant_id: tenantId,
          horse_id: horseIds[1],
          movement_type: 'in' as const,
          to_location_id: taifId,
          movement_at: subDays(now, 5).toISOString(),
          recorded_by: user.id,
          reason: 'Breeding program',
          is_demo: true,
        },
        // Horse 1 transfers to Taif 2 days ago
        {
          tenant_id: tenantId,
          horse_id: horseIds[0],
          movement_type: 'transfer' as const,
          from_location_id: riyadhId,
          to_location_id: taifId,
          movement_at: subDays(now, 2).toISOString(),
          recorded_by: user.id,
          reason: 'Show preparation',
          is_demo: true,
        },
        // Horse 2 transfers to Riyadh 1 day ago
        {
          tenant_id: tenantId,
          horse_id: horseIds[1],
          movement_type: 'transfer' as const,
          from_location_id: taifId,
          to_location_id: riyadhId,
          movement_at: subDays(now, 1).toISOString(),
          recorded_by: user.id,
          reason: 'Vet checkup',
          is_demo: true,
        },
      ];

      await supabase.from('horse_movements').insert(movements);

      return { success: true };
    },
    onSuccess: (result) => {
      if (!result?.alreadyExists) {
        toast.success(tGlobal('movement.demo.loaded'));
      }
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['horse-movements'] });
      queryClient.invalidateQueries({ queryKey: ['movement-demo-exists'] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove demo data
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      // 1. Delete demo movements
      await supabase
        .from('horse_movements')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      // 2. Delete demo locations
      await supabase
        .from('branches')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      return { success: true };
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.demo.removed'));
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['horse-movements'] });
      queryClient.invalidateQueries({ queryKey: ['movement-demo-exists'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    canManageDemo,
    demoExists: demoExists ?? false,
    isCheckingDemo,
    loadDemoData: loadMutation.mutateAsync,
    removeDemoData: removeMutation.mutateAsync,
    isLoading: loadMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
