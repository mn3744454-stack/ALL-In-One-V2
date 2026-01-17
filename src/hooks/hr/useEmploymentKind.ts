import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/i18n';
import { toast } from 'sonner';

export type EmploymentKind = 'internal' | 'external';

interface UpdateEmploymentKindResult {
  success: boolean;
  employee_id?: string;
  employment_kind?: EmploymentKind;
  error?: string;
}

export function useEmploymentKind() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const mutation = useMutation({
    mutationFn: async ({
      employeeId,
      employmentKind,
      previousKind,
    }: {
      employeeId: string;
      employmentKind: EmploymentKind;
      previousKind?: EmploymentKind;
    }) => {
      const { data, error } = await supabase.rpc('hr_update_employment_kind', {
        _employee_id: employeeId,
        _employment_kind: employmentKind,
      });

      if (error) throw error;

      const result = data as unknown as UpdateEmploymentKindResult;
      if (!result?.success) {
        throw new Error(result?.error || t('common.error'));
      }

      // Log employment_kind_changed event
      if (tenantId && user?.id) {
        await supabase.from('hr_employee_events').insert({
          tenant_id: tenantId,
          employee_id: employeeId,
          event_type: 'employment_kind_changed',
          event_payload: {
            from: previousKind || 'unknown',
            to: employmentKind,
          },
          created_by: user.id,
        });
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hr-employee-events', tenantId] });
      toast.success(
        data.employment_kind === 'internal'
          ? t('hr.convertedToInternal')
          : t('hr.convertedToExternal')
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    updateEmploymentKind: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
