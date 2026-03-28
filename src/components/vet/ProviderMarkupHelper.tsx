import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Equal, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ProviderMarkupHelperProps {
  providerCost: number;
  currency: string;
  supplierName: string;
  currentAmount: string;
  onApplyAmount: (amount: string) => void;
}

/**
 * Lightweight markup decision helper for external-provider billing dialogs.
 * Shows provider cost, current billed amount, and the difference.
 * Allows exact pass-through or manual markup.
 */
export function ProviderMarkupHelper({
  providerCost,
  currency,
  supplierName,
  currentAmount,
  onApplyAmount,
}: ProviderMarkupHelperProps) {
  const { t } = useI18n();
  const billedAmount = parseFloat(currentAmount) || 0;
  const difference = billedAmount - providerCost;
  const isExactPassThrough = Math.abs(difference) < 0.01;
  const isAboveProvider = difference > 0.01;
  const isBelowProvider = difference < -0.01;

  return (
    <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-blue-800 dark:text-blue-300">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span>{t("vet.billing.markupHelper.title")}</span>
      </div>

      {/* Cost comparison row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Provider cost */}
        <div className="rounded-md bg-background p-2 border">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("vet.billing.markupHelper.providerCost")}</p>
          <p className="text-sm font-bold font-mono tabular-nums" dir="ltr">
            {formatCurrency(providerCost, currency)}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{supplierName}</p>
        </div>

        {/* Arrow + difference */}
        <div className="flex flex-col items-center justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`text-xs font-medium mt-1 font-mono tabular-nums ${
            isExactPassThrough ? "text-blue-600 dark:text-blue-400" :
            isAboveProvider ? "text-emerald-600 dark:text-emerald-400" :
            "text-amber-600 dark:text-amber-400"
          }`}>
            {isExactPassThrough ? (
              <span className="flex items-center gap-0.5">
                <Equal className="w-3 h-3" />
                {t("vet.billing.markupHelper.exact")}
              </span>
            ) : (
              <span className="flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {difference > 0 ? "+" : ""}{formatCurrency(difference, currency)}
              </span>
            )}
          </div>
        </div>

        {/* Billed amount */}
        <div className="rounded-md bg-background p-2 border">
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("vet.billing.markupHelper.billedAmount")}</p>
          <p className="text-sm font-bold font-mono tabular-nums" dir="ltr">
            {formatCurrency(billedAmount, currency)}
          </p>
          <p className={`text-[10px] font-medium ${
            isExactPassThrough ? "text-blue-600" :
            isAboveProvider ? "text-emerald-600" :
            isBelowProvider ? "text-amber-600" : "text-muted-foreground"
          }`}>
            {isExactPassThrough ? t("vet.billing.markupHelper.passThrough") :
             isAboveProvider ? t("vet.billing.markupHelper.withMarkup") :
             isBelowProvider ? t("vet.billing.markupHelper.belowCost") :
             "—"}
          </p>
        </div>
      </div>

      {/* Quick action: apply pass-through */}
      {!isExactPassThrough && providerCost > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs h-7"
          onClick={() => onApplyAmount(providerCost.toString())}
        >
          {t("vet.billing.markupHelper.applyPassThrough")}
        </Button>
      )}
    </div>
  );
}
