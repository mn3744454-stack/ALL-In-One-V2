import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { toast } = useToast();

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const fetchClients = useCallback(async () => {
    if (!activeTenant?.id) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('name');

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل العملاء',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.id, toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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

  const createClient = async (data: CreateClientData) => {
    if (!activeTenant?.id || !canManage) return null;

    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          ...data,
          tenant_id: activeTenant.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, newClient as Client]);
      toast({
        title: 'تم الإضافة',
        description: 'تم إضافة العميل بنجاح',
      });
      return newClient as Client;
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة العميل',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateClient = async (id: string, data: Partial<CreateClientData>) => {
    if (!canManage) return null;

    try {
      const { data: updated, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setClients(prev => prev.map(c => c.id === id ? (updated as Client) : c));
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث العميل بنجاح',
      });
      return updated as Client;
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث العميل',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteClient = async (id: string) => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف العميل بنجاح',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف العميل',
        variant: 'destructive',
      });
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
    refresh: fetchClients,
  };
}
