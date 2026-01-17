import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { User, Briefcase, Phone, Mail, Calendar, DollarSign, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee, HrEmployeeType, CreateEmployeeData } from '@/hooks/hr/useEmployees';
import type { EmploymentKind } from '@/hooks/hr/useEmploymentKind';

const EMPLOYEE_TYPES: HrEmployeeType[] = [
  'trainer', 'groom', 'vet_tech', 'receptionist',
  'lab_tech', 'admin', 'manager', 'driver', 'farrier', 'other'
];

interface ExtendedEmployeeData extends CreateEmployeeData {
  employment_kind?: EmploymentKind;
  salary_amount?: number | null;
  salary_currency?: string | null;
  start_date?: string | null;
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee & { employment_kind?: EmploymentKind; salary_amount?: number; salary_currency?: string; start_date?: string };
  onSubmit: (data: ExtendedEmployeeData) => Promise<void>;
  isSubmitting?: boolean;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isSubmitting,
}: EmployeeFormDialogProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();
  const isEditing = !!employee;

  const [formData, setFormData] = useState<ExtendedEmployeeData>({
    full_name: '',
    employee_type: 'other',
    employee_type_custom: '',
    department: '',
    phone: '',
    email: '',
    notes: '',
    tags: [],
    employment_kind: 'external',
    salary_amount: null,
    salary_currency: 'SAR',
    start_date: null,
  });

  // Reset form when opening/closing or when employee changes
  useEffect(() => {
    if (open && employee) {
      setFormData({
        full_name: employee.full_name,
        employee_type: employee.employee_type,
        employee_type_custom: employee.employee_type_custom || '',
        department: employee.department || '',
        phone: employee.phone || '',
        email: employee.email || '',
        notes: employee.notes || '',
        tags: employee.tags || [],
        employment_kind: employee.employment_kind || 'external',
        salary_amount: employee.salary_amount || null,
        salary_currency: employee.salary_currency || 'SAR',
        start_date: employee.start_date || null,
      });
    } else if (open && !employee) {
      setFormData({
        full_name: '',
        employee_type: 'other',
        employee_type_custom: '',
        department: '',
        phone: '',
        email: '',
        notes: '',
        tags: [],
        employment_kind: 'internal', // New employees default to internal
        salary_amount: null,
        salary_currency: 'SAR',
        start_date: null,
      });
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    
    await onSubmit(formData);
  };

  const isInternal = formData.employment_kind === 'internal';

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Section: Basic Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="h-4 w-4" />
          {t('hr.basicInfo')}
        </div>
        
        {/* Full Name - Required */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="full_name" className="text-sm font-medium">
            {t('hr.fullName')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder={t('hr.fullNamePlaceholder')}
            required
            autoFocus
          />
        </div>

        {/* Employment Kind */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="employment_kind" className="text-sm font-medium">
            {t('hr.employmentKind')}
          </Label>
          <Select
            value={formData.employment_kind}
            onValueChange={(value) => setFormData({ 
              ...formData, 
              employment_kind: value as EmploymentKind,
            })}
          >
            <SelectTrigger id="employment_kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">{t('hr.internal')}</Badge>
                </div>
              </SelectItem>
              <SelectItem value="external">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{t('hr.external')}</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isInternal ? t('hr.internalDesc') : t('hr.externalDesc')}
          </p>
        </div>

        {/* Employee Type */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="employee_type" className="text-sm font-medium">
            {t('hr.employeeType')}
          </Label>
          <Select
            value={formData.employee_type}
            onValueChange={(value) => setFormData({ 
              ...formData, 
              employee_type: value as HrEmployeeType,
              employee_type_custom: value === 'other' ? formData.employee_type_custom : ''
            })}
          >
            <SelectTrigger id="employee_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`hr.employeeTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Type - only when type is 'other' */}
        {formData.employee_type === 'other' && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee_type_custom" className="text-sm font-medium">
              {t('hr.customType')}
            </Label>
            <Input
              id="employee_type_custom"
              value={formData.employee_type_custom || ''}
              onChange={(e) => setFormData({ ...formData, employee_type_custom: e.target.value })}
              placeholder={t('hr.customTypePlaceholder')}
            />
          </div>
        )}

        {/* Department */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="department" className="text-sm font-medium">
            {t('hr.department')}
          </Label>
          <Input
            id="department"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder={t('hr.departmentPlaceholder')}
          />
        </div>
      </div>

      {/* Section: Contact */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Phone className="h-4 w-4" />
          {t('hr.contactInfo')}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              {t('hr.phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('hr.phonePlaceholder')}
              dir="ltr"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t('hr.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('hr.emailPlaceholder')}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Section: Employment Details (Internal only) */}
      {isInternal && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            {t('hr.employmentDetails')}
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_date" className="text-sm font-medium">
                {t('hr.startDate')}
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                dir="ltr"
              />
            </div>

            {/* Salary */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="salary_amount" className="text-sm font-medium">
                {t('hr.salary')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="salary_amount"
                  type="number"
                  value={formData.salary_amount || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    salary_amount: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="0.00"
                  className="flex-1"
                  dir="ltr"
                />
                <Select
                  value={formData.salary_currency || 'SAR'}
                  onValueChange={(value) => setFormData({ ...formData, salary_currency: value })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Notes */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          {t('hr.additionalInfo')}
        </div>
        
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            {t('hr.notes')}
          </Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('hr.notesPlaceholder')}
            rows={3}
          />
        </div>
      </div>
    </form>
  );

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}
      >
        {t('common.cancel')}
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!formData.full_name.trim() || isSubmitting}
      >
        {isSubmitting ? t('common.loading') : isEditing ? t('common.update') : t('common.create')}
      </Button>
    </div>
  );

  // Mobile: use bottom sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? t('hr.editEmployee') : t('hr.addEmployee')}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 px-1">
            {formContent}
          </div>
          <SheetFooter className="pt-4 border-t">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use dialog with wider layout
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('hr.editEmployee') : t('hr.addEmployee')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {formContent}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}