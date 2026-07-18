import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Clock, Tag, FlaskConical, Trash2, MoreVertical, Pencil, Power, Settings2 } from "lucide-react";
import { useLabServices, type LabService, type CreateLabServiceInput } from "@/hooks/laboratory/useLabServices";
import { LabServiceFormDialog } from "./LabServiceFormDialog";
import { useI18n } from "@/i18n";
import { ViewSwitcher, getGridClass } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { BilingualName } from "@/components/ui/BilingualName";
import {
  displayCategoryName,
  useServiceCategories,
} from "@/hooks/finance/useServiceCategories";
import { ServiceCategoryManagerDialog } from "@/components/finance/ServiceCategoryManagerDialog";
import { usePermissions } from "@/hooks/usePermissions";

type DialogTarget = { service: LabService; action: "deactivate" | "delete" } | null;

// 2QA-C — sentinel filter value used to surface services whose live
// category_id relation is missing (legacy/unmapped rows).
const UNMAPPED_FILTER = "__unmapped__";

export function LabServicesCatalog() {
  const { t, lang } = useI18n();
  const { services, isLoading, createService, updateService, toggleActive, deleteService, isCreating, isUpdating, isDeleting } = useLabServices();
  const { categories: allCategories } = useServiceCategories(true);
  const { isOwner, hasPermission } = usePermissions();
  const canManageCategories = isOwner || hasPermission("services.manage");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<LabService | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<DialogTarget>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference("lab_services");

  const categoryMap = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories],
  );

  // 2QA-C — filter chips reflect the shared live category identity, not the
  // legacy free-text column. Archived categories only appear when at least
  // one current service still points to them.
  const filterCategories = useMemo(() => {
    const linkedIds = new Set(
      services.map((s) => s.category_id).filter(Boolean) as string[],
    );
    const active = allCategories.filter((c) => c.is_active);
    const archivedLinked = allCategories.filter(
      (c) => !c.is_active && linkedIds.has(c.id),
    );
    return { active, archivedLinked };
  }, [allCategories, services]);

  const hasUnmapped = useMemo(
    () => services.some((s) => !s.category_id),
    [services],
  );

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
    if (categoryFilter === UNMAPPED_FILTER) {
      result = result.filter((s) => !s.category_id);
    } else if (categoryFilter) {
      result = result.filter((s) => s.category_id === categoryFilter);
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

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    const { service, action } = confirmTarget;
    if (action === "deactivate") {
      await toggleActive({ id: service.id, is_active: false });
    } else {
      await deleteService(service.id);
    }
    setConfirmTarget(null);
  };

  const openEdit = (service: LabService) => {
    setEditingService(service);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  // Shared action menu for a service
  const ServiceActions = ({ service, asButtons = false }: { service: LabService; asButtons?: boolean }) => {
    if (asButtons) {
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {service.is_active && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => setConfirmTarget({ service, action: "deactivate" })}>
              <Power className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setConfirmTarget({ service, action: "delete" })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(service)}>
            <Pencil className="h-4 w-4 me-2" />
            {t("laboratory.catalog.editService")}
          </DropdownMenuItem>
          {service.is_active && (
            <DropdownMenuItem onClick={() => setConfirmTarget({ service, action: "deactivate" })}>
              <Power className="h-4 w-4 me-2" />
              {t("laboratory.catalog.deactivate")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmTarget({ service, action: "delete" })}>
            <Trash2 className="h-4 w-4 me-2" />
            {t("laboratory.catalog.deleteConfirm")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Card used in Grid and List modes
  const ServiceCard = ({ service }: { service: LabService }) => (
    <Card
      variant="elevated"
      className={`transition-all cursor-pointer hover:shadow-md ${!service.is_active ? "opacity-60" : ""}`}
      onClick={() => openEdit(service)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{service.name}</h3>
              {service.code && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">{service.code}</Badge>
              )}
              {!service.is_active && (
                <Badge variant="secondary" className="text-xs shrink-0">{t("laboratory.catalog.inactive")}</Badge>
              )}
            </div>
            {service.name_ar && (
              <p className="text-xs text-muted-foreground truncate" dir="rtl">({service.name_ar})</p>
            )}
            {viewMode !== 'list' && service.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{service.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {service.category_id && categoryMap.has(service.category_id) && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {displayCategoryName(categoryMap.get(service.category_id)!, lang)}
                </Badge>
              )}
              {service.sample_type && <Badge variant="outline" className="text-xs">{service.sample_type}</Badge>}
              {service.turnaround_hours && (
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{service.turnaround_hours}h</span>
              )}
              {service.price != null && (
                <span className="text-sm font-medium text-primary">{service.price} {service.currency || ""}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Switch
              checked={service.is_active}
              onCheckedChange={checked => {
                if (!checked) {
                  setConfirmTarget({ service, action: "deactivate" });
                } else {
                  toggleActive({ id: service.id, is_active: true });
                }
              }}
            />
            <ServiceActions service={service} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Table view
  const ServiceTable = () => (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("laboratory.catalog.name")}</TableHead>
            <TableHead>{t("laboratory.catalog.code")}</TableHead>
            <TableHead>{t("laboratory.catalog.category")}</TableHead>
            <TableHead>{t("laboratory.catalog.price")}</TableHead>
            <TableHead className="text-center">{t("laboratory.catalog.active")}</TableHead>
            <TableHead className="w-[60px] text-center">{t("laboratory.catalog.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(service => (
            <TableRow key={service.id} className={`cursor-pointer ${!service.is_active ? "opacity-60" : ""}`} onClick={() => openEdit(service)}>
              <TableCell>
                <BilingualName name={service.name} nameAr={service.name_ar} />
              </TableCell>
              <TableCell><span className="font-mono text-xs">{service.code || "—"}</span></TableCell>
              <TableCell>{service.category_id && categoryMap.has(service.category_id) ? displayCategoryName(categoryMap.get(service.category_id)!, lang) : "—"}</TableCell>
              <TableCell>{service.price != null ? `${service.price} ${service.currency || ""}` : "—"}</TableCell>
              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={checked => {
                    if (!checked) setConfirmTarget({ service, action: "deactivate" });
                    else toggleActive({ id: service.id, is_active: true });
                  }}
                />
              </TableCell>
              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                <ServiceActions service={service} asButtons />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const confirmAction = confirmTarget?.action;

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
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <ViewSwitcher
                viewMode={viewMode}
                gridColumns={gridColumns}
                onViewModeChange={setViewMode}
                onGridColumnsChange={setGridColumns}
                showLabels={true}
              />
            </div>
            {canManageCategories && (
              <Button variant="outline" size="icon" onClick={() => setManagerOpen(true)} title={t("finance.categories.manage")}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="gold" onClick={() => { setEditingService(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("laboratory.catalog.addService")}
            </Button>
          </div>
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
          {(filterCategories.active.length > 0 || filterCategories.archivedLinked.length > 0 || hasUnmapped) && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <Badge
                variant={categoryFilter === null ? "default" : "outline"}
                className="cursor-pointer shrink-0"
                onClick={() => setCategoryFilter(null)}
              >
                {t("common.all")}
              </Badge>
              {filterCategories.active.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={categoryFilter === cat.id ? "default" : "outline"}
                  className="cursor-pointer shrink-0"
                  onClick={() => setCategoryFilter(cat.id === categoryFilter ? null : cat.id)}
                >
                  {displayCategoryName(cat, lang)}
                </Badge>
              ))}
              {filterCategories.archivedLinked.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={categoryFilter === cat.id ? "default" : "outline"}
                  className="cursor-pointer shrink-0 opacity-70"
                  onClick={() => setCategoryFilter(cat.id === categoryFilter ? null : cat.id)}
                >
                  {displayCategoryName(cat, lang)}
                </Badge>
              ))}
              {hasUnmapped && (
                <Badge
                  variant={categoryFilter === UNMAPPED_FILTER ? "default" : "outline"}
                  className="cursor-pointer shrink-0 border-dashed"
                  onClick={() => setCategoryFilter(categoryFilter === UNMAPPED_FILTER ? null : UNMAPPED_FILTER)}
                >
                  {t("finance.categories.unmapped")}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Services */}
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
        ) : viewMode === 'table' ? (
          <ServiceTable />
        ) : (
          <div className={getGridClass(gridColumns, viewMode)}>
            {filtered.map(service => (
              <ServiceCard key={service.id} service={service} />
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

      {/* Deactivate / Delete confirmation */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? t("laboratory.catalog.deleteTitle") : t("laboratory.catalog.deactivateTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete" ? t("laboratory.catalog.deleteDesc") : t("laboratory.catalog.deactivateDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {confirmAction === "delete" ? t("laboratory.catalog.deleteConfirm") : t("laboratory.catalog.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
