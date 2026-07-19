import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Tag, FlaskConical, ShieldAlert, X } from "lucide-react";
import { useLabCatalogViewer, type LabCatalogViewerService } from "@/hooks/laboratory/useLabServices";
import { useI18n } from "@/i18n";

interface Props {
  labTenantId: string | null;
  labName?: string;
  onSelectServices?: (serviceIds: string[], serviceNames?: string[]) => void;
  selectable?: boolean;
  selectedIds?: string[];
  /** Slice 3 closure — inline validation message rendered above the list. */
  errorMessage?: string | null;
}

/**
 * Slice 3 — Category → Analysis selection surface.
 *
 * Live category identity comes exclusively from the shared
 * tenant_service_categories join returned by `get_lab_services_for_viewer`
 * (Slice 2QA-C closure). Legacy free-text `lab_services.category` is never
 * read here — a legacy value such as "ميم" cannot appear as a live label.
 *
 * Behavior contract:
 *  - Fetches all active services for the provider with server-side search;
 *    category filtering is applied client-side so multi-select uses OR
 *    semantics without a new RPC.
 *  - Selected analyses persist across category/search changes even when the
 *    current filter hides them — a sticky "Selected" chip strip keeps hidden
 *    selections visible and removable.
 *  - Provider switch: parent owns `labTenantId` + `selectedIds`; when the
 *    provider changes the parent already clears selection (LabRequestsTab)
 *    and the internal registry is scoped to the current provider only.
 */
