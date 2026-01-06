import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { MovementType } from "@/hooks/movement/useHorseMovements";

interface MovementTypeBadgeProps {
  type: MovementType;
  size?: "sm" | "md";
}

export function MovementTypeBadge({ type, size = "md" }: MovementTypeBadgeProps) {
  const { t } = useI18n();

  const config = {
    in: {
      label: t("movement.types.in"),
      icon: ArrowDownToLine,
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    },
    out: {
      label: t("movement.types.out"),
      icon: ArrowUpFromLine,
      className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    },
    transfer: {
      label: t("movement.types.transfer"),
      icon: ArrowLeftRight,
      className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    },
  };

  const { label, icon: Icon, className } = config[type];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "px-2.5 py-1",
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3 me-1" : "h-4 w-4 me-1.5")} />
      {label}
    </Badge>
  );
}
