import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Phone, Mail, Edit, Power, Calendar, DollarSign, ArrowRightLeft, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmployeeAssignedHorses } from './EmployeeAssignedHorses';
import { EmployeeTimeline } from './EmployeeTimeline';
import { SalaryPaymentsSection } from './SalaryPaymentsSection';
import type { Employee } from '@/hooks/hr/useEmployees';

interface ExtendedEmployee extends Employee {
  employment_kind?: 'internal' | 'external';
  salary_amount?: number | null;
  salary_currency?: string | null;
  start_date?: string | null;
  avatar_url?: string | null;
  user_id?: string | null;
}

interface EmployeeDetailsSheetProps {
  employee: ExtendedEmployee | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => Promise<void>;
  onToggleEmploymentKind?: () => Promise<void>;
  isTogglingKind?: boolean;
}

export function EmployeeDetailsSheet({
  employee,
  onClose,
  onEdit,
  onToggleActive,
  onToggleEmploymentKind,
  isTogglingKind,
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

  const isInternal = employee.employment_kind === 'internal';

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    href 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null | undefined; 
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
          <span className="text-sm text-foreground break-words" dir={href ? 'ltr' : undefined}>
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

  const sheetContent = (
    <>
      {/* Header */}
      <div className="text-center pb-4 border-b border-border/50 shrink-0">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20">
            {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.full_name} />}
            <AvatarFallback className={cn(
              "text-xl font-semibold",
              employee.is_active 
                ? "bg-gradient-to-br from-gold to-gold-dark text-navy" 
                : "bg-muted text-muted-foreground"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              {employee.full_name}
            </h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant={isInternal ? "default" : "secondary"}>
                {isInternal ? t('hr.internal') : t('hr.external')}
              </Badge>
              <Badge variant="outline">
                {displayType}
              </Badge>
              <Badge variant={employee.is_active ? "default" : "outline"}>
                {employee.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content - with proper padding for scrollbar */}
      <div className={cn(
        "flex-1 overflow-y-auto py-4 overflow-x-hidden",
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/30",
        dir === 'rtl' ? 'pl-2' : 'pr-2'
      )}>
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

        {employee.start_date && (
          <InfoRow
            icon={Calendar}
            label={t('hr.startDate')}
            value={format(new Date(employee.start_date), 'PPP')}
          />
        )}

        {isInternal && employee.salary_amount && (
          <InfoRow
            icon={DollarSign}
            label={t('hr.salary')}
            value={`${employee.salary_amount.toLocaleString()} ${employee.salary_currency || 'SAR'}`}
          />
        )}

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
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {employee.notes}
            </p>
          </div>
        )}

        {/* Assigned Horses - now passes user_id for member_horse_access lookup */}
        <EmployeeAssignedHorses 
          employeeId={employee.id} 
          employeeUserId={employee.user_id}
        />

        {/* Salary Payments Section - only for internal employees */}
        <SalaryPaymentsSection
          employeeId={employee.id}
          employeeName={employee.full_name}
          isInternal={isInternal}
        />

        {/* Employment History Timeline */}
        <EmployeeTimeline employeeId={employee.id} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border/50 shrink-0">
        {/* Convert Internal/External */}
        {onToggleEmploymentKind && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onToggleEmploymentKind}
            disabled={isTogglingKind}
          >
            <ArrowRightLeft className="h-4 w-4" />
            {isInternal ? t('hr.convertToExternal') : t('hr.convertToInternal')}
          </Button>
        )}
        
        <div className="flex items-center gap-3">
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
      </div>
    </>
  );

  // Mobile: use Drawer with swipe-to-close support
  if (isMobile) {
    return (
      <Drawer open={!!employee} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh] flex flex-col px-4 pb-6">
          <DrawerHeader className="relative px-0 pt-2">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute top-0",
                  dir === 'rtl' ? 'left-0' : 'right-0'
                )}
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="sr-only">{employee.full_name}</DrawerTitle>
          </DrawerHeader>
          {sheetContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use Sheet
  return (
    <Sheet open={!!employee} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side={dir === 'rtl' ? 'left' : 'right'}
        className="sm:max-w-[420px] flex flex-col overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{employee.full_name}</SheetTitle>
        </SheetHeader>
        {sheetContent}
      </SheetContent>
    </Sheet>
  );
}
