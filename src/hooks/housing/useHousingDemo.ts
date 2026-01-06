import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export function useHousingDemo() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManageDemo = activeRole === 'owner' || activeRole === 'manager';

  // Check if demo data exists
  const { data: demoExists = false, isLoading: isCheckingDemo } = useQuery({
    queryKey: ['housing-demo-exists', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;

      const { data } = await supabase
        .from('facility_areas')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_demo', true)
        .limit(1);

      return (data?.length || 0) > 0;
    },
    enabled: !!tenantId,
  });

  const loadDemoMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      // Get first active branch
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(2);

      if (!branches || branches.length === 0) {
        throw new Error('No active branches found. Please create a branch first.');
      }

      const mainBranch = branches[0];
      const secondBranch = branches[1] || branches[0];

      // Create demo areas
      const { data: areas, error: areasError } = await supabase
        .from('facility_areas')
        .insert([
          {
            tenant_id: tenantId,
            branch_id: mainBranch.id,
            name: 'Hangar A',
            name_ar: 'هنجر أ',
            code: 'HA',
            is_active: true,
            is_demo: true,
          },
          {
            tenant_id: tenantId,
            branch_id: mainBranch.id,
            name: 'Hangar B',
            name_ar: 'هنجر ب',
            code: 'HB',
            is_active: true,
            is_demo: true,
          },
          {
            tenant_id: tenantId,
            branch_id: mainBranch.id,
            name: 'Paddock Zone',
            name_ar: 'منطقة البادوك',
            code: 'PZ',
            is_active: true,
            is_demo: true,
          },
        ])
        .select();

      if (areasError) throw areasError;

      const hangarA = areas.find(a => a.code === 'HA');
      const hangarB = areas.find(a => a.code === 'HB');
      const paddockZone = areas.find(a => a.code === 'PZ');

      // Create demo units
      const stallsHangarA = Array.from({ length: 6 }, (_, i) => ({
        tenant_id: tenantId,
        branch_id: mainBranch.id,
        area_id: hangarA!.id,
        code: `A${String(i + 1).padStart(2, '0')}`,
        name: `Stall A${String(i + 1).padStart(2, '0')}`,
        name_ar: `بوكس أ${String(i + 1).padStart(2, '0')}`,
        unit_type: 'stall' as const,
        occupancy: 'single' as const,
        capacity: 1,
        status: 'available',
        is_active: true,
        is_demo: true,
      }));

      const stallsHangarB = Array.from({ length: 4 }, (_, i) => ({
        tenant_id: tenantId,
        branch_id: mainBranch.id,
        area_id: hangarB!.id,
        code: `B${String(i + 1).padStart(2, '0')}`,
        name: `Stall B${String(i + 1).padStart(2, '0')}`,
        name_ar: `بوكس ب${String(i + 1).padStart(2, '0')}`,
        unit_type: 'stall' as const,
        occupancy: 'single' as const,
        capacity: 1,
        status: 'available',
        is_active: true,
        is_demo: true,
      }));

      const paddocks = [
        {
          tenant_id: tenantId,
          branch_id: mainBranch.id,
          area_id: paddockZone!.id,
          code: 'PW',
          name: 'West Paddock',
          name_ar: 'البادوك الغربي',
          unit_type: 'paddock' as const,
          occupancy: 'group' as const,
          capacity: 10,
          status: 'available',
          is_active: true,
          is_demo: true,
        },
        {
          tenant_id: tenantId,
          branch_id: mainBranch.id,
          area_id: paddockZone!.id,
          code: 'PE',
          name: 'East Paddock',
          name_ar: 'البادوك الشرقي',
          unit_type: 'paddock' as const,
          occupancy: 'group' as const,
          capacity: 8,
          status: 'available',
          is_active: true,
          is_demo: true,
        },
      ];

      const { data: units, error: unitsError } = await supabase
        .from('housing_units')
        .insert([...stallsHangarA, ...stallsHangarB, ...paddocks])
        .select();

      if (unitsError) throw unitsError;

      // Get some horses to assign
      const { data: horses } = await supabase
        .from('horses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .limit(5);

      if (horses && horses.length > 0 && units) {
        const stallA01 = units.find(u => u.code === 'A01');
        const stallA02 = units.find(u => u.code === 'A02');
        const westPaddock = units.find(u => u.code === 'PW');

        const occupantInserts = [];

        // Assign first 2 horses to stalls
        if (horses[0] && stallA01) {
          occupantInserts.push({
            tenant_id: tenantId,
            unit_id: stallA01.id,
            horse_id: horses[0].id,
            since: new Date().toISOString(),
            is_demo: true,
          });
        }
        if (horses[1] && stallA02) {
          occupantInserts.push({
            tenant_id: tenantId,
            unit_id: stallA02.id,
            horse_id: horses[1].id,
            since: new Date().toISOString(),
            is_demo: true,
          });
        }

        // Assign remaining horses to paddock
        if (westPaddock) {
          for (let i = 2; i < horses.length; i++) {
            occupantInserts.push({
              tenant_id: tenantId,
              unit_id: westPaddock.id,
              horse_id: horses[i].id,
              since: new Date().toISOString(),
              is_demo: true,
            });
          }
        }

        if (occupantInserts.length > 0) {
          await supabase.from('housing_unit_occupants').insert(occupantInserts);

          // Update horses' housing_unit_id
          for (const insert of occupantInserts) {
            await supabase
              .from('horses')
              .update({ housing_unit_id: insert.unit_id })
              .eq('id', insert.horse_id);
          }
        }
      }

      return { areasCount: areas.length, unitsCount: units.length };
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.demo.loaded'));
      queryClient.invalidateQueries({ queryKey: ['housing-demo-exists', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeDemoMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      // Get demo unit IDs to clear horse references
      const { data: demoUnits } = await supabase
        .from('housing_units')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      if (demoUnits && demoUnits.length > 0) {
        const unitIds = demoUnits.map(u => u.id);
        
        // Clear horse housing_unit_id references
        await supabase
          .from('horses')
          .update({ housing_unit_id: null })
          .in('housing_unit_id', unitIds);

        // Delete occupants
        await supabase
          .from('housing_unit_occupants')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('is_demo', true);
      }

      // Delete demo units
      await supabase
        .from('housing_units')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);

      // Delete demo areas
      await supabase
        .from('facility_areas')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('is_demo', true);
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.demo.removed'));
      queryClient.invalidateQueries({ queryKey: ['housing-demo-exists', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    canManageDemo,
    demoExists,
    isCheckingDemo,
    loadDemoData: loadDemoMutation.mutateAsync,
    removeDemoData: removeDemoMutation.mutateAsync,
    isLoading: loadDemoMutation.isPending,
    isRemoving: removeDemoMutation.isPending,
  };
}
