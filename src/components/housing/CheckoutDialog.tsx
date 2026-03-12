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
import { useFinancialGate } from "@/hooks/housing/useFinancialGate";
import { useI18n } from "@/i18n";
import { LogOut, ShieldAlert, ShieldCheck, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CheckoutDialogProps {
  admission: BoardingAdmission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckoutDialog({ admission, open, onOpenChange, onSuccess }: CheckoutDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const { initiateCheckout, isInitiatingCheckout, confirmCheckout, isConfirmingCheckout } = useBoardingAdmissions();
  const gate = useFinancialGate(admission.id, admission.client_id);

  const isPending = admission.status === 'checkout_pending';
  const isProcessing = isInitiatingCheckout || isConfirmingCheckout;

  // Financial gate determines button state
  const financiallyBlocked = !gate.isLoading && gate.isBlocked;
  const financiallyNeedsOverride = !gate.isLoading && gate.needsOverride && !overrideConfirmed;

  const handleInitiate = async () => {
    try {
      await initiateCheckout({ admissionId: admission.id });
    } catch {
      // Error handled in mutation
    }
  };

  const handleConfirm = async () => {
    try {
      // Record financial override if applicable
      if (gate.needsOverride && overrideConfirmed && user?.id) {
        const overrideData = {
          ...((admission.admission_checks as Record<string, any>) || {}),
          checkout_balance_override: {
            status: 'overridden',
            overridden_by: user.id,
            overridden_at: new Date().toISOString(),
            outstanding_amount: gate.outstandingAmount,
            admission_balance: gate.admissionBalance,
            client_balance: gate.clientBalance,
            context: 'checkout',
          },
        };
        await (supabase as any)
          .from('boarding_admissions')
          .update({
            admission_checks: overrideData,
            balance_cleared: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', admission.id);
      }

      await confirmCheckout({
        admissionId: admission.id,
        checkoutNotes: notes || undefined,
      });
      setNotes('');
      setOverrideConfirmed(false);
      onSuccess?.();
    } catch {
      // Error handled in mutation
    }
  };

  const handleOverrideAccept = () => {
    setOverrideConfirmed(true);
    toast.info(t('housing.admissions.checkout.overrideAccepted'));
  };

  // Determine if the action button should be disabled
  const actionDisabled = isProcessing || financiallyBlocked || (isPending && financiallyNeedsOverride);

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) setOverrideConfirmed(false); onOpenChange(o); }}>
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

          {/* Dual-layer Financial Review */}
          <CheckoutFinancialReview
            admissionId={admission.id}
            clientId={admission.client_id}
          />

          {/* Financial Gate Messages */}
          {financiallyBlocked && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
              <Ban className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  {t('housing.admissions.checkout.financialBlock')}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {t('housing.admissions.checkout.contactManager')}
                </p>
              </div>
            </div>
          )}

          {financiallyNeedsOverride && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {t('housing.admissions.checkout.overrideRequired')}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {t('housing.admissions.checkout.outstandingAmount')}: {gate.outstandingAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOverrideAccept}
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950"
              >
                <ShieldCheck className="h-4 w-4 me-1" />
                {t('housing.admissions.checkout.confirmOverride')}
              </Button>
            </div>
          )}

          {overrideConfirmed && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                {t('housing.admissions.checkout.overrideAccepted')}
              </span>
            </div>
          )}

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
            <AlertDialogAction onClick={handleConfirm} disabled={actionDisabled}>
              <LogOut className="h-4 w-4 me-1" />
              {isProcessing ? t('common.loading') : t('housing.admissions.checkout.confirmCheckout')}
            </AlertDialogAction>
          ) : (
            <Button onClick={handleInitiate} disabled={isProcessing || financiallyBlocked} variant="default">
              {isProcessing ? t('common.loading') : t('housing.admissions.checkout.initiateCheckout')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
