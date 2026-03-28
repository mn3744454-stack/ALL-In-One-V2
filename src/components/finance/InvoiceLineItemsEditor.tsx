import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  entity_type?: string;
  entity_id?: string;
  horse_id?: string | null;
  domain?: string | null;
}

export interface HorseOption {
  id: string;
  name: string;
  name_ar?: string | null;
}

const DOMAIN_OPTIONS = [
  { value: "general", labelKey: "finance.invoices.domain.general" },
  { value: "boarding", labelKey: "clients.statement.domain.boarding" },
  { value: "vet", labelKey: "clients.statement.domain.vet" },
  { value: "breeding", labelKey: "clients.statement.domain.breeding" },
  { value: "lab", labelKey: "clients.statement.domain.lab" },
] as const;

interface InvoiceLineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency?: string;
  horses?: HorseOption[];
  showAttribution?: boolean;
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  currency = "SAR",
  horses = [],
  showAttribution = true,
}: InvoiceLineItemsEditorProps) {
  const { t, dir, lang } = useI18n();

  const getHorseName = (h: HorseOption) =>
    lang === "ar" ? (h.name_ar || h.name) : (h.name || h.name_ar || "");

  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      horse_id: null,
      domain: null,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | null) => {
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
      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-border/50 rounded-lg p-3 space-y-2">
            {/* Row 1: Description + Qty + Price + Total + Delete */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  placeholder={t("finance.invoices.itemDescription")}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                  className="text-center text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                  className="text-center text-sm"
                />
              </div>
              <div className="col-span-2 text-end font-medium text-sm px-2">
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

            {/* Row 2: Optional horse + domain attribution (only for manual invoices) */}
            {showAttribution && !item.entity_type && (
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <HorsePicker
                    horses={horses}
                    selectedId={item.horse_id || null}
                    onSelect={(id) => updateItem(item.id, "horse_id", id)}
                    getHorseName={getHorseName}
                    t={t}
                  />
                </div>
                <div className="col-span-4">
                  <Select
                    value={item.domain || ""}
                    onValueChange={(v) => updateItem(item.id, "domain", v || null)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t("finance.invoices.domain.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Header labels */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
        <div className="col-span-5">{t("finance.invoices.description")}</div>
        <div className="col-span-2 text-center">{t("finance.invoices.quantity")}</div>
        <div className="col-span-2 text-center">{t("finance.invoices.unitPrice")}</div>
        <div className="col-span-2 text-end">{t("finance.invoices.total")}</div>
        <div className="col-span-1"></div>
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
          <span className="text-lg font-bold">{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

/** Compact horse picker for inline use in line items */
function HorsePicker({
  horses,
  selectedId,
  onSelect,
  getHorseName,
  t,
}: {
  horses: HorseOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  getHorseName: (h: HorseOption) => string;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const selected = horses.find((h) => h.id === selectedId);

  if (horses.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full h-8 justify-between font-normal text-xs"
        >
          <span className="truncate">
            {selected ? `🐴 ${getHorseName(selected)}` : t("finance.invoices.selectHorse")}
          </span>
          <ChevronsUpDown className="ms-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("finance.invoices.searchHorse")} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onSelect(null); setOpen(false); }}
                className="text-xs text-muted-foreground"
              >
                <Check className={cn("me-2 h-3 w-3", !selectedId ? "opacity-100" : "opacity-0")} />
                {t("finance.invoices.noHorse")}
              </CommandItem>
              {horses.map((horse) => (
                <CommandItem
                  key={horse.id}
                  value={horse.name}
                  onSelect={() => { onSelect(horse.id); setOpen(false); }}
                  className="text-xs"
                >
                  <Check className={cn("me-2 h-3 w-3", selectedId === horse.id ? "opacity-100" : "opacity-0")} />
                  {getHorseName(horse)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
