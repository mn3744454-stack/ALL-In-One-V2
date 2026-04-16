import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Check } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { BilingualName } from "@/components/ui/BilingualName";

interface Horse {
  id: string;
  name: string;
  name_ar?: string | null;
  gender: string;
  avatar_url?: string | null;
  passport_number?: string | null;
  microchip_number?: string | null;
}

interface MultiHorseSelectorProps {
  selectedHorseIds: string[];
  onSelectionChange: (horses: Array<{ id: string; name: string }>) => void;
  disabled?: boolean;
  /** When true, hides long IDs (passport, microchip) in the list */
  hideIds?: boolean;
  /** Horse list provided by parent — single source of truth */
  horses?: Horse[];
  /** Whether horses are loading */
  loading?: boolean;
}

/**
 * Visual-only check indicator — no Radix Checkbox to avoid ref-based state loops.
 */
function CheckIndicator({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors",
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-primary"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </div>
  );
}

export function MultiHorseSelector({
  selectedHorseIds,
  onSelectionChange,
  disabled = false,
  hideIds = false,
  horses = [],
  loading = false,
}: MultiHorseSelectorProps) {
  const { t, dir } = useI18n();
  const [search, setSearch] = useState("");

  const filteredHorses = useMemo(() => {
    if (!search.trim()) return horses;
    const lowerSearch = search.toLowerCase();
    return horses.filter(h =>
      h.name.toLowerCase().includes(lowerSearch) ||
      h.name_ar?.toLowerCase().includes(lowerSearch) ||
      h.microchip_number?.toLowerCase().includes(lowerSearch) ||
      h.passport_number?.toLowerCase().includes(lowerSearch)
    );
  }, [horses, search]);

  const handleToggleHorse = (horse: { id: string; name: string }) => {
    const isSelected = selectedHorseIds.includes(horse.id);

    if (isSelected) {
      const updated = selectedHorseIds.filter(id => id !== horse.id);
      const updatedHorses = horses
        .filter(h => updated.includes(h.id))
        .map(h => ({ id: h.id, name: h.name }));
      onSelectionChange(updatedHorses);
    } else {
      const updatedHorses = [
        ...horses
          .filter(h => selectedHorseIds.includes(h.id))
          .map(h => ({ id: h.id, name: h.name })),
        horse
      ];
      onSelectionChange(updatedHorses);
    }
  };

  const handleSelectAll = () => {
    if (selectedHorseIds.length === filteredHorses.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredHorses.map(h => ({ id: h.id, name: h.name })));
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
          dir === 'rtl' ? 'right-3' : 'left-3'
        )} />
        <Input
          placeholder={t("laboratory.horseSelection.searchHorses")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(dir === 'rtl' ? 'pr-9' : 'pl-9')}
          disabled={disabled}
        />
      </div>

      {/* Select All */}
      {filteredHorses.length > 0 && (
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && handleSelectAll()}
        >
          <CheckIndicator checked={selectedHorseIds.length === filteredHorses.length && filteredHorses.length > 0} />
          <span className="text-sm font-medium">
            {t("laboratory.horseSelection.selectAll")} ({filteredHorses.length})
          </span>
        </div>
      )}

      {/* Horses List */}
      <div className="max-h-[40vh] sm:max-h-[280px] w-full min-w-0 overflow-y-auto rounded-md border">
        <div className="p-2 space-y-1 w-full">
          {filteredHorses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? t("laboratory.horseSelection.noMatchingHorses") : t("laboratory.horseSelection.noHorses")}
            </div>
          ) : (
            filteredHorses.map((horse) => {
              const isSelected = selectedHorseIds.includes(horse.id);
              return (
                <div
                  key={horse.id}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-primary/10 border border-primary/20",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && handleToggleHorse({ id: horse.id, name: horse.name })}
                >
                  <CheckIndicator checked={isSelected} />
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={horse.avatar_url || undefined} alt={horse.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {horse.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <BilingualName
                      name={horse.name}
                      nameAr={horse.name_ar}
                      primaryClassName="text-sm"
                      secondaryClassName="text-[11px]"
                    />
                    {!hideIds && (horse.passport_number || horse.microchip_number) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {horse.passport_number || horse.microchip_number}
                      </div>
                    )}
                  </div>
                  {horse.gender && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {t(`horses.gender.${horse.gender}`)}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Summary */}
      {selectedHorseIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-md">
          {selectedHorseIds.slice(0, 5).map(id => {
            const horse = horses.find(h => h.id === id);
            if (!horse) return null;
            return (
              <Badge key={id} variant="secondary" className="text-xs">
                {horse.name}
              </Badge>
            );
          })}
          {selectedHorseIds.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{selectedHorseIds.length - 5}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
