import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Banknote, CreditCard, Building, Receipt } from "lucide-react";
import { useI18n } from "@/i18n";
import { FinancialAmountInput } from "./FinancialAmountInput";
import type { PaymentMethod } from "@/lib/finance/postPaymentSession";

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "transfer", "check"];


export interface TenderRow {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string;
}

const METHOD_META: Record<PaymentMethod, { icon: typeof Banknote; labelKey: string }> = {
  cash: { icon: Banknote, labelKey: "finance.paymentMethods.cash" },
  card: { icon: CreditCard, labelKey: "finance.paymentMethods.card" },
  transfer: { icon: Building, labelKey: "finance.paymentMethods.transfer" },
  check: { icon: Receipt, labelKey: "finance.paymentMethods.check" },
};

interface PaymentTenderEditorProps {
  rows: TenderRow[];
  onChange: (next: TenderRow[]) => void;
  disabled?: boolean;
  /** Optional secondary action rendered next to the section title (Single-Invoice "Pay Full Outstanding"). */
  secondaryAction?: { label: string; onClick: () => void; visible: boolean };
  /** Optional label override — defaults to "finance.payments.paymentMethodDetails". */
  labelKey?: string;
}

/**
 * Shared payment-methods (tenders) editor used by both Single-Invoice and
 * Multi-Invoice payment dialogs. Enforces:
 *
 * - New rows auto-select the first unused method from cash/card/transfer/check.
 * - Add Payment Method disables when all four methods are already in use.
 * - The method selector for a row excludes methods used by other rows.
 * - Removing a row frees its method; at least one row always remains.
 */
export function PaymentTenderEditor({
  rows,
  onChange,
  disabled,
  secondaryAction,
  labelKey = "finance.payments.paymentMethodDetails",
}: PaymentTenderEditorProps) {
  const { t } = useI18n();

  const usedMethods = useMemo(() => new Set(rows.map((r) => r.method)), [rows]);
  const nextUnusedMethod = useMemo<PaymentMethod | null>(
    () => PAYMENT_METHODS.find((m) => !usedMethods.has(m)) ?? null,
    [usedMethods],
  );
  const allMethodsUsed = nextUnusedMethod === null;

  function addRow() {
    if (allMethodsUsed) return;
    onChange([
      ...rows,
      { id: crypto.randomUUID(), method: nextUnusedMethod!, amount: "", reference: "" },
    ]);
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return;
    onChange(rows.filter((r) => r.id !== id));
  }

  function patchRow(id: string, patch: Partial<TenderRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-semibold">{t(labelKey)}</Label>
        {secondaryAction?.visible && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={secondaryAction.onClick}
            className="h-auto p-0 text-xs"
            disabled={disabled}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const otherMethods = new Set(
            rows.filter((r) => r.id !== row.id).map((r) => r.method),
          );
          return (
            <Card key={row.id}>
              <CardContent className="p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">
                      {t("finance.payments.method")}
                    </Label>
                    <Select
                      value={row.method}
                      onValueChange={(v) => patchRow(row.id, { method: v as PaymentMethod })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => {
                          const Icon = METHOD_META[m].icon;
                          return (
                            <SelectItem
                              key={m}
                              value={m}
                              disabled={m !== row.method && otherMethods.has(m)}
                            >
                              <span className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" />
                                {t(METHOD_META[m].labelKey)}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">
                      {t("finance.payments.amount")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      dir="ltr"
                      className="h-9 font-mono tabular-nums text-end"
                      placeholder="0.00"
                      value={row.amount}
                      onChange={(e) => patchRow(row.id, { amount: e.target.value })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">
                      {t("finance.payments.reference")}
                    </Label>
                    <Input
                      className="h-9"
                      placeholder={t("finance.payments.referencePlaceholder")}
                      value={row.reference}
                      onChange={(e) => patchRow(row.id, { reference: e.target.value })}
                      disabled={disabled}
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-1 flex sm:justify-end sm:pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={disabled || rows.length <= 1}
                      aria-label={t("common.remove")}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled || allMethodsUsed}
          className="w-full"
        >
          <Plus className="h-4 w-4 me-2" />
          {t("finance.payments.addPaymentMethod")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Build a fresh initial tender row list — a single row using "cash".
 */
export function makeInitialTenderRows(): TenderRow[] {
  return [{ id: crypto.randomUUID(), method: "cash", amount: "", reference: "" }];
}
