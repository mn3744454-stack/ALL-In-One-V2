import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Baby, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHorseOffspring } from "@/hooks/useHorseOffspring";
import { useI18n, isRTL } from "@/i18n";
import { getHorseTypeLabel, getHorseTypeBadgeProps } from "@/lib/horseClassification";
import { formatAgeCompact, getCurrentAgeParts } from "@/lib/horseClassification";
import { displayHorseName } from "@/lib/displayHelpers";
import { cn } from "@/lib/utils";

interface OffspringSectionProps {
  horseId: string;
  gender: string;
}

export function OffspringSection({ horseId, gender }: OffspringSectionProps) {
  const { t, lang } = useI18n();
  const { offspring, loading } = useHorseOffspring(horseId, gender);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Baby className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t("breeding.offspring.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Baby className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          {t("breeding.offspring.title")}
          {offspring.length > 0 && (
            <Badge variant="secondary" className="text-xs ms-1">{offspring.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {offspring.length === 0 ? (
          <div className="text-center py-6">
            <Baby className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("breeding.offspring.empty")}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {offspring.map((foal) => {
              const type = getHorseTypeLabel({
                gender: foal.gender,
                birth_date: foal.birth_date,
              });
              const badge = type ? getHorseTypeBadgeProps(type) : null;
              const ageParts = getCurrentAgeParts({ gender: foal.gender, birth_date: foal.birth_date });
              const ageStr = formatAgeCompact(ageParts);

              return (
                <Link key={foal.id} to={`/dashboard/horses/${foal.id}`}>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={foal.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{foal.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{foal.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {badge && (
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", badge.className)}>
                              {badge.label}
                            </Badge>
                          )}
                          {ageParts && <span>{ageStr}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
