import { useState } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical, Trash2, Archive, Power, RotateCcw, AlertTriangle, Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n";

export interface LifecycleBlocker {
  reason: string;
  count?: number;
}

interface LifecycleActionMenuProps {
  entityType: 'branch' | 'facility' | 'unit';
  isActive: boolean;
  isArchived: boolean;
  canDelete: boolean;
  deleteBlockers: LifecycleBlocker[];
  onDelete: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDeactivate: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onRestore: () => Promise<void>;
  /** Extra items before lifecycle actions */
  extraItems?: React.ReactNode;
}

export function LifecycleActionMenu({
  entityType,
  isActive,
  isArchived,
  canDelete,
  deleteBlockers,
  onDelete,
  onArchive,
  onDeactivate,
  onReactivate,
  onRestore,
  extraItems,
}: LifecycleActionMenuProps) {
  const { t } = useI18n();
  const [dialogType, setDialogType] = useState<'delete' | 'archive' | 'deactivate' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      setDialogType(null);
    } catch {
      // handled by caller
    } finally {
      setIsLoading(false);
    }
  };

  const entityLabel = t(`housing.lifecycle.entity.${entityType}` as any);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {extraItems}
          {extraItems && <DropdownMenuSeparator />}

          {/* Archived state: only restore */}
          {isArchived && (
            <DropdownMenuItem onClick={() => handleAction(onRestore)}>
              <RotateCcw className="h-3.5 w-3.5 me-2" />
              {t('housing.lifecycle.restore')}
            </DropdownMenuItem>
          )}

          {/* Active state: deactivate + archive + delete */}
          {isActive && !isArchived && (
            <>
              <DropdownMenuItem onClick={() => setDialogType('deactivate')}>
                <Power className="h-3.5 w-3.5 me-2" />
                {t('housing.lifecycle.deactivate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogType('archive')}>
                <Archive className="h-3.5 w-3.5 me-2" />
                {t('housing.lifecycle.archive')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDialogType('delete')}
              >
                <Trash2 className="h-3.5 w-3.5 me-2" />
                {t('housing.lifecycle.deletePermanently')}
              </DropdownMenuItem>
            </>
          )}

          {/* Deactivated state: reactivate + archive + delete */}
          {!isActive && !isArchived && (
            <>
              <DropdownMenuItem onClick={() => handleAction(onReactivate)}>
                <Power className="h-3.5 w-3.5 me-2 text-emerald-600" />
                {t('housing.lifecycle.reactivate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialogType('archive')}>
                <Archive className="h-3.5 w-3.5 me-2" />
                {t('housing.lifecycle.archive')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDialogType('delete')}
              >
                <Trash2 className="h-3.5 w-3.5 me-2" />
                {t('housing.lifecycle.deletePermanently')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogType === 'delete'} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {!canDelete && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {t('housing.lifecycle.deleteTitle').replace('{entity}', entityLabel)}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {canDelete ? (
                  <p>{t('housing.lifecycle.deleteConfirmMsg').replace('{entity}', entityLabel)}</p>
                ) : (
                  <>
                    <p>{t('housing.lifecycle.cannotDeleteMsg').replace('{entity}', entityLabel)}</p>
                    <ul className="list-disc ps-5 space-y-1 text-sm">
                      {deleteBlockers.map((b, i) => (
                        <li key={i}>{b.reason}{b.count !== undefined ? ` (${b.count})` : ''}</li>
                      ))}
                    </ul>
                    <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border text-sm">
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{t('housing.lifecycle.suggestArchive')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Power className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{t('housing.lifecycle.suggestDeactivate' as any)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            {canDelete ? (
              <AlertDialogAction
                onClick={() => handleAction(onDelete)}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('housing.lifecycle.deletePermanently')}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={() => { setDialogType(null); setDialogType('archive'); }}
                className="bg-primary"
              >
                <Archive className="h-4 w-4 me-2" />
                {t('housing.lifecycle.archiveInstead')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={dialogType === 'archive'} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.lifecycle.archiveTitle').replace('{entity}', entityLabel)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.lifecycle.archiveMsg').replace('{entity}', entityLabel)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction(onArchive)} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              <Archive className="h-4 w-4 me-2" />
              {t('housing.lifecycle.archive')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Dialog */}
      <AlertDialog open={dialogType === 'deactivate'} onOpenChange={(open) => !open && setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('housing.lifecycle.deactivateTitle').replace('{entity}', entityLabel)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('housing.lifecycle.deactivateMsg').replace('{entity}', entityLabel)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction(onDeactivate)} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              <Power className="h-4 w-4 me-2" />
              {t('housing.lifecycle.deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Badge for lifecycle state */
export function LifecycleStateBadge({ isActive, isArchived }: { isActive: boolean; isArchived: boolean }) {
  const { t } = useI18n();

  if (isArchived) {
    return <Badge variant="secondary" className="text-[10px] shrink-0 gap-1"><Archive className="h-2.5 w-2.5" />{t('housing.lifecycle.archivedBadge')}</Badge>;
  }
  if (!isActive) {
    return <Badge variant="outline" className="text-[10px] shrink-0 gap-1 text-amber-600 border-amber-300"><Power className="h-2.5 w-2.5" />{t('housing.lifecycle.deactivatedBadge')}</Badge>;
  }
  return null;
}
