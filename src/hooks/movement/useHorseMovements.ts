import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { startOfDay, startOfWeek, endOfDay } from 'date-fns';

export type MovementType = 'in' | 'out' | 'transfer';

export interface HorseMovement {
  id: string;
  tenant_id: string;
  horse_id: string;
  movement_type: MovementType;
  from_location_id: string | null;
  to_location_id: string | null;
  movement_at: string;
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
  movement_at?: string;
  reason?: string;
  notes?: string;
  internal_location_note?: string;
  is_demo?: boolean;
}

export interface MovementFilters {
  dateRange?: 'today' | 'week' | 'all';
  locationId?: string;
  movementType?: MovementType;
  search?: string;
}

export function useHorseMovements(filters: MovementFilters = {}) {
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  // Fetch movements with filters
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
        .select(`
          *,
          horse:horses!horse_movements_horse_id_fkey(id, name, name_ar, avatar_url),
          from_location:branches!horse_movements_from_location_id_fkey(id, name, city),
          to_location:branches!horse_movements_to_location_id_fkey(id, name, city)
        `)
        .eq('tenant_id', tenantId)
        .order('movement_at', { ascending: false });

      // Apply date filter
      if (filters.dateRange === 'today') {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        query = query.gte('movement_at', todayStart).lte('movement_at', todayEnd);
      } else if (filters.dateRange === 'week') {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString();
        query = query.gte('movement_at', weekStart);
      }

      // Apply location filter
      if (filters.locationId) {
        query = query.or(`from_location_id.eq.${filters.locationId},to_location_id.eq.${filters.locationId}`);
      }

      // Apply type filter
      if (filters.movementType) {
        query = query.eq('movement_type', filters.movementType);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Client-side search filter
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

  // Fetch movements for a specific horse
  const fetchHorseMovements = async (horseId: string): Promise<HorseMovement[]> => {
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('horse_movements')
      .select(`
        *,
        from_location:branches!horse_movements_from_location_id_fkey(id, name, city),
        to_location:branches!horse_movements_to_location_id_fkey(id, name, city)
      `)
      .eq('tenant_id', tenantId)
      .eq('horse_id', horseId)
      .order('movement_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data || []) as HorseMovement[];
  };

  // Record new movement
  const recordMutation = useMutation({
    mutationFn: async (data: CreateMovementData) => {
      if (!tenantId) throw new Error(tGlobal('movement.toasts.noActiveOrganization'));

      // Validate based on movement type
      if (data.movement_type === 'in' && !data.to_location_id) {
        throw new Error(tGlobal('movement.validation.inRequiresToLocation'));
      }
      if (data.movement_type === 'out' && !data.from_location_id) {
        throw new Error(tGlobal('movement.validation.outRequiresFromLocation'));
      }
      if (data.movement_type === 'transfer') {
        if (!data.from_location_id || !data.to_location_id) {
          throw new Error(tGlobal('movement.validation.transferRequiresBoth'));
        }
        if (data.from_location_id === data.to_location_id && !data.internal_location_note) {
          throw new Error(tGlobal('movement.validation.internalNoteRequired'));
        }
      }

      const { data: newMovement, error } = await supabase
        .from('horse_movements')
        .insert({
          tenant_id: tenantId,
          horse_id: data.horse_id,
          movement_type: data.movement_type,
          from_location_id: data.from_location_id || null,
          to_location_id: data.to_location_id || null,
          movement_at: data.movement_at || new Date().toISOString(),
          recorded_by: user?.id || null,
          reason: data.reason || null,
          notes: data.notes || null,
          internal_location_note: data.internal_location_note || null,
          is_demo: data.is_demo || false,
        })
        .select()
        .single();

      if (error) throw error;
      return newMovement;
    },
    onSuccess: () => {
      toast.success(tGlobal('movement.toasts.movementRecorded'));
      queryClient.invalidateQueries({ queryKey: ['horse-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message || tGlobal('movement.toasts.failedToRecord'));
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
        .select(`
          *,
          from_location:branches!horse_movements_from_location_id_fkey(id, name, city),
          to_location:branches!horse_movements_to_location_id_fkey(id, name, city)
        `)
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
