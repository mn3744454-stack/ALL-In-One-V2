import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdmissionStatus = 'draft' | 'active' | 'checkout_pending' | 'checked_out' | 'cancelled';

export interface BoardingAdmission {
  id: string;
  tenant_id: string;
  horse_id: string;
  client_id: string | null;
  branch_id: string;
  area_id: string | null;
  unit_id: string | null;
  plan_id: string | null;
  status: AdmissionStatus;
  admitted_at: string;
  expected_departure: string | null;
  checked_out_at: string | null;
  daily_rate: number | null;
  monthly_rate: number | null;
  billing_cycle: string;
  rate_currency: string;
  reason: string | null;
  special_instructions: string | null;
  emergency_contact: string | null;
  admitted_by: string | null;
  checked_out_by: string | null;
  checkout_notes: string | null;
  balance_cleared: boolean;
  checkin_movement_id: string | null;
  checkout_movement_id: string | null;
  admission_checks: Record<string, any>;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  horse?: { id: string; name: string; name_ar: string | null; avatar_url: string | null };
  client?: { id: string; name: string; name_ar: string | null; phone: string | null };
  branch?: { id: string; name: string };
  area?: { id: string; name: string; name_ar: string | null };
  unit?: { id: string; code: string; name: string | null };
  admitted_by_profile?: { id: string; full_name: string | null };
}

export interface CreateAdmissionData {
  horse_id: string;
  client_id?: string | null;
  branch_id: string;
  area_id?: string | null;
  unit_id?: string | null;
  daily_rate?: number | null;
  monthly_rate?: number | null;
  billing_cycle?: string;
  rate_currency?: string;
  reason?: string;
  special_instructions?: string;
  emergency_contact?: string;
  expected_departure?: string | null;
}

export interface AdmissionFilters {
  status?: AdmissionStatus | 'all';
  search?: string;
}

// Helper to access new tables that may not be in generated types yet
const fromTable = (table: string) => (supabase as any).from(table);

export function useBoardingAdmissions(filters: AdmissionFilters = {}) {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ['boarding-admissions', tenantId, filters],
    queryFn: async (): Promise<BoardingAdmission[]> => {
      if (!tenantId) return [];

      let query = fromTable('boarding_admissions')
        .select(`
          *,
          horse:horses!horse_id(id, name, name_ar, avatar_url),
          client:clients!client_id(id, name, name_ar, phone),
          branch:branches!branch_id(id, name),
          area:facility_areas!area_id(id, name, name_ar),
          unit:housing_units!unit_id(id, code, name),
          admitted_by_profile:profiles!admitted_by(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('admitted_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as BoardingAdmission[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter((a: BoardingAdmission) =>
          a.horse?.name?.toLowerCase().includes(s) ||
          a.horse?.name_ar?.toLowerCase().includes(s) ||
          a.client?.name?.toLowerCase().includes(s) ||
          a.client?.name_ar?.toLowerCase().includes(s)
        );
      }

      return results;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAdmissionData) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      // Check for duplicate active admission
      const { data: existing } = await fromTable('boarding_admissions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('horse_id', data.horse_id)
        .in('status', ['active', 'draft', 'checkout_pending'])
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('This horse already has an active admission');
      }

      const checks: Record<string, any> = {};
      checks.horse_exists = { status: 'pass', message: 'Horse verified' };
      checks.branch_selected = { status: 'pass', message: 'Branch selected' };
      checks.client_assigned = data.client_id
        ? { status: 'pass', message: 'Client assigned' }
        : { status: 'warning', message: 'No client/payer assigned' };
      checks.housing_assigned = data.unit_id
        ? { status: 'pass', message: 'Housing unit assigned' }
        : { status: 'warning', message: 'No housing unit assigned' };
      checks.emergency_contact = data.emergency_contact
        ? { status: 'pass', message: 'Emergency contact provided' }
        : { status: 'warning', message: 'No emergency contact' };

      const { data: admission, error } = await fromTable('boarding_admissions')
        .insert({
          tenant_id: tenantId,
          horse_id: data.horse_id,
          client_id: data.client_id || null,
          branch_id: data.branch_id,
          area_id: data.area_id || null,
          unit_id: data.unit_id || null,
          daily_rate: data.daily_rate || null,
          monthly_rate: data.monthly_rate || null,
          billing_cycle: data.billing_cycle || 'monthly',
          rate_currency: data.rate_currency || 'SAR',
          reason: data.reason || null,
          special_instructions: data.special_instructions || null,
          emergency_contact: data.emergency_contact || null,
          expected_departure: data.expected_departure || null,
          admitted_by: user.id,
          status: 'active',
          admission_checks: checks,
        })
        .select()
        .single();

      if (error) throw error;

      // Create status history
      await fromTable('boarding_status_history').insert({
        admission_id: admission.id,
        tenant_id: tenantId,
        from_status: null,
        to_status: 'active',
        changed_by: user.id,
      });

      return admission;
    },
    onSuccess: () => {
      toast.success('Admission created successfully');
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create admission');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ admissionId, checkoutNotes }: { admissionId: string; checkoutNotes?: string }) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { error } = await fromTable('boarding_admissions')
        .update({
          status: 'checked_out',
          checked_out_at: new Date().toISOString(),
          checked_out_by: user.id,
          checkout_notes: checkoutNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admissionId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fromTable('boarding_status_history').insert({
        admission_id: admissionId,
        tenant_id: tenantId,
        from_status: 'active',
        to_status: 'checked_out',
        changed_by: user.id,
      });
    },
    onSuccess: () => {
      toast.success('Checkout completed successfully');
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to checkout');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ admissionId, newStatus, reason }: { admissionId: string; newStatus: AdmissionStatus; reason?: string }) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data: current } = await fromTable('boarding_admissions')
        .select('status')
        .eq('id', admissionId)
        .single();

      const { error } = await fromTable('boarding_admissions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'checked_out' ? { checked_out_at: new Date().toISOString(), checked_out_by: user.id } : {}),
        })
        .eq('id', admissionId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fromTable('boarding_status_history').insert({
        admission_id: admissionId,
        tenant_id: tenantId,
        from_status: current?.status || null,
        to_status: newStatus,
        changed_by: user.id,
        reason: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
    },
  });

  return {
    admissions,
    isLoading,
    createAdmission: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    checkout: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
  };
}

export function useSingleAdmission(admissionId: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['boarding-admission', tenantId, admissionId],
    queryFn: async (): Promise<BoardingAdmission | null> => {
      if (!tenantId || !admissionId) return null;

      const { data, error } = await fromTable('boarding_admissions')
        .select(`
          *,
          horse:horses!horse_id(id, name, name_ar, avatar_url),
          client:clients!client_id(id, name, name_ar, phone),
          branch:branches!branch_id(id, name),
          area:facility_areas!area_id(id, name, name_ar),
          unit:housing_units!unit_id(id, code, name),
          admitted_by_profile:profiles!admitted_by(id, full_name)
        `)
        .eq('id', admissionId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data as BoardingAdmission;
    },
    enabled: !!tenantId && !!admissionId,
  });
}

export function useAdmissionStatusHistory(admissionId: string | null) {
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  return useQuery({
    queryKey: ['boarding-status-history', tenantId, admissionId],
    queryFn: async () => {
      if (!tenantId || !admissionId) return [];

      const { data, error } = await fromTable('boarding_status_history')
        .select(`
          *,
          changed_by_profile:profiles!changed_by(id, full_name)
        `)
        .eq('admission_id', admissionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!admissionId,
  });
}
