import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useStableServicePlans } from "@/hooks/useStableServicePlans";
import {
  useBoardingContracts,
  useBoardingContractsDisplay,
  type BoardingContract,
} from "@/hooks/boarding/useBoardingContracts";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: BoardingContract | null;
}

/**
 * Stable-side review of an owner-initiated boarding request.
 * Transitions: pending_stable -> pending_owner (NOT active).
 */
export function ReviewAndSetPlanDialog({ open, onOpenChange, contract }: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { activePlans } = useStableServicePlans();
  const { approveAsStable } = useBoardingContracts();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const contractIds = contract ? [contract.id] : [];
  const { displayMap } = useBoardingContractsDisplay(contractIds);
  const display = contract ? displayMap[contract.id] : undefined;

  // Only active boarding-type plans for the current stable.
  const boardingPlans = activePlans.filter((p) => p.plan_type === "boarding");

  useEffect(() => {
    if (!open) setSelectedPlanId("");
  }, [open]);

  const submit = async () => {
    if (!contract) return;
    if (!selectedPlanId) {
      toast.error(t("boardingContracts.planRequired"));
      return;
    }
    try {
      await approveAsStable.mutateAsync({
        contract_id: contract.id,
        plan_id: selectedPlanId,
        terms_metadata: (contract.terms_metadata as Record<string, unknown>) ?? {},
      });
      onOpenChange(false);
    } catch {
      // toast handled by hook
    }
  };

  const horseName =
    (isAr ? display?.horse_name_ar : display?.horse_name) ||
    display?.horse_name ||
    display?.horse_name_ar ||
    null;
  const ownerName =
    (isAr ? display?.owner_tenant_name_ar : display?.owner_tenant_name) ||
    display?.owner_tenant_name ||
    display?.owner_tenant_name_ar ||
    null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("boardingContracts.reviewAndSetPlan")}</DialogTitle>
          <DialogDescription>
            {t("boardingContracts.reviewAndSetPlanDescription")}
          </DialogDescription>
        </DialogHeader>

        {contract && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
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
                {t("boardingContracts.owner")}
              </span>
              <span className="col-span-2 truncate">
                {ownerName ?? (
                  <span className="text-muted-foreground italic">
                    {t("boardingContracts.displayContextUnavailable")}
                  </span>
                )}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1">
              {t("boardingContracts.technicalId")}:{" "}
              <span className="font-mono">{contract.id.slice(0, 8)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("boardingContracts.boardingPackage")}</Label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  boardingPlans.length === 0
                    ? t("boardingContracts.noActivePlans")
                    : t("boardingContracts.selectPlan")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {boardingPlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.name_ar ? ` · ${p.name_ar}` : ""} — {p.base_price} {p.currency}/
                  {p.billing_cycle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={!selectedPlanId || approveAsStable.isPending}
          >
            {t("boardingContracts.sendToOwner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
