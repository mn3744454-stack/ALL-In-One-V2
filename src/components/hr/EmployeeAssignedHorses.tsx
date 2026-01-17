import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployeeAssignments } from '@/hooks/hr/useEmployeeAssignments';
import { useEmployeeHorseAccess } from '@/hooks/hr/useEmployeeHorseAccess';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/directional-icon';

interface EmployeeAssignedHorsesProps {
  employeeId: string;
  employeeUserId?: string | null;
}

export function EmployeeAssignedHorses({ employeeId, employeeUserId }: EmployeeAssignedHorsesProps) {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  
  // Try hr_assignments first (for employees assigned via HR module)
  const { assignments, isLoading: isLoadingAssignments } = useEmployeeAssignments(employeeId);
  
  // Also try member_horse_access if user_id is available (for linked user accounts)
  const { horses: accessHorses, isLoading: isLoadingAccess } = useEmployeeHorseAccess(employeeUserId);

  const isLoading = isLoadingAssignments || (employeeUserId && isLoadingAccess);

  // Combine both sources, deduplicate by horse id
  const combinedHorses = new Map<string, { 
    id: string; 
    name: string; 
    breed: string | null; 
    gender: string;
    avatar_url: string | null;
    role?: string;
    accessLevel?: string;
  }>();

  // Add from assignments
  assignments.forEach(assignment => {
    if (assignment.horse) {
      combinedHorses.set(assignment.horse.id, {
        id: assignment.horse.id,
        name: assignment.horse.name,
        breed: assignment.horse.breed,
        gender: assignment.horse.gender,
        avatar_url: assignment.horse.avatar_url,
        role: assignment.role,
      });
    }
  });

  // Add from member_horse_access (if not already present)
  accessHorses.forEach(horse => {
    if (!combinedHorses.has(horse.id)) {
      combinedHorses.set(horse.id, {
        id: horse.id,
        name: horse.name,
        breed: horse.breed,
        gender: horse.gender,
        avatar_url: horse.avatar_url,
        accessLevel: horse.access_level,
      });
    }
  });

  const allHorses = Array.from(combinedHorses.values());

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

  if (allHorses.length === 0) {
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

  const getGenderLabel = (gender: string) => {
    if (gender === 'male') return t('horses.genders.stallion') || 'Stallion';
    if (gender === 'female') return t('horses.genders.mare') || 'Mare';
    return gender;
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Heart className="w-4 h-4" />
        {t('hr.assignments.assignedHorses')}
      </div>
      <div className="space-y-2">
        {allHorses.map((horse) => {
          const roleLabel = horse.role 
            ? (t(`hr.assignments.roles.${horse.role}`) || horse.role)
            : horse.accessLevel 
              ? t(`horses.accessLevels.${horse.accessLevel}`) || horse.accessLevel
              : null;

          return (
            <button
              key={horse.id}
              onClick={() => navigate(`/dashboard/horses/${horse.id}`)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg",
                "hover:bg-muted/50 transition-colors text-start",
                "group"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0">
                {horse.avatar_url ? (
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
                    {horse.name}
                  </span>
                  {roleLabel && (
                    <Badge variant="outline" className="text-xs">
                      {roleLabel}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {horse.breed || ''} • {getGenderLabel(horse.gender)}
                </span>
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
