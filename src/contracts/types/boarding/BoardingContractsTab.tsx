import { useState, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BilingualName } from "@/components/ui/BilingualName";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import {
  useBoardingContracts,
  useBoardingContractsDisplay,
  type BoardingContract,
  type BoardingContractStatus,
} from "@/hooks/boarding/useBoardingContracts";
import { useHorses } from "@/hooks/useHorses";
import { CreateBoardingContractDialog } from "@/components/boarding/CreateBoardingContractDialog";
import { RequestBoardingDialog } from "@/components/boarding/RequestBoardingDialog";
import { ReviewAndSetPlanDialog } from "@/components/boarding/ReviewAndSetPlanDialog";
import { ReviewAndApproveContractDialog } from "@/components/boarding/ReviewAndApproveContractDialog";
import { ServiceRequestsSection } from "@/components/boarding/ServiceRequestsSection";
import { ScheduleArrivalSheet } from "@/components/boarding/ScheduleArrivalSheet";
import { ContractDestructiveConfirmDialog } from "@/components/boarding/ContractDestructiveConfirmDialog";
import { BoardingContractDetailsSheet } from "./BoardingContractDetailsSheet";
import { FileText, Plus, CalendarClock, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStandardDate } from "@/lib/displayHelpers";


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

interface RowData {
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

interface ActionHandlers {
  isStable: boolean;
  onReview: (c: BoardingContract) => void;
  onApprove: (c: BoardingContract) => void;
  onSchedule: (c: BoardingContract) => void;
  onCancel: (c: BoardingContract) => void;
  onEnd: (c: BoardingContract) => void;
}

/**
 * Inline visible button group — used for List & Grid (where space allows).
 * Preserves the exact same gating as before.
 */
function RowActions({
  c,
  isStableSide,
  isOwnerSide,
  h,
}: {
  c: BoardingContract;
  isStableSide: boolean;
  isOwnerSide: boolean;
  h: ActionHandlers;
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2 flex-wrap">
      {h.isStable && isStableSide && c.status === "pending_stable" && (
        <Button size="sm" onClick={() => h.onReview(c)}>{t("boardingContracts.reviewAndSetPlan")}</Button>
      )}
      {isOwnerSide && c.status === "pending_owner" && (
        <Button size="sm" onClick={() => h.onApprove(c)}>{t("boardingContracts.reviewAndApprove")}</Button>
      )}
      {(["pending_stable", "pending_owner", "active"] as const).includes(c.status as any) && (
        <Button size="sm" variant="outline" onClick={() => h.onCancel(c)}>{t("boardingContracts.cancelContract")}</Button>
      )}
      {h.isStable && isStableSide && c.status === "active" &&
        (c.operational_phase === "awaiting_arrival" ||
          c.operational_phase === "arrival_scheduled" ||
          c.operational_phase === "not_started") && (
          <Button size="sm" onClick={() => h.onSchedule(c)} className="gap-1">
            <CalendarClock className="w-3 h-3" />
            {c.operational_phase === "arrival_scheduled"
              ? t("boardingContracts.scheduleArrival.reschedule")
              : t("boardingContracts.scheduleArrival.cta")}
          </Button>
        )}
      {isStableSide && c.status === "active" && (
        <Button size="sm" variant="outline" onClick={() => h.onEnd(c)}>{t("boardingContracts.endContract")}</Button>
      )}
    </div>
  );
}

/**
 * Three-dot dropdown — used for Table view to reduce row clutter.
 * Same gating as RowActions, conditionally rendered (not just hidden).
 */
function RowActionsMenu({
  c,
  isStableSide,
  isOwnerSide,
  h,
}: {
  c: BoardingContract;
  isStableSide: boolean;
  isOwnerSide: boolean;
  h: ActionHandlers;
}) {
  const { t } = useI18n();

  const canReview = h.isStable && isStableSide && c.status === "pending_stable";
  const canApprove = isOwnerSide && c.status === "pending_owner";
  const canSchedule =
    h.isStable && isStableSide && c.status === "active" &&
    (c.operational_phase === "awaiting_arrival" ||
      c.operational_phase === "arrival_scheduled" ||
      c.operational_phase === "not_started");
  const canCancel = (["pending_stable", "pending_owner", "active"] as const).includes(c.status as any);
  const canEnd = isStableSide && c.status === "active";

  const hasAny = canReview || canApprove || canSchedule || canCancel || canEnd;
  if (!hasAny) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t("contracts.rowActions.menuLabel")}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canReview && (
          <DropdownMenuItem onClick={() => h.onReview(c)}>
            {t("boardingContracts.reviewAndSetPlan")}
          </DropdownMenuItem>
        )}
        {canApprove && (
          <DropdownMenuItem onClick={() => h.onApprove(c)}>
            {t("boardingContracts.reviewAndApprove")}
          </DropdownMenuItem>
        )}
        {canSchedule && (
          <DropdownMenuItem onClick={() => h.onSchedule(c)}>
            <CalendarClock className="w-3.5 h-3.5 me-2" />
            {c.operational_phase === "arrival_scheduled"
              ? t("boardingContracts.scheduleArrival.reschedule")
              : t("boardingContracts.scheduleArrival.cta")}
          </DropdownMenuItem>
        )}
        {(canReview || canApprove || canSchedule) && (canCancel || canEnd) && (
          <DropdownMenuSeparator />
        )}
        {canCancel && (
          <DropdownMenuItem
            onClick={() => h.onCancel(c)}
            className="text-destructive focus:text-destructive"
          >
            {t("boardingContracts.cancelContract")}
          </DropdownMenuItem>
        )}
        {canEnd && (
          <DropdownMenuItem
            onClick={() => h.onEnd(c)}
            className="text-destructive focus:text-destructive"
          >
            {t("boardingContracts.endContract")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TypeBadge() {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className="gap-1">
      <FileText className="w-3 h-3" />
      {t("contracts.types.boarding.badge")}
    </Badge>
  );
}

export function BoardingContractsTab() {
  const { t } = useI18n();
  const { activeTenant } = useTenant();
  const tenantType = activeTenant?.tenant?.type;
  const tenantId = activeTenant?.tenant?.id ?? activeTenant?.tenant_id ?? null;
  const isOwner = tenantType === "horse_owner";
  const isStable = tenantType === "stable";

  const { contracts, isLoading, cancel, end } = useBoardingContracts();
  const { horses } = useHorses();
  const { displayMap } = useBoardingContractsDisplay(contracts.map((c) => c.id));
  const { viewMode, gridColumns, setViewMode, setGridColumns } =
    useViewPreference("contracts.boarding");

  const [createOpen, setCreateOpen] = useState(false);
  const [requestForHorseId, setRequestForHorseId] = useState<string | null>(null);
  const [reviewContract, setReviewContract] = useState<BoardingContract | null>(null);
  const [approveContract, setApproveContract] = useState<BoardingContract | null>(null);
  const [scheduleContract, setScheduleContract] = useState<BoardingContract | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BoardingContract | null>(null);
  const [endTarget, setEndTarget] = useState<BoardingContract | null>(null);
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);


  const unhostedHorses = isOwner
    ? horses.filter((h: any) => !h.current_location_id && !h.housing_unit_id)
    : [];

  const rows: RowData[] = useMemo(() => {
    return contracts.map((c) => {
      const isStableSide = c.stable_tenant_id === tenantId;
      const isOwnerSide = c.owner_tenant_id === tenantId;
      const snap = (c.plan_snapshot ?? {}) as Record<string, any>;
      const d = displayMap[c.id];
      const horseName = d?.horse_name ?? null;
      const horseNameAr = d?.horse_name_ar ?? null;
      const counterpartyName = isStableSide
        ? d?.owner_tenant_name ?? null
        : d?.stable_tenant_name ?? null;
      const counterpartyNameAr = isStableSide
        ? d?.owner_tenant_name_ar ?? null
        : d?.stable_tenant_name_ar ?? null;
      const planName = d?.plan_name ?? snap.name ?? null;
      const planNameAr = d?.plan_name_ar ?? snap.name_ar ?? null;
      const price = d?.plan_base_price ?? snap.base_price ?? null;
      const currency = d?.plan_currency ?? snap.currency ?? "";
      const cycle = d?.plan_billing_cycle ?? snap.billing_cycle ?? "";
      const priceLine = price != null ? `${price} ${currency}/${cycle}` : null;
      const dateSource =
        c.start_date || c.activated_at || c.expected_arrival_at || c.created_at;
      const dateLine = dateSource ? formatStandardDate(dateSource) : null;
      return {
        c,
        isStableSide,
        isOwnerSide,
        horseName,
        horseNameAr,
        counterpartyName,
        counterpartyNameAr,
        planName,
        planNameAr,
        priceLine,
        dateLine,
      };
    });
  }, [contracts, displayMap, tenantId]);


  const handlers: ActionHandlers = {
    isStable,
    onReview: setReviewContract,
    onApprove: setApproveContract,
    onSchedule: setScheduleContract,
    onCancel: setCancelTarget,
    onEnd: setEndTarget,
  };

  // Renderers ---------------------------------------------------------------

  const renderHorseName = (r: RowData) => {
    if (!r.horseName && !r.horseNameAr) {
      return (
        <span className="text-muted-foreground italic">
          {t("boardingContracts.displayContextUnavailable")}
        </span>
      );
    }
    return <BilingualName name={r.horseName} nameAr={r.horseNameAr} />;
  };

  const renderCounterparty = (r: RowData) => {
    if (!r.counterpartyName && !r.counterpartyNameAr) return null;
    return <BilingualName name={r.counterpartyName} nameAr={r.counterpartyNameAr} />;
  };

  const renderCard = (r: RowData) => (
    <div key={r.c.id} className="rounded-md border p-3 space-y-3 bg-card">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge />
          <StatusBadge status={r.c.status} />
          {r.c.status === "active" && r.c.operational_phase && r.c.operational_phase !== "not_started" && (
            <Badge variant="outline" className="gap-1">
              <CalendarClock className="w-3 h-3" />
              {t(`boardingContracts.operationalPhase.${r.c.operational_phase}`)}
            </Badge>
          )}
        </div>
        <div className="text-sm">{renderHorseName(r)}</div>
        {(r.counterpartyName || r.counterpartyNameAr) && (
          <div className="text-xs text-muted-foreground">
            <span className="me-1">
              {r.isStableSide ? t("boardingContracts.owner") : t("boardingContracts.stable")}:
            </span>
            {renderCounterparty(r)}
          </div>
        )}
        {r.planName && (
          <div className="text-xs text-muted-foreground truncate">
            {r.planName}{r.priceLine ? ` — ${r.priceLine}` : ""}
          </div>
        )}
        {r.dateLine && (
          <div className="text-xs text-muted-foreground">{r.dateLine}</div>
        )}
        <div className="text-[11px] text-muted-foreground font-mono">
          {t("boardingContracts.technicalId")}: {r.c.id.slice(0, 8)}
        </div>
      </div>
      <RowActions c={r.c} isStableSide={r.isStableSide} isOwnerSide={r.isOwnerSide} h={handlers} />
      {r.c.status === "active" && (r.isStableSide || r.isOwnerSide) && (
        <div className="pt-3 border-t">
          <ServiceRequestsSection
            boardingContractId={r.c.id}
            side={r.isStableSide ? "stable" : "owner"}
          />
        </div>
      )}
    </div>
  );

  const renderListRow = (r: RowData) => (
    <div key={r.c.id} className="rounded-md border p-3 bg-card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge />
            <StatusBadge status={r.c.status} />
            {r.c.status === "active" && r.c.operational_phase && r.c.operational_phase !== "not_started" && (
              <Badge variant="outline" className="gap-1">
                <CalendarClock className="w-3 h-3" />
                {t(`boardingContracts.operationalPhase.${r.c.operational_phase}`)}
              </Badge>
            )}
          </div>
          <div className="text-sm">{renderHorseName(r)}</div>
          {(r.counterpartyName || r.counterpartyNameAr) && (
            <div className="text-xs text-muted-foreground">
              <span className="me-1">
                {r.isStableSide ? t("boardingContracts.owner") : t("boardingContracts.stable")}:
              </span>
              {renderCounterparty(r)}
            </div>
          )}
          {(r.planName || r.dateLine) && (
            <div className="text-xs text-muted-foreground truncate">
              {r.planName}
              {r.planName && r.priceLine ? ` — ${r.priceLine}` : r.priceLine ?? ""}
              {r.dateLine ? `${r.planName || r.priceLine ? " · " : ""}${r.dateLine}` : ""}
            </div>
          )}
        </div>
        <RowActions c={r.c} isStableSide={r.isStableSide} isOwnerSide={r.isOwnerSide} h={handlers} />
      </div>
      {r.c.status === "active" && (r.isStableSide || r.isOwnerSide) && (
        <div className="pt-3 mt-3 border-t">
          <ServiceRequestsSection
            boardingContractId={r.c.id}
            side={r.isStableSide ? "stable" : "owner"}
          />
        </div>
      )}
    </div>
  );

  const renderPlanBilingual = (r: RowData) => {
    if (!r.planName && !r.planNameAr) return null;
    return <BilingualName name={r.planName} nameAr={r.planNameAr} />;
  };

  const renderTable = () => {
    const headClass = "text-sm font-bold text-foreground";
    return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/80 hover:bg-muted/80">
            <TableHead className={headClass}>{t("contracts.columns.contract")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.type")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.horse")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.counterparty")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.status")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.operationalPhase")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.plan")}</TableHead>
            <TableHead className={headClass}>{t("contracts.columns.date")}</TableHead>
            <TableHead className={cn(headClass, "text-end")}>{t("contracts.columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.c.id} className="align-top">
              <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {r.c.id.slice(0, 8)}
              </TableCell>
              <TableCell><TypeBadge /></TableCell>
              <TableCell>{renderHorseName(r)}</TableCell>
              <TableCell className="text-muted-foreground">
                {renderCounterparty(r) ?? "—"}
              </TableCell>
              <TableCell><StatusBadge status={r.c.status} /></TableCell>
              <TableCell className="text-muted-foreground">
                {r.c.status === "active" && r.c.operational_phase && r.c.operational_phase !== "not_started"
                  ? t(`boardingContracts.operationalPhase.${r.c.operational_phase}`)
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(r.planName || r.planNameAr) ? (
                  <div className="space-y-0.5 min-w-0">
                    {renderPlanBilingual(r)}
                    {r.priceLine && <div className="text-xs">{r.priceLine}</div>}
                  </div>
                ) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {r.dateLine ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={t("contracts.rowActions.menuLabel")}
                    onClick={() => setDetailsRowId(r.c.id)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    );
  };


  return (
    <div className="space-y-6">
      {isStable && (
        <div className="flex items-center justify-end">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t("boardingContracts.createBoardingContract")}
          </Button>
        </div>
      )}

      {isOwner && unhostedHorses.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-medium text-navy">
            {t("boardingContracts.unhostedHorsesTitle")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("boardingContracts.unhostedHorsesDesc")}
          </p>
          <div className="grid gap-2">
            {unhostedHorses.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <BilingualName name={h.name} nameAr={h.name_ar} />
                </div>
                <Button size="sm" onClick={() => setRequestForHorseId(h.id)}>
                  {t("boardingContracts.requestBoarding")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-medium text-navy flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("boardingContracts.contractsListTitle")}
          </h2>
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable
          />
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("boardingContracts.noContracts")}</p>
        )}

        {!isLoading && rows.length > 0 && (
          viewMode === "table" ? (
            renderTable()
          ) : viewMode === "list" ? (
            <div className="grid grid-cols-1 gap-3">{rows.map(renderListRow)}</div>
          ) : (
            <div className={getGridClass(gridColumns, "grid")}>{rows.map(renderCard)}</div>
          )
        )}
      </Card>

      {isStable && (
        <CreateBoardingContractDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
      {isOwner && requestForHorseId && (
        <RequestBoardingDialog
          open={!!requestForHorseId}
          onOpenChange={(o) => !o && setRequestForHorseId(null)}
          horseId={requestForHorseId}
          horseName={unhostedHorses.find((h: any) => h.id === requestForHorseId)?.name}
        />
      )}
      {isStable && (
        <ReviewAndSetPlanDialog
          open={!!reviewContract}
          onOpenChange={(o) => !o && setReviewContract(null)}
          contract={reviewContract}
        />
      )}
      <ReviewAndApproveContractDialog
        open={!!approveContract}
        onOpenChange={(o) => !o && setApproveContract(null)}
        contract={approveContract}
        display={approveContract ? displayMap[approveContract.id] : null}
      />
      <ScheduleArrivalSheet
        open={!!scheduleContract}
        onOpenChange={(o) => !o && setScheduleContract(null)}
        contract={scheduleContract}
      />

      <ContractDestructiveConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title={t("contracts.confirmCancel.title")}
        message={t("contracts.confirmCancel.message")}
        confirmLabel={t("contracts.confirmCancel.confirm")}
        dismissLabel={t("contracts.confirmCancel.dismiss")}
        isPending={cancel.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancel.mutate(
            { contract_id: cancelTarget.id },
            { onSettled: () => setCancelTarget(null) },
          );
        }}
      />

      <ContractDestructiveConfirmDialog
        open={!!endTarget}
        onOpenChange={(o) => !o && setEndTarget(null)}
        title={t("contracts.confirmEnd.title")}
        message={t("contracts.confirmEnd.message")}
        confirmLabel={t("contracts.confirmEnd.confirm")}
        dismissLabel={t("contracts.confirmEnd.dismiss")}
        isPending={end.isPending}
        onConfirm={() => {
          if (!endTarget) return;
          end.mutate(endTarget.id, {
            onSettled: () => setEndTarget(null),
          });
        }}
      />

      <BoardingContractDetailsSheet
        open={!!detailsRowId}
        onOpenChange={(o) => !o && setDetailsRowId(null)}
        row={rows.find((r) => r.c.id === detailsRowId) ?? null}
        handlers={handlers}
      />
    </div>
  );
}

