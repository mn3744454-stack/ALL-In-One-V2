import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import type {
  InventoryItem,
  CreateInventoryTransactionInput,
  InventoryTransactionType,
} from "@/hooks/inventory";

interface Props {
  items: InventoryItem[];
  defaultItemId?: string;
  onSubmit: (data: CreateInventoryTransactionInput) => Promise<void> | void;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

const TYPES: InventoryTransactionType[] = ["stock_in", "stock_out", "adjustment"];

export function InventoryTransactionFormDialog({
  items,
  defaultItemId,
  onSubmit,
  isLoading,
  trigger,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const [itemId, setItemId] = useState<string>(defaultItemId ?? "");
  const [type, setType] = useState<InventoryTransactionType>("stock_in");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("");
  const [notes, setNotes] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setItemId(defaultItemId ?? "");
      setType("stock_in");
      setQuantity("1");
      setUnitCost("");
      setNotes("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !quantity) return;
    await onSubmit({
      item_id: itemId,
      transaction_type: type,
      quantity: Number(quantity),
      unit_cost: unitCost === "" ? null : Number(unitCost),
      notes: notes.trim() || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4 me-2" />
            {t("inventory.newTransaction")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("inventory.newTransaction")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pe-1">
            <div className="grid gap-2">
              <Label>{t("inventory.items")}</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                      {it.name_ar ? ` — ${it.name_ar}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("common.type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as InventoryTransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`inventory.${tp === "stock_in" ? "stockIn" : tp === "stock_out" ? "stockOut" : "adjustment"}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tx-qty">{t("inventory.quantity")} *</Label>
                <Input
                  id="tx-qty"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tx-cost">{t("inventory.unitCost")}</Label>
                <Input
                  id="tx-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-notes">{t("inventory.notes")}</Label>
              <Textarea
                id="tx-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-3 border-t mt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !itemId || !quantity}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
