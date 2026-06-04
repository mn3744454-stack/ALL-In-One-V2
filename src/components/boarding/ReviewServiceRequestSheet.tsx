import { useState } from "react";
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
import { useI18n } from "@/i18n";
import {
  useServiceRequests,
  type ServiceRequest,
} from "@/hooks/boarding/useServiceRequests";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ServiceRequest | null;
}

export function ReviewServiceRequestSheet({ open, onOpenChange, request }: Props) {
  const { t } = useI18n();
  const { respond } = useServiceRequests({
    boardingContractId: request?.boarding_contract_id,
  });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [approvedCost, setApprovedCost] = useState<string>("");

  if (!request) return null;

  const notes = (request.details as any)?.notes as string | undefined;

  const doApprove = async () => {
    await respond.mutateAsync({
      service_request_id: request.id,
      decision: "approved",
      approved_cost: approvedCost ? Number(approvedCost) : null,
    });
    onOpenChange(false);
    setRejecting(false);
    setReason("");
    setApprovedCost("");
  };
  const doReject = async () => {
    if (!reason.trim()) return;
    await respond.mutateAsync({
      service_request_id: request.id,
      decision: "rejected",
      rejection_reason: reason.trim(),
    });
    onOpenChange(false);
    setRejecting(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("serviceRequests.reviewTitle")}</DialogTitle>
          <DialogDescription>
            {t(`serviceRequests.type.${request.request_type}`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {notes && (
            <div>
              <div className="text-xs text-muted-foreground">{t("serviceRequests.notes")}</div>
              <div>{notes}</div>
            </div>
          )}
          {request.external_provider_name && (
            <div>
              <div className="text-xs text-muted-foreground">
                {t("serviceRequests.externalProvider")}
              </div>
              <div>{request.external_provider_name}</div>
            </div>
          )}
          {request.owner_supplied_item && (
            <div className="text-xs text-muted-foreground">
              {t("serviceRequests.ownerSuppliedItem")}
            </div>
          )}
          {request.cost_estimate != null && (
            <div>
              <div className="text-xs text-muted-foreground">
                {t("serviceRequests.costEstimate")}
              </div>
              <div>
                {request.cost_estimate} {request.currency}
              </div>
            </div>
          )}
        </div>

        {!rejecting ? (
          <div className="space-y-2 pt-2">
            <Label>{t("serviceRequests.approvedCost")}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={approvedCost}
              onChange={(e) => setApprovedCost(e.target.value)}
              placeholder={
                request.cost_estimate != null ? String(request.cost_estimate) : ""
              }
            />
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <Label>{t("serviceRequests.rejectionReason")}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        )}

        <DialogFooter className="gap-2">
          {!rejecting ? (
            <>
              <Button variant="outline" onClick={() => setRejecting(true)}>
                {t("serviceRequests.reject")}
              </Button>
              <Button onClick={doApprove} disabled={respond.isPending}>
                {t("serviceRequests.approve")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRejecting(false)}>
                {t("common.back")}
              </Button>
              <Button
                onClick={doReject}
                disabled={respond.isPending || !reason.trim()}
              >
                {t("serviceRequests.confirmReject")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
