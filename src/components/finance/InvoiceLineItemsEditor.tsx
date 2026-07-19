import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, Package, FileText, Layers, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StableServicePlan } from "@/hooks/useStableServicePlans";
import { normalizeIncludes } from "@/lib/planIncludes";
import { HorseLinePicker } from "./HorseLinePicker";
import { ServiceCategorySelect } from "./ServiceCategorySelect";
import type { InvoiceCatalogItem } from "@/hooks/finance/useInvoiceCatalogSources";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  /** Label 1 — required discriminator when service_id is set. */
  service_source?: "tenant_services" | "lab_services" | null;
  /** Label 1 — live shared category identity (tenant_service_categories.id). */
  category_id?: string | null;
  /** Tracks how the line was added: 'manual', 'catalog', or 'package' */
  source?: 'manual' | 'catalog' | 'package';
}

export interface HorseOption {
  id: string;
  name: string;
  name_ar?: string | null;
}

interface InvoiceLineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
  horses?: HorseOption[];
  showAttribution?: boolean;
  /** Label 1 — normalized catalog items (tenant_services or lab_services). */
  services?: InvoiceCatalogItem[];
  plans?: StableServicePlan[];
  /** Lab-issuer packages are disabled in Label 1. */
  disablePackages?: boolean;
  /** Optional slot for the horse-picker area (e.g. Add-New bridge). */
  onQuickAddHorse?: () => void;
  /** Whether Quick Add is currently allowed (customer must be selected). */
  canQuickAddHorse?: boolean;
  quickAddDisabledReason?: string;
}

export function InvoiceLineItemsEditor({
  items,
  onChange,
  currency,
  horses = [],
  showAttribution = true,
  services = [],
  plans = [],
  disablePackages = false,
  onQuickAddHorse,
  canQuickAddHorse = true,
  quickAddDisabledReason,
}: InvoiceLineItemsEditorProps) {
  const { t, lang } = useI18n();

  const activeServices = useMemo(
    () => services.filter(s => s.isActive),
    [services]
  );

  const activePlans = useMemo(
    () => plans.filter(p => p.is_active),
    [plans]
  );

  // Service lookup by id (used for package expansion + tax status)
  const serviceById = useMemo(() => {
    const map = new Map<string, InvoiceCatalogItem>();
    for (const s of services) map.set(s.id, s);
    return map;
  }, [services]);

  const getHorseName = (h: HorseOption) =>
    lang === "ar" ? (h.name_ar || h.name) : (h.name || h.name_ar || "");

  const getServiceName = (s: InvoiceCatalogItem) =>
    lang === "ar" ? (s.nameAr || s.name) : (s.name || s.nameAr || "");

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
      service_source: null,
      category_id: null,
      source: 'manual',
    };
    onChange([...items, newItem]);
  };

  const addItemFromService = (service: InvoiceCatalogItem) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: getServiceName(service),
      quantity: 1,
      unit_price: service.unitPrice ?? 0,
      total_price: service.unitPrice ?? 0,
      horse_id: null,
      domain: null,
      service_id: service.id,
      service_source: service.serviceSource,
      category_id: service.categoryId ?? null,
      source: 'catalog',
    };
    onChange([...items, newItem]);
  };

  const addItemsFromPackage = (plan: StableServicePlan) => {
    const includes = normalizeIncludes(plan.includes);
    if (includes.length === 0) return;

    const newItems: LineItem[] = [];
    for (const entry of includes) {
      const svc = serviceById.get(entry.service_id);
      if (!svc) continue;
      newItems.push({
        id: crypto.randomUUID(),
        description: getServiceName(svc),
        quantity: 1,
        unit_price: svc.unitPrice ?? 0,
        total_price: svc.unitPrice ?? 0,
        horse_id: null,
        domain: null,
        service_id: svc.id,
        service_source: svc.serviceSource,
        category_id: svc.categoryId ?? null,
        source: 'package',
      });
    }
    if (newItems.length > 0) {
      onChange([...items, ...newItems]);
    }
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | null) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value } as LineItem;
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

  const getLineTaxStatus = (item: LineItem): "taxable" | "exempt" => {
    if (item.service_id) {
      const svc = serviceById.get(item.service_id);
      if (svc && svc.isTaxable === false) return "exempt";
    }
    return "taxable";
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
          <div className="col-span-5">{t("finance.invoices.description")}</div>
          <div className="col-span-2 text-center">{t("finance.invoices.quantity")}</div>
          <div className="col-span-2 text-center">{t("finance.invoices.unitPrice")}</div>
          <div className="col-span-2 text-end">{t("finance.invoices.total")}</div>
          <div className="col-span-1"></div>
        </div>
      )}

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

        {items.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableLineItemRow
                  key={item.id}
                  item={item}
                  horses={horses}
                  showAttribution={showAttribution}
                  getLineTaxStatus={getLineTaxStatus}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  onQuickAddHorse={onQuickAddHorse}
                  canQuickAddHorse={canQuickAddHorse}
                  quickAddDisabledReason={quickAddDisabledReason}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

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
            lang={lang}
            t={t}
          />
        )}

        {!disablePackages && activePlans.length > 0 && (
          <PackagePicker
            plans={activePlans}
            onSelect={addItemsFromPackage}
            lang={lang}
            t={t}
          />
        )}
      </div>

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

