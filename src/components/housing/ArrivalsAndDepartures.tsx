import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { MovementsList } from "@/components/movement/MovementsList";
import { IncomingArrivals } from "@/components/movement/IncomingArrivals";
import { useHorseMovements } from "@/hooks/movement/useHorseMovements";
import { useIncomingMovements } from "@/hooks/movement/useIncomingMovements";
import { useLocations } from "@/hooks/movement/useLocations";
import { BilingualName } from "@/components/ui/BilingualName";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Building2,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

type SubTab = 'all' | 'arrivals' | 'departures' | 'transfers' | 'incoming' | 'pending' | 'completed';

interface ArrivalsAndDeparturesProps {
  onRecordMovement: () => void;
  /** AD-1 Pass 2-G: Housing branch scope. Null/undefined = all branches. */
  selectedBranchId?: string | null;
}

export function ArrivalsAndDepartures({ onRecordMovement, selectedBranchId }: ArrivalsAndDeparturesProps) {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>('all');
  const { activeLocations } = useLocations();

  const branchId = selectedBranchId || null;
  const selectedBranch = branchId ? activeLocations.find(l => l.id === branchId) : null;

  // Counts: server already OR-filters by from/to via locationId. Client-side
  // we then split into one-sided / inter-branch buckets for the badges.
  const { movements } = useHorseMovements(branchId ? { locationId: branchId } : {});
  const { pendingCount } = useIncomingMovements('pending');

  const counts = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();

    const inToday = (m: typeof movements[number]): boolean => {
      const scheduled = m.scheduled_at ? new Date(m.scheduled_at).getTime() : null;
      if (scheduled !== null && scheduled >= todayStart && scheduled <= todayEnd) return true;
      if (m.movement_status === 'completed') {
        const completed = m.completed_at
          ? new Date(m.completed_at).getTime()
          : (m.movement_at ? new Date(m.movement_at).getTime() : null);
        if (completed !== null && completed >= todayStart && completed <= todayEnd) return true;
      }
      return false;
    };

    const active = movements.filter(m => m.movement_status !== 'cancelled');

    // Branch-aware predicates. When no branch is scoped, predicates collapse
    // to the original tenant-wide behaviour.
    const isArrival = (m: typeof movements[number]) =>
      m.movement_type === 'in' && (!branchId || m.to_location_id === branchId);
    const isDeparture = (m: typeof movements[number]) =>
      m.movement_type === 'out' && (!branchId || m.from_location_id === branchId);
    const isInterBranchTransfer = (m: typeof movements[number]) =>
      m.movement_type === 'transfer'
      && (!branchId || m.from_location_id === branchId || m.to_location_id === branchId)
      && m.from_location_id !== m.to_location_id;

    const arrivals = active.filter(isArrival).length;
    const departures = active.filter(isDeparture).length;
    const transfers = active.filter(isInterBranchTransfer).length;
    const pendingMovements = movements.filter(m =>
      (m.movement_status === 'scheduled' || m.movement_status === 'dispatched')
    ).length;

    const arrivingToday = active.filter(m => isArrival(m) && inToday(m)).length;
    const departingToday = active.filter(m => isDeparture(m) && inToday(m)).length;
    const transfersToday = active.filter(m => isInterBranchTransfer(m) && inToday(m)).length;

    // Incoming chips are pre-arrival rows on `incoming_horse_movements`,
    // tenant-scoped and not safely branch-filterable here, so they remain
    // tenant-wide regardless of selected branch.
    const needsAction = pendingMovements + pendingCount;

    return {
      arrivals,
      departures,
      transfers,
      pendingMovements,
      arrivingToday,
      departingToday,
      transfersToday,
      needsAction,
    };
  }, [movements, pendingCount, branchId]);

  return (
    <div className="space-y-4">
      {/* Scope indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {selectedBranch ? (
          <>
            <Building2 className="h-3.5 w-3.5" />
            <BilingualName
              name={selectedBranch.name}
              nameAr={(selectedBranch as any).name_ar}
              inline
              primaryClassName="font-medium text-xs text-foreground"
              secondaryClassName="text-[11px]"
            />
          </>
        ) : (
          <>
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>{t('housing.branchScope.allBranches')}</span>
          </>
        )}
      </div>

      {/* KPI Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {counts.arrivingToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-emerald-600 border-emerald-200">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {counts.arrivingToday} {t('housing.arrivalsAndDepartures.arrivingToday')}
          </Badge>
        )}
        {counts.departingToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-red-500 border-red-200">
            <ArrowUpFromLine className="h-3.5 w-3.5" />
            {counts.departingToday} {t('housing.arrivalsAndDepartures.departingToday')}
          </Badge>
        )}
        {counts.transfersToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-blue-600 border-blue-200">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {counts.transfersToday} {t('housing.arrivalsAndDepartures.transfersToday')}
          </Badge>
        )}
        {counts.needsAction > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-amber-600 border-amber-200">
            <AlertCircle className="h-3.5 w-3.5" />
            {counts.needsAction} {t('housing.arrivalsAndDepartures.needsAction')}
          </Badge>
        )}
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('common.all')}
          </TabsTrigger>
          <TabsTrigger value="arrivals" className="gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.arrivals')}
            {counts.arrivals > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.arrivals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="departures" className="gap-1.5">
            <ArrowUpFromLine className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.departures')}
            {counts.departures > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.departures}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.transfers')}
            {counts.transfers > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.transfers}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.incoming')}
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-w-4 text-amber-600 border-amber-300">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.pending')}
            {counts.pendingMovements > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{counts.pendingMovements}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('housing.arrivalsAndDepartures.completed')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {subTab === 'incoming' ? (
        <IncomingArrivals />
      ) : (
        <MovementsList
          onRecordMovement={onRecordMovement}
          branchId={branchId}
          branchScopeSide={
            subTab === 'arrivals' ? 'to'
            : subTab === 'departures' ? 'from'
            : subTab === 'transfers' ? 'inter-branch'
            : 'any'
          }
          typeFilter={
            subTab === 'arrivals' ? 'in'
            : subTab === 'departures' ? 'out'
            : subTab === 'transfers' ? 'transfer'
            : undefined
          }
          statusFilter={
            subTab === 'pending' ? ['scheduled', 'dispatched']
            : subTab === 'completed' ? 'completed'
            : undefined
          }
        />
      )}
    </div>
  );
}
