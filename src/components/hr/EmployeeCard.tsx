import { useI18n } from '@/i18n';
import { DirectionalIcon } from '@/components/ui/directional-icon';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Phone, Mail, Briefcase, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Employee } from '@/hooks/hr/useEmployees';

interface ExtendedEmployee extends Employee {
  employment_kind?: 'internal' | 'external';
  salary_amount?: number | null;
  salary_currency?: string | null;
  start_date?: string | null;
  avatar_url?: string | null;
}

interface EmployeeCardProps {
  employee: ExtendedEmployee;
  onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const { t } = useI18n();

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

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/50 cursor-pointer transition-all",
        "hover:shadow-md hover:border-border active:scale-[0.99]",
        "min-h-[80px]"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-12 w-12 shrink-0">
          {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.full_name} />}
          <AvatarFallback className={cn(
            "text-sm font-medium",
            employee.is_active 
              ? "bg-gradient-to-br from-gold to-gold-dark text-navy" 
              : "bg-muted text-muted-foreground"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">
              {employee.full_name}
            </span>
            {!employee.is_active && (
              <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                {t('common.inactive')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Employment Kind Badge */}
            <Badge 
              variant={isInternal ? "default" : "secondary"}
              className="text-[10px] px-1.5 shrink-0"
            >
              {isInternal ? t('hr.internal') : t('hr.external')}
            </Badge>
            
            {/* Employee Type */}
            <Badge 
              variant="outline"
              className="text-[10px] px-1.5 shrink-0"
            >
              {displayType}
            </Badge>
            
            {/* Department - visible on larger screens */}
            {employee.department && (
              <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[100px]">
                {employee.department}
              </span>
            )}
          </div>

          {/* Additional info row - visible on larger screens */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {employee.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(employee.start_date), 'MMM yyyy')}
              </span>
            )}
            {isInternal && employee.salary_amount && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {employee.salary_amount.toLocaleString()} {employee.salary_currency || 'SAR'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Quick action icons - visible on larger screens */}
        <div className="hidden sm:flex items-center gap-1">
          {employee.phone && (
            <a
              href={`tel:${employee.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={t('hr.phone')}
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
          {employee.email && (
            <a
              href={`mailto:${employee.email}`}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label={t('hr.email')}
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>

        {/* Status indicator */}
        <div className={cn(
          "w-2.5 h-2.5 rounded-full shrink-0",
          employee.is_active ? "bg-green-500" : "bg-muted-foreground/30"
        )} />

        <DirectionalIcon 
          icon={ChevronRight} 
          className="h-5 w-5 text-muted-foreground" 
          flipInRTL 
        />
      </div>
    </div>
  );
}