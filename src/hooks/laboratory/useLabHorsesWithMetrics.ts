import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { queryKeys } from "@/lib/queryKeys";

export interface LabHorseWithMetrics {
  id: string;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  name_ar: string | null;
  gender: string | null;
  approx_age: string | null;
  breed_text: string | null;
  color_text: string | null;
  microchip_number: string | null;
  passport_number: string | null;
  ueln: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  client_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  linked_horse_id: string | null;
  linked_at: string | null;
  source: 'manual' | 'platform';
  is_archived: boolean;
  // Computed metrics
  samples_count: number;
  total_billed: number;
  total_paid: number;
  outstanding: number;
  last_sample_date: string | null;
}

export interface LabHorsesMetricsFilters {
  search?: string;
  includeArchived?: boolean;
  hasSamples?: boolean;
  hasOutstanding?: boolean;
}

/**
 * Hook to fetch lab horses with aggregated financial metrics.
 * Uses efficient batch queries instead of N+1.
 */
export function useLabHorsesWithMetrics(filters: LabHorsesMetricsFilters = {}) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant.id;

  return useQuery({
    queryKey: ['lab-horses-with-metrics', tenantId, filters],
    queryFn: async (): Promise<LabHorseWithMetrics[]> => {
      if (!tenantId) return [];

      // Step 1: Fetch all lab_horses
      let horsesQuery = supabase
        .from("lab_horses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (!filters.includeArchived) {
        horsesQuery = horsesQuery.eq("is_archived", false);
      }

      if (filters.search?.trim()) {
        const searchTerm = `%${filters.search.trim()}%`;
        horsesQuery = horsesQuery.or(
          `name.ilike.${searchTerm},name_ar.ilike.${searchTerm},microchip_number.ilike.${searchTerm},passport_number.ilike.${searchTerm},ueln.ilike.${searchTerm},owner_phone.ilike.${searchTerm},owner_name.ilike.${searchTerm}`
        );
      }

      const { data: horses, error: horsesError } = await horsesQuery;
      if (horsesError) {
        console.error("Error fetching lab horses:", horsesError);
        return [];
      }

      if (!horses || horses.length === 0) return [];

      const horseIds = horses.map(h => h.id);

      // Step 2: Fetch all samples for these horses in one query
      const { data: samples, error: samplesError } = await supabase
        .from("lab_samples")
        .select("id, lab_horse_id, collection_date")
        .eq("tenant_id", tenantId)
        .in("lab_horse_id", horseIds);

      if (samplesError) {
        console.error("Error fetching samples for metrics:", samplesError);
      }

      // Build sample counts and last sample date per horse
      const samplesByHorse = new Map<string, { count: number; sampleIds: string[]; lastDate: string | null }>();
      for (const sample of samples || []) {
        if (!sample.lab_horse_id) continue;
        const existing = samplesByHorse.get(sample.lab_horse_id) || { count: 0, sampleIds: [], lastDate: null };
        existing.count++;
        existing.sampleIds.push(sample.id);
        if (!existing.lastDate || sample.collection_date > existing.lastDate) {
          existing.lastDate = sample.collection_date;
        }
        samplesByHorse.set(sample.lab_horse_id, existing);
      }

      // Step 3: Get all sample IDs to query invoice_items
      const allSampleIds = (samples || []).map(s => s.id);
      
      let financialByHorse = new Map<string, { billed: number; paid: number }>();
      
      if (allSampleIds.length > 0) {
        // Query invoice_items for all samples at once
        const { data: invoiceItems, error: itemsError } = await supabase
          .from("invoice_items")
          .select(`
            entity_id,
            total_price,
            invoice:invoices!invoice_items_invoice_id_fkey(status)
          `)
          .eq("entity_type", "lab_sample")
          .in("entity_id", allSampleIds);

        if (itemsError) {
          console.error("Error fetching invoice items:", itemsError);
        }

        // Map sample -> horse for aggregation
        const sampleToHorse = new Map<string, string>();
        for (const sample of samples || []) {
          if (sample.lab_horse_id) {
            sampleToHorse.set(sample.id, sample.lab_horse_id);
          }
        }

        // Aggregate by horse
        for (const item of invoiceItems || []) {
          const horseId = sampleToHorse.get(item.entity_id);
          if (!horseId) continue;
          
          const existing = financialByHorse.get(horseId) || { billed: 0, paid: 0 };
          existing.billed += item.total_price || 0;
          
          const invoice = item.invoice as any;
          if (invoice?.status === 'paid') {
            existing.paid += item.total_price || 0;
          }
          financialByHorse.set(horseId, existing);
        }
      }

      // Step 4: Combine all data
      let result: LabHorseWithMetrics[] = horses.map(horse => {
        const sampleData = samplesByHorse.get(horse.id) || { count: 0, sampleIds: [], lastDate: null };
        const financialData = financialByHorse.get(horse.id) || { billed: 0, paid: 0 };

        return {
          ...horse,
          metadata: (horse.metadata || {}) as Record<string, unknown>,
          source: (horse.source || 'manual') as 'manual' | 'platform',
          samples_count: sampleData.count,
          total_billed: financialData.billed,
          total_paid: financialData.paid,
          outstanding: financialData.billed - financialData.paid,
          last_sample_date: sampleData.lastDate,
        };
      });

      // Apply post-filters
      if (filters.hasSamples) {
        result = result.filter(h => h.samples_count > 0);
      }
      if (filters.hasOutstanding) {
        result = result.filter(h => h.outstanding > 0);
      }

      return result;
    },
    enabled: !!tenantId,
    staleTime: 30000,
  });
}
