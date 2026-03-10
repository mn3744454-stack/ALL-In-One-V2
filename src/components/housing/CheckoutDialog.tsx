import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoardingAdmissions, type BoardingAdmission } from "@/hooks/housing/useBoardingAdmissions";
import { CheckoutFinancialReview } from "./CheckoutFinancialReview";
import { useI18n } from "@/i18n";
import { LogOut } from "lucide-react";

interface CheckoutDialogProps {
  admission: BoardingAdmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckoutDialog({ admission, open, onOpenChange, onSuccess }: CheckoutDialogProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const { initiateCheckout, isInitiatingCheckout, confirmCheckout, isConfirmingCheckout } = useBoardingAdmissions();

  const isPending = admission.status === 'checkout_pending';
  const isProcessing = isInitiatingCheckout || isConfirmingCheckout;

  const handleInitiate = async () => {
    try {
      await initiateCheckout({ admissionId: admission.id });
    } catch {
      // Error handled in mutation
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmCheckout({
        admissionId: admission.id,
        checkoutNotes: notes || undefined,
      });
      setNotes('');
      onSuccess?.();
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPending
              ? t('housing.admissions.checkout.confirmTitle')
              : t('housing.admissions.checkout.initiateTitle')
            }: {admission.horse?.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPending
              ? t('housing.admissions.checkout.confirmDesc')
              : t('housing.admissions.checkout.initiateDesc')
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Admission summary */}
          <div className="text-sm space-y-1">
            {admission.unit && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('housing.admissions.detail.unit')}:</span>
                <Badge variant="secondary">{admission.unit.code}</Badge>
                {isPending && (
                  <span className="text-xs text-muted-foreground">({t('housing.admissions.checkout.willBeReleased')})</span>
                )}
              </div>
            )}
            {admission.client && (
              <div>
                <span className="text-muted-foreground">{t('housing.admissions.detail.client')}: </span>
                <span className="font-medium">{admission.client.name}</span>
              </div>
            )}
          </div>

          {/* Dual-layer Financial Review (Phase 4) */}
          <CheckoutFinancialReview
            admissionId={admission.id}
            clientId={admission.client_id}
          />

          {/* Notes - only show during confirmation step */}
          {isPending && (
            <div>
              <Label>{t('housing.admissions.checkout.notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('housing.admissions.checkout.notesPlaceholder')}
                rows={2}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>{t('common.cancel')}</AlertDialogCancel>
          {isPending ? (
            <AlertDialogAction onClick={handleConfirm} disabled={isProcessing}>
              <LogOut className="h-4 w-4 me-1" />
              {isProcessing ? t('common.loading') : t('housing.admissions.checkout.confirmCheckout')}
            </AlertDialogAction>
          ) : (
            <Button onClick={handleInitiate} disabled={isProcessing} variant="default">
              {isProcessing ? t('common.loading') : t('housing.admissions.checkout.initiateCheckout')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
