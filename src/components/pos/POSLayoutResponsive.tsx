import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRTL } from "@/hooks/useRTL";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export type POSStep = "session" | "catalog" | "cart" | "payment" | "receipt";

interface POSLayoutResponsiveProps {
  currentStep: POSStep;
  onStepChange: (step: POSStep) => void;
  sessionBar: React.ReactNode;
  catalog: React.ReactNode;
  cart: React.ReactNode;
  payment: React.ReactNode;
  receipt: React.ReactNode;
  stickyBar?: React.ReactNode;
  hasOpenSession: boolean;
}

export function POSLayoutResponsive({
  currentStep,
  onStepChange,
  sessionBar,
  catalog,
  cart,
  payment,
  receipt,
  stickyBar,
  hasOpenSession,
}: POSLayoutResponsiveProps) {
  const isMobile = useIsMobile();
  const { isRTL } = useRTL();
  const { t } = useI18n();

  // Mobile: step-based single column
  if (isMobile) {
    return (
      <div className={cn("flex flex-col min-h-screen bg-background", isRTL && "rtl")}>
        {/* Session bar always visible */}
        <div className="flex-shrink-0 border-b bg-card">
          {sessionBar}
        </div>

        {/* Main content based on step */}
        <div className="flex-1 overflow-auto pb-20">
          {!hasOpenSession && currentStep !== "session" && (
            <div className="p-4 text-center text-muted-foreground">
              {t("finance.pos.session.openFirst")}
            </div>
          )}
          
          {currentStep === "session" && (
            <div className="p-4">{sessionBar}</div>
          )}
          
          {currentStep === "catalog" && hasOpenSession && (
            <div className="p-2">{catalog}</div>
          )}
          
          {currentStep === "cart" && hasOpenSession && (
            <div className="p-2">{cart}</div>
          )}
          
          {currentStep === "payment" && hasOpenSession && (
            <div className="p-2">{payment}</div>
          )}
          
          {currentStep === "receipt" && (
            <div className="p-2">{receipt}</div>
          )}
        </div>

        {/* Sticky bottom bar */}
        {stickyBar && hasOpenSession && currentStep !== "receipt" && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
            {stickyBar}
          </div>
        )}
      </div>
    );
  }

  // Tablet/Desktop: split layout
  return (
    <div className={cn("flex flex-col h-screen bg-background", isRTL && "rtl")}>
      {/* Session bar */}
      <div className="flex-shrink-0 border-b bg-card">
        {sessionBar}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Catalog */}
        <div className={cn(
          "flex-1 overflow-auto border-e",
          isRTL ? "border-l border-r-0" : "border-r"
        )}>
          {hasOpenSession ? catalog : (
            <div className="p-8 text-center text-muted-foreground">
              {t("finance.pos.session.openToSell")}
            </div>
          )}
        </div>

        {/* Right: Cart + Payment */}
        <div className={cn(
          "w-80 lg:w-96 flex flex-col bg-card overflow-hidden"
        )}>
          {hasOpenSession ? (
            <>
              <div className="flex-1 overflow-auto">
                {cart}
              </div>
              <div className="flex-shrink-0 border-t p-3">
                {payment}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              {t("finance.pos.session.openFirst")}
            </div>
          )}
        </div>
      </div>

      {/* Receipt dialog/overlay handled separately */}
      {receipt}
    </div>
  );
}
