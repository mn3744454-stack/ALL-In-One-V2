import { useI18n } from "@/i18n";
import { useAdmissionFinancials } from "@/hooks/housing/useAdmissionFinancials";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, CreditCard, Wallet, TrendingDown, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBoardingAmount } from "@/lib/boardingUtils";

interface CheckoutFinancialReviewProps {
  admissionId: string;
  clientId: string | null;
}

export function CheckoutFinancialReview({ admissionId, clientId }: CheckoutFinancialReviewProps) {
  const { t } = useI18n();
  const { data: fin, isLoading } = useAdmissionFinancials(admissionId, clientId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!fin) return null;

  const admissionClear = fin.admissionBalance <= 0;
  const clientClear = fin.clientLedgerBalance <= 0;
  const creditExceeded = fin.clientAvailableCredit !== null && fin.clientAvailableCredit < 0;
  const hasUnbilled = fin.unbilledValue > 0;

  return (
    <div className="space-y-3">
      {/* Admission-scoped */}
      <div className={cn(
        "rounded-lg border p-3 space-y-2",
        (!admissionClear || hasUnbilled) ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : "border-success/30 bg-success/5"
      )}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4 shrink-0" />
          {t('housing.checkout.financial.admissionScope')}
          {admissionClear && !hasUnbilled ? (
            <CheckCircle2 className="h-4 w-4 text-success ms-auto" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 ms-auto" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div>
            <span className="text-muted-foreground block">{t('housing.checkout.financial.accrued')}</span>
            <span className="font-medium">{formatBoardingAmount(fin.accruedValue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t('housing.checkout.financial.billed')}</span>
            <span className="font-medium">{formatBoardingAmount(fin.admissionBilled)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t('housing.checkout.financial.paid')}</span>
            <span className="font-medium">{formatBoardingAmount(fin.admissionPaid)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t('housing.checkout.financial.balance')}</span>
            <span className={cn("font-medium", fin.admissionBalance > 0 ? "text-amber-600" : "text-success")}>
              {formatBoardingAmount(fin.admissionBalance)}
            </span>
          </div>
        </div>

        {/* Unbilled warning */}
        {hasUnbilled && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/30 rounded px-2 py-1.5 mt-1">
            <FileWarning className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t('housing.checkout.financial.unbilledWarning')}: <strong>{fin.unbilledValue.toFixed(2)}</strong>
            </span>
          </div>
        )}

        {fin.hasDeposit && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Badge variant="outline" className="text-xs">{t('housing.checkout.financial.deposit')}: {fin.depositTotal.toFixed(2)}</Badge>
          </div>
        )}
      </div>

      {/* Client-level */}
      {clientId && (
        <div className={cn(
          "rounded-lg border p-3 space-y-2",
          clientClear ? "border-success/30 bg-success/5" : creditExceeded ? "border-destructive/30 bg-destructive/5" : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
        )}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 shrink-0" />
            {t('housing.checkout.financial.clientScope')}
            {clientClear ? (
              <CheckCircle2 className="h-4 w-4 text-success ms-auto" />
            ) : creditExceeded ? (
              <AlertTriangle className="h-4 w-4 text-destructive ms-auto" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 ms-auto" />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">{t('housing.checkout.financial.outstanding')}</span>
              <span className={cn("font-medium", fin.clientLedgerBalance > 0 ? "text-amber-600" : "text-success")}>
                {fin.clientLedgerBalance.toFixed(2)}
              </span>
            </div>
            {fin.clientCreditLimit !== null && (
              <>
                <div>
                  <span className="text-muted-foreground block">{t('housing.checkout.financial.creditLimit')}</span>
                  <span className="font-medium">{fin.clientCreditLimit.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('housing.checkout.financial.available')}</span>
                  <span className={cn("font-medium", (fin.clientAvailableCredit || 0) < 0 ? "text-destructive" : "text-success")}>
                    {(fin.clientAvailableCredit || 0).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
          {creditExceeded && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <TrendingDown className="h-3 w-3" />
              {t('housing.checkout.financial.creditExceeded')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
