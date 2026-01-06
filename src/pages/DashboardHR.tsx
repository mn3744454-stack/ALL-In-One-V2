import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployees } from '@/hooks/hr';
import { useTenant } from '@/contexts/TenantContext';
import { EmployeesList } from '@/components/hr';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useState } from 'react';
import { Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardHR() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { activeRole } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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

      <div className="min-h-screen bg-background flex" dir={dir}>
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold truncate flex-1">{t('hr.title')}</h1>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard/hr/settings')}
                className="shrink-0"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between p-6 border-b border-border bg-card">
            <h1 className="text-xl font-semibold">{t('hr.title')}</h1>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/hr/settings')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {t('hr.settings.title')}
              </Button>
            )}
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
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
        </main>
      </div>
    </>
  );
}
