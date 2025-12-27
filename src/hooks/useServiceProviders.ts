import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export type ServiceProviderType = 'veterinary' | 'laboratory' | 'transportation' | 'boarding' | 'breeding';
export type ServiceProviderStatus = 'active' | 'inactive' | 'preferred' | 'blacklisted';

export interface ServiceProvider {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  type: ServiceProviderType;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  website: string | null;
  emergency_phone: string | null;
  is_emergency_provider: boolean;
  services: string[];
  status: ServiceProviderStatus;
  rating: number;
  review_count: number;
  estimated_response_time: string | null;
  average_cost: number | null;
  certifications: string[];
  specializations: string[];
  business_hours: Record<string, string>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceProviderData {
  name: string;
  name_ar?: string | null;
  type: ServiceProviderType;
  description?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  website?: string | null;
  emergency_phone?: string | null;
  is_emergency_provider?: boolean;
  services?: string[];
  status?: ServiceProviderStatus;
  rating?: number;
  estimated_response_time?: string | null;
  average_cost?: number | null;
  certifications?: string[];
  specializations?: string[];
  business_hours?: Record<string, string>;
  notes?: string | null;
}

export function useServiceProviders() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();
  const { toast } = useToast();

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  const fetchProviders = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setProviders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('tenant_id', activeTenant.tenant.id)
        .order('name');

      if (error) throw error;
      setProviders((data as ServiceProvider[]) || []);
    } catch (error: any) {
      console.error('Error fetching service providers:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل مقدمي الخدمات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant?.id, toast]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const getProvidersByType = useCallback((type: ServiceProviderType) => {
    return providers.filter(p => p.type === type && p.status !== 'blacklisted');
  }, [providers]);

  const getActiveProviders = useCallback(() => {
    return providers.filter(p => p.status === 'active' || p.status === 'preferred');
  }, [providers]);

  const getPreferredProviders = useCallback(() => {
    return providers.filter(p => p.status === 'preferred');
  }, [providers]);

  const getEmergencyProviders = useCallback(() => {
    return providers.filter(p => p.is_emergency_provider && p.status !== 'blacklisted');
  }, [providers]);

  const createProvider = async (data: CreateServiceProviderData) => {
    if (!activeTenant?.tenant?.id || !canManage) return null;

    try {
      const { data: newProvider, error } = await supabase
        .from('service_providers')
        .insert({
          ...data,
          tenant_id: activeTenant.tenant.id,
        })
        .select()
        .single();

      if (error) throw error;

      setProviders(prev => [...prev, newProvider as ServiceProvider]);
      toast({
        title: 'تم الإضافة',
        description: 'تم إضافة مقدم الخدمة بنجاح',
      });
      return newProvider as ServiceProvider;
    } catch (error: any) {
      console.error('Error creating service provider:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة مقدم الخدمة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProvider = async (id: string, data: Partial<CreateServiceProviderData>) => {
    if (!canManage) return null;

    try {
      const { data: updated, error } = await supabase
        .from('service_providers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setProviders(prev => prev.map(p => p.id === id ? (updated as ServiceProvider) : p));
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث مقدم الخدمة بنجاح',
      });
      return updated as ServiceProvider;
    } catch (error: any) {
      console.error('Error updating service provider:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث مقدم الخدمة',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteProvider = async (id: string) => {
    if (!canManage) return false;

    try {
      const { error } = await supabase
        .from('service_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProviders(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف مقدم الخدمة بنجاح',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting service provider:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف مقدم الخدمة',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    providers,
    loading,
    canManage,
    getProvidersByType,
    getActiveProviders,
    getPreferredProviders,
    getEmergencyProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    refresh: fetchProviders,
  };
}
