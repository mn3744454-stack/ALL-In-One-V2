import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { useInventoryInvalidation } from './useInventoryInvalidation';

/**
 * Suppliers reuse the SHARED `public.suppliers` directory (also used by the
 * Finance domain: supplier_payables, expenses.vendor_id). The Inventory module
 * is the primary manager of this directory.
 */
export type Supplier = Database['public']['Tables']['suppliers']['Row'];

export interface CreateSupplierData {
  name: string;
  name_ar?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_number?: string | null;
  notes?: string | null;
}

export function useSuppliers(includeInactive = false) {
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const { invalidate } = useInventoryInvalidation();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['inventory-suppliers', tenantId, includeInactive],
    queryFn: async (): Promise<Supplier[]> => {
      if (!tenantId) return [];
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Supplier[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSupplierData) => {
      if (!tenantId) throw new Error(tGlobal('inventory.toasts.noOrg'));
      const { data: row, error } = await supabase
        .from('suppliers')
        .insert({ tenant_id: tenantId, ...data })
        .select()
        .single();
      if (error) throw error;
      return row as Supplier;
    },
    onSuccess: () => {
      invalidate('suppliers');
      toast.success(tGlobal('inventory.toasts.supplierCreated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateSupplierData> & { id: string; is_active?: boolean }) => {
      const { data: row, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return row as Supplier;
    },
    onSuccess: () => {
      invalidate('suppliers');
      toast.success(tGlobal('inventory.toasts.supplierUpdated'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    suppliers,
    isLoading,
    canManage,
    createSupplier: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSupplier: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
