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
import { CheckCircle2, RefreshCw } from "lucide-react";

interface ConfirmArrivalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  /** If true, this is a retry of a half-failed arrival (already dispatched). */
  isRetry?: boolean;
  /** True when the scheduled arrival has a destination unit selected. */
  hasUnit?: boolean;
}

export function ConfirmArrivalDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing,
  isRetry = false,
  hasUnit = false,
}: ConfirmArrivalDialogProps) {
  const { t } = useI18n();

  const title = isRetry
    ? t("movement.lifecycle.retryArrivalTitle")
    : t("movement.lifecycle.confirmArrivalTitle");

  const description = isRetry
    ? t("movement.lifecycle.retryArrivalDesc")
    : hasUnit
      ? t("movement.lifecycle.confirmArrivalDescWithUnit")
      : t("movement.lifecycle.confirmArrivalDescNoUnit");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isRetry ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isProcessing}>
            {isRetry
              ? t("movement.lifecycle.retryArrival")
              : t("movement.lifecycle.confirmArrival")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
