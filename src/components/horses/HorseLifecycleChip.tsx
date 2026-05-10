import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Home,
  PackageOpen,
  MapPinOff,
  Truck,
  PlaneTakeoff,
  PlaneLanding,
  CalendarClock,
} from "lucide-react";
import type { OperationalStatus, HorseLifecycleState } from "@/hooks/movement/useHorseLifecycleStates";
import { deriveOperationalStatus } from "@/hooks/movement/useHorseLifecycleStates";

interface HorseLifecycleChipProps {
  state?: HorseLifecycleState | null;
  status?: OperationalStatus;
  /** If true, render nothing when status is "unknown" (caller falls back to raw status). */
  hideUnknown?: boolean;
  size?: "xs" | "sm";
  className?: string;
}

const CONFIG: Record<
  OperationalStatus,
  { icon: typeof Home; key: string; className: string }
> = {
  housed: {
    icon: Home,
    key: "movement.lifecycle.opStatus.housed",
    className:
      "text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  needs_admission: {
    icon: PackageOpen,
    key: "movement.lifecycle.opStatus.needsAdmission",
    className:
      "text-orange-700 bg-orange-100 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  },
  needs_placement: {
    icon: MapPinOff,
    key: "movement.lifecycle.opStatus.needsPlacement",
    className:
      "text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  temporarily_out: {
    icon: PlaneTakeoff,
    key: "movement.lifecycle.opStatus.temporarilyOut",
    className:
      "text-violet-700 bg-violet-100 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  },
  in_transit: {
    icon: Truck,
    key: "movement.lifecycle.opStatus.inTransit",
    className:
      "text-blue-700 bg-blue-100 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  scheduled: {
    icon: CalendarClock,
    key: "movement.lifecycle.opStatus.scheduled",
    className:
      "text-sky-700 bg-sky-100 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  },
  departed: {
    icon: PlaneLanding,
    key: "movement.lifecycle.opStatus.departed",
    className:
      "text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  },
  unknown: {
    icon: MapPinOff,
    key: "movement.lifecycle.opStatus.unknown",
    className: "text-muted-foreground bg-muted border-border",
  },
};

export function HorseLifecycleChip({
  state,
  status,
  hideUnknown = false,
  size = "sm",
  className,
}: HorseLifecycleChipProps) {
  const { t } = useI18n();
  const resolved: OperationalStatus = status ?? deriveOperationalStatus(state);

  if (hideUnknown && resolved === "unknown") return null;

  const c = CONFIG[resolved];
  const Icon = c.icon;
  const label = t(c.key);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        size === "xs" ? "text-[10px] px-1.5 py-0" : "text-xs",
        c.className,
        className
      )}
      title={label}
    >
      <Icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span className="truncate">{label}</span>
    </Badge>
  );
}
