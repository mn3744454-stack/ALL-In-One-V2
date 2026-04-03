import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, Check, ChevronsUpDown, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TenantService } from "@/hooks/useServices";

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
  service_id?: string | null;
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

// Map service_kind to domain
const SERVICE_KIND_TO_DOMAIN: Record<string, string> = {
  boarding: "boarding",
  vet: "vet",
  breeding: "breeding",
  service: "general",
};

interface InvoiceLineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
  horses?: HorseOption[];
  showAttribution?: boolean;
  services?: TenantService[];
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  currency,
  horses = [],
  showAttribution = true,
  services = [],
}: InvoiceLineItemsEditorProps) {
  const { t, dir, lang } = useI18n();

  const activeServices = useMemo(
    () => services.filter(s => s.is_active),
    [services]
  );

  // Build a lookup for service taxability
  const serviceTaxMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of services) {
      map.set(s.id, s.is_taxable !== false);
    }
    return map;
  }, [services]);

  const getHorseName = (h: HorseOption) =>
    lang === "ar" ? (h.name_ar || h.name) : (h.name || h.name_ar || "");

  const getServiceName = (s: TenantService) =>
    lang === "ar" ? (s.name_ar || s.name) : (s.name || s.name_ar || "");

  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      horse_id: null,
      domain: null,
      service_id: null,
    };
    onChange([...items, newItem]);
  };

  const addItemFromService = (service: TenantService) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: getServiceName(service),
      quantity: 1,
      unit_price: service.unit_price || 0,
      total_price: service.unit_price || 0,
      horse_id: null,
      domain: SERVICE_KIND_TO_DOMAIN[service.service_kind] || "general",
      service_id: service.id,
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

  /** Determine tax status for a line item */
  const getLineTaxStatus = (item: LineItem): "taxable" | "exempt" => {
    if (item.service_id) {
      return serviceTaxMap.get(item.service_id) !== false ? "taxable" : "exempt";
    }
    // Free-text lines are taxable by default
    return "taxable";
  };

  return (
    <div className="space-y-3">
      {/* Column headers — ABOVE items */}
      {items.length > 0 && (
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
          <div className="col-span-5">{t("finance.invoices.description")}</div>
          <div className="col-span-2 text-center">{t("finance.invoices.quantity")}</div>
          <div className="col-span-2 text-center">{t("finance.invoices.unitPrice")}</div>
          <div className="col-span-2 text-end">{t("finance.invoices.total")}</div>
          <div className="col-span-1"></div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {t("finance.invoices.emptyLineItems")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("finance.invoices.emptyLineItemsHint")}
            </p>
          </div>
        )}

        {items.map((item) => {
          const taxStatus = getLineTaxStatus(item);
          const isFromCatalog = !!item.service_id;

          return (
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

              {/* Row 2: Attribution + tax badge + source indicator */}
              <div className="grid grid-cols-12 gap-2 items-center">
                {showAttribution && !item.entity_type ? (
                  <>
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
                  </>
                ) : (
                  <div className="col-span-9" />
                )}
                <div className="col-span-3 flex items-center justify-end gap-1.5 flex-wrap">
                  {/* Source indicator */}
                  {isFromCatalog ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {t("finance.invoices.catalogLinked")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {t("finance.invoices.manualEntry")}
                    </span>
                  )}
                  {/* Tax badge */}
                  <Badge
                    variant={taxStatus === "taxable" ? "default" : "secondary"}
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      taxStatus === "taxable"
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {taxStatus === "taxable"
                      ? t("finance.invoices.taxBadgeTaxable")
                      : t("finance.invoices.taxBadgeExempt")}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("finance.invoices.addManualItem")}
        </Button>

        {activeServices.length > 0 && (
          <ServicePicker
            services={activeServices}
            onSelect={addItemFromService}
            getServiceName={getServiceName}
            t={t}
          />
        )}
      </div>

      {/* Subtotal */}
      {items.length > 0 && (
        <div className="flex justify-end border-t pt-3">
          <div className="text-end">
            <span className="text-sm text-muted-foreground me-4">
              {t("finance.invoices.subtotal")}:
            </span>
            <span className="text-lg font-bold">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      )}
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

/** Service catalog picker — adds a new line item from the catalog */
function ServicePicker({
  services,
  onSelect,
  getServiceName,
  t,
}: {
  services: TenantService[];
  onSelect: (service: TenantService) => void;
  getServiceName: (s: TenantService) => string;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          {t("finance.invoices.addFromCatalog")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("finance.invoices.searchService")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              {services.map((svc) => (
                <CommandItem
                  key={svc.id}
                  value={svc.name}
                  onSelect={() => {
                    onSelect(svc);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{getServiceName(svc)}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {svc.is_taxable === false && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                          {t("finance.invoices.taxBadgeExempt")}
                        </Badge>
                      )}
                      {svc.unit_price != null && (
                        <span className="text-xs text-muted-foreground">
                          {svc.unit_price}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
