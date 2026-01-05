import { Helmet } from 'react-helmet-async';
import { useI18n } from '@/i18n';
import { useEmployees } from '@/hooks/hr';
import { EmployeesList } from '@/components/hr';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardHR() {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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

      <div className="min-h-screen bg-background flex">
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
            <h1 className="text-lg font-semibold truncate">{t('hr.title')}</h1>
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
