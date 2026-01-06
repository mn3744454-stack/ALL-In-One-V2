import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { tGlobal } from '@/i18n';
import { toast } from 'sonner';

export interface HRModules {
  assignments: boolean;
  attendance: boolean;
  documents: boolean;
}

export interface HRSettings {
  tenant_id: string;
  enabled_modules: HRModules;
  created_at: string;
  updated_at: string;
}

const DEFAULT_MODULES: HRModules = {
  assignments: true,
  attendance: false,
  documents: false,
};

export function useHRSettings() {
  const { activeTenant, activeRole } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = activeTenant?.tenant?.id;

  const canManage = activeRole === 'owner' || activeRole === 'manager';

  // Fetch or create settings (upsert pattern)
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['hr-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Try to get existing settings
      const { data, error } = await supabase
        .from('hr_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist and user can manage, create default
      if (!data && canManage) {
        const insertPayload = {
          tenant_id: tenantId,
          enabled_modules: JSON.parse(JSON.stringify(DEFAULT_MODULES)),
        };
        
        const { data: newSettings, error: insertError } = await supabase
          .from('hr_settings')
          .insert([insertPayload])
          .select()
          .single();

        if (insertError) throw insertError;
        return {
          ...newSettings,
          enabled_modules: newSettings.enabled_modules as unknown as HRModules,
        } as HRSettings;
      }

      if (data) {
        return {
          ...data,
          enabled_modules: (data.enabled_modules || DEFAULT_MODULES) as unknown as HRModules,
        } as HRSettings;
      }

      // Return default if no data and can't create
      return {
        tenant_id: tenantId,
        enabled_modules: DEFAULT_MODULES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as HRSettings;
    },
    enabled: !!tenantId,
  });

  // Update modules
  const updateMutation = useMutation({
    mutationFn: async (modules: Partial<HRModules>) => {
      if (!tenantId) throw new Error(tGlobal('hr.toasts.noActiveOrganization'));

      const newModules = {
        ...settings?.enabled_modules,
        ...modules,
      };

      const { data, error } = await supabase
        .from('hr_settings')
        .upsert({
          tenant_id: tenantId,
          enabled_modules: newModules,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-settings', tenantId] });
      toast.success(tGlobal('hr.settings.updated'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    settings,
    isLoading,
    error,
    canManage,
    isModuleEnabled: (module: keyof HRModules) => settings?.enabled_modules?.[module] ?? DEFAULT_MODULES[module],
    updateModules: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
