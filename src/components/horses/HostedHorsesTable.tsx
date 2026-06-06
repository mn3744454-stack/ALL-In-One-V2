import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BilingualName } from "@/components/ui/BilingualName";
import { useI18n } from "@/i18n";
import { formatStandardDate } from "@/lib/displayHelpers";
import type { OwnerHostedHorseRow } from "@/hooks/owner/useOwnerHostedHorses";

interface HostedHorsesTableProps {
  rows: OwnerHostedHorseRow[];
  onRowClick?: (row: OwnerHostedHorseRow) => void;
}

/**
 * B2.4a — Owner-safe hosted horses table.
 * Renders ONLY fields available on OwnerHostedHorseRow.
 * MUST NOT render unit, branch, area, internal moves, lab/vet, or billing.
 */
export const HostedHorsesTable = ({ rows, onRowClick }: HostedHorsesTableProps) => {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  const phaseKeyFor = (row: OwnerHostedHorseRow) =>
    row.operational_phase === "awaiting_arrival" ? "awaitingArrival" :
    row.operational_phase === "arrival_scheduled" ? "arrivalScheduled" :
    row.operational_phase === "arrived_pending_placement" ? "arrivedPendingPlacement" :
    row.operational_phase === "admitted" ? "currentlyHosted" :
    row.operational_phase === "ended" || row.contract_status === "ended" || row.contract_status === "cancelled"
      ? "departed"
      : "currentlyHosted";

  const phaseVariantFor = (key: string): "default" | "secondary" | "outline" =>
    key === "currentlyHosted" ? "default" :
    key === "departed" ? "outline" : "secondary";

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/80">
            <TableHead className="text-start font-bold text-sm">{t("horseOwner.hosted.columns.horse")}</TableHead>
            <TableHead className="text-start font-bold text-sm">{t("horseOwner.hosted.columns.stable")}</TableHead>
            <TableHead className="text-center font-bold text-sm">{t("horseOwner.hosted.columns.phase")}</TableHead>
            <TableHead className="text-start font-bold text-sm whitespace-nowrap">{t("horseOwner.hosted.columns.date")}</TableHead>
            <TableHead className="text-center font-bold text-sm">{t("horseOwner.hosted.columns.openRequests")}</TableHead>
            <TableHead className="text-start font-bold text-sm">{t("horseOwner.hosted.columns.placement")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const displayName = isAr && row.horse_name_ar ? row.horse_name_ar : row.horse_name;
            const phaseKey = phaseKeyFor(row);
            const dateToShow = row.admitted_at ?? row.expected_arrival_at;
            const dateLabelKey = row.admitted_at ? "admittedSince" : "expectedArrival";

            return (
              <TableRow
                key={row.contract_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick?.(row)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={row.avatar_url ?? undefined} alt={displayName} />
                      <AvatarFallback className="text-xs">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <BilingualName name={row.horse_name} nameAr={row.horse_name_ar} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <bdi>
                    <BilingualName name={row.stable_name} nameAr={row.stable_name_ar} primaryClassName="text-sm" />
                  </bdi>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={phaseVariantFor(phaseKey)} className="text-[10px]">
                    {t(`horseOwner.hosted.phase.${phaseKey}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {dateToShow ? (
                    <span className="inline-flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {t(`horseOwner.hosted.${dateLabelKey}`)}
                      </span>
                      <span>{new Date(dateToShow).toLocaleDateString(isAr ? "ar" : "en")}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {row.open_service_requests_count > 0 ? (
                    <Badge variant="secondary" className="text-xs">{row.open_service_requests_count}</Badge>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground/80 italic">
                  {t("horseOwner.hosted.placementNotShared")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