function SortableLineItemRow({
  item,
  horses,
  showAttribution,
  getLineTaxStatus,
  updateItem,
  removeItem,
  onQuickAddHorse,
  canQuickAddHorse,
  quickAddDisabledReason,
  t,
}: {
  item: LineItem;
  horses: HorseOption[];
  showAttribution: boolean;
  getLineTaxStatus: (i: LineItem) => "taxable" | "exempt";
  updateItem: (id: string, field: keyof LineItem, value: string | number | null) => void;
  removeItem: (id: string) => void;
  onQuickAddHorse?: () => void;
  canQuickAddHorse?: boolean;
  quickAddDisabledReason?: string;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const taxStatus = getLineTaxStatus(item);
  const itemSource = item.source || (item.service_id ? 'catalog' : 'manual');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-border/50 rounded-lg p-3 space-y-2 bg-background"
    >
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-5 flex items-center gap-2">
          <button
            type="button"
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-1 -ms-1"
            aria-label="Reorder item"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
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

      <div className="grid grid-cols-12 gap-2 items-center">
        {showAttribution && !item.entity_type ? (
          <>
            <div className="col-span-5">
              <HorseLinePicker
                horses={horses}
                selectedId={item.horse_id || null}
                onSelect={(id) => updateItem(item.id, "horse_id", id)}
                onQuickAdd={onQuickAddHorse}
                canQuickAdd={canQuickAddHorse}
                quickAddDisabledReason={quickAddDisabledReason}
              />
            </div>
            <div className="col-span-4">
              <ServiceCategorySelect
                value={item.category_id ?? null}
                onChange={(id) => updateItem(item.id, "category_id", id)}
                className="h-8 text-xs"
              />
            </div>
          </>
        ) : (
          <div className="col-span-9" />
        )}
        <div className="col-span-3 flex items-center justify-end gap-1.5 flex-wrap">
          {itemSource === 'package' ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {t("finance.invoices.packageSource")}
            </span>
          ) : itemSource === 'catalog' ? (
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
}

function ServicePicker({
  services,
  onSelect,
  getServiceName,
  lang,
  t,
}: {
  services: InvoiceCatalogItem[];
  onSelect: (service: InvoiceCatalogItem) => void;
  getServiceName: (s: InvoiceCatalogItem) => string;
  lang: string;
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
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("finance.invoices.searchService")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              {services.map((svc) => {
                const secondary = lang === "ar" ? svc.name : svc.nameAr;
                const catName = lang === "ar" ? (svc.categoryNameAr || svc.categoryName) : (svc.categoryName || svc.categoryNameAr);
                return (
                  <CommandItem
                    key={svc.id}
                    value={`${svc.name} ${svc.nameAr ?? ""}`}
                    onSelect={() => {
                      onSelect(svc);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{getServiceName(svc)}</div>
                        {secondary && (
                          <div className="truncate text-[10px] text-muted-foreground">{secondary}</div>
                        )}
                        {catName && (
                          <div className="truncate text-[10px] text-muted-foreground/80">{catName}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {svc.isTaxable === false && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                            {t("finance.invoices.taxBadgeExempt")}
                          </Badge>
                        )}
                        {svc.unitPrice != null && (
                          <span className="text-xs text-muted-foreground">
                            {svc.unitPrice}{svc.currency ? ` ${svc.currency}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PackagePicker({
  plans,
  onSelect,
  lang,
  t,
}: {
  plans: StableServicePlan[];
  onSelect: (plan: StableServicePlan) => void;
  lang: string;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);

  const getPlanName = (p: StableServicePlan) =>
    lang === "ar" ? (p.name_ar || p.name) : p.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Layers className="w-4 h-4" />
          {t("finance.invoices.addFromPackage")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("finance.invoices.searchPackage")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              {plans.map((plan) => {
                const includes = normalizeIncludes(plan.includes);
                return (
                  <CommandItem
                    key={plan.id}
                    value={plan.name}
                    onSelect={() => {
                      onSelect(plan);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="min-w-0">
                        <span className="truncate block">{getPlanName(plan)}</span>
                        {includes.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {includes.length} {t("finance.invoices.servicesIncluded")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {plan.base_price} {plan.currency}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
