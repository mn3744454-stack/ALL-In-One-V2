import { useState, useEffect } from "react";
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
import { Plus, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";
import type {
  InventoryItem,
  CreateInventoryItemInput,
} from "@/hooks/inventory";

interface Props {
  item?: InventoryItem;
  onSubmit: (data: CreateInventoryItemInput) => Promise<void> | void;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

const CATEGORY_KEYS = ["feed", "bedding", "medication", "equipment", "supplies", "other"];
const UNIT_KEYS = ["kg", "g", "bag", "bale", "liter", "ml", "piece", "box", "unit"];

export function InventoryItemFormDialog({ item, onSubmit, isLoading, trigger }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isEdit = !!item;

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState("other");
  const [unit, setUnit] = useState("unit");
  const [sku, setSku] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("0");
  const [costPerUnit, setCostPerUnit] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setNameAr(item?.name_ar ?? "");
      setCategory(item?.category ?? "other");
      setUnit(item?.unit ?? "unit");
      setSku(item?.sku ?? "");
      setLowStockThreshold(String(item?.low_stock_threshold ?? 0));
      setCostPerUnit(item?.cost_per_unit != null ? String(item.cost_per_unit) : "");
      setNotes(item?.notes ?? "");
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      category,
      unit,
      sku: sku.trim() || null,
      low_stock_threshold: Number(lowStockThreshold) || 0,
      cost_per_unit: costPerUnit === "" ? null : Number(costPerUnit),
      notes: notes.trim() || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={isEdit ? "ghost" : "default"} size={isEdit ? "icon" : "default"}>
            {isEdit ? <Pencil className="h-4 w-4" /> : (
              <>
                <Plus className="h-4 w-4 me-2" />
                {t("inventory.addItem")}
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEdit ? t("inventory.editItem") : t("inventory.addItem")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pe-1">
            <div className="grid gap-2">
              <Label htmlFor="inv-name">{t("inventory.nameEn")} *</Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                dir="ltr"
                placeholder="e.g. Alfalfa Hay"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-name-ar">{t("inventory.nameAr")}</Label>
              <Input
                id="inv-name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>{t("inventory.category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`inventory.categories.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("inventory.unit")}</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`inventory.units.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="inv-sku">{t("inventory.sku")}</Label>
                <Input id="inv-sku" value={sku} onChange={(e) => setSku(e.target.value)} dir="ltr" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-threshold">{t("inventory.lowStockThreshold")}</Label>
                <Input
                  id="inv-threshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-cost">{t("inventory.costPerUnit")}</Label>
              <Input
                id="inv-cost"
                type="number"
                min="0"
                step="0.01"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-notes">{t("inventory.notes")}</Label>
              <Textarea
                id="inv-notes"
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
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isEdit ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
