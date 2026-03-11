import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

const fromTable = (table: string) => (supabase as any).from(table);

export interface ExternalLocation {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  city: string | null;
  location_type: string;
  contact_name: string | null;
  contact_phone: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExternalLocationData {
  name: string;
  name_ar?: string;
  address?: string;
  city?: string;
  location_type?: string;
  contact_name?: string;
  contact_phone?: string;
}

export function useExternalLocations() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data: externalLocations = [], isLoading } = useQuery({
    queryKey: ['external-locations', tenantId],
    queryFn: async (): Promise<ExternalLocation[]> => {
      if (!tenantId) return [];
      const { data, error } = await fromTable('external_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      if (error) throw error;
      return (data || []) as ExternalLocation[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateExternalLocationData) => {
      if (!tenantId) throw new Error('No tenant');
      const { data, error } = await fromTable('external_locations')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          name_ar: input.name_ar || null,
          address: input.address || null,
          city: input.city || null,
          location_type: input.location_type || 'other',
          contact_name: input.contact_name || null,
          contact_phone: input.contact_phone || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ExternalLocation;
    },
    onSuccess: () => {
      toast.success('External location created');
      queryClient.invalidateQueries({ queryKey: ['external-locations', tenantId] });
    },
    onError: () => toast.error('Failed to create external location'),
  });

  return {
    externalLocations,
    isLoading,
    createExternalLocation: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
