import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, Building2, Clock, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import {
  createSourceCheckoutInvoice,
  type SourceCheckoutLinkKind,
  type SourceCheckoutPayload,
  type SourceCheckoutResult,
  type SourceCheckoutPaymentMethod,
} from "@/lib/finance/invoiceRpc";
import { invalidateFinanceQueries } from "@/hooks/finance/invalidateFinanceQueries";

/**
 * Display-only line-item shape used by callers to preview what is being
 * checked out. `entity_type`, `entity_id`, and `description_ar` are UI-only
 * fields and MUST NOT be forwarded to the Source Checkout RPC — Migration A
 * derives authoritative Source identity, horse attribution, and pricing
 * server-side.
 */
export interface CheckoutLineItem {
  id: string;
  description: string;
  description_ar?: string | null;
  quantity: number;
  unit_price: number | null; // null means price is missing
  total_price: number;
  entity_type?: string; // display-only; not sent to RPC
  entity_id?: string; // display-only; not sent to RPC
}

interface EmbeddedCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only Source types supported by `create_source_checkout_invoice`. */
  sourceType: "lab_sample" | "horse_order";
  sourceId: string;
  initialLineItems: CheckoutLineItem[];
  /** Optional editable Walk-in display name; NO client UUID is sent. */
  suggestedClientName?: string;
  /** Required Source Checkout link kind. Horse Order MUST be "final". */
  linkKind: SourceCheckoutLinkKind;
  onComplete?: (invoiceId: string) => void;
  onCancel?: () => void;
}

type PaymentMethod = SourceCheckoutPaymentMethod;

const getPaymentMethods = (t: (key: string) => string) => [
  { id: "cash" as PaymentMethod, icon: Banknote, label: t("payments.cash") },
  { id: "card" as PaymentMethod, icon: CreditCard, label: t("payments.card") },
  { id: "transfer" as PaymentMethod, icon: Building2, label: t("payments.transfer") },
  { id: "debt" as PaymentMethod, icon: Clock, label: t("payments.debt") },
];

// Known SQLSTATE error message tokens raised by create_source_checkout_invoice.
const CHECKOUT_ERROR_KEYS = new Set([
  "FIN_PERMISSION_DENIED",
  "FIN_TENANT_ACCESS_DENIED",
  "FIN_SOURCE_NOT_FOUND",
  "FIN_SOURCE_CANCELLED",
  "FIN_LAB_DEPOSIT_STATUS_INVALID",
  "FIN_LAB_FINAL_STATUS_INVALID",
  "FIN_ORDER_NOT_COMPLETED",
  "FIN_ORDER_MISSING_COST",
  "FIN_ORDER_MISSING_HORSE",
  "FIN_ORDER_HORSE_NOT_FOUND",
  "FIN_ORDER_TYPE_NOT_FOUND",
  "FIN_SOURCE_LINK_CONFLICT",
  "FIN_TENANT_PAYMENT_ACCOUNT_MISSING",
  "FIN_IDEMPOTENCY_CONFLICT",
  "FIN_ITEMS_EMPTY",
  "FIN_LINK_KIND_REQUIRED",
  "FIN_HORSE_ORDER_LINK_KIND_INVALID",
  "FIN_PAYLOAD_UNKNOWN_KEY",
]);

function extractErrorToken(error: unknown): string | null {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  for (const token of CHECKOUT_ERROR_KEYS) {
    if (message.includes(token)) return token;
  }
  return null;
}

