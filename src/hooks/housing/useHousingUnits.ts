import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type InternalUnitType = Database['public']['Enums']['internal_unit_type'];
type OccupancyMode = Database['public']['Enums']['occupancy_mode'];

export interface HousingUnit {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  stable_id: string | null;
  area_id: string | null;
  code: string;
  name: string | null;
  name_ar: string | null;
  unit_type: string;
  occupancy: OccupancyMode;
  capacity: number;
  status: string;
  is_active: boolean;
  is_demo: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  area?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
  current_occupants?: number;
}

export interface CreateUnitData {
  branch_id: string;
  area_id: string;
  code: string;
  name?: string;
  name_ar?: string;
  unit_type: InternalUnitType;
  occupancy: OccupancyMode;
  capacity?: number;
  notes?: string;
}

export function useHousingUnits(branchId?: string, areaId?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const {
    data: units = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['housing-units', tenantId, branchId, areaId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('housing_units')
        .select(`
          *,
          area:facility_areas(id, name),
          branch:branches(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false })
        .order('code');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      if (areaId) {
        query = query.eq('area_id', areaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch occupant counts
      const unitIds = data.map(u => u.id);
      if (unitIds.length > 0) {
        const { data: occupantCounts } = await supabase
          .from('housing_unit_occupants')
          .select('unit_id')
          .in('unit_id', unitIds)
          .is('until', null);

        const countMap: Record<string, number> = {};
        occupantCounts?.forEach(o => {
          countMap[o.unit_id] = (countMap[o.unit_id] || 0) + 1;
        });

        return data.map(unit => ({
          ...unit,
          current_occupants: countMap[unit.id] || 0,
        })) as HousingUnit[];
      }

      return data.map(unit => ({
        ...unit,
        current_occupants: 0,
      })) as HousingUnit[];
    },
    enabled: !!tenantId,
  });

  const activeUnits = units.filter(u => u.is_active);

  const createMutation = useMutation({
    mutationFn: async (data: CreateUnitData) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const capacity = data.occupancy === 'single' ? 1 : (data.capacity || 10);

      const { data: newUnit, error } = await supabase
        .from('housing_units')
        .insert({
          tenant_id: tenantId,
          branch_id: data.branch_id,
          area_id: data.area_id,
          code: data.code,
          name: data.name || data.code,
          name_ar: data.name_ar || null,
          unit_type: data.unit_type,
          occupancy: data.occupancy,
          capacity,
          status: 'available',
          is_active: true,
          is_demo: false,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newUnit;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.units.created'));
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateUnitData>) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.name_ar !== undefined) updateData.name_ar = data.name_ar;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.unit_type !== undefined) updateData.unit_type = data.unit_type;
      if (data.occupancy !== undefined) updateData.occupancy = data.occupancy;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { data: updated, error } = await supabase
        .from('housing_units')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.units.updated'));
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('housing_units')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.units.updated'));
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    units,
    activeUnits,
    isLoading,
    error,
    canManage,
    createUnit: createMutation.mutateAsync,
    updateUnit: updateMutation.mutateAsync,
    toggleUnitActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
