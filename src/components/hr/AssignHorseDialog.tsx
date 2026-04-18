import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHorses } from '@/hooks/useHorses';
import { ASSIGNMENT_ROLES } from '@/hooks/hr/useHorseAssignments';
import { useEmployeeHorseAssignment } from '@/hooks/hr/useEmployeeHorseAssignment';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BilingualName } from '@/components/ui/BilingualName';
import { Check, ChevronsUpDown, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignHorseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  existingHorseIds?: string[];
}

export function AssignHorseDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  existingHorseIds = [],
}: AssignHorseDialogProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { horses } = useHorses();
  const { createAssignment, isCreating } = useEmployeeHorseAssignment(employeeId);

  const [selectedHorseId, setSelectedHorseId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [horseSearchOpen, setHorseSearchOpen] = useState(false);

  const availableHorses = horses.filter((h) => !existingHorseIds.includes(h.id));
  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  const handleClose = () => {
    setSelectedHorseId('');
    setSelectedRole('');
    setNotes('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedHorseId || !selectedRole) return;
    await createAssignment({
      horse_id: selectedHorseId,
      role: selectedRole,
      notes: notes || null,
    });
    handleClose();
  };

  const formContent = (
    <div className="space-y-6 p-4">
      {/* Horse Select */}
      <div className="space-y-2">
        <Label>{t('hr.assignments.selectHorse')} *</Label>
        <Popover open={horseSearchOpen} onOpenChange={setHorseSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                'w-full justify-between',
                !selectedHorseId && 'text-muted-foreground'
              )}
            >
              {selectedHorse ? (
                <BilingualName name={selectedHorse.name} nameAr={selectedHorse.name_ar} inline />
              ) : (
                t('hr.assignments.searchHorses')
              )}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={t('hr.assignments.searchHorses')} />
              <CommandList>
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                    <Heart className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {availableHorses.length === 0
                        ? t('hr.assignments.noHorsesAvailable')
                        : t('common.noResults')}
                    </p>
                  </div>
                </CommandEmpty>
                {availableHorses.length > 0 && (
                  <CommandGroup>
                    {availableHorses.map((horse) => (
                      <CommandItem
                        key={horse.id}
                        value={`${horse.name} ${horse.name_ar || ''}`}
                        onSelect={() => {
                          setSelectedHorseId(horse.id);
                          setHorseSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'me-2 h-4 w-4',
                            selectedHorseId === horse.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <BilingualName name={horse.name} nameAr={horse.name_ar} />
                          {horse.breed && (
                            <span className="text-xs text-muted-foreground">{horse.breed}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
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
          disabled={!selectedHorseId || !selectedRole || isCreating}
        >
          {isCreating ? t('common.loading') : t('hr.assignments.addAssignment')}
        </Button>
      </div>
    </div>
  );

  const title = t('hr.assignments.assignHorseTo').replace('{{name}}', employeeName);

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
