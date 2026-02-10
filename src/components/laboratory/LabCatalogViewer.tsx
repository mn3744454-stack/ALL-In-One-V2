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
  onSelectServices?: (serviceIds: string[]) => void;
  selectable?: boolean;
  selectedIds?: string[];
}

export function LabCatalogViewer({ labTenantId, labName, onSelectServices, selectable, selectedIds = [] }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: services, isLoading, isError } = useLabCatalogViewer(labTenantId, search, categoryFilter);

  const categories = useMemo(() => {
    const cats = new Set((services ?? []).map(s => s.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [services]);

  const handleToggleService = (serviceId: string) => {
    if (!onSelectServices) return;
    const newSelected = selectedIds.includes(serviceId)
      ? selectedIds.filter(id => id !== serviceId)
      : [...selectedIds, serviceId];
    onSelectServices(newSelected);
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
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Badge
              variant={categoryFilter === null ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setCategoryFilter(null)}
            >
              {t("common.all")}
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                className="cursor-pointer shrink-0"
                onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="space-y-3">
        {servicesList.map(service => {
          const isSelected = selectedIds.includes(service.id);
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
                      {service.category && (
                        <Badge variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {service.category}
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
