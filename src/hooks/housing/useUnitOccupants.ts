import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { useHousingInvalidation } from './useHousingInvalidation';
import { OPERATIONAL_OPEN_ADMISSION_STATUSES } from '@/lib/housing/eligibility';

export interface UnitOccupant {
  id: string;
  tenant_id: string;
  unit_id: string;
  horse_id: string;
  since: string;
  until: string | null;
  is_demo: boolean;
  created_at: string;
  horse?: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  };
  /**
   * Phase 1.e.f.7.b.1 — attached active admission carrying snapshot
   * identity fields, used as a display fallback when the canonical
   * `horse` join is blocked by recipient RLS for connected B2B horses.
   */
  activeAdmission?: {
    id: string;
    horse_name_snapshot: string | null;
    horse_name_ar_snapshot: string | null;
    horse_avatar_url_snapshot: string | null;
  } | null;
}

export function useUnitOccupants(unitId?: string) {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const { invalidate } = useHousingInvalidation();

  const {
    data: occupants = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['unit-occupants', tenantId, unitId],
    queryFn: async () => {
      if (!tenantId || !unitId) return [];

      const { data, error } = await supabase
        .from('housing_unit_occupants')
        .select(`
          *,
          horse:horses(id, name, name_ar, avatar_url)
        `)
        .eq('tenant_id', tenantId)
        .eq('unit_id', unitId)
        .is('until', null)
        .order('since', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as UnitOccupant[];

      // Phase 1.e.f.7.b.1 — attach active admission snapshot per occupant
      // (single batched query, no N+1). Matches by (tenant, unit, horse,
      // status='active'). Falls back to null when no admission row exists.
      const horseIds = rows.map(r => r.horse_id);
      if (horseIds.length > 0) {
        const { data: admissions } = await supabase
          .from('boarding_admissions')
          .select('id, horse_id, horse_name_snapshot, horse_name_ar_snapshot, horse_avatar_url_snapshot')
          .eq('tenant_id', tenantId)
          .eq('unit_id', unitId)
          .in('status', OPERATIONAL_OPEN_ADMISSION_STATUSES as unknown as string[])
          .in('horse_id', horseIds);

        const byHorse = new Map<string, NonNullable<UnitOccupant['activeAdmission']>>();
        for (const a of (admissions || [])) {
          byHorse.set(a.horse_id, {
            id: a.id,
            horse_name_snapshot: a.horse_name_snapshot ?? null,
            horse_name_ar_snapshot: a.horse_name_ar_snapshot ?? null,
            horse_avatar_url_snapshot: a.horse_avatar_url_snapshot ?? null,
          });
        }
        for (const r of rows) {
          r.activeAdmission = byHorse.get(r.horse_id) ?? null;
        }
      }

      return rows;
    },
    enabled: !!tenantId && !!unitId,
  });

  /**
   * Orphan-only repair mutation.
   * Pre-validates that the horse has NO active admission before allowing removal.
   * This is NOT a normal vacate path — it is a constrained safety-net for legacy data.
   */
  const removeOrphanOccupantMutation = useMutation({
    mutationFn: async ({ occupantId, horseId }: { occupantId: string; horseId: string }) => {
      if (!tenantId) throw new Error(tGlobal('housing.toasts.noActiveOrganization'));
      if (!canManage) throw new Error('Insufficient permissions for orphan cleanup');

      // Pre-validate: horse must NOT have an active admission
      const { data: activeAdmission, error: admErr } = await supabase
        .from('boarding_admissions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('horse_id', horseId)
        .in('status', OPERATIONAL_OPEN_ADMISSION_STATUSES as unknown as string[])
        .maybeSingle();

      if (admErr) throw admErr;
      if (activeAdmission) {
        throw new Error('Cannot remove: horse has an active admission. Use Move/Checkout instead.');
      }

      // Safe to close orphan occupancy row
      const { error } = await supabase
        .from('housing_unit_occupants')
        .update({ until: new Date().toISOString() })
        .eq('id', occupantId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tGlobal('housing.occupants.orphanRemoved'));
      // Orphan removal is a pure occupancy event.
      invalidate('occupancy');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    occupants,
    isLoading,
    error,
    canManage,
    removeOrphanOccupant: removeOrphanOccupantMutation.mutateAsync,
    isRemovingOrphan: removeOrphanOccupantMutation.isPending,
  };
}
