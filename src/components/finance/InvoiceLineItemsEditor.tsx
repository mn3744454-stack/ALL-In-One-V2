import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, Package, FileText, Layers, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StableServicePlan } from "@/hooks/useStableServicePlans";
import { normalizeIncludes } from "@/lib/planIncludes";
import { HorseLinePicker } from "./HorseLinePicker";
import { ServiceCategorySelect } from "./ServiceCategorySelect";
import type { InvoiceCatalogItem } from "@/hooks/finance/useInvoiceCatalogSources";
import { ServiceSelectionDialog } from "./ServiceSelectionDialog";
import { PackageSelectionDialog } from "./PackageSelectionDialog";
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

/** Snapshot for one included service inside a package line. */
export interface PackageServiceSnapshot {
  service_id: string;
  service_source: "tenant_services" | "lab_services";
  name: string;
  name_ar: string | null;
  quantity: number;
  unit_price: number;
  currency: string | null;
}

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
  /** Label 1 — live shared category identity. */
  category_id?: string | null;
  /** Tracks how the line was added: 'manual', 'catalog', or 'package' */
  source?: 'manual' | 'catalog' | 'package';

  /** Label 2 — Package snapshot fields (only when source === 'package') */
  package_id?: string | null;
  package_source?: string | null;
  package_name_snapshot?: string | null;
  package_name_ar_snapshot?: string | null;
  package_price_snapshot?: number | null;
  package_currency_snapshot?: string | null;
  package_services_snapshot?: PackageServiceSnapshot[] | null;
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
  services?: InvoiceCatalogItem[];
  plans?: StableServicePlan[];
  /** Lab-issuer packages are disabled in Label 1. */
  disablePackages?: boolean;
  onQuickAddHorse?: () => void;
  canQuickAddHorse?: boolean;
  quickAddDisabledReason?: string;
  /** Customer-scoped horse query state — forwarded to HorseLinePicker. */
  isCustomerSelected?: boolean;
  horsesLoading?: boolean;
  horsesError?: boolean;
  onRetryHorses?: () => void;
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
  isCustomerSelected = true,
  horsesLoading = false,
  horsesError = false,
  onRetryHorses,
}: InvoiceLineItemsEditorProps) {
  const { t, lang } = useI18n();

  const activeServices = useMemo(() => services.filter(s => s.isActive), [services]);
  const activePlans = useMemo(() => plans.filter(p => p.is_active), [plans]);

  const serviceById = useMemo(() => {
    const map = new Map<string, InvoiceCatalogItem>();
    for (const s of services) map.set(s.id, s);
    return map;
  }, [services]);

  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const addItemsFromServices = (svcs: InvoiceCatalogItem[]) => {
    const newItems: LineItem[] = svcs.map((s) => ({
      id: crypto.randomUUID(),
      description: getServiceName(s),
      quantity: 1,
      unit_price: s.unitPrice ?? 0,
      total_price: s.unitPrice ?? 0,
      horse_id: null,
      domain: null,
      service_id: s.id,
      service_source: s.serviceSource,
      category_id: s.categoryId ?? null,
      source: 'catalog',
    }));
    onChange([...items, ...newItems]);
  };

  const addItemsFromPackages = (selectedPlans: StableServicePlan[]) => {
    const newItems: LineItem[] = [];
    for (const plan of selectedPlans) {
      const includes = normalizeIncludes(plan.includes);
      const snapshot: PackageServiceSnapshot[] = includes.map((e) => {
        const svc = serviceById.get(e.service_id);
        return {
          service_id: e.service_id,
          service_source: (svc?.serviceSource ?? "tenant_services") as PackageServiceSnapshot["service_source"],
          name: svc?.name ?? "",
          name_ar: svc?.nameAr ?? null,
          quantity: 1,
          unit_price: svc?.unitPrice ?? 0,
          currency: svc?.currency ?? plan.currency,
        };
      });
      const packagePrice = Number(plan.base_price) || 0;
      newItems.push({
        id: crypto.randomUUID(),
        description: lang === "ar" ? (plan.name_ar || plan.name) : plan.name,
        quantity: 1,
        unit_price: packagePrice,
        total_price: packagePrice,
        horse_id: null,
        domain: null,
        service_id: null,
        service_source: null,
        category_id: null,
        source: 'package',
        package_id: plan.id,
        package_source: 'stable_service_plans',
        package_name_snapshot: plan.name,
        package_name_ar_snapshot: plan.name_ar,
        package_price_snapshot: packagePrice,
        package_currency_snapshot: plan.currency,
        package_services_snapshot: snapshot,
      });
    }
    if (newItems.length > 0) onChange([...items, ...newItems]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number | null) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      // Package lines: keep totals aligned to snapshot price; quantity stays 1
      if (item.source === 'package') {
        if (field === 'unit_price' || field === 'quantity' || field === 'total_price') return item;
      }
      const newItem = { ...item, [field]: value } as LineItem;
      if (field === "quantity" || field === "unit_price") {
        newItem.total_price = newItem.quantity * newItem.unit_price;
      }
      return newItem;
    });
    onChange(updated);
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

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

  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

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
                  isCustomerSelected={isCustomerSelected}
                  horsesLoading={horsesLoading}
                  horsesError={horsesError}
                  onRetryHorses={onRetryHorses}
                  expanded={!!expanded[item.id]}
                  onToggleExpanded={() => toggleExpanded(item.id)}
                  lang={lang}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("finance.invoices.addManualItem")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setServicesDialogOpen(true)}
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          {t("finance.invoices.addFromCatalog")}
        </Button>

        {!disablePackages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPackagesDialogOpen(true)}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            {t("finance.invoices.addFromPackage")}
          </Button>
        )}
      </div>

      <ServiceSelectionDialog
        open={servicesDialogOpen}
        onOpenChange={setServicesDialogOpen}
        services={activeServices}
        onApply={addItemsFromServices}
      />

      {!disablePackages && (
        <PackageSelectionDialog
          open={packagesDialogOpen}
          onOpenChange={setPackagesDialogOpen}
          plans={activePlans}
          services={services}
          onApply={addItemsFromPackages}
        />
      )}

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
  isCustomerSelected,
  horsesLoading,
  horsesError,
  onRetryHorses,
  expanded,
  onToggleExpanded,
  lang,
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
  isCustomerSelected?: boolean;
  horsesLoading?: boolean;
  horsesError?: boolean;
  onRetryHorses?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  lang: string;
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
  const isPackage = itemSource === 'package';
  const includedCount = item.package_services_snapshot?.length ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-3 space-y-2 bg-background",
        isPackage ? "border-primary/40 bg-primary/[0.02]" : "border-border/50"
      )}
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
          {isPackage && includedCount > 0 && (
            <button
              type="button"
              onClick={onToggleExpanded}
              aria-label={expanded ? "Collapse" : "Expand"}
              className="shrink-0 text-muted-foreground hover:text-foreground p-1"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <Input
            value={item.description}
            onChange={(e) => updateItem(item.id, "description", e.target.value)}
            placeholder={t("finance.invoices.itemDescription")}
            className="text-sm"
            readOnly={isPackage}
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
            className="text-center text-sm"
            readOnly={isPackage}
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
            readOnly={isPackage}
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
                isCustomerSelected={isCustomerSelected}
                isLoading={horsesLoading}
                isError={horsesError}
                onRetry={onRetryHorses}
              />
            </div>
            {isPackage ? (
              <div className="col-span-4 text-xs text-muted-foreground truncate">
                {t("finance.invoices.packageLineHint")}
              </div>
            ) : (
              <div className="col-span-4">
                <ServiceCategorySelect
                  value={item.category_id ?? null}
                  onChange={(id) => updateItem(item.id, "category_id", id)}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </>
        ) : (
          <div className="col-span-9" />
        )}
        <div className="col-span-3 flex items-center justify-end gap-1.5 flex-wrap">
          {isPackage ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {t("finance.invoices.packageSource")}
              {includedCount > 0 && <span>· {includedCount}</span>}
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
          {!isPackage && (
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
          )}
        </div>
      </div>

      {/* Package children detail — read-only, at 0.00 */}
      {isPackage && expanded && includedCount > 0 && (
        <div className="ms-8 border-s ps-3 space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground pt-1">
            {t("finance.invoices.includedServices")}
          </div>
          {(item.package_services_snapshot || []).map((child, idx) => (
            <div key={`${child.service_id}-${idx}`} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="truncate flex-1 min-w-0">
                {lang === "ar" ? (child.name_ar || child.name) : (child.name || child.name_ar)}
                <span className="opacity-70"> × {child.quantity}</span>
              </div>
              <div className="font-mono tabular-nums shrink-0" dir="ltr">0.00</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
