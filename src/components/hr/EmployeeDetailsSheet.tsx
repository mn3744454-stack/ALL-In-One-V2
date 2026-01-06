import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Phone, Mail, Edit, Power, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmployeeAssignedHorses } from './EmployeeAssignedHorses';
import type { Employee } from '@/hooks/hr/useEmployees';

interface EmployeeDetailsSheetProps {
  employee: Employee | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => Promise<void>;
}

export function EmployeeDetailsSheet({
  employee,
  onClose,
  onEdit,
  onToggleActive,
}: EmployeeDetailsSheetProps) {
  const { t, dir } = useI18n();
  const isMobile = useIsMobile();

  if (!employee) return null;

  const initials = employee.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const displayType = employee.employee_type === 'other' && employee.employee_type_custom
    ? employee.employee_type_custom
    : t(`hr.employeeTypes.${employee.employee_type}`);

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    href 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null; 
    href?: string;
  }) => {
    if (!value) return null;
    
    const content = (
      <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm text-foreground break-all" dir={href ? 'ltr' : undefined}>
            {value}
          </span>
        </div>
      </div>
    );

    if (href) {
      return (
        <a href={href} className="block hover:bg-muted/50 rounded-lg -mx-2 px-2 transition-colors">
          {content}
        </a>
      );
    }

    return content;
  };

  return (
    <Sheet open={!!employee} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side={isMobile ? "bottom" : (dir === 'rtl' ? 'left' : 'right')}
        className={cn(
          isMobile ? "h-[85vh]" : "sm:max-w-[400px]",
          "flex flex-col"
        )}
      >
        <SheetHeader className="text-center pb-4 border-b border-border/50">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarFallback className={cn(
                "text-xl font-semibold",
                employee.is_active 
                  ? "bg-gradient-to-br from-gold to-gold-dark text-navy" 
                  : "bg-muted text-muted-foreground"
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-lg">
                {employee.full_name}
              </SheetTitle>
              <div className="flex items-center justify-center gap-2">
                <Badge variant={employee.is_active ? "secondary" : "outline"}>
                  {displayType}
                </Badge>
                <Badge variant={employee.is_active ? "default" : "outline"}>
                  {employee.is_active ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {employee.department && (
            <InfoRow
              icon={({ className }: { className?: string }) => (
                <span className={cn(className, "text-base")}>🏢</span>
              )}
              label={t('hr.department')}
              value={employee.department}
            />
          )}
          
          <InfoRow
            icon={Phone}
            label={t('hr.phone')}
            value={employee.phone}
            href={employee.phone ? `tel:${employee.phone}` : undefined}
          />
          
          <InfoRow
            icon={Mail}
            label={t('hr.email')}
            value={employee.email}
            href={employee.email ? `mailto:${employee.email}` : undefined}
          />

          <InfoRow
            icon={Calendar}
            label={t('hr.createdAt')}
            value={format(new Date(employee.created_at), 'PPP')}
          />

          {employee.notes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground block mb-1">
                {t('hr.notes')}
              </span>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {employee.notes}
              </p>
            </div>
          )}

          {/* Assigned Horses */}
          <EmployeeAssignedHorses employeeId={employee.id} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
            {t('common.edit')}
          </Button>
          <Button
            variant={employee.is_active ? "destructive" : "default"}
            className="flex-1 gap-2"
            onClick={onToggleActive}
          >
            <Power className="h-4 w-4" />
            {employee.is_active ? t('hr.deactivate') : t('hr.activate')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
