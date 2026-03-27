import { Badge } from "@/components/ui/badge";
import { useServicesByKind } from "@/hooks/useServices";
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

/**
 * Renders a plan's included services as badges.
 * Gracefully handles empty/legacy includes.
 * Supports both boarding and vet services.
 */
export function PlanIncludedServicesDisplay({ includes, compact = false }: Props) {
  const { lang } = useI18n();
  const entries = normalizeIncludes(includes);
  const { data: boardingServices = [] } = useServicesByKind('boarding');
  const { data: vetServices = [] } = useServicesByKind('vet');

  const allServices = useMemo(() => [...boardingServices, ...vetServices], [boardingServices, vetServices]);

  if (entries.length === 0) return null;

  return (
    <div className={compact ? "flex flex-wrap gap-1 mt-1" : "flex flex-wrap gap-1.5 mt-2"}>
      {entries.map(entry => {
        const svc = allServices.find(s => s.id === entry.service_id);
        const display = svc
          ? displayServiceName(svc.name, svc.name_ar, lang)
          : entry.label;
        const isVet = svc?.service_kind === 'vet';
        return (
          <Badge
            key={entry.service_id}
            variant="outline"
            className={compact ? "text-[10px] gap-0.5 px-1.5 py-0" : "text-xs gap-1"}
          >
            <CheckCircle2 className={compact ? `h-2.5 w-2.5 ${isVet ? 'text-emerald-500' : 'text-green-500'}` : `h-3 w-3 ${isVet ? 'text-emerald-500' : 'text-green-500'}`} />
            {display}
          </Badge>
        );
      })}
    </div>
  );
}
