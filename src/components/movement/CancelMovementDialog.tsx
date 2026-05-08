import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useHorseMovements, type HorseMovement } from "@/hooks/movement/useHorseMovements";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CancelMovementDialogProps {
  movement: HorseMovement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

/**
 * AD-1 Pass 2-C — Cancel UI.
 * Wires the existing `cancel_horse_movement` RPC. The RPC handles
 * origin restoration when cancelling a dispatched movement; if origin
 * housing is unavailable the RPC fails and we surface the message as-is
 * (no fallback cancel-without-restore in this pass).
 */
export function CancelMovementDialog({
  movement,
  open,
  onOpenChange,
  onCancelled,
}: CancelMovementDialogProps) {
  const { t } = useI18n();
  const { cancelMovement, isCancelling } = useHorseMovements();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!movement) return null;

  const isDispatched = movement.movement_status === "dispatched";

  const titleKey = isDispatched
    ? "movement.cancel.dispatchedTitle"
    : "movement.cancel.scheduledTitle";
  const descKey = isDispatched
    ? "movement.cancel.dispatchedDesc"
    : "movement.cancel.scheduledDesc";

  const handleConfirm = async () => {
    try {
      await cancelMovement({
        movementId: movement.id,
        reason: reason.trim() || undefined,
      });
      toast.success(t("movement.cancel.success"));
      onOpenChange(false);
      onCancelled?.();
    } catch {
      // mutation onError already surfaces the server message
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>{t(descKey)}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t("movement.cancel.reasonLabel")}</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("movement.cancel.reasonPlaceholder")}
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            {t("common.back")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isCancelling}
            className={cn(
              "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {t("movement.cancel.confirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
