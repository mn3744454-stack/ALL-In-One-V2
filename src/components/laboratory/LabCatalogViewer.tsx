import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Tag, FlaskConical, ShieldAlert } from "lucide-react";
import { useLabCatalogViewer } from "@/hooks/laboratory/useLabServices";
import { useI18n } from "@/i18n";

interface Props {
  labTenantId: string | null;
  labName?: string;
  onSelectServices?: (serviceIds: string[], serviceNames?: string[]) => void;
  selectable?: boolean;
  selectedIds?: string[];
}

/**
 * 2QA-C Cross-Tenant Closure — this cross-tenant catalog surface renders
 * live category identity from the shared tenant_service_categories join
 * returned by `get_lab_services_for_viewer`. Legacy free-text category
 * (`lab_services.category`) is intentionally NOT read here, so a legacy
 * value such as "ميم" can never appear as a live category label.
 */
export function LabCatalogViewer({ labTenantId, labName, onSelectServices, selectable, selectedIds = [] }: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: services, isLoading, isError } = useLabCatalogViewer(labTenantId, search, categoryId);

  // Distinct shared categories present in the current result set.
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; name_ar: string | null }>();
    for (const s of services ?? []) {
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

  const hasUnmapped = useMemo(
    () => (services ?? []).some((s) => !s.category_id),
    [services],
  );

  const handleToggleService = (serviceId: string) => {
    if (!onSelectServices) return;
    const newSelected = selectedIds.includes(serviceId)
      ? selectedIds.filter(id => id !== serviceId)
      : [...selectedIds, serviceId];
    const newNames = (services ?? [])
      .filter(s => newSelected.includes(s.id))
      .map(s => s.name);
    onSelectServices(newSelected, newNames);
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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
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

  const servicesList = services ?? [];

  if (servicesList.length === 0) {
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

  const UNMAPPED_FILTER = "__unmapped__";

  return (
    <div className="space-y-4">
      {labName && (
        <h3 className="text-base font-semibold">{t("laboratory.catalog.servicesFrom")} {labName}</h3>
      )}

      {/* Search + Category */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("laboratory.catalog.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {(categories.length > 0 || hasUnmapped) && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Badge
              variant={categoryId === null ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setCategoryId(null)}
            >
              {t("common.all")}
            </Badge>
            {categories.map(cat => {
              const label = (isAr ? cat.name_ar || cat.name : cat.name || cat.name_ar || "").trim();
              return (
                <Badge
                  key={cat.id}
                  variant={categoryId === cat.id ? "default" : "outline"}
                  className="cursor-pointer shrink-0"
                  onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                >
                  {label || t("finance.categories.unavailable")}
                </Badge>
              );
            })}
            {hasUnmapped && (
              <Badge
                variant="outline"
                className="cursor-pointer shrink-0 border-dashed text-muted-foreground"
                title={t("finance.categories.unmappedFull")}
              >
                {t("finance.categories.unmapped")}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="space-y-3">
        {servicesList.map(service => {
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
              onClick={selectable ? () => handleToggleService(service.id) : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{service.name}</h3>
                      {service.code && (
                        <Badge variant="outline" className="font-mono text-xs shrink-0">{service.code}</Badge>
                      )}
                    </div>
                    {service.name_ar && (
                      <p className="text-sm text-muted-foreground truncate" dir="rtl">{service.name_ar}</p>
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
                          <Tag className="w-3 h-3 mr-1" />
                          {primary || t("finance.categories.unavailable")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs border-dashed text-muted-foreground"
                          title={t("finance.categories.unmappedFull")}
                        >
                          <Tag className="w-3 h-3 mr-1" />
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
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                      {isSelected && <span className="text-xs">✓</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
