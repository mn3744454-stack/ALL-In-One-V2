import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Clock, User, Baby, Crown } from "lucide-react";
import { 
  getCurrentAgeParts, 
  formatAgeCompact, 
  getHorseTypeLabel, 
  getHorseTypeBadgeProps 
} from "@/lib/horseClassification";
import { useMemo } from "react";
import { useI18n, isRTL } from "@/i18n";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";

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
  primary_owner?: { name: string } | null;
  _hasOffspring?: boolean;
  _isBreedingActive?: boolean;
}

interface HorseCardProps {
  horse: Horse;
  onClick?: () => void;
  compact?: boolean;
  /** Dense mode for 4-column grid — vertical layout with smaller avatar */
  dense?: boolean;
}

export const HorseCard = ({ horse, onClick, compact = false, dense = false }: HorseCardProps) => {
  const { t, lang } = useI18n();
  const rtl = isRTL(lang);

  const getGenderIcon = (gender: string) => {
    return gender === "female" ? "♀" : "♂";
  };

  const getStatusColor = (status?: string | null) => {
    if (status === "active") return "bg-success/10 text-success";
    if (status === "inactive") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

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

  const typeLabel = rtl ? typeBadgeProps.labelAr : typeBadgeProps.label;
  const breedName = horse.breed_data?.name || horse.breed || t('horses.unknownBreed');
  const colorName = horse.color_data?.name || horse.color;
  const branchName = horse.branch_data?.name;
  const ownerName = horse.primary_owner?.name;

  // Compact mode for list view
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer transition-all",
          "hover:shadow-md hover:border-border/80"
        )}
        onClick={onClick}
      >
        <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
          {horse.avatar_url ? (
            <img src={horse.avatar_url} alt={horse.name} className="w-full h-full object-cover" />
          ) : (
            <Heart className="w-4 h-4 text-gold" />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-navy text-cream text-[10px] font-bold rounded-full flex items-center justify-center">
            {getGenderIcon(horse.gender)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BilingualName name={horse.name} nameAr={horse.name_ar} inline primaryClassName="text-sm" secondaryClassName="text-[10px]" />
            <Badge className={cn("text-[10px] px-1.5", typeBadgeProps.className)}>
              {typeLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {breedName}
            {formattedAge && ` • ${formattedAge}`}
          </p>
        </div>
        <Badge variant="secondary" className={cn("text-[10px] shrink-0", getStatusColor(horse.status))}>
          {t(`horses.status.${horse.status || 'draft'}`)}
        </Badge>
      </div>
    );
  }

  // Dense mode for 4-column grid — vertical layout
  if (dense) {
    return (
      <Card 
        variant="elevated" 
        className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
        onClick={onClick}
      >
        <CardContent className="p-3">
          {/* Top: Avatar + Gender */}
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
              {horse.avatar_url ? (
                <img src={horse.avatar_url} alt={horse.name} className="w-full h-full object-cover" />
              ) : (
                <Heart className="w-5 h-5 text-gold" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-navy text-cream text-[10px] font-bold rounded-full flex items-center justify-center">
                {getGenderIcon(horse.gender)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <BilingualName
                name={horse.name}
                nameAr={horse.name_ar}
                primaryClassName="text-sm font-semibold"
                secondaryClassName="text-[10px]"
              />
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="secondary" className={cn("text-[10px] px-1.5", getStatusColor(horse.status))}>
              {t(`horses.status.${horse.status || 'draft'}`)}
            </Badge>
            <Badge className={cn("text-[10px] px-1.5", typeBadgeProps.className)}>
              {typeLabel}
            </Badge>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground truncate mb-1">
            {breedName}
            {colorName && ` • ${colorName}`}
          </p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {horse.birth_date && formattedAge && (
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
        </CardContent>
      </Card>
    );
  }

  // Full card mode for grid view (2-3 columns)
  return (
    <Card 
      variant="elevated" 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden min-w-0"
      onClick={onClick}
    >
      <CardContent className="p-4 min-w-0">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 overflow-hidden">
            {horse.avatar_url ? (
              <img src={horse.avatar_url} alt={horse.name} className="w-full h-full object-cover" />
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
              <BilingualName
                name={horse.name}
                nameAr={horse.name_ar}
                primaryClassName="font-display font-semibold text-foreground"
              />
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getStatusColor(horse.status))}
                >
                  {t(`horses.status.${horse.status || 'draft'}`)}
                </Badge>
                <Badge className={cn("text-xs", typeBadgeProps.className)}>
                  {typeLabel}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-2 truncate">
              {breedName}
              {colorName && ` • ${colorName}`}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {horse.birth_date && formattedAge && (
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
              {ownerName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {ownerName}
                </span>
              )}
              {horse.breeding_role && (
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-primary" />
                  {t(`horses.breedingRoles.${horse.breeding_role}`)}
                </span>
              )}
              {horse._hasOffspring && (
                <span className="flex items-center gap-1">
                  <Baby className="w-3 h-3 text-primary" />
                  {t("breeding.offspring.title")}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
