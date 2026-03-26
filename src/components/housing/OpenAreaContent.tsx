import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BilingualName } from "@/components/ui/BilingualName";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import {
  Sun, CloudRain, Droplets, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import type { FacilityArea } from "@/hooks/housing/useFacilityAreas";

interface OpenAreaContentProps {
  facility: FacilityArea;
}

interface AreaHorse {
  id: string;
  name: string;
  name_ar: string | null;
}

export function OpenAreaContent({ facility }: OpenAreaContentProps) {
  const { t, lang } = useI18n();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const [expanded, setExpanded] = useState(false);

  const fa = facility as any;
  const capacity = fa.capacity as number | null;
  const areaSize = fa.area_size as number | null;
  const shade = (fa.shade as string) || 'none';
  const hasWater = fa.has_water as boolean | undefined;

  // Fetch horses currently in this area
  const { data: horses = [] } = useQuery({
    queryKey: ['open-area-horses', tenantId, facility.id],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('horses')
        .select('id, name, name_ar')
        .eq('tenant_id', tenantId)
        .eq('current_area_id', facility.id);
      if (error) throw error;
      return (data || []) as AreaHorse[];
    },
    enabled: !!tenantId,
  });

  const horseCount = horses.length;

  const shadeLabel = shade === 'full'
    ? t('housing.openArea.shadeFull')
    : shade === 'partial'
      ? t('housing.openArea.shadePartial')
      : t('housing.openArea.shadeNone');

  const ShadeIcon = shade === 'none' ? Sun : CloudRain;

  return (
    <div className="space-y-3 py-2 px-1">
      {/* Attribute badges row */}
      <div className="flex flex-wrap gap-2">
        {/* Capacity */}
        {capacity != null && (
          <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
            <Users className="w-3 h-3" />
            {horseCount} / ~{capacity}
          </Badge>
        )}
        {capacity == null && horseCount > 0 && (
          <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
            <Users className="w-3 h-3" />
            {horseCount} {t('housing.openArea.horsesPresent')}
          </Badge>
        )}

        {/* Area size */}
        {areaSize != null && (
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            {areaSize} m²
          </Badge>
        )}

        {/* Shade */}
        <Badge variant="outline" className="gap-1 text-xs font-normal">
          <ShadeIcon className="w-3 h-3" />
          {shadeLabel}
        </Badge>

        {/* Water */}
        {hasWater && (
          <Badge variant="outline" className="gap-1 text-xs font-normal text-blue-600 dark:text-blue-400">
            <Droplets className="w-3 h-3" />
            {t('housing.openArea.waterAvailable')}
          </Badge>
        )}
      </div>

      {/* Horse roster */}
      {horseCount > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {t('housing.openArea.horsesInArea').replace('{count}', String(horseCount))}
          </button>

          {expanded && (
            <div className="pl-4 space-y-1 border-l-2 border-muted ml-1">
              {horses.map((horse) => (
                <div key={horse.id} className="text-sm">
                  <BilingualName
                    name={horse.name}
                    nameAr={horse.name_ar}
                    primaryClassName="text-sm font-medium"
                    secondaryClassName="text-xs"
                    inline
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state — no horses and no attributes */}
      {horseCount === 0 && capacity == null && (
        <p className="text-xs text-muted-foreground">
          {t('housing.openArea.emptyState')}
        </p>
      )}
    </div>
  );
}
