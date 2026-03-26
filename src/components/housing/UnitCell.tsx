import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import type { InlineUnit, InlineOccupant } from "@/hooks/housing/useInlineFacilityUnits";

interface UnitCellProps {
  unit: InlineUnit;
  occupants: InlineOccupant[];
  onClick?: (unit: InlineUnit) => void;
}

/**
 * Compact visual cell for a single housing unit in the facility grid.
 * Shows unit code, horse name (or vacant), and status color via left border.
 */
export function UnitCell({ unit, occupants, onClick }: UnitCellProps) {
  const { t } = useI18n();

  const currentOccupants = occupants.filter(o => o.unit_id === unit.id);
  const isOccupied = currentOccupants.length > 0;
  const isFull = currentOccupants.length >= unit.capacity;
  const isGroup = unit.occupancy === 'group';

  // Get horse for single-occupancy display
  const horse = currentOccupants[0]?.horse;

  // Status color: green=vacant, primary=occupied, amber=full
  const borderColor = !isOccupied
    ? 'border-s-emerald-500'
    : isFull
      ? 'border-s-amber-500'
      : 'border-s-primary';

  const bgColor = !isOccupied
    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
    : isFull
      ? 'bg-amber-500/5 hover:bg-amber-500/10'
      : 'bg-primary/5 hover:bg-primary/10';

  return (
    <button
      type="button"
      onClick={() => onClick?.(unit)}
      className={cn(
        "text-start rounded-lg border border-s-4 p-2.5 transition-colors cursor-pointer min-h-[72px] flex flex-col justify-between",
        borderColor,
        bgColor,
      )}
    >
      {/* Unit code */}
      <span className="text-[11px] font-mono text-muted-foreground leading-tight truncate">
        {unit.code}
      </span>

      {/* Horse identity or vacant label */}
      {isOccupied ? (
        isGroup ? (
          <span className="text-sm font-semibold text-foreground leading-tight mt-1">
            {currentOccupants.length}/{unit.capacity}
          </span>
        ) : horse ? (
          <div className="mt-1 truncate">
            <BilingualName
              name={horse.name}
              nameAr={horse.name_ar}
              primaryClassName="text-sm font-medium leading-tight"
              secondaryClassName="text-[10px]"
              inline
            />
          </div>
        ) : (
          <span className="text-sm font-medium text-foreground leading-tight mt-1">—</span>
        )
      ) : (
        <span className="text-xs text-muted-foreground/60 mt-1">
          {t('housing.units.status.vacant')}
        </span>
      )}
    </button>
  );
}
