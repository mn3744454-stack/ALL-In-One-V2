import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export type FacilityType = 'barn' | 'paddock' | 'arena' | 'isolation' | 'pasture' | 'wash_area' | 'round_pen' | 'storage';

export const FACILITY_TYPES: FacilityType[] = ['barn', 'paddock', 'arena', 'isolation', 'pasture', 'wash_area', 'round_pen', 'storage'];

export interface SubdivisionConfig {
  label: string;
  labelAr: string;
  types: string[];
  supportsChildren: boolean;
}

export const SUBDIVISION_CONFIG: Record<FacilityType, SubdivisionConfig> = {
  barn: { label: 'Stall', labelAr: 'إسطبل', types: ['stall', 'box', 'room'], supportsChildren: true },
  paddock: { label: 'Zone', labelAr: 'منطقة', types: ['zone', 'section', 'partition'], supportsChildren: true },
  isolation: { label: 'Bay', labelAr: 'حجرة عزل', types: ['isolation_room', 'isolation_bay'], supportsChildren: true },
  pasture: { label: 'Zone', labelAr: 'منطقة', types: ['zone', 'section'], supportsChildren: true },
  storage: { label: 'Storage', labelAr: 'مستودع', types: [], supportsChildren: false },
  arena: { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
  wash_area: { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
  round_pen: { label: 'Operational Space', labelAr: 'مساحة تشغيلية', types: [], supportsChildren: false },
};

export interface FacilityArea {
  id: string;
  tenant_id: string;
  branch_id: string;
  name: string;
  name_ar: string | null;
  code: string | null;
  facility_type: FacilityType;
  capacity: number | null;
  area_size: number | null;
  shade: string | null;
  has_water: boolean | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  branch?: {
    id: string;
    name: string;
  };
}

export interface CreateAreaData {
  branch_id: string;
  name: string;
  name_ar?: string;
  code?: string;
  facility_type?: FacilityType;
  capacity?: number;
  area_size?: number;
  shade?: string;
  has_water?: boolean;
  metadata?: Record<string, unknown>;
}

export function useFacilityAreas(branchId?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const {
    data: areas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['facility-areas', tenantId, branchId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('facility_areas')
        .select('*, branch:branches(id, name)')
        .eq('tenant_id', tenantId)
        .order('is_active', { ascending: false })
        .order('name');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FacilityArea[];
    },
    enabled: !!tenantId,
  });

  const activeAreas = areas.filter(a => a.is_active);

  const createMutation = useMutation({
    mutationFn: async (data: CreateAreaData) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { data: newArea, error } = await supabase
        .from('facility_areas')
        .insert({
          tenant_id: tenantId,
          branch_id: data.branch_id,
          name: data.name,
          name_ar: data.name_ar || null,
          code: data.code || null,
          facility_type: data.facility_type || 'barn',
          capacity: data.capacity || null,
          area_size: data.area_size || null,
          shade: data.shade || 'none',
          has_water: data.has_water || false,
          metadata: data.metadata || {},
          is_active: true,
          is_demo: false,
        })
        .select()
        .single();

      if (error) throw error;
      return newArea;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.created'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateAreaData>) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const updatePayload: Record<string, unknown> = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.name_ar !== undefined) updatePayload.name_ar = data.name_ar;
      if (data.code !== undefined) updatePayload.code = data.code;
      if (data.facility_type !== undefined) updatePayload.facility_type = data.facility_type;
      if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
      if (data.area_size !== undefined) updatePayload.area_size = data.area_size;
      if (data.shade !== undefined) updatePayload.shade = data.shade;
      if (data.has_water !== undefined) updatePayload.has_water = data.has_water;

      const { data: updated, error } = await supabase
        .from('facility_areas')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.updated'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));

      const { error } = await supabase
        .from('facility_areas')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.areas.updated'));
      queryClient.invalidateQueries({ queryKey: ['facility-areas', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    areas,
    activeAreas,
    isLoading,
    error,
    canManage,
    createArea: createMutation.mutateAsync,
    updateArea: updateMutation.mutateAsync,
    toggleAreaActive: toggleActiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
