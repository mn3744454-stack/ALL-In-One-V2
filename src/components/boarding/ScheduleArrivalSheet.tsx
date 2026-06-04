import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useBoardingContracts, type BoardingContract } from "@/hooks/boarding/useBoardingContracts";
import { useLocations } from "@/hooks/movement/useLocations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: BoardingContract | null;
}

export function ScheduleArrivalSheet({ open, onOpenChange, contract }: Props) {
  const { t } = useI18n();
  const { scheduleArrival } = useBoardingContracts();
  const { activeLocations } = useLocations();

  const [expectedAt, setExpectedAt] = useState("");
  const [branchPref, setBranchPref] = useState("");
  const [branchId, setBranchId] = useState<string>("__none__");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setExpectedAt(contract?.expected_arrival_at?.slice(0, 16) ?? "");
    setBranchPref(contract?.branch_preference ?? "");
    setBranchId(contract?.preferred_branch_id ?? "__none__");
    setNotes(contract?.arrival_notes ?? "");
  }, [open, contract]);

  if (!contract) return null;
  const isReschedule = contract.operational_phase === "arrival_scheduled";

  const submit = async () => {
    if (!expectedAt) return;
    await scheduleArrival.mutateAsync({
      contract_id: contract.id,
      expected_arrival_at: new Date(expectedAt).toISOString(),
      branch_preference: branchPref.trim() || null,
      preferred_branch_id: branchId === "__none__" ? null : branchId,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReschedule
              ? t("boardingContracts.scheduleArrival.reschedule")
              : t("boardingContracts.scheduleArrival.title")}
          </DialogTitle>
          <DialogDescription>
            {t("boardingContracts.scheduleArrival.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("boardingContracts.scheduleArrival.expectedArrival")}</Label>
            <Input
              type="datetime-local"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("boardingContracts.scheduleArrival.preferredBranch")}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("boardingContracts.scheduleArrival.noBranchOption")}
                </SelectItem>
                {activeLocations.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {t("boardingContracts.scheduleArrival.preferredBranchHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("boardingContracts.scheduleArrival.branchPreference")}</Label>
            <Input
              value={branchPref}
              onChange={(e) => setBranchPref(e.target.value)}
              placeholder={t("boardingContracts.scheduleArrival.branchPreferencePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("boardingContracts.scheduleArrival.notes")}</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!expectedAt || scheduleArrival.isPending}>
            {t("boardingContracts.scheduleArrival.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
