import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import {
  useBoardingContracts,
  type BoardingContract,
} from "@/hooks/boarding/useBoardingContracts";
import type { BoardingContractDisplayContext } from "@/hooks/boarding/useBoardingContracts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: BoardingContract | null;
  display?: BoardingContractDisplayContext | null;
}

/**
 * Owner-side review surface for pending_owner contracts.
 * Approval activates the contract.
 */
export function ReviewAndApproveContractDialog({
  open,
  onOpenChange,
  contract,
  display,
}: Props) {
  const { t, lang } = useI18n();
  const { approveAsOwner } = useBoardingContracts();
  const isAr = lang === "ar";

  const snap = (contract?.plan_snapshot ?? {}) as Record<string, any>;

  const horseName =
    (isAr ? display?.horse_name_ar : display?.horse_name) ||
    display?.horse_name ||
    display?.horse_name_ar ||
    null;
  const stableName =
    (isAr ? display?.stable_tenant_name_ar : display?.stable_tenant_name) ||
    display?.stable_tenant_name ||
    display?.stable_tenant_name_ar ||
    null;
  const planName =
    (isAr ? display?.plan_name_ar : display?.plan_name) ||
    snap.name ||
    snap.name_ar ||
    null;
  const price = display?.plan_base_price ?? snap.base_price ?? null;
  const currency = display?.plan_currency ?? snap.currency ?? "";
  const cycle = display?.plan_billing_cycle ?? snap.billing_cycle ?? "";

  const submit = async () => {
    if (!contract) return;
    try {
      await approveAsOwner.mutateAsync(contract.id);
      onOpenChange(false);
    } catch {
      // toast handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("boardingContracts.reviewAndApproveTitle")}</DialogTitle>
          <DialogDescription>
            {t("boardingContracts.approvalMeaning")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div className="font-medium">
              {t("boardingContracts.contractSummary")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">
                {t("boardingContracts.horse")}
              </span>
              <span className="col-span-2 truncate">
                {horseName ?? (
                  <span className="text-muted-foreground italic">
                    {t("boardingContracts.displayContextUnavailable")}
                  </span>
                )}
              </span>

              <span className="text-muted-foreground">
                {t("boardingContracts.stable")}
              </span>
              <span className="col-span-2 truncate">
                {stableName ?? (
                  <span className="text-muted-foreground italic">
                    {t("boardingContracts.displayContextUnavailable")}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2 text-sm">
            <div className="font-medium">
              {t("boardingContracts.planSummary")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">
                {t("boardingContracts.boardingPackage")}
              </span>
              <span className="col-span-2 truncate">
                {planName ?? "—"}
              </span>

              <span className="text-muted-foreground">
                {t("boardingContracts.price")}
              </span>
              <span className="col-span-2">
                {price != null ? `${price} ${currency}` : "—"}
              </span>

              <span className="text-muted-foreground">
                {t("boardingContracts.billingCycle")}
              </span>
              <span className="col-span-2">{cycle || "—"}</span>
            </div>
          </div>

          {contract && (
            <div className="text-[11px] text-muted-foreground">
              {t("boardingContracts.technicalId")}:{" "}
              <span className="font-mono">{contract.id.slice(0, 8)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={approveAsOwner.isPending}>
            {t("boardingContracts.reviewAndApprove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
