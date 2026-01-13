import React from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { POSCartItem } from "@/hooks/pos/usePOSCore";

interface POSCartProps {
  items: POSCartItem[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    itemCount: number;
  };
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  discountAmount: number;
  onDiscountChange: (amount: number) => void;
}

export function POSCart({
  items,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  discountAmount,
  onDiscountChange,
}: POSCartProps) {
  const { t, lang } = useI18n();
  const { isRTL } = useRTL();

  const getDisplayName = (item: POSCartItem) => {
    if (lang === "ar" && item.name_ar) return item.name_ar;
    return item.name;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
        <p>{t("finance.pos.cart.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-3 border-b",
        isRTL && "flex-row-reverse"
      )}>
        <span className="font-semibold">
          {t("finance.pos.cart.title")} ({totals.itemCount})
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCart}
          className="text-destructive hover:text-destructive h-9"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg bg-muted/30",
                isRTL && "flex-row-reverse"
              )}
            >
              {/* Item info */}
              <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                <p className="font-medium text-sm truncate">{getDisplayName(item)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.unit_price.toFixed(2)} × {item.quantity}
                </p>
              </div>

              {/* Quantity stepper */}
              <div className={cn(
                "flex items-center gap-1",
                isRTL && "flex-row-reverse"
              )}>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 touch-manipulation"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 touch-manipulation"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Item total */}
              <span className="font-semibold text-sm w-16 text-end">
                {item.total_price.toFixed(2)}
              </span>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive touch-manipulation"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="p-3 border-t space-y-2">
        <div className={cn(
          "flex justify-between text-sm",
          isRTL && "flex-row-reverse"
        )}>
          <span>{t("finance.pos.cart.subtotal")}</span>
          <span>{totals.subtotal.toFixed(2)}</span>
        </div>

        {/* Discount input */}
        <div className={cn(
          "flex items-center justify-between gap-2 text-sm",
          isRTL && "flex-row-reverse"
        )}>
          <span>{t("finance.pos.cart.discount")}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountAmount || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
            className="w-20 h-8 px-2 text-end rounded border bg-background"
            placeholder="0.00"
          />
        </div>

        {totals.taxAmount > 0 && (
          <div className={cn(
            "flex justify-between text-sm",
            isRTL && "flex-row-reverse"
          )}>
            <span>{t("finance.pos.cart.tax")}</span>
            <span>{totals.taxAmount.toFixed(2)}</span>
          </div>
        )}

        <Separator />

        <div className={cn(
          "flex justify-between font-bold text-lg",
          isRTL && "flex-row-reverse"
        )}>
          <span>{t("finance.pos.cart.total")}</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
