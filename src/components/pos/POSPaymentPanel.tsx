import React from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Banknote, CreditCard, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/hooks/pos/usePOSCore";

interface POSPaymentPanelProps {
  total: number;
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  onCompleteSale: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

const paymentMethods: { id: PaymentMethod; icon: React.ReactNode; labelKey: string }[] = [
  { id: "cash", icon: <Banknote className="h-5 w-5" />, labelKey: "finance.pos.payment.cash" },
  { id: "card", icon: <CreditCard className="h-5 w-5" />, labelKey: "finance.pos.payment.card" },
  { id: "transfer", icon: <Building2 className="h-5 w-5" />, labelKey: "finance.pos.payment.transfer" },
  { id: "debt", icon: <Clock className="h-5 w-5" />, labelKey: "finance.pos.payment.debt" },
];

export function POSPaymentPanel({
  total,
  selectedMethod,
  onMethodChange,
  onCompleteSale,
  isProcessing,
  disabled,
}: POSPaymentPanelProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();

  return (
    <div className="space-y-3">
      {/* Payment method selection */}
      <div>
        <Label className="text-sm mb-2 block">
          {t("finance.pos.payment.method")}
        </Label>
        <div className={cn(
          "grid grid-cols-4 gap-2",
          isRTL && "direction-rtl"
        )}>
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg border",
                "transition-colors min-h-[60px] touch-manipulation",
                selectedMethod === method.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent/50 border-border"
              )}
            >
              {method.icon}
              <span className="text-xs mt-1 font-medium">
                {t(method.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Complete sale button */}
      <Button
        onClick={onCompleteSale}
        disabled={disabled || isProcessing || total <= 0}
        className="w-full h-14 text-lg font-bold touch-manipulation"
        size="lg"
      >
        {isProcessing ? (
          <span className="animate-pulse">
            {t("common.processing")}
          </span>
        ) : (
          <>
            {t("finance.pos.actions.completeSale")}
            <span className={cn("ms-2 font-bold", isRTL && "me-2 ms-0")}>
              {total.toFixed(2)}
            </span>
          </>
        )}
      </Button>
    </div>
  );
}
