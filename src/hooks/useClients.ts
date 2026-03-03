import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';

export type ClientType = 'individual' | 'organization' | 'farm' | 'clinic';
export type ClientStatus = 'active' | 'inactive' | 'pending';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check';

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: ClientType;
  status: ClientStatus;
  tax_number: string | null;
  preferred_payment_method: PaymentMethod | null;
  credit_limit: number | null;
  outstanding_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  name_ar?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  type?: ClientType;
  status?: ClientStatus;
  tax_number?: string | null;
  preferred_payment_method?: PaymentMethod | null;
  credit_limit?: number | null;
  outstanding_balance?: number;
  notes?: string | null;
}

export function useClients() {
  const { activeTenant, activeRole } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.clients(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      return (data as Client[]) || [];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateClientData) => {
      if (!tenantId || !canManage) throw new Error('No permission');
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return newClient as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(tenantId) });
      toast({ title: 'تم الإضافة', description: 'تم إضافة العميل بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في إضافة العميل', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClientData> }) => {
      if (!canManage) throw new Error('No permission');
      const { data: updated, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(tenantId) });
      toast({ title: 'تم التحديث', description: 'تم تحديث العميل بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في تحديث العميل', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canManage) throw new Error('No permission');
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(tenantId) });
      toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل في حذف العميل', variant: 'destructive' });
    },
  });

  const getActiveClients = useCallback(() => {
    return clients.filter(c => c.status === 'active');
  }, [clients]);

  const getClientsByType = useCallback((type: ClientType) => {
    return clients.filter(c => c.type === type && c.status === 'active');
  }, [clients]);

  const getClientsWithOutstandingBalance = useCallback(() => {
    return clients.filter(c => c.outstanding_balance > 0);
  }, [clients]);

  const searchClients = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.name_ar?.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query)
    );
  }, [clients]);

  // Backward-compatible wrappers
  const createClient = async (data: CreateClientData) => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  };

  const updateClient = async (id: string, data: Partial<CreateClientData>) => {
    try {
      return await updateMutation.mutateAsync({ id, data });
    } catch {
      return null;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    clients,
    loading,
    canManage,
    getActiveClients,
    getClientsByType,
    getClientsWithOutstandingBalance,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients(tenantId) }),
  };
}
