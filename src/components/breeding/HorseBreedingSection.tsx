import { Heart, Baby, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { useBreedingAttempts } from "@/hooks/breeding/useBreedingAttempts";
import { usePregnancies } from "@/hooks/breeding/usePregnancies";
import { BreedingStatusBadge } from "@/components/breeding/BreedingStatusBadge";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HorseBreedingSectionProps {
  horseId: string;
  horseName: string;
  gender: string;
}

export function HorseBreedingSection({ horseId, horseName, gender }: HorseBreedingSectionProps) {
  const { t } = useI18n();
  const isFemale = gender === "female" || gender === "mare";

  // For mares: breeding records where mare_id = horseId + pregnancies
  // For stallions: breeding records where stallion_id = horseId
  const attemptFilters = isFemale ? { mare_id: horseId } : { stallion_id: horseId };
  const { attempts, loading: attemptsLoading } = useBreedingAttempts(attemptFilters);
  const { pregnancies, loading: pregnanciesLoading } = usePregnancies(isFemale ? { mare_id: horseId } : undefined);

  const recentAttempts = attempts.slice(0, 3);
  const activePregnancy = isFemale
    ? pregnancies.find(p => !p.ended_at && (p.status === "pregnant" || p.status === "open"))
    : null;

  const hasData = attempts.length > 0 || (isFemale && pregnancies.length > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          {t("breeding.horseSection.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attemptsLoading || pregnanciesLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !hasData ? (
          <div className="text-center py-6">
            <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("breeding.empty.horseRecords")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active pregnancy for mares */}
            {isFemale && activePregnancy && (
              <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{t("breeding.horseSection.activePregnancy")}</span>
                  </div>
                  <BreedingStatusBadge status={activePregnancy.status} type="pregnancy" />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{t("breeding.startedOn")} {format(new Date(activePregnancy.start_date), "PP")}</span>
                  <span>
                    {differenceInDays(new Date(), new Date(activePregnancy.start_date))} {t("breeding.days")}
                  </span>
                  {activePregnancy.expected_due_date && (
                    <span>{t("breeding.dueOn")} {format(new Date(activePregnancy.expected_due_date), "PP")}</span>
                  )}
                </div>
              </div>
            )}

            {isFemale && !activePregnancy && (
              <p className="text-xs text-muted-foreground">{t("breeding.horseSection.noActivePregnancy")}</p>
            )}

            {/* Recent breeding records */}
            {recentAttempts.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("breeding.horseSection.recentRecords")}</h4>
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(attempt.attempt_date), "PP")}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {t(`breeding.methods.${attempt.attempt_type}`)}
                        </Badge>
                      </div>
                      <BreedingStatusBadge status={attempt.result} type="attempt" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link to="/dashboard/breeding">
              <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                {t("breeding.horseSection.viewAll")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
