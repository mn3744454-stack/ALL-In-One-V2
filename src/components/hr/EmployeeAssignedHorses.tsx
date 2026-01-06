import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployeeAssignments } from '@/hooks/hr/useEmployeeAssignments';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/directional-icon';

interface EmployeeAssignedHorsesProps {
  employeeId: string;
}

export function EmployeeAssignedHorses({ employeeId }: EmployeeAssignedHorsesProps) {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { assignments, isLoading } = useEmployeeAssignments(employeeId);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Heart className="w-4 h-4" />
          {t('hr.assignments.assignedHorses')}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
          <Heart className="w-4 h-4" />
          {t('hr.assignments.assignedHorses')}
        </div>
        <p className="text-sm text-muted-foreground/70 text-center py-4">
          {t('hr.assignments.noHorses')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Heart className="w-4 h-4" />
        {t('hr.assignments.assignedHorses')}
      </div>
      <div className="space-y-2">
        {assignments.map((assignment) => {
          const horse = assignment.horse;
          const roleLabel = t(`hr.assignments.roles.${assignment.role}`) || assignment.role;

          return (
            <button
              key={assignment.id}
              onClick={() => horse && navigate(`/dashboard/horses/${horse.id}`)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg",
                "hover:bg-muted/50 transition-colors text-start",
                "group"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0">
                {horse?.avatar_url ? (
                  <img
                    src={horse.avatar_url}
                    alt={horse.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Heart className="w-5 h-5 text-gold" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {horse?.name || 'Unknown'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {roleLabel}
                  </Badge>
                </div>
                {horse && (
                  <span className="text-xs text-muted-foreground">
                    {horse.breed || ''} • {horse.gender === 'male' ? 'Stallion' : horse.gender === 'female' ? 'Mare' : horse.gender}
                  </span>
                )}
              </div>
              <DirectionalIcon
                icon={ChevronRight}
                className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
