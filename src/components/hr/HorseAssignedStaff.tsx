import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useHorseAssignments } from '@/hooks/hr/useHorseAssignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Users, Plus, Phone, Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddAssignmentDialog } from './AddAssignmentDialog';
import type { HorseAssignment } from '@/hooks/hr/useHorseAssignments';

interface HorseAssignedStaffProps {
  horseId: string;
  horseName: string;
}

export function HorseAssignedStaff({ horseId, horseName }: HorseAssignedStaffProps) {
  const { t, dir } = useI18n();
  const { assignments, isLoading, canManage, deleteAssignment, isDeleting } = useHorseAssignments(horseId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HorseAssignment | null>(null);

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteAssignment(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            {t('hr.assignments.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            {t('hr.assignments.title')}
          </CardTitle>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.add')}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('hr.assignments.noAssignments')}</p>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddDialog(true)}
                >
                  {t('hr.assignments.addAssignment')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const employee = assignment.employee;
                if (!employee) return null;

                const initials = employee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                const roleLabel = t(`hr.assignments.roles.${assignment.role}`) || assignment.role;

                return (
                  <div
                    key={assignment.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-gold to-gold-dark text-navy text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {employee.full_name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {roleLabel}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {employee.phone && (
                          <a
                            href={`tel:${employee.phone}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            dir="ltr"
                          >
                            <Phone className="w-3 h-3" />
                            {employee.phone}
                          </a>
                        )}
                        {employee.email && (
                          <a
                            href={`mailto:${employee.email}`}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            dir="ltr"
                          >
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </a>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(assignment)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Assignment Dialog */}
      <AddAssignmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        horseId={horseId}
        horseName={horseName}
        existingEmployeeIds={assignments.map(a => a.employee_id)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hr.assignments.confirmRemove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.employee?.full_name} - {t(`hr.assignments.roles.${deleteTarget?.role}`)}
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
