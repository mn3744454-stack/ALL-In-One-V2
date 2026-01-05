import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Employee, HrEmployeeType, CreateEmployeeData } from '@/hooks/hr/useEmployees';

const EMPLOYEE_TYPES: HrEmployeeType[] = [
  'trainer', 'groom', 'vet_tech', 'receptionist',
  'lab_tech', 'admin', 'manager', 'driver', 'farrier', 'other'
];

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
  onSubmit: (data: CreateEmployeeData) => Promise<void>;
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

  const [formData, setFormData] = useState<CreateEmployeeData>({
    full_name: '',
    employee_type: 'other',
    employee_type_custom: '',
    department: '',
    phone: '',
    email: '',
    notes: '',
    tags: [],
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
      });
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    
    await onSubmit(formData);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          dir="ltr" // Phone numbers always LTR
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
          dir="ltr" // Emails always LTR
        />
      </div>

      {/* Notes */}
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
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? t('hr.editEmployee') : t('hr.addEmployee')}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {formContent}
          </div>
          <SheetFooter className="pt-4 border-t">
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('hr.editEmployee') : t('hr.addEmployee')}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {formContent}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