export function EmbeddedCheckout({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  initialLineItems,
  suggestedClientName,
  linkKind,
  onComplete,
  onCancel,
}: EmbeddedCheckoutProps) {
  const { t, lang } = useI18n();
  const { isRTL } = useRTL();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();
  const tenantId = activeTenant?.tenant?.id;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState<number>(0);
  const [clientName, setClientName] = useState(suggestedClientName || "");

  // ============================================================
  // Idempotency session lifecycle
  // ============================================================
  // One stable idempotency key per stable submitted payload. Key is minted
  // on open (closed→open transition), reused on retry when payload is
  // unchanged, and rotated when the operator edits any payload-bearing
  // field after a submission attempt.
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastSubmittedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = crypto.randomUUID();
      lastSubmittedFingerprintRef.current = null;
    } else {
      idempotencyKeyRef.current = null;
      lastSubmittedFingerprintRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (suggestedClientName) setClientName(suggestedClientName);
  }, [suggestedClientName]);

  // Check for missing prices
  const itemsWithMissingPrice = useMemo(
    () => initialLineItems.filter((item) => item.unit_price === null),
    [initialLineItems],
  );
  const hasMissingPrices = itemsWithMissingPrice.length > 0;

  // Display-only totals (backend response is authoritative)
  const subtotal = initialLineItems.reduce(
    (sum, item) => sum + (item.unit_price !== null ? item.total_price : 0),
    0,
  );
  const total = Math.max(0, subtotal - discount);

  const buildPayload = useCallback((): SourceCheckoutPayload => {
    const trimmedName = clientName.trim();
    const common = {
      payment_method: paymentMethod,
      discount_amount: discount,
      ...(trimmedName.length > 0 ? { client_name: trimmedName } : {}),
    };
    if (sourceType === "lab_sample") {
      return {
        source_type: "lab_sample",
        source_id: sourceId,
        link_kind: linkKind,
        ...common,
        items: initialLineItems
          .filter((item) => item.unit_price !== null)
          .map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price as number,
            is_taxable: true,
          })),
      };
    }
    // horse_order: Source Checkout RPC requires link_kind "final".
    return {
      source_type: "horse_order",
      source_id: sourceId,
      link_kind: "final",
      ...common,
    };
  }, [clientName, discount, paymentMethod, sourceType, sourceId, linkKind, initialLineItems]);

  const checkoutMutation = useMutation<SourceCheckoutResult, unknown, void>({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");

      const payload = buildPayload();
      const fingerprint = JSON.stringify(payload);
      // Rotate idempotency key when payload changed since the previous attempt.
      if (
        lastSubmittedFingerprintRef.current !== null &&
        lastSubmittedFingerprintRef.current !== fingerprint
      ) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      lastSubmittedFingerprintRef.current = fingerprint;

      return await createSourceCheckoutInvoice(
        tenantId,
        idempotencyKeyRef.current,
        payload,
      );
    },
    onSuccess: (result) => {
      invalidateFinanceQueries(queryClient, tenantId);
      if (sourceType === "lab_sample") {
        queryClient.invalidateQueries({ queryKey: ["lab-samples", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["lab-samples"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["horse-orders", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["horse-orders"] });
      }
      toast({ title: t("finance.pos.checkout.success") });
      onComplete?.(result.invoice_id);
      onOpenChange(false);
    },
    onError: (error) => {
      // Never log the payload — it can carry operator-entered client name.
      console.error("Checkout error:", error);
      const token = extractErrorToken(error);
      const description = token ?? (
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : String(error ?? "")
      );
      toast({
        title: t("finance.pos.checkout.error"),
        description,
        variant: "destructive",
      });
    },
  });

  const isPending = checkoutMutation.isPending;

  const handleComplete = () => {
    if (hasMissingPrices) {
      toast({
        title: t("finance.pos.checkout.missingPrices"),
        description: t("finance.pos.priceMissing"),
        variant: "destructive",
      });
      return;
    }
    checkoutMutation.mutate();
  };

  const handleCancel = () => {
    if (isPending) return;
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Prevent Sheet dismissal while the RPC is in-flight.
        if (isPending && !next) return;
        onOpenChange(next);
      }}
    >
      <SheetContent
        side={isRTL ? "left" : "right"}
        className={cn("w-full sm:max-w-md", isRTL && "rtl")}
        onEscapeKeyDown={(e) => { if (isPending) e.preventDefault(); }}
        onPointerDownOutside={(e) => { if (isPending) e.preventDefault(); }}
        onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}
      >
        <SheetHeader>
          <SheetTitle>
            {t("finance.pos.quickCheckout")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full mt-4">
          {/* Line items */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2">
              {initialLineItems.map((item, idx) => {
                const isMissingPrice = item.unit_price === null;
                return (
                  <div
                    key={item.id || idx}
                    className={cn(
                      "flex justify-between items-start p-2 bg-muted/30 rounded",
                      isRTL && "flex-row-reverse text-right",
                      isMissingPrice && "border border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {lang === "ar" && item.description_ar
                            ? item.description_ar
                            : item.description}
                        </p>
                        {isMissingPrice && (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            <AlertTriangle className="h-3 w-3 me-1" />
                            {t("finance.pos.priceMissing")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isMissingPrice ? "—" : `${item.unit_price!.toFixed(2)} × ${item.quantity}`}
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      {isMissingPrice ? "—" : item.total_price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="space-y-4 pt-4 border-t mt-4">
            {/* Client name (display / walk-in only; no UUID sent) */}
            <div className="space-y-2">
              <Label>{t("finance.pos.customer")}</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("finance.pos.walkIn")}
                disabled={isPending}
              />
            </div>

            {/* Discount */}
            <div className="space-y-2">
              <Label>{t("finance.pos.cart.discount")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0.00"
                disabled={isPending}
              />
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label>{t("finance.pos.payment.method")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {getPaymentMethods(t).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    disabled={isPending}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg border",
                      "transition-colors min-h-[50px] touch-manipulation",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      paymentMethod === method.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent/50 border-border"
                    )}
                  >
                    <method.icon className="h-4 w-4" />
                    <span className="text-[10px] mt-1">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals (display-only preview; backend is authoritative) */}
            <div className="space-y-1">
              <div className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
                <span>{t("finance.pos.cart.subtotal")}</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className={cn("flex justify-between text-sm text-green-600", isRTL && "flex-row-reverse")}>
                  <span>{t("finance.pos.cart.discount")}</span>
                  <span>-{discount.toFixed(2)}</span>
                </div>
              )}
              <div className={cn("flex justify-between font-bold text-lg", isRTL && "flex-row-reverse")}>
                <span>{t("finance.pos.cart.total")}</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-12 touch-manipulation"
                disabled={isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 h-12 touch-manipulation"
                disabled={isPending || total <= 0 || hasMissingPrices}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("finance.pos.actions.completeSale")
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
