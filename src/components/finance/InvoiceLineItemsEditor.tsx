import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2 } from "lucide-react";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  entity_type?: string;
  entity_id?: string;
}

interface InvoiceLineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency?: string;
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  currency = "SAR",
}: InvoiceLineItemsEditorProps) {
  const { t, dir } = useI18n();

  // Use centralized formatter for EN digits
  const formatAmount = (amount: number) => formatCurrency(amount, currency);

  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;

      const newItem = { ...item, [field]: value };

      // Auto-calculate total
      if (field === "quantity" || field === "unit_price") {
        newItem.total_price = newItem.quantity * newItem.unit_price;
      }

      return newItem;
    });
    onChange(updated);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
        <div className="col-span-5">{t("finance.invoices.description")}</div>
        <div className="col-span-2 text-center">{t("finance.invoices.quantity")}</div>
        <div className="col-span-2 text-center">{t("finance.invoices.unitPrice")}</div>
        <div className="col-span-2 text-end">{t("finance.invoices.total")}</div>
        <div className="col-span-1"></div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <Input
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                placeholder={t("finance.invoices.itemDescription")}
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                className="text-center"
              />
            </div>
            <div className="col-span-2 text-end font-medium text-navy px-2">
              {formatCurrency(item.total_price)}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        {t("finance.invoices.addItem")}
      </Button>

      {/* Subtotal */}
      <div className="flex justify-end border-t pt-4">
        <div className="text-end">
          <span className="text-sm text-muted-foreground me-4">
            {t("finance.invoices.subtotal")}:
          </span>
          <span className="text-lg font-bold text-navy">{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
