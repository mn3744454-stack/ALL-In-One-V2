import { useMemo, useState } from "react";
import { HorseCard } from "./HorseCard";
import { HorsesTable } from "./HorsesTable";
import { HorseFilters, HorseFiltersState } from "./HorseFilters";
import { HorseExport } from "./HorseExport";
import { HorseWizard } from "./HorseWizard";
import { IncompleteProfileModal } from "./IncompleteProfileModal";
import { HostedHorseCard } from "./HostedHorseCard";
import { HostedHorsesTable } from "./HostedHorsesTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { BilingualName } from "@/components/ui/BilingualName";
import { Heart, Plus, AlertTriangle, Home, Building2, DoorOpen, LogOut } from "lucide-react";
import { useI18n } from "@/i18n";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";
import { useHorseLifecycleStates } from "@/hooks/movement/useHorseLifecycleStates";
import { useOwnerHostedHorses } from "@/hooks/owner/useOwnerHostedHorses";
import {
  useStableHostedHorses,
  useStableHistoricalHostedHorses,
  type StableHostedHorseRow,
} from "@/hooks/housing/useStableHostedHorses";

import { isHorseIncomplete, type CompletenessHorse } from "@/lib/horseCompleteness";

interface Horse extends CompletenessHorse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  age_category?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  housing_unit_id?: string | null;
  current_location_id?: string | null;
}

/**
 * Owner-mode tabs: existing behavior (all/inside/outside + hosted).
 * Stable-mode tabs (Phase 1.e.f.7.g.4.3.1):
 *   - current    : open admissions in this stable (custody truth)
 *   - local      : horses with horses.tenant_id = this stable (registry truth)
 *   - historical : checked-out admissions in this stable (audit/history)
 */
type OperationalTab = 'all' | 'inside' | 'outside' | 'hosted' | 'current' | 'local' | 'historical';

interface HorsesListProps {
  horses: Horse[];
  loading: boolean;
  onHorseClick?: (horse: Horse) => void;
  onRefresh?: () => void;
  /** When true, surface the owner-only Hosted tab backed by get_owner_hosted_horses. */
  ownerMode?: boolean;
  /** When true, surface the stable-side Current / Local / Historical tabs. */
  stableMode?: boolean;
}

