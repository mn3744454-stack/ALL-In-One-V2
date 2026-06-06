import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { BilingualName } from "@/components/ui/BilingualName";
import { ServiceRequestsSection } from "@/components/boarding/ServiceRequestsSection";
import { BoardingContractDocumentsSection } from "./BoardingContractDocumentsSection";
import {
  type BoardingContract,
  type BoardingContractStatus,
} from "@/hooks/boarding/useBoardingContracts";
import { FileText, CalendarClock } from "lucide-react";

interface RowDataLike {
  c: BoardingContract;
  isStableSide: boolean;
  isOwnerSide: boolean;
  horseName: string | null;
  horseNameAr: string | null;
  counterpartyName: string | null;
  counterpartyNameAr: string | null;
  planName: string | null;
  planNameAr: string | null;
  priceLine: string | null;
  dateLine: string | null;
}

interface ActionHandlersLike {
  isStable: boolean;
  onReview: (c: BoardingContract) => void;
  onApprove: (c: BoardingContract) => void;
  onSchedule: (c: BoardingContract) => void;
  onCancel: (c: BoardingContract) => void;
  onEnd: (c: BoardingContract) => void;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RowDataLike | null;
  handlers: ActionHandlersLike;
}

function StatusBadge({ status }: { status: BoardingContractStatus }) {
  const { t } = useI18n();
  const map: Record<BoardingContractStatus, { label: string; variant: any }> = {
    pending_stable: { label: t("boardingContracts.status.pending_stable"), variant: "secondary" },
    pending_owner: { label: t("boardingContracts.status.pending_owner"), variant: "secondary" },
    active: { label: t("boardingContracts.status.active"), variant: "default" },
    cancelled: { label: t("boardingContracts.status.cancelled"), variant: "outline" },
    ended: { label: t("boardingContracts.status.ended"), variant: "outline" },
  };
  const v = map[status];
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

export function BoardingContractDetailsSheet({ open, onOpenChange, row, handlers }: Props) {
  const { t } = useI18n();
  if (!row) return null;
  const { c, isStableSide, isOwnerSide } = row;
  const h = handlers;

  const canReview = h.isStable && isStableSide && c.status === "pending_stable";
  const canApprove = isOwnerSide && c.status === "pending_owner";
  const canSchedule =
    h.isStable && isStableSide && c.status === "active" &&
    (c.operational_phase === "awaiting_arrival" ||
      c.operational_phase === "arrival_scheduled" ||
      c.operational_phase === "not_started");
  const canCancel = (["pending_stable", "pending_owner", "active"] as const).includes(c.status as any);
  const canEnd = isStableSide && c.status === "active";

  const close = () => onOpenChange(false);
  const run = (fn: () => void) => {
    close();
    setTimeout(fn, 0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-3 text-start">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              {t("contracts.types.boarding.badge")}
            </Badge>
            <StatusBadge status={c.status} />
            {c.status === "active" && c.operational_phase && c.operational_phase !== "not_started" && (
              <Badge variant="outline" className="gap-1">
                <CalendarClock className="w-3 h-3" />
                {t(`boardingContracts.operationalPhase.${c.operational_phase}`)}
              </Badge>
            )}
          </div>
          <SheetTitle>{t("contracts.detailsSheet.title")}</SheetTitle>
          <SheetDescription>{t("contracts.detailsSheet.summaryNote")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* B. Contract summary */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("contracts.detailsSheet.summary")}
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">{t("boardingContracts.technicalId")}</span>
              <span className="font-mono text-xs">{c.id.slice(0, 8)}</span>
              {row.dateLine && (
                <>
                  <span className="text-muted-foreground">{t("contracts.columns.date")}</span>
                  <span>{row.dateLine}</span>
                </>
              )}
              {(row.planName || row.planNameAr) && (
                <>
                  <span className="text-muted-foreground">{t("contracts.columns.plan")}</span>
                  <span className="min-w-0">
                    <BilingualName name={row.planName} nameAr={row.planNameAr} />
                    {row.priceLine && (
                      <span className="block text-xs text-muted-foreground mt-0.5">{row.priceLine}</span>
                    )}
                  </span>
                </>
              )}
            </div>
          </section>

          <Separator />

          {/* C. Parties and horse */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("contracts.detailsSheet.parties")}
            </h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="text-muted-foreground">{t("contracts.columns.horse")}</span>
              <span className="min-w-0">
                {row.horseName || row.horseNameAr ? (
                  <BilingualName name={row.horseName} nameAr={row.horseNameAr} />
                ) : (
                  <span className="text-muted-foreground italic">
                    {t("boardingContracts.displayContextUnavailable")}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {isStableSide ? t("boardingContracts.owner") : t("boardingContracts.stable")}
              </span>
              <span className="min-w-0">
                {row.counterpartyName || row.counterpartyNameAr ? (
                  <BilingualName name={row.counterpartyName} nameAr={row.counterpartyNameAr} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
          </section>

          {/* D. Service requests — only where already safe/shown */}
          {c.status === "active" && (isStableSide || isOwnerSide) && (
            <>
              <Separator />
              <section className="space-y-2">
                <ServiceRequestsSection
                  boardingContractId={c.id}
                  side={isStableSide ? "stable" : "owner"}
                />
              </section>
            </>
          )}

          {/* E. Available actions */}
          {(canReview || canApprove || canSchedule) && (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("contracts.detailsSheet.availableActions")}
                </h3>
                <div className="flex flex-col gap-2">
                  {canReview && (
                    <Button onClick={() => run(() => h.onReview(c))}>
                      {t("boardingContracts.reviewAndSetPlan")}
                    </Button>
                  )}
                  {canApprove && (
                    <Button onClick={() => run(() => h.onApprove(c))}>
                      {t("boardingContracts.reviewAndApprove")}
                    </Button>
                  )}
                  {canSchedule && (
                    <Button variant="outline" onClick={() => run(() => h.onSchedule(c))} className="gap-2 justify-center">
                      <CalendarClock className="w-4 h-4" />
                      {c.operational_phase === "arrival_scheduled"
                        ? t("boardingContracts.scheduleArrival.reschedule")
                        : t("boardingContracts.scheduleArrival.cta")}
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}

          {/* F. Destructive zone */}
          {(canCancel || canEnd) && (
            <>
              <Separator />
              <section className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  {t("contracts.detailsSheet.destructiveActions")}
                </h3>
                <div className="flex flex-col gap-2">
                  {canCancel && (
                    <Button variant="destructive" onClick={() => run(() => h.onCancel(c))}>
                      {t("boardingContracts.cancelContract")}
                    </Button>
                  )}
                  {canEnd && (
                    <Button variant="destructive" onClick={() => run(() => h.onEnd(c))}>
                      {t("boardingContracts.endContract")}
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
