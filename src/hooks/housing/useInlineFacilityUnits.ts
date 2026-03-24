import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface InlineUnit {
  id: string;
  area_id: string | null;
  code: string;
  name: string | null;
  name_ar: string | null;
  unit_type: string;
  occupancy: string;
  capacity: number;
  status: string;
  is_active: boolean;
}

export interface InlineOccupant {
  unit_id: string;
  horse_id: string;
  horse: {
    id: string;
    name: string;
    name_ar: string | null;
    avatar_url: string | null;
  } | null;
}

export interface FacilityWithUnits {
  facilityId: string;
  units: InlineUnit[];
  occupants: InlineOccupant[];
  occupiedCount: number;
  totalCount: number;
}

/**
 * Fetches all units + current occupants for a set of facility IDs in bulk.
 * Designed for the inline Facilities tab grid — no per-facility Sheet needed.
 */
export function useInlineFacilityUnits(facilityIds: string[]) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['inline-facility-units', tenantId, facilityIds.sort().join(',')],
    queryFn: async () => {
      if (!tenantId || facilityIds.length === 0) return {};

      // Fetch all active units for these facilities
      const { data: units, error: unitsErr } = await supabase
        .from('housing_units')
        .select('id, area_id, code, name, name_ar, unit_type, occupancy, capacity, status, is_active')
        .eq('tenant_id', tenantId)
        .in('area_id', facilityIds)
        .eq('is_active', true)
        .order('code');

      if (unitsErr) throw unitsErr;

      const unitIds = (units || []).map(u => u.id);

      // Fetch current occupants for all those units
      let occupants: InlineOccupant[] = [];
      if (unitIds.length > 0) {
        const { data: occ, error: occErr } = await supabase
          .from('housing_unit_occupants')
          .select('unit_id, horse_id, horse:horses(id, name, name_ar, avatar_url)')
          .eq('tenant_id', tenantId)
          .in('unit_id', unitIds)
          .is('until', null);

        if (occErr) throw occErr;
        occupants = (occ || []) as unknown as InlineOccupant[];
      }

      // Group by facility
      const result: Record<string, FacilityWithUnits> = {};
      for (const fid of facilityIds) {
        const fUnits = (units || []).filter(u => u.area_id === fid);
        const fUnitIds = new Set(fUnits.map(u => u.id));
        const fOccupants = occupants.filter(o => fUnitIds.has(o.unit_id));

        // Count occupied units (units with at least one occupant)
        const occupiedUnitIds = new Set(fOccupants.map(o => o.unit_id));

        result[fid] = {
          facilityId: fid,
          units: fUnits as InlineUnit[],
          occupants: fOccupants,
          occupiedCount: occupiedUnitIds.size,
          totalCount: fUnits.length,
        };
      }

      return result;
    },
    enabled: !!tenantId && facilityIds.length > 0,
  });

  return { facilityUnitsMap: data || {}, isLoadingUnits: isLoading };
}