export function LabCatalogViewer({ labTenantId, labName, onSelectServices, selectable, selectedIds = [], errorMessage }: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [includeUnmapped, setIncludeUnmapped] = useState(false);

  // Fetch with server-side search only; multi-category OR is applied client-side.
  const { data, isLoading, isError } = useLabCatalogViewer(labTenantId, search, null);
  const services = useMemo<LabCatalogViewerService[]>(() => data ?? [], [data]);

  // Persistent registry of selected analyses so hidden selections stay
  // visible as removable chips. Scoped to the current provider.
  const registryRef = useRef<Map<string, LabCatalogViewerService>>(new Map());
  useEffect(() => {
    registryRef.current = new Map();
    setCategoryIds(new Set());
    setIncludeUnmapped(false);
    setSearch("");
    setCategorySearch("");
  }, [labTenantId]);

  useEffect(() => {
    for (const s of services) {
      if (selectedIds.includes(s.id)) registryRef.current.set(s.id, s);
    }
  }, [services, selectedIds]);

  // Distinct shared categories across the FULL fetched set (not filtered)
  // so the chip list is stable while the user narrows selection.
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; name_ar: string | null }>();
    for (const s of services) {
      if (s.category_id && !map.has(s.category_id)) {
        map.set(s.category_id, {
          id: s.category_id,
          name: s.category_name || "",
          name_ar: s.category_name_ar || null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const an = (isAr ? a.name_ar || a.name : a.name || a.name_ar || "").trim();
      const bn = (isAr ? b.name_ar || b.name : b.name || b.name_ar || "").trim();
      return an.localeCompare(bn);
    });
  }, [services, isAr]);

  const hasUnmapped = useMemo(() => services.some((s) => !s.category_id), [services]);

  const visibleCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      `${c.name} ${c.name_ar ?? ""}`.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  // OR semantics: no chip = show all; chip(s) = union of matched categories.
  const filteredServices = useMemo(() => {
    if (categoryIds.size === 0 && !includeUnmapped) return services;
    return services.filter((s) => {
      if (!s.category_id) return includeUnmapped;
      return categoryIds.has(s.category_id);
    });
  }, [services, categoryIds, includeUnmapped]);

  const emitSelection = (nextIds: string[]) => {
    if (!onSelectServices) return;
    // Dedup defensively.
    const unique = Array.from(new Set(nextIds));
    const names = unique
      .map((id) => registryRef.current.get(id)?.name)
      .filter((n): n is string => !!n);
    onSelectServices(unique, names);
  };

  const handleToggleService = (service: LabCatalogViewerService) => {
    if (!onSelectServices) return;
    registryRef.current.set(service.id, service);
    const next = selectedIds.includes(service.id)
      ? selectedIds.filter((id) => id !== service.id)
      : [...selectedIds, service.id];
    emitSelection(next);
  };

  const handleRemoveSelected = (id: string) => emitSelection(selectedIds.filter((x) => x !== id));
  const handleClearSelection = () => emitSelection([]);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!labTenantId) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-12 text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("laboratory.catalog.selectLabFirst")}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-12 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">{t("laboratory.catalog.noAccess")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("laboratory.catalog.noAccessDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card variant="elevated" className="border-dashed">
        <CardContent className="py-12 text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">{t("laboratory.catalog.noServicesAvailable")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {labName
              ? t("laboratory.catalog.noServicesForLab").replace("{{lab}}", labName)
              : t("laboratory.catalog.noServicesDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSelected = selectedIds.length;

  // Slice 3 closure — grouped price totals over unique selected IDs.
  // Missing price is never treated as zero: the currency bucket is flagged
  // "missing" and reported separately so it can never inflate a numeric total.
  const totalsByCurrency = useMemo(() => {
    const unique = Array.from(new Set(selectedIds));
    const buckets = new Map<string, { total: number; missing: number }>();
    for (const id of unique) {
      const s = registryRef.current.get(id);
      if (!s) continue;
      const cur = (s.currency || "").trim() || "—";
      const b = buckets.get(cur) || { total: 0, missing: 0 };
      if (typeof s.price === "number" && !Number.isNaN(s.price)) {
        b.total += s.price;
      } else {
        b.missing += 1;
      }
      buckets.set(cur, b);
    }
    return Array.from(buckets.entries()).map(([currency, v]) => ({ currency, ...v }));
  }, [selectedIds]);

  return (
    <div className="space-y-4">
      {labName && (
        <h3 className="text-base font-semibold">{t("laboratory.catalog.servicesFrom")} {labName}</h3>
      )}

      {/* Slice 3 closure — inline validation error, anchored above selection. */}
      {errorMessage && (
        <div
          role="alert"
          data-lab-analysis-error
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}


      {/* Sticky selected-analysis chip strip. Keeps hidden selections visible. */}
      {selectable && totalSelected > 0 && (
        <div className="rounded-md border bg-muted/30 p-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {(t("laboratory.catalog.selectedCount") || "{{count}} selected").replace("{{count}}", String(totalSelected))}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={handleClearSelection}
            >
              {t("laboratory.catalog.clearSelection") || "Clear selection"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map((id) => {
              const s = registryRef.current.get(id);
              const label = s
                ? (isAr ? s.name_ar || s.name : s.name || s.name_ar || "")
                : id.slice(0, 6);
              return (
                <Badge key={id} variant="secondary" className="gap-1 min-h-6">
                  <span className="max-w-[10rem] truncate">{label}</span>
                  <button
                    type="button"
                    aria-label={t("common.remove") || "Remove"}
                    className="hover:text-destructive"
                    onClick={() => handleRemoveSelected(id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          {/* Slice 3 closure — selected analyses total by currency */}
          {totalsByCurrency.length > 0 && (
            <div className="border-t pt-2 mt-1 space-y-0.5">
              <div className="text-xs font-medium text-muted-foreground">
                {t("laboratory.catalog.selectedAnalysesTotal")}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {totalsByCurrency.map((b) => (
                  <span key={b.currency} className="text-sm font-semibold">
                    {b.total.toLocaleString(isAr ? "ar" : "en", { maximumFractionDigits: 2 })}
                    {b.currency !== "—" ? ` ${b.currency}` : ""}
                    {b.missing > 0 && (
                      <span className="ms-1 text-xs font-normal text-muted-foreground">
                        (+{b.missing} {t("finance.pos.priceMissing") || "no price"})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search: analyses + categories */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("laboratory.catalog.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 min-h-11"
          />
        </div>
        {(categories.length > 3 || categorySearch) && (
          <div className="relative sm:w-56">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("laboratory.catalog.searchCategoriesPlaceholder") || "Search categories..."}
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="ps-9 min-h-11"
            />
          </div>
        )}
      </div>

      {/* Category chip toolbar (multi-select) */}
      {(visibleCategories.length > 0 || hasUnmapped) && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={categoryIds.size === 0 && !includeUnmapped ? "default" : "outline"}
            className="cursor-pointer min-h-7"
            onClick={() => { setCategoryIds(new Set()); setIncludeUnmapped(false); }}
          >
            {t("common.all")}
          </Badge>
          {visibleCategories.map((cat) => {
            const label = (isAr ? cat.name_ar || cat.name : cat.name || cat.name_ar || "").trim();
            const active = categoryIds.has(cat.id);
            return (
              <Badge
                key={cat.id}
                variant={active ? "default" : "outline"}
                className="cursor-pointer min-h-7"
                onClick={() => toggleCategory(cat.id)}
              >
                {label || t("finance.categories.unavailable")}
              </Badge>
            );
          })}
          {hasUnmapped && (
            <Badge
              variant={includeUnmapped ? "default" : "outline"}
              className="cursor-pointer min-h-7 border-dashed text-muted-foreground"
              title={t("finance.categories.unmappedFull")}
              onClick={() => setIncludeUnmapped((v) => !v)}
            >
              {t("finance.categories.unmapped")}
            </Badge>
          )}
        </div>
      )}

      {/* Services */}
      <div className="space-y-3">
        {filteredServices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("laboratory.catalog.noMatches") || "No analyses match your filters"}
          </p>
        ) : (
          filteredServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);

            const hasLinked = !!service.category_id;
            const primary = (isAr
              ? service.category_name_ar || service.category_name
              : service.category_name || service.category_name_ar || ""
            )?.trim() || "";
            const secondary = (isAr
              ? service.category_name || ""
              : service.category_name_ar || ""
            )?.trim() || "";

            return (
              <Card
                key={service.id}
                variant="elevated"
                className={`transition-all ${selectable ? "cursor-pointer hover:shadow-md" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={selectable ? () => handleToggleService(service) : undefined}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {isAr ? service.name_ar || service.name : service.name}
                        </h3>
                        {service.code && (
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{service.code}</Badge>
                        )}
                      </div>
                      {(isAr ? service.name : service.name_ar) && (
                        <p
                          className="text-sm text-muted-foreground truncate"
                          dir={isAr ? "ltr" : "rtl"}
                        >
                          {isAr ? service.name : service.name_ar}
                        </p>
                      )}
                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{service.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {hasLinked ? (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            title={secondary || undefined}
                          >
                            <Tag className="w-3 h-3 me-1" />
                            {primary || t("finance.categories.unavailable")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs border-dashed text-muted-foreground"
                            title={t("finance.categories.unmappedFull")}
                          >
                            <Tag className="w-3 h-3 me-1" />
                            {t("finance.categories.unmapped")}
                          </Badge>
                        )}
                        {service.sample_type && (
                          <Badge variant="outline" className="text-xs">{service.sample_type}</Badge>
                        )}
                        {service.turnaround_hours && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.turnaround_hours}h
                          </span>
                        )}
                        {service.price != null && (
                          <span className="text-sm font-medium text-primary">
                            {service.price} {service.currency || ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectable && (
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-1 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
