import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, ChevronRight } from "lucide-react";
import { useHorsePedigree, PedigreeData } from "@/hooks/useHorsePedigree";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface PedigreeSectionProps {
  horseId: string;
  /** Text-only fallbacks from the horse record */
  fatherName?: string | null;
  motherName?: string | null;
}

interface PedigreeEntryProps {
  label: string;
  name: string | null;
  linkedId?: string | null;
  compact?: boolean;
}

function PedigreeEntry({ label, name, linkedId, compact }: PedigreeEntryProps) {
  if (!name) return null;

  const content = (
    <div className={cn(
      "flex items-center justify-between rounded-lg border bg-card p-2.5",
      linkedId && "hover:bg-accent/50 transition-colors cursor-pointer",
      compact && "p-2"
    )}>
      <div className="min-w-0">
        <p className={cn("text-[10px] uppercase tracking-wider text-muted-foreground", compact && "text-[9px]")}>{label}</p>
        <p className={cn("font-medium text-sm truncate", compact && "text-xs")}>{name}</p>
      </div>
      {linkedId && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 rtl:rotate-180" />}
    </div>
  );

  if (linkedId) {
    return <Link to={`/dashboard/horses/${linkedId}`}>{content}</Link>;
  }
  return content;
}

export function PedigreeSection({ horseId, fatherName, motherName }: PedigreeSectionProps) {
  const { t } = useI18n();
  const { pedigree, loading } = useHorsePedigree(horseId);

  const sireName = pedigree?.sire?.name || pedigree?.sireNameFallback || fatherName;
  const damName = pedigree?.dam?.name || pedigree?.damNameFallback || motherName;

  const hasPedigree = !!(sireName || damName);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t("horses.profile.pedigree")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPedigree) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {t("horses.profile.pedigree")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs sm:text-sm">{t("horses.profile.noPedigree")}</p>
        </CardContent>
      </Card>
    );
  }

  // Grandparent names (linked or text fallback)
  const patGrandsireName = pedigree?.paternalGrandsire?.name || pedigree?.paternalGrandfatherFallback;
  const patGranddamName = pedigree?.paternalGranddam?.name || pedigree?.paternalGrandmotherFallback;
  const matGrandsireName = pedigree?.maternalGrandsire?.name || pedigree?.maternalGrandfatherFallback;
  const matGranddamName = pedigree?.maternalGranddam?.name || pedigree?.maternalGrandmotherFallback;

  const hasGrandparents = !!(patGrandsireName || patGranddamName || matGrandsireName || matGranddamName);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          {t("horses.profile.pedigree")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Parents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <PedigreeEntry
              label={t("horses.profile.sire")}
              name={sireName || null}
              linkedId={pedigree?.sire?.id}
            />
            <PedigreeEntry
              label={t("horses.profile.dam")}
              name={damName || null}
              linkedId={pedigree?.dam?.id}
            />
          </div>

          {/* Grandparents */}
          {hasGrandparents && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                {t("breeding.pedigree.grandparents")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <PedigreeEntry
                  label={t("breeding.pedigree.paternalGrandsire")}
                  name={patGrandsireName || null}
                  linkedId={pedigree?.paternalGrandsire?.id}
                  compact
                />
                <PedigreeEntry
                  label={t("breeding.pedigree.paternalGranddam")}
                  name={patGranddamName || null}
                  linkedId={pedigree?.paternalGranddam?.id}
                  compact
                />
                <PedigreeEntry
                  label={t("breeding.pedigree.maternalGrandsire")}
                  name={matGrandsireName || null}
                  linkedId={pedigree?.maternalGrandsire?.id}
                  compact
                />
                <PedigreeEntry
                  label={t("breeding.pedigree.maternalGranddam")}
                  name={matGranddamName || null}
                  linkedId={pedigree?.maternalGranddam?.id}
                  compact
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
