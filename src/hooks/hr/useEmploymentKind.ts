import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const mutation = useMutation({
    mutationFn: async ({
      employeeId,
      employmentKind,
    }: {
      employeeId: string;
      employmentKind: EmploymentKind;
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

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees', tenantId] });
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
