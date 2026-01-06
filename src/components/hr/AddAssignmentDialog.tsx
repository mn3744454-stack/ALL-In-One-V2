import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEmployees } from '@/hooks/hr/useEmployees';
import { useHorseAssignments, ASSIGNMENT_ROLES } from '@/hooks/hr/useHorseAssignments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseId: string;
  horseName: string;
  existingEmployeeIds?: string[];
}

export function AddAssignmentDialog({
  open,
  onOpenChange,
  horseId,
  horseName,
  existingEmployeeIds = [],
}: AddAssignmentDialogProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();
  const { employees } = useEmployees();
  const { createAssignment, isCreating } = useHorseAssignments(horseId);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  // Filter out employees already assigned with any role
  const availableEmployees = employees.filter(
    (emp) => emp.is_active && !existingEmployeeIds.includes(emp.id)
  );

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !selectedRole) return;

    await createAssignment({
      employee_id: selectedEmployeeId,
      role: selectedRole,
      notes: notes || null,
    });

    // Reset and close
    setSelectedEmployeeId('');
    setSelectedRole('');
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedEmployeeId('');
    setSelectedRole('');
    setNotes('');
    onOpenChange(false);
  };

  const formContent = (
    <div className="space-y-6 p-4">
      {/* Employee Select */}
      <div className="space-y-2">
        <Label>{t('hr.assignments.selectEmployee')} *</Label>
        <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !selectedEmployeeId && "text-muted-foreground"
              )}
            >
              {selectedEmployee ? selectedEmployee.full_name : t('hr.assignments.searchEmployees')}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={t('hr.assignments.searchEmployees')} />
              <CommandList>
                <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                <CommandGroup>
                  {availableEmployees.map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={emp.full_name}
                      onSelect={() => {
                        setSelectedEmployeeId(emp.id);
                        setEmployeeSearchOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "me-2 h-4 w-4",
                          selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{emp.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {t(`hr.employeeTypes.${emp.employee_type}`)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Role Select */}
      <div className="space-y-2">
        <Label>{t('hr.assignments.role')} *</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue placeholder={t('hr.assignments.selectRole')} />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNMENT_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`hr.assignments.roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>{t('hr.assignments.notes')}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('hr.assignments.notesPlaceholder')}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleClose}
          disabled={isCreating}
        >
          {t('common.cancel')}
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!selectedEmployeeId || !selectedRole || isCreating}
        >
          {isCreating ? t('common.loading') : t('hr.assignments.addAssignment')}
        </Button>
      </div>
    </div>
  );

  const title = t('hr.assignments.assignTo').replace('{{name}}', horseName);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
