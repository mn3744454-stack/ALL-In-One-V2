import React from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { POSStep } from "./POSLayoutResponsive";

interface POSStickyBarProps {
  currentStep: POSStep;
  onStepChange: (step: POSStep) => void;
  cartItemCount: number;
  total: number;
  canPay: boolean;
  onPay: () => void;
}

export function POSStickyBar({
  currentStep,
  onStepChange,
  cartItemCount,
  total,
  canPay,
  onPay,
}: POSStickyBarProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();

  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 p-3",
      isRTL && "flex-row-reverse"
    )}>
      {/* Cart button with badge */}
      <Button
        variant={currentStep === "cart" ? "default" : "outline"}
        onClick={() => onStepChange("cart")}
        className={cn(
          "relative h-12 px-4 touch-manipulation",
          isRTL && "flex-row-reverse"
        )}
      >
        <ShoppingCart className="h-5 w-5" />
        {cartItemCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
            {cartItemCount}
          </Badge>
        )}
        <span className="ms-2 font-medium">{total.toFixed(2)}</span>
      </Button>

      {/* Step navigation */}
      <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
        {currentStep === "catalog" && cartItemCount > 0 && (
          <Button
            onClick={() => onStepChange("cart")}
            variant="secondary"
            className="h-12 touch-manipulation"
          >
            {t("finance.pos.cart.view")}
            <ChevronIcon className="h-4 w-4 ms-1" />
          </Button>
        )}

        {currentStep === "cart" && (
          <>
            <Button
              variant="ghost"
              onClick={() => onStepChange("catalog")}
              className="h-12 touch-manipulation"
            >
              {t("finance.pos.actions.addMore")}
            </Button>
            <Button
              onClick={() => onStepChange("payment")}
              disabled={!canPay}
              className="h-12 touch-manipulation"
            >
              {t("finance.pos.actions.pay")}
              <ChevronIcon className="h-4 w-4 ms-1" />
            </Button>
          </>
        )}

        {currentStep === "payment" && (
          <Button
            variant="ghost"
            onClick={() => onStepChange("cart")}
            className="h-12 touch-manipulation"
          >
            {t("common.back")}
          </Button>
        )}
      </div>

      {/* Pay button on catalog step */}
      {currentStep === "catalog" && canPay && (
        <Button
          onClick={onPay}
          className="h-12 px-6 touch-manipulation font-bold"
        >
          {t("finance.pos.actions.pay")}
          <ChevronIcon className="h-4 w-4 ms-1" />
        </Button>
      )}
    </div>
  );
}
