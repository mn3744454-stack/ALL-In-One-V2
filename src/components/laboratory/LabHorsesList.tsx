import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Archive, ArchiveRestore, Edit, Eye, MoreHorizontal, FlaskConical, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useI18n } from "@/i18n";
import { useLabHorses, type LabHorse, type CreateLabHorseData } from "@/hooks/laboratory/useLabHorses";
import { useLabHorsesWithMetrics, type LabHorseWithMetrics } from "@/hooks/laboratory/useLabHorsesWithMetrics";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LabHorseFormData {
  name: string;
  name_ar?: string;
  microchip_number?: string;
  passport_number?: string;
  ueln?: string;
  owner_name?: string;
  owner_phone?: string;
  notes?: string;
}

export function LabHorsesList() {
  const { t, lang, dir } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeRole } = useTenant();
  const canManage = activeRole === "owner" || activeRole === "manager";

  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [hasSamples, setHasSamples] = useState(false);
  const [hasOutstanding, setHasOutstanding] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<LabHorse | null>(null);
  const [formData, setFormData] = useState<LabHorseFormData>({ name: "" });

  // View preference
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('lab-horses');

  // Use aggregated hook for metrics
  const { data: labHorses = [], isLoading: loading } = useLabHorsesWithMetrics({
    search,
    includeArchived,
    hasSamples: hasSamples || undefined,
    hasOutstanding: hasOutstanding || undefined,
  });

  // Use regular hook for mutations
  const { createLabHorse, updateLabHorse, archiveLabHorse, isCreating, isUpdating } = useLabHorses({});

  const handleViewProfile = (horseId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("horseId", horseId);
    setSearchParams(params);
  };

  const handleOpenCreate = () => {
    setFormData({ name: "" });
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (horse: LabHorseWithMetrics) => {
    setFormData({
      name: horse.name,
      name_ar: horse.name_ar || undefined,
      microchip_number: horse.microchip_number || undefined,
      passport_number: horse.passport_number || undefined,
      ueln: horse.ueln || undefined,
      owner_name: horse.owner_name || undefined,
      owner_phone: horse.owner_phone || undefined,
      notes: horse.notes || undefined,
    });
    setEditingHorse(horse as LabHorse);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingHorse) {
      await updateLabHorse(editingHorse.id, formData);
      setEditingHorse(null);
    } else {
      await createLabHorse(formData as CreateLabHorseData);
      setCreateDialogOpen(false);
    }
    setFormData({ name: "" });
  };

  const handleArchive = async (horse: LabHorseWithMetrics) => {
    if (horse.is_archived) {
      await updateLabHorse(horse.id, { is_archived: false });
    } else {
      await archiveLabHorse(horse.id);
    }
  };

  const getHorseDisplayName = (horse: LabHorseWithMetrics) => {
    if (lang === 'ar' && horse.name_ar) {
      return horse.name_ar;
    }
    return horse.name;
  };

  // Use EN digits for all amounts
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Check if we have a horseId param for profile view
  const selectedHorseId = searchParams.get("horseId");
  if (selectedHorseId) {
    return null; // Profile rendered in parent
  }

  const renderTable = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">{t("common.name")}</TableHead>
            <TableHead className="text-center">{t("laboratory.walkIn.microchip")}</TableHead>
            <TableHead className="text-center">{t("laboratory.walkIn.passportNumber")}</TableHead>
            <TableHead className="text-center">{t("laboratory.labHorses.ownerName")}</TableHead>
            <TableHead className="text-center">{t("laboratory.labHorses.ownerPhone")}</TableHead>
            <TableHead className="text-center">{t("laboratory.labHorses.samplesCount")}</TableHead>
            <TableHead className="text-center">{t("laboratory.labHorses.outstanding")}</TableHead>
            <TableHead className="text-center w-[80px]">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {labHorses.map((horse) => (
            <TableRow
              key={horse.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                horse.is_archived && "opacity-60"
              )}
              onClick={() => handleViewProfile(horse.id)}
            >
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-medium">{getHorseDisplayName(horse)}</span>
                  {horse.is_archived && (
                    <Badge variant="secondary" className="text-xs">
                      {t("laboratory.labHorses.archived")}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center font-mono text-sm text-muted-foreground">
                {horse.microchip_number || "-"}
              </TableCell>
              <TableCell className="text-center font-mono text-sm text-muted-foreground">
                {horse.passport_number || "-"}
              </TableCell>
              <TableCell className="text-center">{horse.owner_name || "-"}</TableCell>
              <TableCell className="text-center font-mono text-sm">
                {horse.owner_phone || "-"}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="font-mono">
                  {horse.samples_count}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  "font-mono text-sm",
                  horse.outstanding > 0 && "text-destructive font-medium"
                )}>
                  {horse.outstanding > 0 ? formatAmount(horse.outstanding) : "-"}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewProfile(horse.id); }}>
                      <Eye className="h-4 w-4 me-2" />
                      {t("laboratory.labHorses.viewProfile")}
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEdit(horse); }}>
                          <Edit className="h-4 w-4 me-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(horse); }}>
                          {horse.is_archived ? (
                            <>
                              <ArchiveRestore className="h-4 w-4 me-2" />
                              {t("laboratory.labHorses.restoreHorse")}
                            </>
                          ) : (
                            <>
                              <Archive className="h-4 w-4 me-2" />
                              {t("laboratory.labHorses.archiveHorse")}
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderCard = (horse: LabHorseWithMetrics) => (
    <Card
      key={horse.id}
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        horse.is_archived && "opacity-60"
      )}
      onClick={() => handleViewProfile(horse.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{getHorseDisplayName(horse)}</span>
              {horse.is_archived && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("laboratory.labHorses.archived")}
                </Badge>
              )}
            </div>
            {(horse.microchip_number || horse.passport_number) && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {horse.microchip_number || horse.passport_number}
              </p>
            )}
            {horse.owner_name && (
              <p className="text-sm text-muted-foreground mt-1">
                {horse.owner_name} {horse.owner_phone && `• ${horse.owner_phone}`}
              </p>
            )}
            
            {/* Metrics row */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex items-center gap-1 text-sm">
                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono">{horse.samples_count}</span>
              </div>
              {horse.outstanding > 0 && (
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums" dir="ltr">{formatAmount(horse.outstanding)}</span>
                </div>
              )}
              {horse.last_sample_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(horse.last_sample_date), "dd/MM/yy")}</span>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewProfile(horse.id); }}>
                <Eye className="h-4 w-4 me-2" />
                {t("laboratory.labHorses.viewProfile")}
              </DropdownMenuItem>
              {canManage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEdit(horse); }}>
                    <Edit className="h-4 w-4 me-2" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(horse); }}>
                    {horse.is_archived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 me-2" />
                        {t("laboratory.labHorses.restoreHorse")}
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 me-2" />
                        {t("laboratory.labHorses.archiveHorse")}
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("laboratory.labHorses.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ViewSwitcher - desktop/tablet */}
            <div className="hidden md:block">
              <ViewSwitcher
                viewMode={viewMode}
                gridColumns={gridColumns}
                onViewModeChange={setViewMode}
                onGridColumnsChange={setGridColumns}
                showTable={true}
              />
            </div>
            {canManage && (
              <Button onClick={handleOpenCreate} className="shrink-0">
                <Plus className="h-4 w-4 me-2" />
                {t("laboratory.labHorses.addNew")}
              </Button>
            )}
          </div>
        </div>
        
        {/* Filter toggles */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="include-archived"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <Label htmlFor="include-archived" className="text-sm text-muted-foreground whitespace-nowrap">
              {t("laboratory.labHorses.showArchived")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="has-samples"
              checked={hasSamples}
              onCheckedChange={setHasSamples}
            />
            <Label htmlFor="has-samples" className="text-sm text-muted-foreground whitespace-nowrap">
              {t("laboratory.labHorses.hasSamples")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="has-outstanding"
              checked={hasOutstanding}
              onCheckedChange={setHasOutstanding}
            />
            <Label htmlFor="has-outstanding" className="text-sm text-muted-foreground whitespace-nowrap">
              {t("laboratory.labHorses.hasOutstanding")}
            </Label>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && labHorses.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {search ? t("laboratory.labHorses.noMatchingHorses") : t("laboratory.labHorses.noHorses")}
            </p>
            {canManage && !search && (
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 me-2" />
                {t("laboratory.labHorses.addNew")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content based on view mode */}
      {!loading && labHorses.length > 0 && (
        <>
          {/* Desktop/Tablet view based on viewMode */}
          <div className="hidden md:block">
            {viewMode === 'table' && renderTable()}
            {(viewMode === 'grid' || viewMode === 'list') && (
              <div className={getGridClass(gridColumns, viewMode)}>
                {labHorses.map((horse) => renderCard(horse))}
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {labHorses.map((horse) => renderCard(horse))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={createDialogOpen || !!editingHorse} 
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingHorse(null);
            setFormData({ name: "" });
          }
        }}
      >
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {editingHorse ? t("laboratory.labHorses.editHorse") : t("laboratory.labHorses.addNew")}
            </DialogTitle>
            <DialogDescription>
              {editingHorse 
                ? t("laboratory.labHorses.editHorseDesc")
                : t("laboratory.labHorses.addNewDesc")
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("laboratory.walkIn.horseNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_ar">{t("common.name")} ({t("language.ar") || "Arabic"})</Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar || ""}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder={t("laboratory.walkIn.horseNamePlaceholder")}
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="microchip">{t("laboratory.walkIn.microchip")}</Label>
                <Input
                  id="microchip"
                  value={formData.microchip_number || ""}
                  onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
                  placeholder={t("laboratory.walkIn.microchipPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport">{t("laboratory.walkIn.passportNumber")}</Label>
                <Input
                  id="passport"
                  value={formData.passport_number || ""}
                  onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                  placeholder={t("laboratory.walkIn.passportPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ueln">UELN</Label>
              <Input
                id="ueln"
                value={formData.ueln || ""}
                onChange={(e) => setFormData({ ...formData, ueln: e.target.value })}
                placeholder="e.g. 123456789012345"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="owner_name">{t("laboratory.labHorses.ownerName")}</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name || ""}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder={t("laboratory.labHorses.ownerNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_phone">{t("laboratory.labHorses.ownerPhone")}</Label>
                <Input
                  id="owner_phone"
                  value={formData.owner_phone || ""}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  placeholder={t("laboratory.labHorses.ownerPhonePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Input
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("common.notes")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingHorse(null);
                setFormData({ name: "" });
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isCreating || isUpdating}
            >
              {editingHorse ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
