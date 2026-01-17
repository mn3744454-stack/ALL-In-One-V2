import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';

export interface SalaryPayment {
  id: string;
  tenant_id: string;
  employee_id: string;
  amount: number;
  currency: string;
  paid_at: string;
  payment_period: string | null;
  notes: string | null;
  finance_expense_id: string | null;
  created_by: string | null;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    employee_type: string;
    employment_kind: string;
  };
}

export interface CreateSalaryPaymentData {
  employee_id: string;
  amount: number;
  currency?: string;
  paid_at?: string;
  payment_period?: string;
  notes?: string;
  create_expense?: boolean;
}

export function useSalaryPayments() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const {
    data: payments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['hr-salary-payments', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('hr_salary_payments')
        .select(`
          *,
          employee:hr_employees(id, full_name, employee_type, employment_kind)
        `)
        .eq('tenant_id', tenantId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SalaryPayment[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSalaryPaymentData) => {
      if (!tenantId || !user?.id) throw new Error('No active tenant or user');

      let financeExpenseId: string | null = null;

      // Optionally create an expense record for finance integration
      if (data.create_expense) {
        // Get employee name for expense description
        const { data: employee } = await supabase
          .from('hr_employees')
          .select('full_name')
          .eq('id', data.employee_id)
          .single();

        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            tenant_id: tenantId,
            amount: data.amount,
            currency: data.currency || 'SAR',
            category: 'salaries',
            description: `${t('hr.salaryPayment')}: ${employee?.full_name || 'Employee'}`,
            expense_date: data.paid_at || new Date().toISOString().split('T')[0],
            status: 'approved',
            notes: data.notes,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!expenseError && expense) {
          financeExpenseId = expense.id;
        }
      }

      const { data: result, error } = await supabase
        .from('hr_salary_payments')
        .insert({
          tenant_id: tenantId,
          employee_id: data.employee_id,
          amount: data.amount,
          currency: data.currency || 'SAR',
          paid_at: data.paid_at || new Date().toISOString(),
          payment_period: data.payment_period || null,
          notes: data.notes || null,
          finance_expense_id: financeExpenseId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-salary-payments', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      toast.success(t('hr.salaryPaymentCreated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    payments,
    isLoading,
    error,
    createPayment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
