import React, { useState, useEffect, useMemo } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { postLedgerForInvoice } from "@/lib/finance/postLedgerForInvoice";
import { useTenant } from "@/contexts/TenantContext";

export interface CheckoutLineItem {
  id: string;
  description: string;
  description_ar?: string | null;
  quantity: number;
  unit_price: number | null; // null means price is missing
  total_price: number;
  entity_type?: string;
  entity_id?: string;
}

interface EmbeddedCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: "lab_sample" | "lab_request" | "service" | "order";
  sourceId: string;
  initialLineItems: CheckoutLineItem[];
  suggestedClientId?: string | null;
  suggestedClientName?: string;
  onComplete?: (invoiceId: string) => void;
  onCancel?: () => void;
}

type PaymentMethod = "cash" | "card" | "transfer" | "debt";

const paymentMethods = [
  { id: "cash" as PaymentMethod, icon: Banknote, label: "Cash" },
  { id: "card" as PaymentMethod, icon: CreditCard, label: "Card" },
  { id: "transfer" as PaymentMethod, icon: Building2, label: "Transfer" },
  { id: "debt" as PaymentMethod, icon: Clock, label: "Debt" },
];

export function EmbeddedCheckout({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  initialLineItems,
  suggestedClientId,
  suggestedClientName,
  onComplete,
  onCancel,
}: EmbeddedCheckoutProps) {
  const { t, lang } = useI18n();
  const { isRTL } = useRTL();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeTenant } = useTenant();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState<number>(0);
  const [clientName, setClientName] = useState(suggestedClientName || "");

  useEffect(() => {
    if (suggestedClientName) setClientName(suggestedClientName);
  }, [suggestedClientName]);

  // Check for missing prices
  const itemsWithMissingPrice = useMemo(() => 
    initialLineItems.filter(item => item.unit_price === null),
    [initialLineItems]
  );
  const hasMissingPrices = itemsWithMissingPrice.length > 0;

  // Calculate totals (only include items with valid prices)
  const subtotal = initialLineItems.reduce((sum, item) => 
    sum + (item.unit_price !== null ? item.total_price : 0), 0);
  const total = Math.max(0, subtotal - discount);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenant?.tenant?.id) throw new Error("No tenant selected");

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Traceability for non-lab sources
      const traceability = sourceType.startsWith("lab_") 
        ? "" // Lab handles its own traceability
        : `[CTX:${sourceType}:${sourceId}]`;

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      // Create invoice
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          tenant_id: activeTenant.tenant.id,
          invoice_number: invoiceNumber,
          client_id: suggestedClientId || null,
          client_name: clientName || "Walk-in Customer",
          subtotal,
          tax_amount: 0,
          discount_amount: discount,
          total_amount: total,
          status: "issued",
          issue_date: new Date().toISOString().split("T")[0],
          due_date: new Date().toISOString().split("T")[0],
          notes: traceability || null,
          payment_method: paymentMethod,
          payment_received_at: paymentMethod !== "debt" ? new Date().toISOString() : null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (invError) throw invError;

      // Create invoice items
      const invoiceItems = initialLineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        entity_type: item.entity_type || sourceType,
        entity_id: item.entity_id || sourceId,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Post to ledger if client exists
      if (suggestedClientId) {
        await postLedgerForInvoice(invoice.id, activeTenant.tenant.id);
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["customer-balances"] });
      toast({ title: t("finance.pos.checkout.success") });
      onComplete?.(invoice.id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Checkout error:", error);
      toast({ 
        title: t("finance.pos.checkout.error"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleComplete = () => {
    if (hasMissingPrices) {
      toast({
        title: t("finance.pos.checkout.missingPrices"),
        description: t("finance.pos.priceMissing"),
        variant: "destructive",
      });
      return;
    }
    createInvoiceMutation.mutate();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isRTL ? "left" : "right"} 
        className={cn("w-full sm:max-w-md", isRTL && "rtl")}
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
            {/* Client name */}
            <div className="space-y-2">
              <Label>{t("finance.pos.customer")}</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("finance.pos.walkIn")}
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
              />
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label>{t("finance.pos.payment.method")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg border",
                      "transition-colors min-h-[50px] touch-manipulation",
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

            {/* Totals */}
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
                disabled={createInvoiceMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 h-12 touch-manipulation"
                disabled={createInvoiceMutation.isPending || total <= 0 || hasMissingPrices}
              >
                {createInvoiceMutation.isPending ? (
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
