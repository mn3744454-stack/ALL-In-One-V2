import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Clock, Tag, FlaskConical, Trash2 } from "lucide-react";
import { useLabServices, type LabService, type CreateLabServiceInput } from "@/hooks/laboratory/useLabServices";
import { LabServiceFormDialog } from "./LabServiceFormDialog";
import { useI18n } from "@/i18n";

export function LabServicesCatalog() {
  const { t } = useI18n();
  const { services, isLoading, createService, updateService, toggleActive, isCreating, isUpdating } = useLabServices();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<LabService | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [services]);

  const filtered = useMemo(() => {
    let result = services;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.name_ar?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter(s => s.category === categoryFilter);
    }
    return result;
  }, [services, search, categoryFilter]);

  const handleSubmit = async (data: CreateLabServiceInput & { id?: string }) => {
    if (data.id) {
      await updateService(data as CreateLabServiceInput & { id: string });
    } else {
      await createService(data);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {t("laboratory.catalog.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("laboratory.catalog.subtitle")}</p>
          </div>
          <Button variant="gold" onClick={() => { setEditingService(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            {t("laboratory.catalog.addService")}
          </Button>
        </div>

        {/* Search + Category Filter */}
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

        {/* Services List */}
        {filtered.length === 0 ? (
          <Card variant="elevated" className="border-dashed">
            <CardContent className="py-12 text-center">
              <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t("laboratory.catalog.noServices")}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                {t("laboratory.catalog.noServicesDesc")}
              </p>
              <Button variant="gold" onClick={() => { setEditingService(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t("laboratory.catalog.addService")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(service => (
              <Card
                key={service.id}
                variant="elevated"
                className={`transition-all cursor-pointer hover:shadow-md ${!service.is_active ? "opacity-60" : ""}`}
                onClick={() => { setEditingService(service); setDialogOpen(true); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{service.name}</h3>
                        {service.code && (
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {service.code}
                          </Badge>
                        )}
                        {!service.is_active && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {t("laboratory.catalog.inactive")}
                          </Badge>
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
                    <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {service.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeactivateTarget(service)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={checked => toggleActive({ id: service.id, is_active: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <LabServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editingService}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("laboratory.catalog.deactivateTitle") || "Deactivate this service?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("laboratory.catalog.deactivateDesc") || "This service will no longer be selectable in new requests. You can reactivate it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deactivateTarget) {
                  toggleActive({ id: deactivateTarget.id, is_active: false });
                  setDeactivateTarget(null);
                }
              }}
            >
              {t("laboratory.catalog.deactivate") || "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
