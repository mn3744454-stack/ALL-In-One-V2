import { Badge } from "@/components/ui/badge";
import { useServices } from "@/hooks/useServices";
import { useI18n } from "@/i18n";
import { displayServiceName } from "@/lib/displayHelpers";
import { normalizeIncludes } from "@/lib/planIncludes";
import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface Props {
  includes: unknown;
  /** Compact mode for cards */
  compact?: boolean;
}

const KIND_COLORS: Record<string, string> = {
  vet: 'text-emerald-500',
  breeding: 'text-purple-500',
  training: 'text-blue-500',
  transport: 'text-amber-500',
  boarding: 'text-green-500',
  service: 'text-gray-500',
};

/**
 * Renders a plan's included services as badges.
 * Gracefully handles empty/legacy includes.
 * Supports all service kinds (boarding, vet, breeding, training, transport, service).
 */
export function PlanIncludedServicesDisplay({ includes, compact = false }: Props) {
  const { lang } = useI18n();
  const entries = normalizeIncludes(includes);
  const { data: allServices = [] } = useServices();

  const serviceMap = useMemo(
    () => new Map(allServices.map(s => [s.id, s])),
    [allServices]
  );

  if (entries.length === 0) return null;

  return (
    <div className={compact ? "flex flex-wrap gap-1 mt-1" : "flex flex-wrap gap-1.5 mt-2"}>
      {entries.map(entry => {
        const svc = serviceMap.get(entry.service_id);
        const display = svc
          ? displayServiceName(svc.name, svc.name_ar, lang)
          : entry.label;
        const colorClass = KIND_COLORS[svc?.service_kind ?? ''] || 'text-green-500';
        return (
          <Badge
            key={entry.service_id}
            variant="outline"
            className={compact ? "text-[10px] gap-0.5 px-1.5 py-0" : "text-xs gap-1"}
          >
            <CheckCircle2 className={compact ? `h-2.5 w-2.5 ${colorClass}` : `h-3 w-3 ${colorClass}`} />
            {display}
          </Badge>
        );
      })}
    </div>
  );
}
