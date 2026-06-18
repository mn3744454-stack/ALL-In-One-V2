import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { Wrench, Ban, ShieldAlert, Warehouse } from "lucide-react";
import type { InlineUnit, InlineOccupant } from "@/hooks/housing/useInlineFacilityUnits";
import { getOccupantDisplay } from "@/lib/housing/occupantDisplay";

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
 * Supports maintenance / out-of-service / isolation / storage visual states.
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
  const isStorage = unit.unit_type === 'storage';

  // Get resolved identity for single-occupancy display (canonical horse
  // join → admission snapshot fallback → neutral). Phase 1.e.f.7.b.1.
  const primaryOccupant = currentOccupants[0];
  const display = primaryOccupant ? getOccupantDisplay(primaryOccupant) : null;
  const hasIdentity = !!(display && (display.name || display.nameAr));

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
      {(isUnavailable || isIsolation || isStorage) && (
        <div className="absolute top-1.5 end-1.5">
          {isOutOfService ? (
            <Ban className="w-3 h-3 text-destructive" />
          ) : isMaintenance ? (
            <Wrench className="w-3 h-3 text-muted-foreground" />
          ) : isIsolation ? (
            <ShieldAlert className="w-3 h-3 text-amber-600" />
          ) : isStorage ? (
            <Warehouse className="w-3 h-3 text-amber-700" />
          ) : null}
        </div>
      )}

      {/* Unit code + type label */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[11px] font-mono text-muted-foreground leading-tight truncate">
          {unit.code}
        </span>
        {isIsolation && (
          <span className="text-[9px] font-medium px-1 py-0 rounded bg-amber-100 text-amber-700 border border-amber-200 leading-tight shrink-0">
            {t('housing.units.isolationLabel')}
          </span>
        )}
        {isStorage && (
          <span className="text-[9px] font-medium px-1 py-0 rounded bg-amber-100 text-amber-800 border border-amber-200 leading-tight shrink-0">
            {t('housing.units.storageLabel')}
          </span>
        )}
      </div>

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
        ) : hasIdentity ? (
          <div className="mt-1 truncate">
            <BilingualName
              name={display!.name || ''}
              nameAr={display!.nameAr}
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
