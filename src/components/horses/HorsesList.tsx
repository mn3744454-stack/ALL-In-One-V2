import { useMemo, useState } from "react";
import { HorseCard } from "./HorseCard";
import { HorsesTable } from "./HorsesTable";
import { HorseFilters, HorseFiltersState } from "./HorseFilters";
import { HorseExport } from "./HorseExport";
import { HorseWizard } from "./HorseWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { ViewSwitcher, getGridClass, type ViewMode, type GridColumns } from "@/components/ui/ViewSwitcher";
import { useViewPreference } from "@/hooks/useViewPreference";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  status?: string | null;
  age_category?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  breed?: string | null;
  color?: string | null;
  breed_id?: string | null;
  color_id?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  housing_unit_id?: string | null;
  current_location_id?: string | null;
}

type OperationalTab = 'all' | 'inside' | 'intake_draft' | 'incomplete' | 'outside';

interface HorsesListProps {
  horses: Horse[];
  loading: boolean;
  onHorseClick?: (horse: Horse) => void;
  onRefresh?: () => void;
}

export const HorsesList = ({ horses, loading, onHorseClick, onRefresh }: HorsesListProps) => {
  const { t } = useI18n();
  const { viewMode, gridColumns, setViewMode, setGridColumns } = useViewPreference('horses');
  const [filters, setFilters] = useState<HorseFiltersState>({
    search: "",
    gender: "",
    status: "",
    breed_id: "",
    color_id: "",
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [operationalTab, setOperationalTab] = useState<OperationalTab>('all');

  // Operational buckets
  const horseBuckets = useMemo(() => {
    const inside = horses.filter(h => h.status === 'active' && h.current_location_id);
    const intakeDraft = horses.filter(h => h.status === 'intake_draft');
    const incomplete = horses.filter(h => 
      h.status === 'active' && (!h.birth_date || !h.microchip_number || !h.passport_number)
    );
    const outside = horses.filter(h => h.status === 'active' && !h.current_location_id);
    return { all: horses, inside, intakeDraft, incomplete, outside };
  }, [horses]);

  // Get base list from operational tab
  const baseHorses = useMemo(() => {
    switch (operationalTab) {
      case 'inside': return horseBuckets.inside;
      case 'intake_draft': return horseBuckets.intakeDraft;
      case 'incomplete': return horseBuckets.incomplete;
      case 'outside': return horseBuckets.outside;
      default: return horseBuckets.all;
    }
  }, [operationalTab, horseBuckets]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t('horses.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredHorses.length} {t('common.of')} {horses.length} {t('horses.horses')}
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

      {/* Operational Status Tabs */}
      <Tabs value={operationalTab} onValueChange={(v) => setOperationalTab(v as OperationalTab)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="gap-1.5">
            {t('horses.tabs.all')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.all.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inside" className="gap-1.5">
            {t('horses.tabs.inside')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.inside.length}</Badge>
          </TabsTrigger>
          {horseBuckets.intakeDraft.length > 0 && (
            <TabsTrigger value="intake_draft" className="gap-1.5">
              {t('horses.tabs.intakeDraft')}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 min-w-4 text-amber-600 border-amber-300">{horseBuckets.intakeDraft.length}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="incomplete" className="gap-1.5">
            {t('horses.tabs.incomplete')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.incomplete.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="outside" className="gap-1.5">
            {t('horses.tabs.outside')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">{horseBuckets.outside.length}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <HorseFilters filters={filters} onChange={setFilters} />

      {/* Content */}
      {filteredHorses.length === 0 ? (
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
        <HorsesTable horses={filteredHorses} onHorseClick={onHorseClick} />
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filteredHorses.map((horse) => (
            <HorseCard
              key={horse.id}
              horse={horse}
              onClick={() => onHorseClick?.(horse)}
              compact={viewMode === 'list'}
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
    </div>
  );
};
