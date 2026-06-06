import { useState, useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { FileText, Plus, CalendarClock } from "lucide-react";
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
  counterpartyName: string | null;
  planName: string | null;
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

function RowActions({ c, isStableSide, isOwnerSide, h }: { c: BoardingContract; isStableSide: boolean; isOwnerSide: boolean; h: ActionHandlers }) {
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
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
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

  const unhostedHorses = isOwner
    ? horses.filter((h: any) => !h.current_location_id && !h.housing_unit_id)
    : [];

  const rows: RowData[] = useMemo(() => {
    return contracts.map((c) => {
      const isStableSide = c.stable_tenant_id === tenantId;
      const isOwnerSide = c.owner_tenant_id === tenantId;
      const snap = (c.plan_snapshot ?? {}) as Record<string, any>;
      const d = displayMap[c.id];
      const horseName =
        (isAr ? d?.horse_name_ar : d?.horse_name) || d?.horse_name || d?.horse_name_ar || null;
      const counterpartyName = isStableSide
        ? (isAr ? d?.owner_tenant_name_ar : d?.owner_tenant_name) ||
          d?.owner_tenant_name || d?.owner_tenant_name_ar || null
        : (isAr ? d?.stable_tenant_name_ar : d?.stable_tenant_name) ||
          d?.stable_tenant_name || d?.stable_tenant_name_ar || null;
      const planName =
        (isAr ? d?.plan_name_ar : d?.plan_name) || snap.name || snap.name_ar || null;
      const price = d?.plan_base_price ?? snap.base_price ?? null;
      const currency = d?.plan_currency ?? snap.currency ?? "";
      const cycle = d?.plan_billing_cycle ?? snap.billing_cycle ?? "";
      const priceLine = price != null ? `${price} ${currency}/${cycle}` : null;
      const dateSource =
        c.start_date || c.activated_at || c.expected_arrival_at || c.created_at;
      const dateLine = dateSource ? formatStandardDate(dateSource) : null;
      return { c, isStableSide, isOwnerSide, horseName, counterpartyName, planName, priceLine, dateLine };
    });
  }, [contracts, displayMap, tenantId, isAr]);

  const handlers: ActionHandlers = {
    isStable,
    onReview: setReviewContract,
    onApprove: setApproveContract,
    onSchedule: setScheduleContract,
    onCancel: (c) => cancel.mutate({ contract_id: c.id }),
    onEnd: (c) => end.mutate(c.id),
  };

  // Renderers ---------------------------------------------------------------

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
        <div className="text-sm font-medium truncate">
          {r.horseName ?? (
            <span className="text-muted-foreground italic">
              {t("boardingContracts.displayContextUnavailable")}
            </span>
          )}
        </div>
        {r.counterpartyName && (
          <div className="text-xs text-muted-foreground truncate">
            {r.isStableSide ? t("boardingContracts.owner") : t("boardingContracts.stable")}: {r.counterpartyName}
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
            <span className="text-sm font-medium truncate">
              {r.horseName ?? (
                <span className="text-muted-foreground italic">
                  {t("boardingContracts.displayContextUnavailable")}
                </span>
              )}
            </span>
          </div>
          {r.counterpartyName && (
            <div className="text-xs text-muted-foreground truncate">
              {r.isStableSide ? t("boardingContracts.owner") : t("boardingContracts.stable")}: {r.counterpartyName}
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

  const renderTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr className="text-start">
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.contract")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.type")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.horse")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.counterparty")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.status")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.operationalPhase")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.plan")}</th>
            <th className="px-3 py-2 text-start font-medium">{t("contracts.columns.date")}</th>
            <th className="px-3 py-2 text-end font-medium">{t("contracts.columns.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.c.id} className="border-t align-top">
              <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                {r.c.id.slice(0, 8)}
              </td>
              <td className="px-3 py-2"><TypeBadge /></td>
              <td className="px-3 py-2">
                {r.horseName ?? (
                  <span className="text-muted-foreground italic">
                    {t("boardingContracts.displayContextUnavailable")}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {r.counterpartyName ?? "—"}
              </td>
              <td className="px-3 py-2"><StatusBadge status={r.c.status} /></td>
              <td className="px-3 py-2 text-muted-foreground">
                {r.c.status === "active" && r.c.operational_phase && r.c.operational_phase !== "not_started"
                  ? t(`boardingContracts.operationalPhase.${r.c.operational_phase}`)
                  : "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {r.planName ? (
                  <div className="space-y-0.5">
                    <div className="truncate">{r.planName}</div>
                    {r.priceLine && <div className="text-xs">{r.priceLine}</div>}
                  </div>
                ) : "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.dateLine ?? "—"}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end">
                  <RowActions c={r.c} isStableSide={r.isStableSide} isOwnerSide={r.isOwnerSide} h={handlers} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
                  <div className="font-medium truncate">{h.name}</div>
                  {h.name_ar && (
                    <div className="text-xs text-muted-foreground truncate">{h.name_ar}</div>
                  )}
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
    </div>
  );
}
