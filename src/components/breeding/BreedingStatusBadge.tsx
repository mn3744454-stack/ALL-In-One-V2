import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tStatus } from "@/i18n/labels";

interface BreedingStatusBadgeProps {
  status: string;
  type?: "attempt" | "pregnancy" | "embryo" | "verification";
  className?: string;
}

const attemptStyles: Record<string, string> = {
  unknown: "bg-slate-500/20 text-slate-600 border-slate-500/30",
  successful: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  unsuccessful: "bg-red-500/20 text-red-600 border-red-500/30",
};

const pregnancyStyles: Record<string, string> = {
  open: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  pregnant: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  open_by_abortion: "bg-red-500/20 text-red-600 border-red-500/30",
  closed: "bg-slate-500/20 text-slate-600 border-slate-500/30",
};

const embryoStyles: Record<string, string> = {
  planned: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  transferred: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  failed: "bg-red-500/20 text-red-600 border-red-500/30",
  completed: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

const verificationStyles: Record<string, string> = {
  unverified: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  verified: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
};

export function BreedingStatusBadge({ status, type = "attempt", className }: BreedingStatusBadgeProps) {
  let styles: Record<string, string>;
  
  switch (type) {
    case "pregnancy":
      styles = pregnancyStyles;
      break;
    case "embryo":
      styles = embryoStyles;
      break;
    case "verification":
      styles = verificationStyles;
      break;
    default:
      styles = attemptStyles;
  }

  const style = styles[status] || "bg-slate-500/20 text-slate-600 border-slate-500/30";

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", style, className)}>
      {tStatus(status)}
    </Badge>
  );
}
