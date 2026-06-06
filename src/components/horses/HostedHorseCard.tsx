import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Clock, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { formatStandardDate } from "@/lib/displayHelpers";
import type { OwnerHostedHorseRow } from "@/hooks/owner/useOwnerHostedHorses";

interface HostedHorseCardProps {
  row: OwnerHostedHorseRow;
  onClick?: () => void;
  /** When true, render a compact stacked row suitable for List view mode. */
  compact?: boolean;
}

/**
 * B2.4 MVB / B2.4a — Owner-facing hosted horse card.
 * Renders only owner-safe fields from `get_owner_hosted_horses`.
 * MUST NOT render unit/branch labels, lab/vet/financial detail.
 */
export const HostedHorseCard = ({ row, onClick, compact = false }: HostedHorseCardProps) => {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";

  const displayName = isAr && row.horse_name_ar ? row.horse_name_ar : row.horse_name;
  const stableName = isAr && row.stable_name_ar ? row.stable_name_ar : row.stable_name;

  const phaseKey =
    row.operational_phase === "awaiting_arrival" ? "awaitingArrival" :
    row.operational_phase === "arrival_scheduled" ? "arrivalScheduled" :
    row.operational_phase === "arrived_pending_placement" ? "arrivedPendingPlacement" :
    row.operational_phase === "admitted" ? "currentlyHosted" :
    row.operational_phase === "ended" || row.contract_status === "ended" || row.contract_status === "cancelled"
      ? "departed"
      : "currentlyHosted";

  const phaseVariant: "default" | "secondary" | "outline" =
    phaseKey === "currentlyHosted" ? "default" :
    phaseKey === "departed" ? "outline" : "secondary";

  const dateToShow = row.admitted_at ?? row.expected_arrival_at;
  const dateLabelKey = row.admitted_at ? "admittedSince" : "expectedArrival";

  return (
    <Card
      dir={dir}
      onClick={onClick}
      className="cursor-pointer hover:border-primary/40 transition-colors"
    >
      <CardContent className={cn(compact ? "p-3 space-y-2" : "p-4 space-y-3")}>
        <div className="flex items-start gap-3">
          <Avatar className={cn("shrink-0", compact ? "w-10 h-10" : "w-12 h-12")}>
            <AvatarImage src={row.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
              <Badge variant={phaseVariant} className="text-[10px] px-1.5 py-0 h-5">
                {t(`horseOwner.hosted.phase.${phaseKey}`)}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {t("horseOwner.hosted.hostedAt")}{" "}
                <bdi>{stableName}</bdi>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {dateToShow && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t(`horseOwner.hosted.${dateLabelKey}`)}{" "}
              {new Date(dateToShow).toLocaleDateString(isAr ? "ar" : "en")}
            </span>
          )}
          {row.open_service_requests_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Inbox className="w-3 h-3" />
              {t("horseOwner.hosted.openServiceRequests")}: {row.open_service_requests_count}
            </span>
          )}
        </div>

        {!compact && (
          <p className="text-xs text-muted-foreground/80 italic border-t border-border/40 pt-2">
            {t("horseOwner.hosted.placementNotShared")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
