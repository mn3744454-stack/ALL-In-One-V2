import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { Search, X } from "lucide-react";

export type ScopeMode = "all" | "horses" | "services";

export interface ScopeHorse {
  id: string;
  name: string;
  name_ar: string | null;
}

export interface StatementScopeConfig {
  dateFrom: string;
  dateTo: string;
  mode: ScopeMode;
  selectedHorseIds: string[];
}

interface StatementScopeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  horses: ScopeHorse[];
  initialConfig: StatementScopeConfig;
  onGenerate: (config: StatementScopeConfig) => void;
}

export function StatementScopeSelector({
  open,
  onOpenChange,
  clientName,
  horses,
  initialConfig,
  onGenerate,
}: StatementScopeSelectorProps) {
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";

  const [dateFrom, setDateFrom] = useState(initialConfig.dateFrom);
  const [dateTo, setDateTo] = useState(initialConfig.dateTo);
  const [mode, setMode] = useState<ScopeMode>(initialConfig.mode);
  const [selectedHorseIds, setSelectedHorseIds] = useState<Set<string>>(
    new Set(initialConfig.selectedHorseIds)
  );
  const [horseSearch, setHorseSearch] = useState("");

  const filteredHorses = useMemo(() => {
    if (!horseSearch.trim()) return horses;
    const q = horseSearch.toLowerCase();
    return horses.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.name_ar && h.name_ar.includes(q))
    );
  }, [horses, horseSearch]);

  const getHorseName = (h: ScopeHorse) =>
    isRTL ? h.name_ar || h.name : h.name || h.name_ar || "";

  const toggleHorse = (id: string) => {
    setSelectedHorseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllHorses = () => {
    setSelectedHorseIds(new Set(horses.map((h) => h.id)));
  };

  const clearHorses = () => {
    setSelectedHorseIds(new Set());
  };

  const canGenerate = mode === "all" || selectedHorseIds.size > 0;

  const handleGenerate = () => {
    onGenerate({
      dateFrom,
      dateTo,
      mode,
      selectedHorseIds: Array.from(selectedHorseIds),
    });
    onOpenChange(false);
  };

  const scopePills: { value: ScopeMode; label: string }[] = [
    { value: "all", label: t("clients.statement.scope.all") },
    { value: "horses", label: t("clients.statement.scope.selectHorses") },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-2">
          <SheetTitle>{t("clients.statement.scope.title")}</SheetTitle>
          <SheetDescription>{clientName}</SheetDescription>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Date range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground min-w-[32px]">
                {t("clients.statement.scope.dateFrom")}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground min-w-[32px]">
                {t("clients.statement.scope.dateTo")}
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Scope pills */}
          <div className="flex gap-2">
            {scopePills.map((pill) => (
              <Button
                key={pill.value}
                variant={mode === pill.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(pill.value)}
                className="flex-1"
              >
                {pill.label}
              </Button>
            ))}
          </div>

          {/* Horse selection */}
          {mode === "horses" && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={horseSearch}
                  onChange={(e) => setHorseSearch(e.target.value)}
                  placeholder={t("clients.statement.scope.searchHorses")}
                  className="ps-9"
                />
              </div>

              {/* Select all / Clear */}
              <div className="flex items-center justify-between text-sm">
                <Button variant="ghost" size="sm" onClick={selectAllHorses}>
                  {t("clients.statement.scope.selectAll")}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearHorses}>
                  {t("clients.statement.scope.clear")}
                </Button>
              </div>

              {/* Horse list */}
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {filteredHorses.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    {t("common.noResults")}
                  </p>
                ) : (
                  filteredHorses.map((horse) => (
                    <label
                      key={horse.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedHorseIds.has(horse.id) && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={selectedHorseIds.has(horse.id)}
                        onCheckedChange={() => toggleHorse(horse.id)}
                      />
                      <span className="text-sm font-medium">
                        {getHorseName(horse)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-background p-4 space-y-3">
          {/* Summary */}
          {mode === "horses" && selectedHorseIds.size > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {t("clients.statement.scope.horsesSelected").replace(
                "{count}",
                String(selectedHorseIds.size)
              )}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("clients.statement.scope.cancel")}
            </Button>
            <Button
              className="flex-1"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {t("clients.statement.scope.generate")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
