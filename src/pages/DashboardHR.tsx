import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployees } from '@/hooks/hr';
import { useTenant } from '@/contexts/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { EmployeesList } from '@/components/hr';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobilePageHeader } from '@/components/navigation';

/** Phase 2 — normalized HR entry kind derived from the existing `kind` query parameter. */
export type HrKind = 'employee' | 'collaborator';

function normalizeKind(value: string | null): HrKind | undefined {
  if (value === 'employee') return 'employee';
  if (value === 'collaborator') return 'collaborator';
  return undefined;
}

export default function DashboardHR() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeRole } = useTenant();
  const { hasPermission } = usePermissions();

  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const kind = normalizeKind(searchParams.get('kind'));

  const headingKey =
    kind === 'collaborator' ? 'hr.collaborators' : kind === 'employee' ? 'hr.title' : 'hr.title';

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
        <title>{t(headingKey)} | Dayli Horse</title>
      </Helmet>

      <DashboardShell>
        {/* Mobile Header */}
        <MobilePageHeader 
          title={t(headingKey)} 
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
            kind={kind}
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
            settingsAction={canManage ? {
              label: t('hr.settings.title'),
              onClick: () => navigate('/dashboard/hr/settings'),
            } : undefined}
            accessAction={hasPermission('team.view') ? {
              label: t('hr.peopleAndInvitations'),
              onClick: () => navigate('/dashboard/team?tab=people'),
            } : undefined}
          />
        </div>
      </DashboardShell>
    </>
  );
}
