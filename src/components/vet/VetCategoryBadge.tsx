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
  FlaskConical 
} from "lucide-react";

interface VetCategoryBadgeProps {
  category: VetTreatmentCategory;
  className?: string;
}

const categoryConfig: Record<VetTreatmentCategory, { icon: React.ElementType; color: string }> = {
  treatment: { icon: Stethoscope, color: "bg-blue-500/10 text-blue-600" },
  procedure: { icon: Scissors, color: "bg-purple-500/10 text-purple-600" },
  checkup: { icon: Activity, color: "bg-green-500/10 text-green-600" },
  dental: { icon: Smile, color: "bg-cyan-500/10 text-cyan-600" },
  hoof: { icon: Footprints, color: "bg-amber-500/10 text-amber-600" },
  injury: { icon: Bandage, color: "bg-red-500/10 text-red-600" },
  surgery: { icon: Scissors, color: "bg-rose-500/10 text-rose-600" },
  reproductive: { icon: Baby, color: "bg-pink-500/10 text-pink-600" },
  lab: { icon: FlaskConical, color: "bg-indigo-500/10 text-indigo-600" },
};

export function VetCategoryBadge({ category, className }: VetCategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.color, className)}>
      <Icon className="w-3 h-3" />
      {tCategory(category)}
    </Badge>
  );
}
