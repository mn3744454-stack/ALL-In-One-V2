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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  useInventoryItems,
  useSuppliers,
  type InventoryItem,
} from "@/hooks/inventory";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this item; otherwise it creates a new one. */
  item?: InventoryItem | null;
}

const EMPTY = {
  name: "",
  name_ar: "",
  category: "feed",
  unit: "kg",
  sku: "",
  low_stock_threshold: "",
  cost_per_unit: "",
  default_supplier_id: "__none__",
  notes: "",
};

export function ItemFormDialog({ open, onOpenChange, item }: ItemFormDialogProps) {
  const { t } = useI18n();
  const { createItem, updateItem, isCreating, isUpdating } = useInventoryItems();
  const { suppliers } = useSuppliers();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name,
              name_ar: item.name_ar ?? "",
              category: item.category,
              unit: item.unit,
              sku: item.sku ?? "",
              low_stock_threshold: String(item.low_stock_threshold ?? ""),
              cost_per_unit: item.cost_per_unit != null ? String(item.cost_per_unit) : "",
              default_supplier_id: item.default_supplier_id ?? "__none__",
              notes: item.notes ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, item]);

  const isSaving = isCreating || isUpdating;
  const canSubmit = form.name.trim().length > 0 && !isSaving;

  const handleSubmit = async () => {
    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      category: form.category,
      unit: form.unit,
      sku: form.sku.trim() || null,
      low_stock_threshold: form.low_stock_threshold ? Number(form.low_stock_threshold) : 0,
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      default_supplier_id:
        form.default_supplier_id === "__none__" ? null : form.default_supplier_id,
      notes: form.notes.trim() || null,
    };
    if (item) {
      await updateItem({ id: item.id, ...payload });
    } else {
      await createItem(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? t("inventory.items.editTitle") : t("inventory.items.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("inventory.fields.namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.nameAr")}</Label>
              <Input
                value={form.name_ar}
                dir="rtl"
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`inventory.categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.unit")}</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`inventory.units.${u}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.lowStockThreshold")}</Label>
              <Input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.costPerUnit")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_per_unit}
                onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.sku")}</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.defaultSupplier")}</Label>
              <Select
                value={form.default_supplier_id}
                onValueChange={(v) => setForm({ ...form, default_supplier_id: v })}
              >
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
          </div>

          <div className="space-y-1.5">
            <Label>{t("inventory.fields.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {item ? t("common.save") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
