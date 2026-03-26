import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import {
  Ruler, Shield, Footprints, Droplets, CircleDot, CheckCircle2,
} from "lucide-react";
import type { FacilityArea } from "@/hooks/housing/useFacilityAreas";

interface ActivityContentProps {
  facility: FacilityArea;
}

interface ActivityMetadata {
  // Arena
  dimensions?: string;
  // Round pen
  diameter?: string;
  // Shared
  covered?: string; // 'covered' | 'uncovered'
  footing?: string; // 'sand' | 'grass' | 'rubber' | 'dirt' | 'synthetic'
  // Wash area
  wash_points?: number;
  water_type?: string; // 'cold' | 'hot_cold'
}

const FOOTING_OPTIONS = ['sand', 'grass', 'rubber', 'dirt', 'synthetic'] as const;
const COVERED_OPTIONS = ['covered', 'uncovered'] as const;
const WATER_TYPE_OPTIONS = ['cold', 'hot_cold'] as const;

export { FOOTING_OPTIONS, COVERED_OPTIONS, WATER_TYPE_OPTIONS };
export type { ActivityMetadata };

export function ActivityContent({ facility }: ActivityContentProps) {
  const { t } = useI18n();

  const meta: ActivityMetadata = (facility as any).metadata || {};
  const type = facility.facility_type;

  const badges: { icon: React.ElementType; label: string; variant?: 'secondary' | 'outline'; className?: string }[] = [];

  // Dimensions / diameter
  if (type === 'arena' && meta.dimensions) {
    badges.push({ icon: Ruler, label: `${meta.dimensions} m`, variant: 'secondary' });
  }
  if (type === 'round_pen' && meta.diameter) {
    badges.push({ icon: CircleDot, label: `⌀ ${meta.diameter} m`, variant: 'secondary' });
  }

  // Covered / uncovered
  if (meta.covered) {
    badges.push({
      icon: Shield,
      label: t(`housing.activity.${meta.covered}`),
      variant: 'outline',
    });
  }

  // Footing
  if (meta.footing && (type === 'arena' || type === 'round_pen')) {
    badges.push({
      icon: Footprints,
      label: t(`housing.activity.footing_${meta.footing}`),
      variant: 'outline',
    });
  }

  // Wash points
  if (type === 'wash_area' && meta.wash_points) {
    badges.push({
      icon: Droplets,
      label: t('housing.activity.washPointsCount').replace('{count}', String(meta.wash_points)),
      variant: 'secondary',
    });
  }

  // Water type
  if (type === 'wash_area' && meta.water_type) {
    badges.push({
      icon: Droplets,
      label: t(`housing.activity.water_${meta.water_type}`),
      variant: 'outline',
      className: 'text-blue-600 dark:text-blue-400',
    });
  }

  // Active status
  if (facility.is_active) {
    badges.push({
      icon: CheckCircle2,
      label: t('housing.activity.ready'),
      variant: 'outline',
      className: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    });
  }

  return (
    <div className="py-2 px-1">
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <Badge key={i} variant={b.variant || 'outline'} className={`gap-1.5 text-xs font-normal ${b.className || ''}`}>
              <b.icon className="w-3 h-3" />
              {b.label}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('housing.activity.noSpecs')}
        </p>
      )}
    </div>
  );
}
