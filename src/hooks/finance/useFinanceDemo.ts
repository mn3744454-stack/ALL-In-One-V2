import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';
import { addDays, subDays, format } from 'date-fns';

export function useFinanceDemo() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManageDemo = activeRole === 'owner' || activeRole === 'manager';

  // Check if demo data exists
  const { data: demoExists = false, isLoading: isCheckingDemo } = useQuery({
    queryKey: ['finance-demo-exists', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;

      // Check for demo expenses or invoices
      const { data: expenses } = await supabase
        .from('expenses' as any)
        .select('id')
        .eq('tenant_id', tenantId)
        .like('notes', '%[DEMO]%')
        .limit(1);

      return (expenses?.length || 0) > 0;
    },
    enabled: !!tenantId,
  });

  const loadDemoMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No active organization');

      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      const today = new Date();

      // Create demo expenses
      const demoExpenses = [
        {
          tenant_id: tenantId,
          category: 'feed',
          description: 'Monthly hay supply',
          amount: 2500,
          currency: 'SAR',
          expense_date: format(subDays(today, 5), 'yyyy-MM-dd'),
          vendor_name: 'Al-Madinah Feed Co.',
          status: 'paid',
          notes: '[DEMO] Premium alfalfa hay delivery',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          category: 'veterinary',
          description: 'Routine health checkups',
          amount: 1800,
          currency: 'SAR',
          expense_date: format(subDays(today, 3), 'yyyy-MM-dd'),
          vendor_name: 'Dr. Ahmed Veterinary Clinic',
          status: 'approved',
          notes: '[DEMO] Quarterly health examination for 6 horses',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          category: 'equipment',
          description: 'New saddles and riding gear',
          amount: 4200,
          currency: 'SAR',
          expense_date: format(subDays(today, 10), 'yyyy-MM-dd'),
          vendor_name: 'Equestrian Supplies Ltd.',
          status: 'paid',
          notes: '[DEMO] 2 Western saddles, bridles, and accessories',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          category: 'maintenance',
          description: 'Stable repairs',
          amount: 850,
          currency: 'SAR',
          expense_date: format(subDays(today, 2), 'yyyy-MM-dd'),
          vendor_name: 'Quick Fix Maintenance',
          status: 'pending',
          notes: '[DEMO] Door repairs and fence maintenance',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          category: 'utilities',
          description: 'Electricity bill',
          amount: 1200,
          currency: 'SAR',
          expense_date: format(subDays(today, 1), 'yyyy-MM-dd'),
          vendor_name: 'Saudi Electric Company',
          status: 'pending',
          notes: '[DEMO] Monthly electricity for stables',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          category: 'transportation',
          description: 'Horse transport to show',
          amount: 3500,
          currency: 'SAR',
          expense_date: format(subDays(today, 7), 'yyyy-MM-dd'),
          vendor_name: 'Premium Horse Transport',
          status: 'paid',
          notes: '[DEMO] Round trip transport for competition',
          created_by: userId,
        },
      ];

      const { error: expensesError } = await supabase
        .from('expenses' as any)
        .insert(demoExpenses);

      if (expensesError && expensesError.code !== '42P01') throw expensesError;

      // Create demo invoices
      const demoInvoices = [
        {
          tenant_id: tenantId,
          invoice_number: `INV-${format(today, 'yyyyMM')}-001`,
          client_name: 'Mohammed Al-Faisal',
          status: 'paid',
          issue_date: format(subDays(today, 20), 'yyyy-MM-dd'),
          due_date: format(subDays(today, 5), 'yyyy-MM-dd'),
          subtotal: 5000,
          tax_amount: 750,
          discount_amount: 0,
          total_amount: 5750,
          currency: 'SAR',
          notes: '[DEMO] Monthly boarding for 2 horses',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          invoice_number: `INV-${format(today, 'yyyyMM')}-002`,
          client_name: 'Abdullah Trading Co.',
          status: 'sent',
          issue_date: format(subDays(today, 10), 'yyyy-MM-dd'),
          due_date: format(addDays(today, 5), 'yyyy-MM-dd'),
          subtotal: 8500,
          tax_amount: 1275,
          discount_amount: 500,
          total_amount: 9275,
          currency: 'SAR',
          notes: '[DEMO] Training program - 3 months',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          invoice_number: `INV-${format(today, 'yyyyMM')}-003`,
          client_name: 'Khalid Horse Farm',
          status: 'overdue',
          issue_date: format(subDays(today, 45), 'yyyy-MM-dd'),
          due_date: format(subDays(today, 15), 'yyyy-MM-dd'),
          subtotal: 12000,
          tax_amount: 1800,
          discount_amount: 0,
          total_amount: 13800,
          currency: 'SAR',
          notes: '[DEMO] Breeding services',
          created_by: userId,
        },
        {
          tenant_id: tenantId,
          invoice_number: `INV-${format(today, 'yyyyMM')}-004`,
          client_name: 'Princess Noura Stables',
          status: 'draft',
          issue_date: format(today, 'yyyy-MM-dd'),
          due_date: format(addDays(today, 30), 'yyyy-MM-dd'),
          subtotal: 3200,
          tax_amount: 480,
          discount_amount: 200,
          total_amount: 3480,
          currency: 'SAR',
          notes: '[DEMO] Veterinary consultation package',
          created_by: userId,
        },
      ];

      const { error: invoicesError } = await supabase
        .from('invoices' as any)
        .insert(demoInvoices);

      if (invoicesError && invoicesError.code !== '42P01') throw invoicesError;

      return { expensesCount: demoExpenses.length, invoicesCount: demoInvoices.length };
    },
    onSuccess: () => {
      toast.success('Demo finance data loaded successfully');
      queryClient.invalidateQueries({ queryKey: ['finance-demo-exists', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeDemoMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No active organization');

      // Delete demo expenses
      await supabase
        .from('expenses' as any)
        .delete()
        .eq('tenant_id', tenantId)
        .like('notes', '%[DEMO]%');

      // Delete demo invoices
      await supabase
        .from('invoices' as any)
        .delete()
        .eq('tenant_id', tenantId)
        .like('notes', '%[DEMO]%');
    },
    onSuccess: () => {
      toast.success('Demo finance data removed');
      queryClient.invalidateQueries({ queryKey: ['finance-demo-exists', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    canManageDemo,
    demoExists,
    isCheckingDemo,
    loadDemoData: loadDemoMutation.mutateAsync,
    removeDemoData: removeDemoMutation.mutateAsync,
    isLoading: loadDemoMutation.isPending,
    isRemoving: removeDemoMutation.isPending,
  };
}
