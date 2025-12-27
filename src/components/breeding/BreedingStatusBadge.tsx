import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BreedingStatusBadgeProps {
  status: string;
  type?: "attempt" | "pregnancy" | "embryo" | "verification";
  className?: string;
}

const attemptResultConfig: Record<string, { label: string; className: string }> = {
  unknown: { label: "Unknown", className: "bg-slate-500/20 text-slate-600 border-slate-500/30" },
  successful: { label: "Successful", className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
  unsuccessful: { label: "Unsuccessful", className: "bg-red-500/20 text-red-600 border-red-500/30" },
};

const pregnancyStatusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  pregnant: { label: "Pregnant", className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
  open_by_abortion: { label: "Open (Abortion)", className: "bg-red-500/20 text-red-600 border-red-500/30" },
  closed: { label: "Closed", className: "bg-slate-500/20 text-slate-600 border-slate-500/30" },
};

const embryoStatusConfig: Record<string, { label: string; className: string }> = {
  planned: { label: "Planned", className: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
  transferred: { label: "Transferred", className: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  failed: { label: "Failed", className: "bg-red-500/20 text-red-600 border-red-500/30" },
  completed: { label: "Completed", className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
};

const verificationConfig: Record<string, { label: string; className: string }> = {
  unverified: { label: "Unverified", className: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  verified: { label: "Verified", className: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
};

export function BreedingStatusBadge({ status, type = "attempt", className }: BreedingStatusBadgeProps) {
  let config: Record<string, { label: string; className: string }>;
  
  switch (type) {
    case "pregnancy":
      config = pregnancyStatusConfig;
      break;
    case "embryo":
      config = embryoStatusConfig;
      break;
    case "verification":
      config = verificationConfig;
      break;
    default:
      config = attemptResultConfig;
  }

  const statusConfig = config[status] || { label: status, className: "bg-slate-500/20 text-slate-600 border-slate-500/30" };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", statusConfig.className, className)}>
      {statusConfig.label}
    </Badge>
  );
}
