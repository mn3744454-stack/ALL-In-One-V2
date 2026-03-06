import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployees } from '@/hooks/hr';
import { useTenant } from '@/contexts/TenantContext';
import { EmployeesList } from '@/components/hr';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobilePageHeader } from '@/components/navigation';

export default function DashboardHR() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeRole } = useTenant();
  
  const canManage = activeRole === 'owner' || activeRole === 'manager';
  
  const {
    employees,
    isLoading,
    filters,
    setFilters,
    createEmployee,
    updateEmployee,
    activateEmployee,
    deactivateEmployee,
    isCreating,
    isUpdating,
  } = useEmployees();

  return (
    <>
      <Helmet>
        <title>{t('hr.title')} | Khail</title>
      </Helmet>

      <DashboardShell
        headerRight={canManage ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/hr/settings')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {t('hr.settings.title')}
          </Button>
        ) : undefined}
      >
        {/* Mobile Header */}
        <MobilePageHeader 
          title={t('hr.title')} 
          backTo="/dashboard"
          rightElement={canManage ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/hr/settings')}
              className="shrink-0"
            >
              <Settings className="h-5 w-5" />
            </Button>
          ) : undefined}
        />

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <EmployeesList
            employees={employees}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onCreateEmployee={createEmployee}
            onUpdateEmployee={updateEmployee}
            onActivateEmployee={activateEmployee}
            onDeactivateEmployee={deactivateEmployee}
            isCreating={isCreating}
            isUpdating={isUpdating}
          />
        </div>
      </DashboardShell>
    </>
  );
}
