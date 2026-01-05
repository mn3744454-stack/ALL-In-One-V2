import { useI18n } from '@/i18n';
import { DirectionalIcon } from '@/components/ui/directional-icon';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronRight, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/hooks/hr/useEmployees';

interface EmployeeCardProps {
  employee: Employee;
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/50 cursor-pointer transition-all",
        "hover:shadow-md hover:border-border active:scale-[0.99]",
        "min-h-[72px]" // Ensure touch target >= 44px
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarFallback className={cn(
            "text-sm font-medium",
            employee.is_active 
              ? "bg-gradient-to-br from-gold to-gold-dark text-navy" 
              : "bg-muted text-muted-foreground"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-medium text-foreground truncate">
            {employee.full_name}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={employee.is_active ? "secondary" : "outline"}
              className="text-xs shrink-0"
            >
              {displayType}
            </Badge>
            {employee.department && (
              <span className="text-xs text-muted-foreground truncate">
                {employee.department}
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
          "w-2 h-2 rounded-full shrink-0",
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
