import { Badge } from "@/components/ui/badge";
import { Building2, ExternalLink } from "lucide-react";

interface ServiceModeBadgeProps {
  mode: "internal" | "external";
  size?: "sm" | "default";
}

export function ServiceModeBadge({ mode, size = "default" }: ServiceModeBadgeProps) {
  const isInternal = mode === "internal";

  return (
    <Badge
      variant="outline"
      className={`gap-1 ${
        isInternal
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-violet-50 text-violet-700 border-violet-200"
      } ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {isInternal ? (
        <Building2 className="w-3 h-3" />
      ) : (
        <ExternalLink className="w-3 h-3" />
      )}
      {isInternal ? "Internal" : "External"}
    </Badge>
  );
}
