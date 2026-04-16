import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { Loader2, XCircle } from "lucide-react";

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title?: string;
  description?: string;
  isPending?: boolean;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isPending = false,
}: RejectionReasonDialogProps) {
  const { t, dir } = useI18n();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            {title || t("laboratory.intake.rejectTitle") || "Reject request"}
          </DialogTitle>
          <DialogDescription>
            {description || t("laboratory.intake.rejectDescription") || "Please provide a reason. This will be visible to the requesting stable."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="rejection-reason" className="text-sm font-medium">
            {t("laboratory.intake.rejectionReason") || "Rejection reason"}
          </Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("laboratory.intake.rejectionReasonPlaceholder") || "e.g. wrong specimen tube, hemolyzed sample..."}
            rows={4}
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("laboratory.intake.confirmReject") || "Confirm rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
