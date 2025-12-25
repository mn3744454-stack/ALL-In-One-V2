import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  age_category?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
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
              <Badge 
                variant="secondary" 
                className={`shrink-0 text-xs ${getStatusColor(horse.status)}`}
              >
                {horse.status || "draft"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2 truncate">
              {breedName}
              {colorName && ` • ${colorName}`}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {horse.age_category && (
                <span className="capitalize">{horse.age_category}</span>
              )}
              {horse.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(horse.birth_date), "yyyy")}
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
