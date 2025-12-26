import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Clock } from "lucide-react";
import { 
  getCurrentAgeParts, 
  formatAgeCompact, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";
import { useMemo } from "react";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  age_category?: string | null;
  birth_date?: string | null;
  birth_at?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  is_gelded?: boolean;
  breeding_role?: string | null;
  breed_data?: { name: string } | null;
  color_data?: { name: string } | null;
  branch_data?: { name: string } | null;
}

interface HorseCardProps {
  horse: Horse;
  onClick?: () => void;
}

export const HorseCard = ({ horse, onClick }: HorseCardProps) => {
  const getGenderIcon = (gender: string) => {
    return gender === "female" ? "♀" : "♂";
  };

  const getStatusColor = (status?: string | null) => {
    if (status === "active") return "bg-success/10 text-success";
    if (status === "inactive") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  // Calculate age and classification
  const { formattedAge, typeBadgeProps } = useMemo(() => {
    const ageParts = getCurrentAgeParts({
      gender: horse.gender,
      birth_date: horse.birth_date,
      birth_at: horse.birth_at,
      is_gelded: horse.is_gelded,
      breeding_role: horse.breeding_role,
    });
    
    const horseType = getHorseTypeLabel({
      gender: horse.gender,
      birth_date: horse.birth_date,
      birth_at: horse.birth_at,
      is_gelded: horse.is_gelded,
      breeding_role: horse.breeding_role,
    });
    
    return {
      formattedAge: formatAgeCompact(ageParts),
      typeBadgeProps: getHorseTypeBadgeProps(horseType),
    };
  }, [horse.gender, horse.birth_date, horse.birth_at, horse.is_gelded, horse.breeding_role]);

  const breedName = horse.breed_data?.name || horse.breed || "Unknown breed";
  const colorName = horse.color_data?.name || horse.color;
  const branchName = horse.branch_data?.name;

  return (
    <Card 
      variant="elevated" 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
            {horse.avatar_url ? (
              <img 
                src={horse.avatar_url} 
                alt={horse.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Heart className="w-7 h-7 text-gold" />
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-navy text-cream text-xs font-bold rounded-full flex items-center justify-center">
              {getGenderIcon(horse.gender)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="font-display font-semibold text-navy truncate">
                  {horse.name}
                </h3>
                {horse.name_ar && (
                  <p className="text-xs text-muted-foreground truncate" dir="rtl">
                    {horse.name_ar}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getStatusColor(horse.status)}`}
                >
                  {horse.status || "draft"}
                </Badge>
                <Badge className={`text-xs ${typeBadgeProps.className}`}>
                  {typeBadgeProps.label}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-2 truncate">
              {breedName}
              {colorName && ` • ${colorName}`}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {horse.birth_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formattedAge}
                </span>
              )}
              {branchName && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {branchName}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
