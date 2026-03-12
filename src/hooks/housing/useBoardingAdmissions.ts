import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { computeAdmissionChecks, type AdmissionChecks } from './admissionChecks';

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
  plan_id?: string | null;
  daily_rate?: number | null;
  monthly_rate?: number | null;
  billing_cycle?: string;
  rate_currency?: string;
  reason?: string;
  special_instructions?: string;
  emergency_contact?: string;
  expected_departure?: string | null;
  /** ISO string for historical admissions. Defaults to now() if omitted. */
  admitted_at?: string;
}

export interface AdmissionFilters {
  status?: AdmissionStatus | 'all';
  search?: string;
}

// Helper to access new tables that may not be in generated types yet
const fromTable = (table: string) => (supabase as any).from(table);

const ADMISSION_SELECT = `
  *,
  horse:horses!horse_id(id, name, name_ar, avatar_url),
  client:clients!client_id(id, name, name_ar, phone),
  branch:branches!branch_id(id, name),
  area:facility_areas!area_id(id, name, name_ar),
  unit:housing_units!unit_id(id, code, name),
  admitted_by_profile:profiles!admitted_by(id, full_name)
`;

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
        .select(ADMISSION_SELECT)
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

  /**
   * Create admission + check-in movement atomically (best-effort).
   * Also creates initial billing link if client is assigned.
   */
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

      const checks = computeAdmissionChecks({
        horse_id: data.horse_id,
        branch_id: data.branch_id,
        client_id: data.client_id,
        unit_id: data.unit_id,
        emergency_contact: data.emergency_contact,
        daily_rate: data.daily_rate,
        monthly_rate: data.monthly_rate,
      });

      // Step 1: Create admission in draft state first (safe fallback)
      const admittedAt = data.admitted_at || new Date().toISOString();
      const { data: admission, error } = await fromTable('boarding_admissions')
        .insert({
          tenant_id: tenantId,
          horse_id: data.horse_id,
          client_id: data.client_id || null,
          branch_id: data.branch_id,
          area_id: data.area_id || null,
          unit_id: data.unit_id || null,
          plan_id: data.plan_id || null,
          daily_rate: data.daily_rate || null,
          monthly_rate: data.monthly_rate || null,
          billing_cycle: data.billing_cycle || 'monthly',
          rate_currency: data.rate_currency || 'SAR',
          reason: data.reason || null,
          special_instructions: data.special_instructions || null,
          emergency_contact: data.emergency_contact || null,
          expected_departure: data.expected_departure || null,
          admitted_at: admittedAt,
          admitted_by: user.id,
          status: 'draft',
          admission_checks: checks,
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Create check-in movement via RPC
      const { data: movementId, error: mvError } = await supabase.rpc(
        'record_horse_movement_with_housing',
        {
          p_tenant_id: tenantId,
          p_horse_id: data.horse_id,
          p_movement_type: 'in',
          p_from_location_id: null,
          p_to_location_id: data.branch_id,
          p_from_area_id: null,
          p_from_unit_id: null,
          p_to_area_id: data.area_id || null,
          p_to_unit_id: data.unit_id || null,
          p_movement_at: admittedAt,
          p_reason: 'Boarding admission check-in',
          p_notes: data.special_instructions || null,
          p_internal_location_note: null,
          p_is_demo: false,
          p_clear_housing: false,
        }
      );

      if (mvError) {
        // Movement failed — rollback: delete the draft admission
        await fromTable('boarding_admissions')
          .delete()
          .eq('id', admission.id)
          .eq('tenant_id', tenantId);
        throw new Error(`Check-in movement failed: ${mvError.message}`);
      }

      // Step 3: Promote to active + link movement
      const { error: promoteError } = await fromTable('boarding_admissions')
        .update({
          status: 'active',
          checkin_movement_id: movementId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admission.id)
        .eq('tenant_id', tenantId);

      if (promoteError) {
        throw new Error(`Failed to activate admission: ${promoteError.message}`);
      }

      // Step 4: Create status history
      await fromTable('boarding_status_history').insert({
        admission_id: admission.id,
        tenant_id: tenantId,
        from_status: 'draft',
        to_status: 'active',
        changed_by: user.id,
      });

      return { ...admission, status: 'active', checkin_movement_id: movementId };
    },
    onSuccess: () => {
      toast.success('Admission created successfully');
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horse-movements', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create admission');
    },
  });

  /**
   * Initiate checkout: active → checkout_pending
   */
  const initiateCheckoutMutation = useMutation({
    mutationFn: async ({ admissionId }: { admissionId: string }) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data: current } = await fromTable('boarding_admissions')
        .select('status')
        .eq('id', admissionId)
        .eq('tenant_id', tenantId)
        .single();

      if (current?.status !== 'active') {
        throw new Error('Only active admissions can initiate checkout');
      }

      const { error } = await fromTable('boarding_admissions')
        .update({ status: 'checkout_pending', updated_at: new Date().toISOString() })
        .eq('id', admissionId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await fromTable('boarding_status_history').insert({
        admission_id: admissionId,
        tenant_id: tenantId,
        from_status: 'active',
        to_status: 'checkout_pending',
        changed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['boarding-admission', tenantId] });
    },
  });

  /**
   * Confirm checkout: checkout_pending → checked_out + movement
   */
  const confirmCheckoutMutation = useMutation({
    mutationFn: async ({ admissionId, checkoutNotes }: { admissionId: string; checkoutNotes?: string }) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data: admission } = await fromTable('boarding_admissions')
        .select('*')
        .eq('id', admissionId)
        .eq('tenant_id', tenantId)
        .single();

      if (!admission) throw new Error('Admission not found');
      if (admission.status !== 'checkout_pending') {
        throw new Error('Admission must be in checkout_pending status');
      }

      // Step 1: Create checkout movement via RPC
      const { data: movementId, error: mvError } = await supabase.rpc(
        'record_horse_movement_with_housing',
        {
          p_tenant_id: tenantId,
          p_horse_id: admission.horse_id,
          p_movement_type: 'out',
          p_from_location_id: admission.branch_id,
          p_to_location_id: null,
          p_from_area_id: admission.area_id || null,
          p_from_unit_id: admission.unit_id || null,
          p_to_area_id: null,
          p_to_unit_id: null,
          p_movement_at: new Date().toISOString(),
          p_reason: 'Boarding admission checkout',
          p_notes: checkoutNotes || null,
          p_internal_location_note: null,
          p_is_demo: false,
          p_clear_housing: true,
        }
      );

      if (mvError) {
        throw new Error(`Checkout movement failed: ${mvError.message}. Admission remains in checkout_pending.`);
      }

      // Step 2: Update admission to checked_out with movement link
      const { error } = await fromTable('boarding_admissions')
        .update({
          status: 'checked_out',
          checked_out_at: new Date().toISOString(),
          checked_out_by: user.id,
          checkout_notes: checkoutNotes || null,
          checkout_movement_id: movementId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admissionId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Step 3: Status history
      await fromTable('boarding_status_history').insert({
        admission_id: admissionId,
        tenant_id: tenantId,
        from_status: 'checkout_pending',
        to_status: 'checked_out',
        changed_by: user.id,
        reason: checkoutNotes || null,
      });

      // Billing links are created separately when real invoices exist
    },
    onSuccess: () => {
      toast.success('Checkout completed successfully');
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['boarding-admission', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
      queryClient.invalidateQueries({ queryKey: ['unit-occupants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['housing-units', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['horse-movements', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admission-financials', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['billing-links', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to checkout');
    },
  });

  /**
   * Update admission fields and recompute checks
   */
  const updateMutation = useMutation({
    mutationFn: async ({ admissionId, ...updates }: Partial<CreateAdmissionData> & { admissionId: string }) => {
      if (!tenantId) throw new Error('Missing tenant');

      const { data: current } = await fromTable('boarding_admissions')
        .select('*')
        .eq('id', admissionId)
        .eq('tenant_id', tenantId)
        .single();

      if (!current) throw new Error('Admission not found');

      // Block updates on terminal states
      if (['checked_out', 'cancelled'].includes(current.status)) {
        throw new Error('Cannot update a closed admission');
      }

      const merged = { ...current, ...updates };
      const checks = computeAdmissionChecks({
        horse_id: merged.horse_id,
        branch_id: merged.branch_id,
        client_id: merged.client_id,
        unit_id: merged.unit_id,
        emergency_contact: merged.emergency_contact,
        daily_rate: merged.daily_rate,
        monthly_rate: merged.monthly_rate,
      });

      const { error } = await fromTable('boarding_admissions')
        .update({
          ...updates,
          admission_checks: checks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admissionId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Admission updated');
      queryClient.invalidateQueries({ queryKey: ['boarding-admissions', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['boarding-admission', tenantId] });
    },
  });

  /**
   * Create a billing link for an admission (for manual invoice attachment)
   */
  const createBillingLinkMutation = useMutation({
    mutationFn: async ({ admissionId, invoiceId, linkKind, amount }: {
      admissionId: string;
      invoiceId: string;
      linkKind: 'deposit' | 'final' | 'refund' | 'credit_note';
      amount?: number | null;
    }) => {
      if (!tenantId || !user?.id) throw new Error('Missing tenant or user');

      const { data, error } = await supabase.from('billing_links').insert({
        tenant_id: tenantId,
        source_type: 'boarding',
        source_id: admissionId,
        invoice_id: invoiceId,
        link_kind: linkKind,
        amount: amount ?? null,
        created_by: user.id,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Billing link created');
      queryClient.invalidateQueries({ queryKey: ['admission-financials', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['billing-links', tenantId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create billing link');
    },
  });

  return {
    admissions,
    isLoading,
    createAdmission: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    initiateCheckout: initiateCheckoutMutation.mutateAsync,
    isInitiatingCheckout: initiateCheckoutMutation.isPending,
    confirmCheckout: confirmCheckoutMutation.mutateAsync,
    isConfirmingCheckout: confirmCheckoutMutation.isPending,
    updateAdmission: updateMutation.mutateAsync,
    createBillingLink: createBillingLinkMutation.mutateAsync,
    isCreatingBillingLink: createBillingLinkMutation.isPending,
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
        .select(ADMISSION_SELECT)
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
