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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/i18n";
import {
  useServiceRequests,
  type ServiceRequestType,
  type ServiceRequestBilling,
} from "@/hooks/boarding/useServiceRequests";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardingContractId: string;
  side: "owner" | "stable";
}

const TYPES: ServiceRequestType[] = [
  "extra_lab",
  "extra_vet_visit",
  "extra_supplement",
  "feeding_change",
  "package_change",
  "movement",
  "provider_preference",
  "other",
];

export function ServiceRequestSheet({
  open,
  onOpenChange,
  boardingContractId,
  side,
}: Props) {
  const { t } = useI18n();
  const { create } = useServiceRequests({ boardingContractId });

  const [requestType, setRequestType] = useState<ServiceRequestType>("extra_lab");
  const [notes, setNotes] = useState("");
  const [externalProvider, setExternalProvider] = useState("");
  const [ownerSupplied, setOwnerSupplied] = useState(false);
  const [costEstimate, setCostEstimate] = useState<string>("");
  const [billing, setBilling] = useState<ServiceRequestBilling | "__none__">("__none__");

  useEffect(() => {
    if (!open) {
      setRequestType("extra_lab");
      setNotes("");
      setExternalProvider("");
      setOwnerSupplied(false);
      setCostEstimate("");
      setBilling("__none__");
    }
  }, [open]);

  const submit = async () => {
    await create.mutateAsync({
      boarding_contract_id: boardingContractId,
      request_type: requestType,
      details: notes ? { notes } : {},
      external_provider_name: externalProvider.trim() || null,
      owner_supplied_item: side === "owner" ? ownerSupplied : false,
      cost_estimate: costEstimate ? Number(costEstimate) : null,
      billing_responsibility: billing === "__none__" ? null : (billing as ServiceRequestBilling),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("serviceRequests.newRequest")}</DialogTitle>
          <DialogDescription>
            {side === "owner"
              ? t("serviceRequests.newRequestOwnerDesc")
              : t("serviceRequests.newRequestStableDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("serviceRequests.requestType")}</Label>
            <Select
              value={requestType}
              onValueChange={(v) => setRequestType(v as ServiceRequestType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {t(`serviceRequests.type.${tp}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("serviceRequests.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("serviceRequests.notesPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("serviceRequests.externalProvider")}</Label>
            <Input
              value={externalProvider}
              onChange={(e) => setExternalProvider(e.target.value)}
              placeholder={t("serviceRequests.externalProviderPlaceholder")}
            />
          </div>

          {side === "owner" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={ownerSupplied}
                onCheckedChange={(v) => setOwnerSupplied(!!v)}
              />
              {t("serviceRequests.ownerSuppliedItem")}
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("serviceRequests.costEstimate")}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={costEstimate}
                onChange={(e) => setCostEstimate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("serviceRequests.billingResponsibility")}</Label>
              <Select value={billing as string} onValueChange={(v) => setBilling(v as any)}>
                <SelectTrigger><SelectValue placeholder={t("serviceRequests.notSpecified")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("serviceRequests.notSpecified")}</SelectItem>
                  <SelectItem value="owner_pays">{t("serviceRequests.billing.owner_pays")}</SelectItem>
                  <SelectItem value="included_in_package">{t("serviceRequests.billing.included_in_package")}</SelectItem>
                  <SelectItem value="stable_absorbs">{t("serviceRequests.billing.stable_absorbs")}</SelectItem>
                  <SelectItem value="deduct_from_prepaid">{t("serviceRequests.billing.deduct_from_prepaid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {t("serviceRequests.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
