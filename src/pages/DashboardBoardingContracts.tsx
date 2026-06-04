import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MobilePageHeader } from "@/components/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  useBoardingContracts,
  useBoardingContractsDisplay,
  type BoardingContractStatus,
} from "@/hooks/boarding/useBoardingContracts";
import { useHorses } from "@/hooks/useHorses";
import { CreateBoardingContractDialog } from "@/components/boarding/CreateBoardingContractDialog";
import { RequestBoardingDialog } from "@/components/boarding/RequestBoardingDialog";
import { ReviewAndSetPlanDialog } from "@/components/boarding/ReviewAndSetPlanDialog";
import { ReviewAndApproveContractDialog } from "@/components/boarding/ReviewAndApproveContractDialog";
import type { BoardingContract } from "@/hooks/boarding/useBoardingContracts";
import { FileText, Plus } from "lucide-react";

function StatusBadge({ status }: { status: BoardingContractStatus }) {
  const { t } = useI18n();
  const map: Record<BoardingContractStatus, { label: string; variant: any }> = {
    pending_stable: { label: t("boardingContracts.status.pending_stable"), variant: "secondary" },
    pending_owner:  { label: t("boardingContracts.status.pending_owner"),  variant: "secondary" },
    active:         { label: t("boardingContracts.status.active"),         variant: "default" },
    cancelled:      { label: t("boardingContracts.status.cancelled"),      variant: "outline" },
    ended:          { label: t("boardingContracts.status.ended"),          variant: "outline" },
  };
  const v = map[status];
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

export default function DashboardBoardingContracts() {
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
  const [createOpen, setCreateOpen] = useState(false);
  const [requestForHorseId, setRequestForHorseId] = useState<string | null>(null);
  const [reviewContract, setReviewContract] = useState<BoardingContract | null>(null);
  const [approveContract, setApproveContract] = useState<BoardingContract | null>(null);

  const unhostedHorses = isOwner
    ? horses.filter((h: any) => !h.current_location_id && !h.housing_unit_id)
    : [];

  return (
    <DashboardShell>
      <MobilePageHeader title={t("boardingContracts.pageTitle")} />
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy">
              {t("boardingContracts.pageTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("boardingContracts.pageSubtitle")}
            </p>
          </div>
          {isStable && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("boardingContracts.createBoardingContract")}
            </Button>
          )}
        </div>

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
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
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
          <h2 className="font-medium text-navy flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("boardingContracts.contractsListTitle")}
          </h2>
          {isLoading && (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}
          {!isLoading && contracts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("boardingContracts.noContracts")}
            </p>
          )}
          <div className="space-y-2">
            {contracts.map((c) => {
              const isStableSide = c.stable_tenant_id === tenantId;
              const isOwnerSide = c.owner_tenant_id === tenantId;
              const snap = (c.plan_snapshot ?? {}) as Record<string, any>;
              const d = displayMap[c.id];

              const horseName =
                (isAr ? d?.horse_name_ar : d?.horse_name) ||
                d?.horse_name ||
                d?.horse_name_ar ||
                null;
              const counterpartyName = isStableSide
                ? (isAr ? d?.owner_tenant_name_ar : d?.owner_tenant_name) ||
                  d?.owner_tenant_name ||
                  d?.owner_tenant_name_ar
                : (isAr ? d?.stable_tenant_name_ar : d?.stable_tenant_name) ||
                  d?.stable_tenant_name ||
                  d?.stable_tenant_name_ar;
              const planName =
                (isAr ? d?.plan_name_ar : d?.plan_name) ||
                snap.name ||
                snap.name_ar ||
                null;
              const price = d?.plan_base_price ?? snap.base_price ?? null;
              const currency = d?.plan_currency ?? snap.currency ?? "";
              const cycle = d?.plan_billing_cycle ?? snap.billing_cycle ?? "";

              return (
                <div
                  key={c.id}
                  className="rounded-md border p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={c.status} />
                      <span className="text-sm font-medium truncate">
                        {horseName ?? (
                          <span className="text-muted-foreground italic">
                            {t("boardingContracts.displayContextUnavailable")}
                          </span>
                        )}
                      </span>
                    </div>
                    {counterpartyName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {isStableSide
                          ? t("boardingContracts.owner")
                          : t("boardingContracts.stable")}
                        : {counterpartyName}
                      </div>
                    )}
                    {planName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {planName}
                        {price != null
                          ? ` — ${price} ${currency}/${cycle}`
                          : ""}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {t("boardingContracts.technicalId")}: {c.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {isStable && isStableSide && c.status === "pending_stable" && (
                      <Button size="sm" onClick={() => setReviewContract(c)}>
                        {t("boardingContracts.reviewAndSetPlan")}
                      </Button>
                    )}
                    {isOwnerSide && c.status === "pending_owner" && (
                      <Button size="sm" onClick={() => setApproveContract(c)}>
                        {t("boardingContracts.reviewAndApprove")}
                      </Button>
                    )}
                    {(["pending_stable", "pending_owner", "active"] as const).includes(
                      c.status as any,
                    ) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancel.mutate({ contract_id: c.id })}
                      >
                        {t("boardingContracts.cancelContract")}
                      </Button>
                    )}
                    {isStableSide && c.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => end.mutate(c.id)}
                      >
                        {t("boardingContracts.endContract")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

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
    </DashboardShell>
  );
}
