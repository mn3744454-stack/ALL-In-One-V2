import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useEmployeeAssignments } from '@/hooks/hr/useEmployeeAssignments';
import { useEmployeeHorseAccess } from '@/hooks/hr/useEmployeeHorseAccess';
import { useEmployeeHorseAssignment } from '@/hooks/hr/useEmployeeHorseAssignment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Heart, ChevronRight, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/directional-icon';
import { AssignHorseDialog } from './AssignHorseDialog';

interface EmployeeAssignedHorsesProps {
  employeeId: string;
  employeeName?: string;
  employeeUserId?: string | null;
}

interface HorseRow {
  id: string;
  name: string;
  name_ar?: string | null;
  breed: string | null;
  gender: string;
  avatar_url: string | null;
  role?: string;
  accessLevel?: string;
  assignmentId?: string;
}

export function EmployeeAssignedHorses({ employeeId, employeeName, employeeUserId }: EmployeeAssignedHorsesProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { assignments, isLoading: isLoadingAssignments } = useEmployeeAssignments(employeeId);
  const { horses: accessHorses, isLoading: isLoadingAccess } = useEmployeeHorseAccess(employeeUserId);
  const { canManage, deleteAssignment, isDeleting } = useEmployeeHorseAssignment(employeeId);

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HorseRow | null>(null);

  const isLoading = isLoadingAssignments || (employeeUserId && isLoadingAccess);

  // Combine both sources, deduplicate by horse id (assignments take priority)
  const combinedHorses = new Map<string, HorseRow>();

  assignments.forEach((assignment) => {
    if (assignment.horse) {
      combinedHorses.set(assignment.horse.id, {
        id: assignment.horse.id,
        name: assignment.horse.name,
        name_ar: assignment.horse.name_ar,
        breed: assignment.horse.breed,
        gender: assignment.horse.gender,
        avatar_url: assignment.horse.avatar_url,
        role: assignment.role,
        assignmentId: assignment.id,
      });
    }
  });

  accessHorses.forEach((horse) => {
    if (!combinedHorses.has(horse.id)) {
      combinedHorses.set(horse.id, {
        id: horse.id,
        name: horse.name,
        name_ar: horse.name_ar,
        breed: horse.breed,
        gender: horse.gender,
        avatar_url: horse.avatar_url,
        accessLevel: horse.access_level,
      });
    }
  });

  const allHorses = Array.from(combinedHorses.values());
  const assignedHorseIds = assignments
    .map((a) => a.horse?.id)
    .filter((id): id is string => !!id);

  const handleDelete = async () => {
    if (deleteTarget?.assignmentId) {
      await deleteAssignment({
        assignmentId: deleteTarget.assignmentId,
        horseId: deleteTarget.id,
      });
      setDeleteTarget(null);
    }
  };

  const getGenderLabel = (gender: string) => {
    if (gender === 'male') return t('horses.stallion') || 'Stallion';
    if (gender === 'female') return t('horses.mare') || 'Mare';
    return gender;
  };

  // Loading state
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

  return (
    <>
      <div className="mt-4 pt-4 border-t border-border/50">
        {/* Header with persistent management affordance */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Heart className="w-4 h-4" />
            {t('hr.assignments.assignedHorses')}
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 px-2 text-xs"
              onClick={() => setShowAssignDialog(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('hr.assignments.assignHorse')}</span>
            </Button>
          )}
        </div>

        {/* Empty state with first-class CTA */}
        {allHorses.length === 0 ? (
          <div className="text-center py-6">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('hr.assignments.noHorses')}</p>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowAssignDialog(true)}
              >
                <Plus className="w-4 h-4 me-1.5" />
                {t('hr.assignments.assignHorse')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allHorses.map((horse) => {
              const roleLabel = horse.role
                ? t(`hr.assignments.roles.${horse.role}`) || horse.role
                : horse.accessLevel
                ? t(`horses.accessLevels.${horse.accessLevel}`) || horse.accessLevel
                : null;

              return (
                <div
                  key={horse.id}
                  className={cn(
                    'group flex items-center gap-3 p-2 rounded-lg',
                    'hover:bg-muted/50 transition-colors'
                  )}
                >
                  <button
                    onClick={() => navigate(`/dashboard/horses/${horse.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-start"
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
                        <span className="font-medium text-sm truncate">{horse.name}</span>
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

                  {/* Remove only available on assignment-sourced rows (not member_horse_access) */}
                  {canManage && horse.assignmentId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(horse);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Horse Dialog */}
      <AssignHorseDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        employeeId={employeeId}
        employeeName={employeeName || ''}
        existingHorseIds={assignedHorseIds}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hr.assignments.confirmRemove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
              {deleteTarget?.role && ` — ${t(`hr.assignments.roles.${deleteTarget.role}`)}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
