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
  const { t } = useI18n();
  const { activePlans } = useStableServicePlans();
  const { approveAsStable } = useBoardingContracts();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

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
          <div className="rounded-md border p-3 text-xs space-y-1 bg-muted/30">
            <div>
              <span className="text-muted-foreground">
                {t("boardingContracts.contractIdShort")}:
              </span>{" "}
              <span className="font-mono">{contract.id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("boardingContracts.horse")}:
              </span>{" "}
              <span className="font-mono">{contract.horse_id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("boardingContracts.ownerCounterparty")}:
              </span>{" "}
              <span className="font-mono">{contract.owner_tenant_id.slice(0, 8)}</span>
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
