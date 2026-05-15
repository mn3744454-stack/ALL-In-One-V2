import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeFormDialog } from "@/components/ui/safe-form-dialog";
import { MissingRequirementsBar } from "@/components/ui/missing-requirements-bar";
import { useDirtyForm } from "@/hooks/useDirtyForm";
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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const { isDirty, resetBaseline } = useDirtyForm({ reason }, open);

  useEffect(() => {
    if (!open) {
      setReason("");
      setAttemptedSubmit(false);
    }
  }, [open]);

  const missingIssues = useMemo(() => {
    const issues: string[] = [];
    if (!reason.trim()) {
      issues.push(t("common.validation.enterRejectionReason"));
    }
    return issues;
  }, [reason, t]);

  const handleConfirm = async () => {
    setAttemptedSubmit(true);
    if (!reason.trim()) return;
    // Reset baseline so SafeFormDialog won't prompt discard after a successful submit
    resetBaseline({ reason: "" });
    await onConfirm(reason.trim());
  };

  return (
    <SafeFormDialog
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      className="sm:max-w-[480px]"
      dir={dir}
    >
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

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <MissingRequirementsBar
            issues={attemptedSubmit ? missingIssues : []}
            attempted={attemptedSubmit}
            className="flex-1 w-full sm:w-auto"
          />
          <div className="flex gap-2 sm:ms-auto">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                {t("common.cancel") || "Cancel"}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              className="gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("laboratory.intake.confirmReject") || "Confirm rejection"}
            </Button>
          </div>
        </DialogFooter>
    </SafeFormDialog>
  );
}
