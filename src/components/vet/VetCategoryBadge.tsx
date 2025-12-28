import { Badge } from "@/components/ui/badge";
import type { VetTreatmentCategory } from "@/hooks/vet/useVetTreatments";
import { cn } from "@/lib/utils";
import { 
  Stethoscope, 
  Scissors, 
  Activity, 
  Smile, 
  Footprints, 
  Bandage, 
  Syringe, 
  Baby, 
  FlaskConical 
} from "lucide-react";

interface VetCategoryBadgeProps {
  category: VetTreatmentCategory;
  className?: string;
}

const categoryConfig: Record<VetTreatmentCategory, { label: string; icon: React.ElementType; color: string }> = {
  treatment: { label: "Treatment", icon: Stethoscope, color: "bg-blue-500/10 text-blue-600" },
  procedure: { label: "Procedure", icon: Scissors, color: "bg-purple-500/10 text-purple-600" },
  checkup: { label: "Checkup", icon: Activity, color: "bg-green-500/10 text-green-600" },
  dental: { label: "Dental", icon: Smile, color: "bg-cyan-500/10 text-cyan-600" },
  hoof: { label: "Hoof", icon: Footprints, color: "bg-amber-500/10 text-amber-600" },
  injury: { label: "Injury", icon: Bandage, color: "bg-red-500/10 text-red-600" },
  surgery: { label: "Surgery", icon: Scissors, color: "bg-rose-500/10 text-rose-600" },
  reproductive: { label: "Reproductive", icon: Baby, color: "bg-pink-500/10 text-pink-600" },
  lab: { label: "Lab", icon: FlaskConical, color: "bg-indigo-500/10 text-indigo-600" },
};

export function VetCategoryBadge({ category, className }: VetCategoryBadgeProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 border-transparent", config.color, className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
