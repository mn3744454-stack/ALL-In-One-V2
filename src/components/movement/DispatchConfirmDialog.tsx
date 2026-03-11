import { useState } from "react";
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
import { useFinancialGate } from "@/hooks/housing/useFinancialGate";
import { CheckoutFinancialReview } from "@/components/housing/CheckoutFinancialReview";
import { Truck, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DispatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDispatching: boolean;
  /** Active admission ID for the horse being dispatched */
  admissionId?: string | null;
  /** Client ID associated with the admission */
  clientId?: string | null;
}

export function DispatchConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDispatching,
  admissionId = null,
  clientId = null,
}: DispatchConfirmDialogProps) {
  const { t } = useI18n();
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const gate = useFinancialGate(admissionId, clientId);

  const handleConfirm = async () => {
    // Record dispatch override if needed
    if (gate.needsOverride && admissionId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && admissionId) {
        // Fetch current admission_checks, append dispatch override
        const { data: admission } = await supabase
          .from('boarding_admissions')
          .select('admission_checks')
          .eq('id', admissionId)
          .maybeSingle();

        const currentChecks = (admission?.admission_checks as Record<string, unknown>) || {};
        const updatedChecks = {
          ...currentChecks,
          dispatch_balance_override: {
            overridden_by: user.id,
            overridden_at: new Date().toISOString(),
            outstanding_amount: gate.outstandingAmount,
            admission_balance: gate.admissionBalance,
            client_balance: gate.clientBalance,
            context: 'dispatch',
          },
        };

        await supabase
          .from('boarding_admissions')
          .update({ admission_checks: updatedChecks as any })
          .eq('id', admissionId);
      }
    }

    setOverrideConfirmed(false);
    onConfirm();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setOverrideConfirmed(false);
    onOpenChange(open);
  };

  // Determine gate state
  const hasFinancialData = !!admissionId || !!clientId;
  const showFinancialGate = hasFinancialData && !gate.isLoading && !gate.canProceed;
  const isBlocked = hasFinancialData && gate.isBlocked;
  const needsOverride = hasFinancialData && gate.needsOverride;

  // Can confirm: either no financial concern, or override confirmed
  const canConfirm = !isDispatching && (
    !hasFinancialData ||
    gate.isLoading ||
    gate.canProceed ||
    (needsOverride && overrideConfirmed)
  );

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('movement.lifecycle.confirmDispatchTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('movement.lifecycle.confirmDispatchDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Financial gate section */}
        {showFinancialGate && (
          <div className="space-y-3">
            {/* Financial review */}
            {admissionId && clientId && (
              <CheckoutFinancialReview admissionId={admissionId} clientId={clientId} />
            )}

            {/* Blocked state — staff cannot proceed */}
            {isBlocked && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    {t('housing.admissions.detail.checkout.financialBlock')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('housing.admissions.detail.checkout.contactManager')}
                  </p>
                  <Badge variant="destructive" className="text-xs">
                    {gate.outstandingAmount.toFixed(2)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Override state — manager/owner can override */}
            {needsOverride && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      {t('housing.checkout.financial.overrideRequired')}
                    </p>
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                      {gate.outstandingAmount.toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded border">
                  <Checkbox
                    id="dispatch-override"
                    checked={overrideConfirmed}
                    onCheckedChange={(checked) => setOverrideConfirmed(checked === true)}
                  />
                  <Label htmlFor="dispatch-override" className="text-xs leading-tight cursor-pointer">
                    {t('housing.checkout.financial.confirmOverride')}
                  </Label>
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          {!isBlocked && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(needsOverride && overrideConfirmed && "bg-amber-600 hover:bg-amber-700")}
            >
              {needsOverride ? (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  {t('movement.lifecycle.confirmDispatch')}
                </span>
              ) : (
                t('movement.lifecycle.confirmDispatch')
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
