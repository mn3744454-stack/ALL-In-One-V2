import { Badge } from "@/components/ui/badge";
import type { VetTreatmentCategory } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";
import { tCategory } from "@/i18n/labels";
import { 
  Stethoscope, 
  Scissors, 
  Activity, 
  Smile, 
  Footprints, 
  Bandage, 
  Baby, 
  FlaskConical,
  Wind,
  Bone,
} from "lucide-react";

interface VetCategoryBadgeProps {
  category: VetTreatmentCategory;
  className?: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  treatment: { icon: Stethoscope, color: "bg-blue-500/10 text-blue-600" },
  procedure: { icon: Scissors, color: "bg-purple-500/10 text-purple-600" },
  checkup: { icon: Activity, color: "bg-green-500/10 text-green-600" },
  dental: { icon: Smile, color: "bg-cyan-500/10 text-cyan-600" },
  hoof: { icon: Footprints, color: "bg-amber-500/10 text-amber-600" },
  injury: { icon: Bandage, color: "bg-red-500/10 text-red-600" },
  surgery: { icon: Scissors, color: "bg-rose-500/10 text-rose-600" },
  reproductive: { icon: Baby, color: "bg-pink-500/10 text-pink-600" },
  lab: { icon: FlaskConical, color: "bg-indigo-500/10 text-indigo-600" },
  respiratory: { icon: Wind, color: "bg-teal-500/10 text-teal-600" },
  musculoskeletal: { icon: Bone, color: "bg-orange-500/10 text-orange-600" },
};

const defaultConfig = { icon: Stethoscope, color: "bg-muted text-muted-foreground" };

export function VetCategoryBadge({ category, className }: VetCategoryBadgeProps) {
  const config = categoryConfig[category] || defaultConfig;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.color, className)}>
      <Icon className="w-3 h-3" />
      {tCategory(category)}
    </Badge>
  );
}
