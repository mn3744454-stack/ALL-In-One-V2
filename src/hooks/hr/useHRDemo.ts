import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

const DEMO_TAG = 'demo';

// Demo employees specification
const DEMO_EMPLOYEES = [
  {
    full_name: 'Ahmed Al-Rashid',
    employee_type: 'groom' as const,
    employee_category: 'field' as const,
    phone: '+966 55 111 2222',
    email: 'ahmed@demo.local',
  },
  {
    full_name: 'Sarah Johnson',
    employee_type: 'trainer' as const,
    employee_category: 'field' as const,
    phone: '+966 55 333 4444',
    email: 'sarah@demo.local',
  },
  {
    full_name: 'Mohammad Al-Faris',
    employee_type: 'farrier' as const,
    employee_category: 'field' as const,
    phone: '+966 55 555 6666',
    email: null,
  },
  {
    full_name: 'Emily Chen',
    employee_type: 'vet_tech' as const,
    employee_category: 'mixed' as const,
    phone: null,
    email: 'emily@demo.local',
  },
  {
    full_name: 'Khaled Al-Omari',
    employee_type: 'admin' as const,
    employee_category: 'office' as const,
    phone: null,
    email: null,
  },
  {
    full_name: 'Lisa Thompson',
    employee_type: 'manager' as const,
    employee_category: 'office' as const,
    phone: '+966 55 777 8888',
    email: 'lisa@demo.local',
  },
];

// Demo horses (only created if needed)
const DEMO_HORSES = [
  { name: 'Thunder', name_ar: 'رعد', gender: 'male', breed: 'Arabian' },
  { name: 'Starlight', name_ar: 'نجمة', gender: 'female', breed: 'Thoroughbred' },
];

export function useHRDemo() {
  const { activeTenant, activeRole } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManageDemo = activeRole === 'owner' || activeRole === 'manager';

  // Check if demo data exists
  const {
    data: demoExists,
    isLoading: isCheckingDemo,
  } = useQuery({
    queryKey: ['hr-demo-exists', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;

      const { count } = await supabase
        .from('hr_employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .contains('tags', [DEMO_TAG]);

      return (count ?? 0) > 0;
    },
    enabled: !!tenantId && canManageDemo,
  });

  // Load demo data
  const loadMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !user?.id) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      // Check if demo already exists
      const { count: existingCount } = await supabase
        .from('hr_employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .contains('tags', [DEMO_TAG]);

      if ((existingCount ?? 0) > 0) {
        toast.info(tGlobal('hr.demo.alreadyLoaded'));
        return { alreadyExists: true };
      }

      // 1. Check for existing horses
      const { data: existingHorses } = await supabase
        .from('horses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .limit(3);

      let horseIds: string[] = [];

      if (!existingHorses || existingHorses.length < 2) {
        // Create demo horses
        const horsesToCreate = DEMO_HORSES.map(h => ({
          ...h,
          tenant_id: tenantId,
          status: 'active',
        }));

        const { data: newHorses, error: horsesError } = await supabase
          .from('horses')
          .insert(horsesToCreate)
          .select();

        if (horsesError) {
          // If can't create horses, show message
          toast.warning(tGlobal('hr.demo.needsHorses'));
          // Continue without assignments
        } else if (newHorses) {
          horseIds = newHorses.map(h => h.id);
        }
      } else {
        horseIds = existingHorses.map(h => h.id).slice(0, 2);
      }

      // 2. Create demo employees
      const employeesToCreate = DEMO_EMPLOYEES.map(emp => ({
        ...emp,
        tenant_id: tenantId,
        created_by: user.id,
        tags: [DEMO_TAG],
        is_active: true,
      }));

      const { data: employees, error: empError } = await supabase
        .from('hr_employees')
        .insert(employeesToCreate)
        .select();

      if (empError) throw empError;
      if (!employees) throw new Error('Failed to create demo employees');

      // 3. Create demo assignments if we have horses
      if (horseIds.length >= 2 && employees.length >= 4) {
        const assignments = [
          // Horse 1 (Thunder) assignments
          { employee_id: employees[0].id, entity_id: horseIds[0], role: 'primary_groom' },
          { employee_id: employees[1].id, entity_id: horseIds[0], role: 'trainer' },
          { employee_id: employees[2].id, entity_id: horseIds[0], role: 'farrier' },
          // Horse 2 (Starlight) assignments
          { employee_id: employees[0].id, entity_id: horseIds[1], role: 'secondary_groom' },
          { employee_id: employees[3].id, entity_id: horseIds[1], role: 'vet_contact' },
          { employee_id: employees[1].id, entity_id: horseIds[1], role: 'trainer' },
        ].map(a => ({
          ...a,
          tenant_id: tenantId,
          entity_type: 'horse',
        }));

        await supabase
          .from('hr_assignments')
          .insert(assignments);
      }

      return { success: true };
    },
    onSuccess: (result) => {
      if (!result?.alreadyExists) {
        toast.success(tGlobal('hr.demo.loaded'));
      }
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-demo-exists'] });
      queryClient.invalidateQueries({ queryKey: ['horse-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['horses'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Remove demo data
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      // 1. Get demo employee IDs
      const { data: demoEmployees } = await supabase
        .from('hr_employees')
        .select('id')
        .eq('tenant_id', tenantId)
        .contains('tags', [DEMO_TAG]);

      if (demoEmployees && demoEmployees.length > 0) {
        const employeeIds = demoEmployees.map(e => e.id);

        // 2. Delete assignments for demo employees
        await supabase
          .from('hr_assignments')
          .delete()
          .in('employee_id', employeeIds);

        // 3. Delete demo employees
        await supabase
          .from('hr_employees')
          .delete()
          .eq('tenant_id', tenantId)
          .contains('tags', [DEMO_TAG]);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success(tGlobal('hr.demo.removed'));
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-demo-exists'] });
      queryClient.invalidateQueries({ queryKey: ['horse-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-assignments'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    canManageDemo,
    demoExists: demoExists ?? false,
    isCheckingDemo,
    loadDemoData: loadMutation.mutateAsync,
    removeDemoData: removeMutation.mutateAsync,
    isLoading: loadMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
