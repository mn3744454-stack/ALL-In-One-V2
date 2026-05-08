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
import { useI18n } from "@/i18n";
import { ArrowRightLeft, RefreshCw } from "lucide-react";

interface ConfirmTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  /** True when the row is already dispatched (half-failure retry path). */
  isRetry?: boolean;
  /** True when a destination unit is set on the movement. */
  hasUnit?: boolean;
}

export function ConfirmTransferDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing,
  isRetry = false,
  hasUnit = false,
}: ConfirmTransferDialogProps) {
  const { t } = useI18n();

  const title = isRetry
    ? t("movement.lifecycle.completeInternalTransferTitle")
    : t("movement.lifecycle.confirmInternalTransferTitle");

  const baseDesc = isRetry
    ? t("movement.lifecycle.retryCompleteTransferDesc")
    : t("movement.lifecycle.confirmInternalTransferDesc");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isRetry ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <ArrowRightLeft className="h-5 w-5" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block">{baseDesc}</span>
            {!isRetry && !hasUnit && (
              <span className="block mt-2 text-amber-700 dark:text-amber-400">
                {t("movement.lifecycle.confirmInternalTransferDescNoUnit")}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isProcessing}>
            {isRetry
              ? t("movement.lifecycle.completeInternalTransfer")
              : t("movement.lifecycle.confirmInternalTransfer")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
