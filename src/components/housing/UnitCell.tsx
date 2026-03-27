import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { Wrench, Ban, ShieldAlert } from "lucide-react";
import type { InlineUnit, InlineOccupant } from "@/hooks/housing/useInlineFacilityUnits";

interface UnitCellProps {
  unit: InlineUnit;
  occupants: InlineOccupant[];
  onClick?: (unit: InlineUnit) => void;
  /** When true, adds a subtle highlight ring to indicate search match */
  highlighted?: boolean;
}

/**
 * Compact visual cell for a single housing unit in the facility grid.
 * Shows unit code, horse name (or vacant), and status color via left border.
 * Supports maintenance / out-of-service / isolation visual states.
 */
export function UnitCell({ unit, occupants, onClick, highlighted }: UnitCellProps) {
  const { t } = useI18n();

  const currentOccupants = occupants.filter(o => o.unit_id === unit.id);
  const isOccupied = currentOccupants.length > 0;
  const isFull = currentOccupants.length >= unit.capacity;
  const isGroup = unit.occupancy === 'group';
  const isMaintenance = unit.status === 'maintenance';
  const isOutOfService = unit.status === 'out_of_service';
  const isUnavailable = isMaintenance || isOutOfService;
  const isIsolation = unit.unit_type === 'isolation_room' || unit.unit_type === 'isolation_bay';

  // Get horse for single-occupancy display
  const horse = currentOccupants[0]?.horse;

  // Status color: maintenance=slate, out_of_service=red, green=vacant, primary=occupied, amber=full
  const borderColor = isOutOfService
    ? 'border-s-destructive'
    : isMaintenance
      ? 'border-s-muted-foreground'
      : !isOccupied
        ? 'border-s-emerald-500'
        : isFull
          ? 'border-s-amber-500'
          : 'border-s-primary';

  const bgColor = isOutOfService
    ? 'bg-destructive/5 hover:bg-destructive/10'
    : isMaintenance
      ? 'bg-muted/60 hover:bg-muted/80'
      : !isOccupied
        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
        : isFull
          ? 'bg-amber-500/5 hover:bg-amber-500/10'
          : 'bg-primary/5 hover:bg-primary/10';

  return (
    <button
      type="button"
      onClick={() => onClick?.(unit)}
      className={cn(
        "text-start rounded-lg border border-s-4 p-2.5 transition-colors cursor-pointer min-h-[72px] flex flex-col justify-between relative",
        borderColor,
        bgColor,
        isUnavailable && "opacity-75",
        highlighted && "ring-2 ring-primary/40",
      )}
    >
      {/* Status icon overlay for special states */}
      {(isUnavailable || isIsolation) && (
        <div className="absolute top-1.5 end-1.5">
          {isOutOfService ? (
            <Ban className="w-3 h-3 text-destructive" />
          ) : isMaintenance ? (
            <Wrench className="w-3 h-3 text-muted-foreground" />
          ) : isIsolation ? (
            <ShieldAlert className="w-3 h-3 text-amber-600" />
          ) : null}
        </div>
      )}

      {/* Unit code */}
      <span className="text-[11px] font-mono text-muted-foreground leading-tight truncate">
        {unit.code}
      </span>

      {/* Horse identity, status label, or vacant */}
      {isUnavailable ? (
        <span className="text-[10px] text-muted-foreground/70 mt-1">
          {isMaintenance ? t('housing.units.status.maintenance') : t('housing.units.status.outOfService')}
        </span>
      ) : isOccupied ? (
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
