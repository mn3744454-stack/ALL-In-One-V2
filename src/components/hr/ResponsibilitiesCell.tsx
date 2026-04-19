import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeAssignments } from '@/hooks/hr/useEmployeeAssignments';
import { BilingualName } from '@/components/ui/BilingualName';
import { Heart } from 'lucide-react';

interface ResponsibilitiesCellProps {
  employeeId: string;
  employeeFullName: string;
  employeeFullNameAr?: string | null;
  /** Pre-aggregated total count (from list-level query). */
  count: number;
}

/**
 * Phase D — Compact summary cell for the Team Directory "Responsibilities" column.
 *
 * - Shows a clickable count chip ("3 مسؤوليات" / "3 Responsibilities") or "—".
 * - On click, opens a lightweight in-place reveal:
 *   - Desktop: Popover anchored to the chip.
 *   - Mobile: small Dialog.
 * - The reveal is structured around a `sections[]` model so a future
 *   non-horse Tasks section can be added when real structured data exists.
 *   Today only the horses section is rendered (per Phase D mini-clarification).
 */
export function ResponsibilitiesCell({
  employeeId,
  employeeFullName,
  employeeFullNameAr,
  count,
}: ResponsibilitiesCellProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const hasAny = count > 0;

  // Lazy-load assignment details only when the reveal is opened.
  const { assignments, isLoading } = useEmployeeAssignments(open ? employeeId : '');

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const trigger = hasAny ? (
    <button
      type="button"
      onClick={(e) => {
        stop(e);
        setOpen(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors"
      aria-label={t('hr.responsibilitiesPopover.title')}
    >
      <Heart className="h-3 w-3 text-gold" />
      <span>
        {count} {t('hr.responsibilitiesShort')}
      </span>
    </button>
  ) : (
    <span
      className="text-muted-foreground text-sm"
      onClick={stop}
      aria-label={t('hr.responsibilitiesNone')}
    >
      —
    </span>
  );

  const body = (
    <div className="space-y-3">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('hr.responsibilitiesNone')}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {assignments.map((a) => {
            const roleLabel = a.role
              ? t(`hr.assignments.roles.${a.role}`) || a.role
              : null;
            const horseName = a.horse?.name ?? '—';
            const horseNameAr = a.horse?.name_ar ?? null;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card px-2.5 py-1.5"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <Heart className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span className="text-sm truncate">
                    <BilingualName name={horseName} nameAr={horseNameAr} />
                  </span>
                </div>
                {roleLabel && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {roleLabel}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // If no count, render the dash without any reveal wiring.
  if (!hasAny) return trigger;

  if (isMobile) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm" onClick={stop}>
            <DialogHeader>
              <DialogTitle className="text-base">
                {t('hr.responsibilitiesPopover.title')} ·{' '}
                <BilingualName
                  name={employeeFullName}
                  nameAr={employeeFullNameAr}
                />
              </DialogTitle>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        onClick={stop}
      >
        <div className="mb-2 pb-2 border-b border-border/50">
          <p className="text-xs text-muted-foreground">
            {t('hr.responsibilitiesPopover.title')}
          </p>
          <p className="text-sm font-medium">
            <BilingualName
              name={employeeFullName}
              nameAr={employeeFullNameAr}
            />
          </p>
        </div>
        {body}
      </PopoverContent>
    </Popover>
  );
}
