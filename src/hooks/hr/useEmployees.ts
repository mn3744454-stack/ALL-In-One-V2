import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';

export type HrEmployeeType = 
  | 'trainer' | 'groom' | 'vet_tech' | 'receptionist' 
  | 'lab_tech' | 'admin' | 'manager' | 'driver' | 'farrier' | 'other';

export interface Employee {
  id: string;
  tenant_id: string;
  created_by: string | null;
  full_name: string;
  employee_type: HrEmployeeType;
  employee_type_custom: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  // New fields
  user_id?: string | null;
  employment_kind?: 'internal' | 'external';
  salary_amount?: number | null;
  salary_currency?: string | null;
  start_date?: string | null;
  avatar_url?: string | null;
  documents?: unknown[];
}

export interface EmployeeFilters {
  search?: string;
  isActive?: boolean | 'all';
  employeeType?: HrEmployeeType | 'all';
  department?: string | 'all';
}

export interface CreateEmployeeData {
  full_name: string;
  employee_type: HrEmployeeType;
  employee_type_custom?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  is_active?: boolean;
}

export function useEmployees() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EmployeeFilters>({
    isActive: 'all',
    employeeType: 'all',
    search: '',
  });

  const tenantId = activeTenant?.tenant?.id;

  // Fetch employees with filters
  const {
    data: employees = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['hr-employees', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      // TENANT SCOPE FIRST - always
      let query = supabase
        .from('hr_employees')
        .select('*')
        .eq('tenant_id', tenantId);

      // THEN apply filters
      if (filters.isActive !== 'all' && filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters.employeeType && filters.employeeType !== 'all') {
        query = query.eq('employee_type', filters.employeeType);
      }

      if (filters.department && filters.department !== 'all') {
        query = query.eq('department', filters.department);
      }

      // SEARCH LAST (after tenant scope)
      if (filters.search) {
        query = query.ilike('full_name', `%${filters.search}%`);
      }

      query = query.order('full_name', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!tenantId,
  });

  // Create employee
  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeData) => {
      if (!tenantId || !user?.id) throw new Error('No active tenant or user');

      const { data: result, error } = await supabase
        .from('hr_employees')
        .insert({
          tenant_id: tenantId,
          created_by: user.id,
          full_name: data.full_name,
          employee_type: data.employee_type,
          employee_type_custom: data.employee_type === 'other' ? data.employee_type_custom : null,
          department: data.department || null,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
          tags: data.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return result as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
      toast.success(t('hr.employeeCreated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update employee
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeData }) => {
      if (!tenantId) throw new Error('No active tenant');

      const updateData: Record<string, unknown> = { ...data };
      
      // Enforce constraint: clear custom type if type is not 'other'
      if (data.employee_type && data.employee_type !== 'other') {
        updateData.employee_type_custom = null;
      }

      const { data: result, error } = await supabase
        .from('hr_employees')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT SCOPE
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!result) throw new Error(t('common.notFoundInOrg'));
      
      return result as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
      toast.success(t('hr.employeeUpdated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Deactivate employee (soft delete)
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No active tenant');

      const { data: result, error } = await supabase
        .from('hr_employees')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT SCOPE
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!result) throw new Error(t('common.notFoundInOrg'));
      
      return result as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
      toast.success(t('hr.employeeDeactivated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Activate employee
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No active tenant');

      const { data: result, error } = await supabase
        .from('hr_employees')
        .update({ is_active: true })
        .eq('id', id)
        .eq('tenant_id', tenantId) // TENANT SCOPE
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!result) throw new Error(t('common.notFoundInOrg'));
      
      return result as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
      toast.success(t('hr.employeeActivated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Get unique departments for filtering
  const departments = [...new Set(employees.filter(e => e.department).map(e => e.department))];

  return {
    employees,
    isLoading,
    error,
    refetch,
    filters,
    setFilters,
    departments,
    createEmployee: createMutation.mutateAsync,
    updateEmployee: (id: string, data: UpdateEmployeeData) => updateMutation.mutateAsync({ id, data }),
    deactivateEmployee: deactivateMutation.mutateAsync,
    activateEmployee: activateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
