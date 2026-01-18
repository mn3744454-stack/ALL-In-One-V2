import { useMemo, useState } from "react";
import { HorseCard } from "./HorseCard";
import { HorseFilters, HorseFiltersState } from "./HorseFilters";
import { HorseExport } from "./HorseExport";
import { HorseWizard } from "./HorseWizard";
import { Button } from "@/components/ui/button";
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
}

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

  const filteredHorses = useMemo(() => {
    return horses.filter((horse) => {
      // Search filter
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

      // Gender filter
      if (filters.gender && filters.gender !== "all") {
        if (horse.gender !== filters.gender) return false;
      }

      // Status filter
      if (filters.status && filters.status !== "all") {
        if (horse.status !== filters.status) return false;
      }

      // Breed filter
      if (filters.breed_id && filters.breed_id !== "all") {
        if (horse.breed_id !== filters.breed_id) return false;
      }

      // Color filter
      if (filters.color_id && filters.color_id !== "all") {
        if (horse.color_id !== filters.color_id) return false;
      }

      return true;
    });
  }, [horses, filters]);

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
          <ViewSwitcher
            viewMode={viewMode}
            gridColumns={gridColumns}
            onViewModeChange={setViewMode}
            onGridColumnsChange={setGridColumns}
            showTable={false}
          />
          <HorseExport horses={filteredHorses} />
          <Button onClick={() => setWizardOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('horses.addHorse')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <HorseFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
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
      ) : (
        <div className={getGridClass(gridColumns, viewMode)}>
          {filteredHorses.map((horse) => (
            <HorseCard
              key={horse.id}
              horse={horse}
              onClick={() => onHorseClick?.(horse)}
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
