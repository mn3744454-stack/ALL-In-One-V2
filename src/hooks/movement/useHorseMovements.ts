import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useHousingInvalidation } from '@/hooks/housing/useHousingInvalidation';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { startOfDay, startOfWeek, endOfDay } from 'date-fns';

export type MovementType = 'in' | 'out' | 'transfer';
export type MovementStatus = 'scheduled' | 'dispatched' | 'completed' | 'cancelled';

export interface HorseMovement {
  id: string;
  tenant_id: string;
  horse_id: string;
  movement_type: MovementType;
  movement_status: MovementStatus;
  from_location_id: string | null;
  to_location_id: string | null;
  from_area_id: string | null;
  to_area_id: string | null;
  from_unit_id: string | null;
  to_unit_id: string | null;
  destination_type: string;
  from_external_location_id: string | null;
  to_external_location_id: string | null;
  movement_at: string;
  scheduled_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  recorded_by: string | null;
  reason: string | null;
  notes: string | null;
  internal_location_note: string | null;
  is_demo: boolean;
  created_at: string;
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  from_location?: {
    id: string;
    name: string;
    city: string | null;
  };
  to_location?: {
    id: string;
    name: string;
    city: string | null;
  };
  from_area?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  to_area?: {
    id: string;
    name: string;
    name_ar: string | null;
  };
  from_unit?: {
    id: string;
    code: string;
    name: string | null;
  };
  to_unit?: {
    id: string;
    code: string;
    name: string | null;
  };
  from_external_location?: {
    id: string;
    name: string;
    name_ar: string | null;
    location_type: string;
  };
  to_external_location?: {
    id: string;
    name: string;
    name_ar: string | null;
    location_type: string;
  };
  recorded_by_profile?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateMovementData {
  horse_id: string;
  movement_type: MovementType;
  from_location_id?: string | null;
  to_location_id?: string | null;
  from_area_id?: string | null;
  from_unit_id?: string | null;
  to_area_id?: string | null;
  to_unit_id?: string | null;
  movement_at?: string;
  reason?: string;
  notes?: string;
  internal_location_note?: string;
  is_demo?: boolean;
  clear_housing?: boolean;
  destination_type?: string;
  from_external_location_id?: string | null;
  to_external_location_id?: string | null;
  movement_status?: MovementStatus;
  scheduled_at?: string;
}

export interface MovementFilters {
  dateRange?: 'today' | 'week' | 'all';
  locationId?: string;
  movementType?: MovementType;
  movementStatus?: MovementStatus;
  search?: string;
}

const MOVEMENT_SELECT = `
  *,
  horse:horses!horse_movements_horse_id_fkey(id, name, name_ar, avatar_url),
  from_location:branches!horse_movements_from_location_id_fkey(id, name, city),
  to_location:branches!horse_movements_to_location_id_fkey(id, name, city),
  from_area:facility_areas!horse_movements_from_area_id_fkey(id, name, name_ar),
  to_area:facility_areas!horse_movements_to_area_id_fkey(id, name, name_ar),
  from_unit:housing_units!horse_movements_from_unit_id_fkey(id, code, name),
  to_unit:housing_units!horse_movements_to_unit_id_fkey(id, code, name),
  from_external_location:external_locations!horse_movements_from_external_location_id_fkey(id, name, name_ar, location_type),
  to_external_location:external_locations!horse_movements_to_external_location_id_fkey(id, name, name_ar, location_type)
`;

export function useHorseMovements(filters: MovementFilters = {}) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const { invalidate } = useHousingInvalidation();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const {
    data: movements = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['horse-movements', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('horse_movements')
        .select(MOVEMENT_SELECT)
        .eq('tenant_id', tenantId)
        .order('movement_at', { ascending: false });

      if (filters.dateRange === 'today') {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        query = query.gte('movement_at', todayStart).lte('movement_at', todayEnd);
      } else if (filters.dateRange === 'week') {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();
        query = query.gte('movement_at', weekStart);
      }

      if (filters.locationId) {
        query = query.or(`from_location_id.eq.${filters.locationId},to_location_id.eq.${filters.locationId}`);
      }

      if (filters.movementType) {
        query = query.eq('movement_type', filters.movementType);
      }

      if (filters.movementStatus) {
        query = query.eq('movement_status', filters.movementStatus);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      let result = (data || []) as HorseMovement[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(m => 
          m.horse?.name?.toLowerCase().includes(searchLower) ||
          m.horse?.name_ar?.includes(filters.search!) ||
          m.reason?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
    enabled: !!tenantId,
  });

  const fetchHorseMovements = async (horseId: string): Promise<HorseMovement[]> => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('horse_movements')
      .select(MOVEMENT_SELECT)
      .eq('tenant_id', tenantId)
      .eq('horse_id', horseId)
      .order('movement_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data || []) as HorseMovement[];
  };

  const recordMutation = useMutation({
    mutationFn: async (data: CreateMovementData) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      const rpcParams: Record<string, unknown> = {
        p_tenant_id: tenantId,
        p_horse_id: data.horse_id,
        p_movement_type: data.movement_type,
        p_from_location_id: data.from_location_id || null,
        p_to_location_id: data.to_location_id || null,
        p_from_area_id: data.from_area_id || null,
        p_from_unit_id: data.from_unit_id || null,
        p_to_area_id: data.to_area_id || null,
        p_to_unit_id: data.to_unit_id || null,
        p_movement_at: data.movement_at || new Date().toISOString(),
        p_reason: data.reason || null,
        p_notes: data.notes || null,
        p_internal_location_note: data.internal_location_note || null,
        p_is_demo: data.is_demo || false,
        p_clear_housing: data.movement_status === 'scheduled' ? false : (data.clear_housing || false),
        p_destination_type: data.destination_type || 'internal',
        p_from_external_location_id: data.from_external_location_id || null,
        p_to_external_location_id: data.to_external_location_id || null,
        p_movement_status: data.movement_status || 'completed',
      };

      const { data: result, error } = await supabase.rpc('record_horse_movement_with_housing', rpcParams as any);

      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      const msg = vars.movement_status === 'scheduled' 
        ? tGlobal('movement.lifecycle.scheduled')
        : tGlobal('movement.toasts.movementRecorded');
      toast.success(msg);
      // A recorded movement can affect movement lists, occupancy (housing legs),
      // and admission state (admission-linked check-in/out movements).
      invalidate(['movement', 'occupancy', 'admission']);
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes('single-occupancy')) {
        toast.error(tGlobal('movement.validation.singleOccupied'));
      } else if (msg.includes('maximum capacity')) {
        toast.error(tGlobal('movement.validation.unitFull'));
      } else if (msg.includes('Destination location is required')) {
        toast.error(tGlobal('movement.validation.destinationRequired'));
      } else if (msg.includes('Origin location is required')) {
        toast.error(tGlobal('movement.validation.originRequired'));
      } else if (msg.includes('Permission denied')) {
        toast.error(tGlobal('movement.toasts.permissionDenied'));
      } else {
        toast.error(msg || tGlobal('movement.toasts.failedToRecord'));
      }
    },
  });

  // Dispatch mutation — transitions scheduled → dispatched
  const dispatchMutation = useMutation({
    mutationFn: async ({ movementId }: { movementId: string }) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));
      
      const { data, error } = await supabase.rpc('dispatch_horse_movement' as any, {
        p_movement_id: movementId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.lifecycle.dispatched'));
      // Dispatch flips status; same housing/admission consumers care.
      invalidate(['movement', 'occupancy', 'admission']);
    },
    onError: (error: Error) => {
      toast.error(error.message || tGlobal('movement.lifecycle.dispatchFailed'));
    },
  });

  return {
    movements,
    isLoading,
    error,
    canManage,
    fetchHorseMovements,
    recordMovement: recordMutation.mutateAsync,
    isRecording: recordMutation.isPending,
    dispatchMovement: dispatchMutation.mutateAsync,
    isDispatching: dispatchMutation.isPending,
  };
}

// Hook for single horse movements
export function useSingleHorseMovements(horseId: string | undefined) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['horse-movements', tenantId, 'single', horseId],
    queryFn: async () => {
      if (!tenantId || !horseId) return [];

      const { data, error } = await supabase
        .from('horse_movements')
        .select(MOVEMENT_SELECT)
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .order('movement_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as HorseMovement[];
    },
    enabled: !!tenantId && !!horseId,
  });
}
