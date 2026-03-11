import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

const fromTable = (table: string) => (supabase as any).from(table);

export interface StableServicePlan {
  id: string;
  tenant_id: string;
  service_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  plan_type: string;
  billing_cycle: string;
  base_price: number;
  currency: string;
  includes: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanData {
  name: string;
  name_ar?: string;
  description?: string;
  service_id?: string | null;
  plan_type?: string;
  billing_cycle?: string;
  base_price?: number;
  currency?: string;
  includes?: Record<string, any>;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
}

export function useStableServicePlans() {
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['stable-service-plans', tenantId],
    queryFn: async (): Promise<StableServicePlan[]> => {
      if (!tenantId) return [];
      const { data, error } = await fromTable('stable_service_plans')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as StableServicePlan[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePlanData) => {
      if (!tenantId) throw new Error('No tenant');
      const { data, error } = await fromTable('stable_service_plans')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          name_ar: input.name_ar || null,
          description: input.description || null,
          plan_type: input.plan_type || 'boarding',
          billing_cycle: input.billing_cycle || 'monthly',
          base_price: input.base_price || 0,
          currency: input.currency || 'SAR',
          includes: input.includes || {},
          is_active: input.is_active ?? true,
          is_public: input.is_public ?? false,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan created');
      queryClient.invalidateQueries({ queryKey: ['stable-service-plans', tenantId] });
    },
    onError: () => toast.error('Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreatePlanData> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await fromTable('stable_service_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan updated');
      queryClient.invalidateQueries({ queryKey: ['stable-service-plans', tenantId] });
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await fromTable('stable_service_plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan deactivated');
      queryClient.invalidateQueries({ queryKey: ['stable-service-plans', tenantId] });
    },
  });

  const activePlans = plans.filter(p => p.is_active);

  return {
    plans,
    activePlans,
    isLoading,
    createPlan: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePlan: updateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
  };
}
