import { Heart, Baby, Calendar, Crown, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { useBreedingAttempts } from "@/hooks/breeding/useBreedingAttempts";
import { usePregnancies } from "@/hooks/breeding/usePregnancies";
import { BreedingStatusBadge } from "@/components/breeding/BreedingStatusBadge";
import { useI18n } from "@/i18n";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getBreedingRole } from "@/lib/breedingEligibility";

interface HorseBreedingSectionProps {
  horseId: string;
  horseName: string;
  gender: string;
  birthDate?: string | null;
  birthAt?: string | null;
  isGelded?: boolean;
  breedingRole?: string | null;
}

export function HorseBreedingSection({
  horseId,
  horseName,
  gender,
  birthDate,
  birthAt,
  isGelded,
  breedingRole,
}: HorseBreedingSectionProps) {
  const { t } = useI18n();

  const role = getBreedingRole({
    gender,
    birth_date: birthDate,
    birth_at: birthAt,
    is_gelded: isGelded,
    breeding_role: breedingRole,
  });

  const isMare = role === 'breeding_mare';
  const isStallion = role === 'breeding_stallion';
  const isIneligible = role === 'ineligible';

  // Query based on reproductive role
  const attemptFilters = isMare
    ? { mare_id: horseId }
    : isStallion
      ? { stallion_id: horseId }
      : undefined;

  const { attempts, loading: attemptsLoading } = useBreedingAttempts(attemptFilters);
  const { pregnancies, loading: pregnanciesLoading } = usePregnancies(isMare ? { mare_id: horseId } : undefined);

  const recentAttempts = attempts.slice(0, 3);
  const activePregnancy = isMare
    ? pregnancies.find(p => !p.ended_at && (p.status === "pregnant" || p.status === "open"))
    : null;

  const hasData = attempts.length > 0 || (isMare && pregnancies.length > 0);

  // Section title based on role
  const sectionTitle = isMare
    ? t("breeding.horseSection.titleMare")
    : isStallion
      ? t("breeding.horseSection.titleStallion")
      : t("breeding.horseSection.title");

  const recordsLabel = isStallion
    ? t("breeding.horseSection.serviceRecords")
    : t("breeding.horseSection.recentRecords");

  // Don't show breeding section for ineligible horses (geldings, colts, fillies)
  if (isIneligible) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            {t("breeding.horseSection.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Shield className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("breeding.horseSection.notEligible")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          {isStallion ? (
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          ) : (
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          )}
          {sectionTitle}
          {hasData && (
            <Badge variant="secondary" className="text-xs ms-1">{attempts.length}</Badge>
          )}
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
            {isMare && activePregnancy && (
              <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{t("breeding.horseSection.activePregnancy")}</span>
                  </div>
                  <BreedingStatusBadge status={activePregnancy.status} type="pregnancy" />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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

            {isMare && !activePregnancy && (
              <p className="text-xs text-muted-foreground">{t("breeding.horseSection.noActivePregnancy")}</p>
            )}

            {/* Recent breeding/service records */}
            {recentAttempts.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">{recordsLabel}</h4>
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="shrink-0">{format(new Date(attempt.attempt_date), "PP")}</span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {t(`breeding.methods.${attempt.attempt_type}`)}
                        </Badge>
                        {/* Show the other party */}
                        {isStallion && attempt.mare && (
                          <span className="text-xs text-muted-foreground truncate">
                            × {attempt.mare.name}
                          </span>
                        )}
                        {isMare && (attempt.stallion || attempt.external_stallion_name) && (
                          <span className="text-xs text-muted-foreground truncate">
                            × {attempt.stallion?.name || attempt.external_stallion_name}
                          </span>
                        )}
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