export const HorsesList = ({
  horses,
  loading,
  onHorseClick,
  onRefresh,
  ownerMode = false,
  stableMode = false,
}: HorsesListProps) => {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('horses');
  const { data: hostedRows = [], isLoading: hostedLoading } = useOwnerHostedHorses();
  const { data: stableCurrentRows = [], isLoading: stableCurrentLoading } = useStableHostedHorses();
  const { data: stableHistoricalRows = [], isLoading: stableHistoricalLoading } =
    useStableHistoricalHostedHorses();
  const [filters, setFilters] = useState<HorseFiltersState>({
    search: "",
    gender: "",
    status: "",
    breed_id: "",
    color_id: "",
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [operationalTab, setOperationalTab] = useState<OperationalTab>(
    stableMode ? 'current' : 'all'
  );
  // Phase 1.e.f.7.g.4.3.2.1 — Local sub-filter (stable mode only)
  const [localSubFilter, setLocalSubFilter] = useState<'all' | 'noLocation'>('all');
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false);

  // Operational buckets (registry-derived; used by owner-mode and stable Local tab)
  const horseBuckets = useMemo(() => {
    const inside = horses.filter(h => h.status === 'active' && h.current_location_id);
    const incomplete = horses.filter(h => h.status === 'active' && isHorseIncomplete(h));
    const outside = horses.filter(h => h.status === 'active' && !h.current_location_id);
    return { all: horses, inside, incomplete, outside };
  }, [horses]);

  // Batch lifecycle for ALL local horses (stable mode) so the No Location
  // sub-filter count is accurate before search/filter is applied. Owner mode
  // continues to use the smaller filteredHorses footprint below.
  const lifecycleInputIds = useMemo(
    () => (stableMode ? horses.map(h => h.id) : []),
    [stableMode, horses]
  );
  const { statesByHorseId: stableStatesByHorseId } = useHorseLifecycleStates(lifecycleInputIds);

  // Phase 1.e.f.7.g.4.3.2.1 — No Location subset within Local.
  // Start from legacy `outside` (active + no current_location_id), then refine
  // using lifecycle data to exclude horses that are currently hosted in this
  // tenant, hosted elsewhere (where visible), departed, transferred away,
  // or historical-only. RLS may hide open admissions in unconnected tenants
  // — residual over-count documented in the phase report.
  const noLocationLocalHorses = useMemo(() => {
    if (!stableMode) return [] as Horse[];
    return horses.filter(h => {
      if (h.status !== 'active') return false;
      if (h.current_location_id) return false;
      if (h.housing_unit_id) return false;
      const ls = stableStatesByHorseId.get(h.id);
      if (!ls) return true; // no lifecycle row => never moved/admitted
      if (ls.is_departed) return false;
      if (ls.is_housed) return false;
      const openStatus = ls.open_admission_status;
      if (openStatus === 'active' || openStatus === 'checkout_pending') return false;
      const lastSub = ls.latest_completed_movement_subtype;
      if (lastSub === 'checkout_departure') return false;
      return true;
    });
  }, [stableMode, horses, stableStatesByHorseId]);

  // Operational buckets (registry-derived; used by owner-mode and stable Local tab)
  const horseBuckets = useMemo(() => {
    const inside = horses.filter(h => h.status === 'active' && h.current_location_id);
    const incomplete = horses.filter(h => h.status === 'active' && isHorseIncomplete(h));
    const outside = horses.filter(h => h.status === 'active' && !h.current_location_id);
    return { all: horses, inside, incomplete, outside };
  }, [horses]);

  // Get base list from operational tab
  const baseHorses = useMemo(() => {
    switch (operationalTab) {
      case 'inside': return horseBuckets.inside;
      case 'outside': return horseBuckets.outside;
      // stable-mode "local" tab: registry truth, optionally narrowed by sub-filter
      case 'local':
        return stableMode && localSubFilter === 'noLocation'
          ? noLocationLocalHorses
          : horseBuckets.all;
      default: return horseBuckets.all;
    }
  }, [operationalTab, horseBuckets, stableMode, localSubFilter, noLocationLocalHorses]);

  const filteredHorses = useMemo(() => {
    return baseHorses.filter((horse) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          horse.name.toLowerCase().includes(searchLower) ||
          horse.name_ar?.toLowerCase().includes(searchLower) ||
          horse.breed?.toLowerCase().includes(searchLower) ||
          horse.microchip_number?.toLowerCase().includes(searchLower) ||
          horse.passport_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.gender && filters.gender !== "all") {
        if (horse.gender !== filters.gender) return false;
      }
      if (filters.status && filters.status !== "all") {
        if (horse.status !== filters.status) return false;
      }
      if (filters.breed_id && filters.breed_id !== "all") {
        if (horse.breed_id !== filters.breed_id) return false;
      }
      if (filters.color_id && filters.color_id !== "all") {
        if (horse.color_id !== filters.color_id) return false;
      }
      return true;
    });
  }, [baseHorses, filters]);

  // Stable Current/Historical search filter (admission-derived rows, no registry fields)
  const filteredStableCurrent = useMemo(
    () => applyStableRowSearch(stableCurrentRows, filters.search),
    [stableCurrentRows, filters.search]
  );
  const filteredStableHistorical = useMemo(
    () => applyStableRowSearch(stableHistoricalRows, filters.search),
    [stableHistoricalRows, filters.search]
  );

  // Per-card lifecycle map used by row rendering. In stable mode this is the
  // already-loaded full map; in owner/default mode keep the small per-filter
  // fetch to avoid unnecessary breadth.
  const ownerFilteredIds = useMemo(
    () => (stableMode ? [] : filteredHorses.map(h => h.id)),
    [stableMode, filteredHorses]
  );
  const { statesByHorseId: ownerStatesByHorseId } = useHorseLifecycleStates(ownerFilteredIds);
  const statesByHorseId = stableMode ? stableStatesByHorseId : ownerStatesByHorseId;

  const handleWizardSuccess = () => {
    setWizardOpen(false);
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleStableRowClick = (row: StableHostedHorseRow) =>
    onHorseClick?.({
      id: row.horse_id,
      name: row.name ?? '',
      name_ar: row.name_ar ?? undefined,
      gender: '',
    } as Horse);

  // Counts shown in the visible tablist
  const totalHeaderCount =
    operationalTab === 'current'
      ? filteredStableCurrent.length
      : operationalTab === 'historical'
      ? filteredStableHistorical.length
      : filteredHorses.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t('horses.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalHeaderCount} {t('common.of')} {horses.length} {t('horses.horses')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ViewSwitcher
              viewMode={viewMode}
              gridColumns={gridColumns}
              onViewModeChange={setViewMode}
              onGridColumnsChange={setGridColumns}
              showTable={true}
            />
          </div>
          <HorseExport horses={filteredHorses} />
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('horses.addHorse')}</span>
          </Button>
        </div>
      </div>

      {/* Primary Category Tabs + Incomplete Badge */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={operationalTab} onValueChange={(v) => setOperationalTab(v as OperationalTab)}>
          <TabsList className="h-auto gap-1 flex-wrap">
            {stableMode ? (
              <>
                <TabsTrigger value="current" className="gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  {t('horses.tabs.current')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                    {stableCurrentRows.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="local" className="gap-1.5">
                  {t('horses.tabs.local')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                    {horseBuckets.all.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="historical" className="gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  {t('horses.tabs.historical')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                    {stableHistoricalRows.length}
                  </Badge>
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="all" className="gap-1.5">
                  {t('horses.tabs.all')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.all.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inside" className="gap-1.5">
                  {t('horses.tabs.inside')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.inside.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="outside" className="gap-1.5">
                  {t('horses.tabs.outside')}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.outside.length}</Badge>
                </TabsTrigger>
                {ownerMode && (
                  <TabsTrigger value="hosted" className="gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    {t('horses.tabs.hosted')}
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{hostedRows.length}</Badge>
                  </TabsTrigger>
                )}
              </>
            )}
          </TabsList>
        </Tabs>

        {/* Incomplete Profile Badge — registry-derived, only meaningful for owner-mode or stable Local tab */}
        {horseBuckets.incomplete.length > 0 && (!stableMode || operationalTab === 'local') && (
          <button
            onClick={() => setIncompleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('horses.tabs.incomplete')}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-w-4 border-amber-300 text-amber-700 dark:text-amber-400">
              {horseBuckets.incomplete.length}
            </Badge>
          </button>
        )}
      </div>

      {/* Filters */}
      <HorseFilters filters={filters} onChange={setFilters} />

      {/* Content */}
      {operationalTab === 'hosted' && ownerMode ? (
        hostedLoading ? (
          <LoadingSpinner />
        ) : hostedRows.length === 0 ? (
          <EmptyState
            icon={<Home className="w-8 h-8 text-muted-foreground/50" />}
            title={t('horseOwner.hosted.empty.title')}
            body={t('horseOwner.hosted.empty.body')}
          />
        ) : (
          (() => {
            const handleHostedClick = (row: typeof hostedRows[number]) =>
              onHorseClick?.({ id: row.horse_id, name: row.horse_name, name_ar: row.horse_name_ar ?? undefined, gender: '' } as Horse);

            if (viewMode === 'table') {
              return <HostedHorsesTable rows={hostedRows} onRowClick={handleHostedClick} />;
            }
            if (viewMode === 'list') {
              return (
                <div className="flex flex-col gap-2">
                  {hostedRows.map((row) => (
                    <HostedHorseCard
                      key={row.contract_id}
                      row={row}
                      compact
                      onClick={() => handleHostedClick(row)}
                    />
                  ))}
                </div>
              );
            }
            return (
              <div className={getGridClass(gridColumns, viewMode)}>
                {hostedRows.map((row) => (
                  <HostedHorseCard
                    key={row.contract_id}
                    row={row}
                    onClick={() => handleHostedClick(row)}
                  />
                ))}
              </div>
            );
          })()
        )
      ) : operationalTab === 'current' && stableMode ? (
        stableCurrentLoading ? (
          <LoadingSpinner />
        ) : filteredStableCurrent.length === 0 ? (
          <EmptyState
            icon={<Home className="w-8 h-8 text-muted-foreground/50" />}
            title={t('horses.tabs.current')}
            body={t('horses.noHorses')}
          />
        ) : (
          <StableHostedRender
            rows={filteredStableCurrent}
            viewMode={viewMode}
            gridColumns={gridColumns}
            onClick={handleStableRowClick}
            historical={false}
            t={t}
          />
        )
      ) : operationalTab === 'historical' && stableMode ? (
        stableHistoricalLoading ? (
          <LoadingSpinner />
        ) : filteredStableHistorical.length === 0 ? (
          <EmptyState
            icon={<LogOut className="w-8 h-8 text-muted-foreground/50" />}
            title={t('horses.tabs.historical')}
            body={t('horses.noHorses')}
          />
        ) : (
          <StableHostedRender
            rows={filteredStableHistorical}
            viewMode={viewMode}
            gridColumns={gridColumns}
            onClick={handleStableRowClick}
            historical={true}
            t={t}
          />
        )
      ) : filteredHorses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-muted-foreground/50" />
          </div>
          {horses.length === 0 ? (
            <>
              <h3 className="font-semibold text-foreground mb-2">{t('horses.noHorses')}</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                {t('horses.addFirstHorse')}
              </p>
              <Button onClick={() => setWizardOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                {t('horses.addHorse')}
              </Button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-foreground mb-2">{t('common.noResults')}</h3>
              <p className="text-muted-foreground">
                {t('common.tryAdjustingFilters')}
              </p>
            </>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <HorsesTable horses={filteredHorses} onHorseClick={onHorseClick} lifecycleStates={statesByHorseId} />
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filteredHorses.map((horse) => (
            <HorseCard
              key={horse.id}
              horse={horse}
              onClick={() => onHorseClick?.(horse)}
              compact={viewMode === 'list'}
              dense={viewMode === 'grid' && gridColumns >= 4}
              lifecycleState={statesByHorseId.get(horse.id) ?? null}
            />
          ))}
        </div>
      )}

      {/* Wizard */}
      <HorseWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={handleWizardSuccess}
      />

      {/* Incomplete Profile Modal */}
      <IncompleteProfileModal
        open={incompleteModalOpen}
        onOpenChange={setIncompleteModalOpen}
        horses={horseBuckets.incomplete}
        onHorseClick={onHorseClick}
      />
    </div>
  );
};

/* --------------------------- helpers --------------------------- */

function applyStableRowSearch(rows: StableHostedHorseRow[], search: string) {
  if (!search) return rows;
  const s = search.toLowerCase();
  return rows.filter(
    (r) =>
      r.name?.toLowerCase().includes(s) ||
      r.name_ar?.toLowerCase().includes(s) ||
      r.branch_name?.toLowerCase().includes(s) ||
      r.branch_name_ar?.toLowerCase().includes(s) ||
      r.unit_code?.toLowerCase().includes(s)
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{body}</p>
    </div>
  );
}

function StableHostedRender({
  rows,
  viewMode,
  gridColumns,
  onClick,
  historical,
  t,
}: {
  rows: StableHostedHorseRow[];
  viewMode: ViewMode;
  gridColumns: GridColumns;
  onClick: (row: StableHostedHorseRow) => void;
  historical: boolean;
  t: (key: string) => string;
}) {
  if (viewMode === 'table') {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80">
              <TableHead className="text-start">{t('horses.table.name')}</TableHead>
              <TableHead className="text-start">{t('housing.admissions.table.branch')}</TableHead>
              <TableHead className="text-center">{t('housing.admissions.table.unit')}</TableHead>
              <TableHead className="text-center">{t('housing.admissions.table.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.admission_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onClick(row)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={row.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(row.name || row.name_ar || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <BilingualName name={row.name} nameAr={row.name_ar} primaryClassName="text-sm" />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.branch_name || row.branch_name_ar ? (
                    <BilingualName
                      name={row.branch_name}
                      nameAr={row.branch_name_ar}
                      primaryClassName="text-sm font-normal"
                    />
                  ) : '—'}
                </TableCell>
                <TableCell className="text-center text-muted-foreground text-sm">
                  {row.unit_code ?? '—'}
                </TableCell>
                <TableCell className="text-center">
                  {historical ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('housing.admissions.status.checkedOut')}
                    </Badge>
                  ) : row.status === 'checkout_pending' ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                      {t('housing.admissions.status.checkoutPending')}
                    </Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                      {t('housing.admissions.status.active')}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  return (
    <div className={getGridClass(gridColumns, viewMode)}>
      {rows.map((row) => (
        <Card
          key={row.admission_id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onClick(row)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                <AvatarImage src={row.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {(row.name || row.name_ar || '?').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <BilingualName
                    name={row.name}
                    nameAr={row.name_ar}
                    primaryClassName="font-semibold"
                  />
                  {historical ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {t('housing.admissions.status.checkedOut')}
                    </Badge>
                  ) : row.status === 'checkout_pending' ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                      {t('housing.admissions.status.checkoutPending')}
                    </Badge>
                  ) : (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                      {t('housing.admissions.status.active')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {(row.branch_name || row.branch_name_ar) && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <BilingualName
                        name={row.branch_name}
                        nameAr={row.branch_name_ar}
                        primaryClassName="text-xs"
                        inline
                      />
                    </span>
                  )}
                  {row.unit_code && (
                    <span className="flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" />
                      {row.unit_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
