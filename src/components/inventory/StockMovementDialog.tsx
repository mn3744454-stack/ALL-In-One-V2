import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import {
  useInventoryTransactions,
  useSuppliers,
  type InventoryItem,
  type TransactionType,
} from "@/hooks/inventory";
import { EXPENSE_CATEGORIES } from "@/hooks/finance/useExpenses";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  /** Pre-select the movement type when opening (e.g. from a "+ Stock" button). */
  defaultType?: TransactionType;
}

const TYPES: TransactionType[] = ["stock_in", "consumption", "adjustment", "waste"];

export function StockMovementDialog({
  open,
  onOpenChange,
  item,
  defaultType = "stock_in",
}: StockMovementDialogProps) {
  const { t } = useI18n();
  const { recordTransaction, isRecording } = useInventoryTransactions();
  const { suppliers } = useSuppliers();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("__none__");
  const [createExpense, setCreateExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("other");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setAmount("");
      setNewQuantity(item ? String(item.current_quantity) : "");
      setUnitCost(item?.cost_per_unit != null ? String(item.cost_per_unit) : "");
      setSupplierId(item?.default_supplier_id ?? "__none__");
      setCreateExpense(false);
      setExpenseCategory("other");
      setNotes("");
    }
  }, [open, item, defaultType]);

  if (!item) return null;

  const isAdjustment = type === "adjustment";
  const showCost = type === "stock_in";
  const valid = isAdjustment
    ? newQuantity !== "" && !isRecording
    : amount !== "" && Number(amount) > 0 && !isRecording;

  const handleSubmit = async () => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    await recordTransaction({
      item_id: item.id,
      transaction_type: type,
      amount: amount ? Number(amount) : 0,
      newQuantity: isAdjustment ? Number(newQuantity) : undefined,
      unit_cost: showCost && unitCost ? Number(unitCost) : null,
      supplier_id: supplierId === "__none__" ? null : supplierId,
      supplier_name: supplier?.name ?? null,
      createExpense: createExpense && showCost,
      expenseCategory,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("inventory.movement.title")} — {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            {t("inventory.movement.currentStock")}:{" "}
            <span className="font-semibold text-foreground">
              {item.current_quantity} {t(`inventory.units.${item.unit}`)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.movement.type")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {t(`inventory.movement.types.${tp}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdjustment ? (
            <div className="space-y-1.5">
              <Label>{t("inventory.movement.newQuantity")}</Label>
              <Input
                type="number"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>
                {t("inventory.movement.quantity")} ({t(`inventory.units.${item.unit}`)})
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}

          {showCost && (
            <>
              <div className="space-y-1.5">
                <Label>{t("inventory.fields.costPerUnit")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("inventory.fields.supplier")}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("inventory.fields.noSupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("inventory.fields.noSupplier")}</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label className="cursor-pointer">{t("inventory.movement.recordExpense")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("inventory.movement.recordExpenseHint")}
                  </p>
                </div>
                <Switch checked={createExpense} onCheckedChange={setCreateExpense} />
              </div>

              {createExpense && (
                <div className="space-y-1.5">
                  <Label>{t("inventory.movement.expenseCategory")}</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`finance.expenses.categories.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label>{t("inventory.fields.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {t("inventory.movement.record")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
