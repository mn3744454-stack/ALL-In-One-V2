import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { MovementsList } from "@/components/movement/MovementsList";
import { IncomingArrivals } from "@/components/movement/IncomingArrivals";
import { useHorseMovements } from "@/hooks/movement/useHorseMovements";
import { useIncomingMovements } from "@/hooks/movement/useIncomingMovements";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Package, Clock, CheckCircle2 } from "lucide-react";

type SubTab = 'all' | 'arrivals' | 'departures' | 'incoming' | 'pending' | 'completed';

interface ArrivalsAndDeparturesProps {
  onRecordMovement: () => void;
}

export function ArrivalsAndDepartures({ onRecordMovement }: ArrivalsAndDeparturesProps) {
  const { t } = useI18n();
  const [subTab, setSubTab] = useState<SubTab>('all');

  // Fetch data for KPI counters
  const { movements } = useHorseMovements({});
  const { pendingCount } = useIncomingMovements('pending');

  const counts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const arrivalsToday = movements.filter(m => 
      m.movement_type === 'in' && 
      new Date(m.movement_at) >= today && new Date(m.movement_at) <= todayEnd
    ).length;

    const departuresToday = movements.filter(m => 
      m.movement_type === 'out' && 
      new Date(m.movement_at) >= today && new Date(m.movement_at) <= todayEnd
    ).length;

    const pendingMovements = movements.filter(m => 
      m.movement_status === 'scheduled' || m.movement_status === 'dispatched'
    ).length;

    const arrivals = movements.filter(m => m.movement_type === 'in').length;
    const departures = movements.filter(m => m.movement_type === 'out').length;
    const completed = movements.filter(m => m.movement_status === 'completed').length;

    return { arrivalsToday, departuresToday, pendingMovements, arrivals, departures, completed };
  }, [movements]);

  return (
    <div className="space-y-4">
      {/* KPI Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {counts.arrivalsToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-emerald-600 border-emerald-200">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            {counts.arrivalsToday} {t('housing.arrivalsAndDepartures.arrivalsToday')}
          </Badge>
        )}
        {counts.departuresToday > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-red-500 border-red-200">
            <ArrowUpFromLine className="h-3.5 w-3.5" />
            {counts.departuresToday} {t('housing.arrivalsAndDepartures.departuresToday')}
          </Badge>
        )}
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-amber-600 border-amber-200">
            <Package className="h-3.5 w-3.5" />
            {pendingCount} {t('housing.arrivalsAndDepartures.incoming')}
          </Badge>
        )}
        {counts.pendingMovements > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-blue-600 border-blue-200">
            <Clock className="h-3.5 w-3.5" />
            {counts.pendingMovements} {t('housing.arrivalsAndDepartures.pending')}
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
          typeFilter={subTab === 'arrivals' ? 'in' : subTab === 'departures' ? 'out' : undefined}
          statusFilter={subTab === 'pending' ? 'scheduled' : subTab === 'completed' ? 'completed' : undefined}
        />
      )}
    </div>
  );
}
