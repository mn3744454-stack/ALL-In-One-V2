import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeeDetailsSheet } from './EmployeeDetailsSheet';
import { BilingualName } from '@/components/ui/BilingualName';
import { ResponsibilitiesCell } from './ResponsibilitiesCell';
import { Plus, Search, Settings, Users } from 'lucide-react';
import { useEmploymentKind } from '@/hooks/hr/useEmploymentKind';
import { useEmployeesAssignmentCounts } from '@/hooks/hr/useEmployeesAssignmentCounts';
import { ViewSwitcher, getGridClass } from '@/components/ui/ViewSwitcher';
import { useViewPreference } from '@/hooks/useViewPreference';
import type { Employee, EmployeeFilters, HrEmployeeType, CreateEmployeeData, UpdateEmployeeData } from '@/hooks/hr/useEmployees';

const EMPLOYEE_TYPES: HrEmployeeType[] = [
  'trainer', 'groom', 'vet_tech', 'receptionist',
  'lab_tech', 'admin', 'manager', 'driver', 'farrier', 'other'
];

interface EmployeesListProps {
  employees: Employee[];
  isLoading: boolean;
  filters: EmployeeFilters;
  onFiltersChange: (filters: EmployeeFilters) => void;
  onCreateEmployee: (data: CreateEmployeeData) => Promise<Employee>;
  onUpdateEmployee: (id: string, data: UpdateEmployeeData) => Promise<Employee>;
  onActivateEmployee: (id: string) => Promise<Employee>;
  onDeactivateEmployee: (id: string) => Promise<Employee>;
  isCreating?: boolean;
  isUpdating?: boolean;
  /** Optional secondary action (e.g. HR Settings) shown in the toolbar next to Add Employee */
  settingsAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmployeesList({
  employees,
  isLoading,
  filters,
  onFiltersChange,
  onCreateEmployee,
  onUpdateEmployee,
  onActivateEmployee,
  onDeactivateEmployee,
  isCreating,
  isUpdating,
  settingsAction,
}: EmployeesListProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('hr_employees');
  const { updateEmploymentKind, isUpdating: isTogglingKind } = useEmploymentKind();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Summary counts
  const totalCount = employees.length;
  const internalCount = employees.filter(e => e.employment_kind === 'internal').length;
  const externalCount = employees.filter(e => e.employment_kind === 'external').length;

  // Phase D — aggregate horse-backed responsibility counts for the visible list.
  const { countsMap } = useEmployeesAssignmentCounts(employees.map(e => e.id));

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (value: string) => {
    const isActive = value === 'all' ? 'all' : value === 'active';
    onFiltersChange({ ...filters, isActive });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      employeeType: value as HrEmployeeType | 'all' 
    });
  };

  const handleEditFromDetails = () => {
    if (selectedEmployee) {
      setEditingEmployee(selectedEmployee);
      setSelectedEmployee(null);
    }
  };

  const handleToggleActiveFromDetails = async () => {
    if (!selectedEmployee) return;
    
    if (selectedEmployee.is_active) {
      await onDeactivateEmployee(selectedEmployee.id);
    } else {
      await onActivateEmployee(selectedEmployee.id);
    }
    setSelectedEmployee(null);
  };

  const handleToggleEmploymentKind = async () => {
    if (!selectedEmployee) return;
    const newKind = selectedEmployee.employment_kind === 'internal' ? 'external' : 'internal';
    await updateEmploymentKind({ employeeId: selectedEmployee.id, employmentKind: newKind });
    setSelectedEmployee(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with counters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-foreground">
            {t('hr.title')}
          </h1>
          {!isLoading && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {totalCount} {t('hr.total')}
              </Badge>
              <Badge variant="default" className="text-xs">
                {internalCount} {t('hr.internal')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {externalCount} {t('hr.external')}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hide ViewSwitcher on mobile */}
          <div className="hidden md:block">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
          {settingsAction && (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={settingsAction.onClick}
              className="gap-2 shrink-0 hidden md:inline-flex"
            >
              <Settings className="h-4 w-4" />
              <span>{settingsAction.label}</span>
            </Button>
          )}
          <Button
            onClick={() => setShowCreateDialog(true)}
            size={isMobile ? "sm" : "default"}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('hr.addEmployee')}</span>
            <span className="sm:hidden">{t('common.add')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('hr.searchPlaceholder')}
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.isActive === 'all' ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder={t('hr.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('hr.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('common.active')}</SelectItem>
            <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select
          value={filters.employeeType || 'all'}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t('hr.filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('hr.allTypes')}</SelectItem>
            {EMPLOYEE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`hr.employeeTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className={getGridClass(gridColumns, viewMode)}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-xl" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {t('hr.noEmployees')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('hr.addFirstEmployee')}
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('hr.addEmployee')}
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border">
                <TableHead className="font-semibold text-foreground">{t('hr.name')}</TableHead>
                <TableHead className="font-semibold text-foreground">{t('hr.employeeType')}</TableHead>
                <TableHead className="font-semibold text-foreground">{t('hr.department')}</TableHead>
                <TableHead className="font-semibold text-foreground text-center">{t('hr.phone')}</TableHead>
                <TableHead className="font-semibold text-foreground">{t('hr.responsibilities')}</TableHead>
                <TableHead className="font-semibold text-foreground text-center">{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <TableCell>
                    <BilingualName name={employee.full_name} nameAr={employee.full_name_ar} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {t(`hr.employeeTypes.${employee.employee_type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {employee.department || '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm" dir="ltr">
                    {employee.phone || '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ResponsibilitiesCell
                      employeeId={employee.id}
                      employeeFullName={employee.full_name}
                      employeeFullNameAr={employee.full_name_ar}
                      count={countsMap.get(employee.id) ?? 0}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className={employee.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}
                    >
                      {employee.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={() => setSelectedEmployee(employee)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <EmployeeFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (data) => {
          await onCreateEmployee(data);
          setShowCreateDialog(false);
        }}
        isSubmitting={isCreating}
      />

      {/* Edit Dialog */}
      <EmployeeFormDialog
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
        employee={editingEmployee || undefined}
        onSubmit={async (data) => {
          if (editingEmployee) {
            await onUpdateEmployee(editingEmployee.id, data);
            setEditingEmployee(null);
          }
        }}
        isSubmitting={isUpdating}
      />

      {/* Details Sheet */}
      <EmployeeDetailsSheet
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onEdit={handleEditFromDetails}
        onToggleActive={handleToggleActiveFromDetails}
        onToggleEmploymentKind={handleToggleEmploymentKind}
        isTogglingKind={isTogglingKind}
      />
    </div>
  );
}
