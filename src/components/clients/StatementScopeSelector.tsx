import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SharedDateField } from "@/components/ui/shared-date-field";
import { useI18n } from "@/i18n";
import { CategoryMultiSelect } from "./CategoryMultiSelect";
import { HorseSelectDialog, type HorseSelectOption } from "./HorseSelectDialog";

export type ScopeMode = "all" | "horses" | "services";
/** Legacy domain filter — kept for backward compatibility during Slice 2A.
 *  New callers should use `categoryKeys` (dynamic, tenant-scoped). */
export type DomainFilter = "all" | "boarding" | "vet" | "breeding" | "lab" | "general";

export interface ScopeHorse extends HorseSelectOption {}

export interface StatementScopeConfig {
  dateFrom: string;
  dateTo: string;
  mode: ScopeMode;
  selectedHorseIds: string[];
  /** @deprecated Prefer `categoryKeys`. */
  domainFilter: DomainFilter;
  /** Dynamic, tenant-scoped category keys (OR semantics). Empty = All Categories. */
  categoryKeys: string[];
}

interface StatementScopeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  horses: ScopeHorse[];
  initialConfig: StatementScopeConfig;
  onGenerate: (config: StatementScopeConfig) => void;
  historicalCategoryKeys?: string[];
  hasUncategorizedItems?: boolean;
  firstActivityDate?: string | null;
}

export function StatementScopeSelector({
  open,
  onOpenChange,
  clientName,
  horses,
  initialConfig,
  onGenerate,
  historicalCategoryKeys = [],
  hasUncategorizedItems = false,
  firstActivityDate = null,
}: StatementScopeSelectorProps) {
  const { t, dir } = useI18n();
  const isRTL = dir === "rtl";

  const [dateFrom, setDateFrom] = useState(initialConfig.dateFrom);
  const [dateTo, setDateTo] = useState(initialConfig.dateTo);
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>(
    initialConfig.selectedHorseIds || [],
  );
  const [domainFilter] = useState<DomainFilter>(initialConfig.domainFilter || "all");
  const [categoryKeys, setCategoryKeys] = useState<string[]>(initialConfig.categoryKeys || []);

  const handleGenerate = () => {
    onGenerate({
      dateFrom,
      dateTo,
      // Mode is derived from horse selection: empty = All Horses ("all").
      mode: selectedHorseIds.length > 0 ? "horses" : "all",
      selectedHorseIds: [...selectedHorseIds].sort(),
      domainFilter,
      categoryKeys: [...categoryKeys].sort(),
    });
    onOpenChange(false);
  };

  // Filter horses again defensively to guarantee only customer/tenant-valid
  // horses (already pre-scoped by ClientStatementTab) reach the dialog.
  const scopedHorses: HorseSelectOption[] = horses;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="p-4 pb-2">
          <SheetTitle>{t("clients.statement.scope.title")}</SheetTitle>
          <SheetDescription>{clientName}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t("clients.statement.scope.dateFrom")}
              </label>
              <SharedDateField
                value={dateFrom}
                onChange={setDateFrom}
                max={dateTo || undefined}
                showToday
                showClear
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t("clients.statement.scope.dateTo")}
              </label>
              <SharedDateField
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom || undefined}
                showToday
                showClear
              />
              {dateFrom && dateTo && dateTo < dateFrom && (
                <p className="text-xs text-destructive">{t("common.dateRange.endBeforeStart")}</p>
              )}
            </div>
          </div>

          {firstActivityDate && (
            <div className="flex items-center justify-between rounded-md border border-dashed p-2.5">
              <div className="text-xs text-muted-foreground">
                <div className="font-medium text-foreground">
                  {t("clients.statement.scope.firstFinancialActivity")}
                </div>
                <div>{firstActivityDate}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFrom(firstActivityDate)}
                className="text-xs h-7"
              >
                {t("clients.statement.scope.fromFirstActivity")}
              </Button>
            </div>
          )}
          {!firstActivityDate && (
            <p className="text-xs text-muted-foreground italic">
              {t("clients.statement.scope.noFinancialActivity")}
            </p>
          )}

          {/* Categories — 2QA-B dedicated dialog */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("clients.statement.scope.categoriesLabel")}
            </label>
            <CategoryMultiSelect
              value={categoryKeys}
              onChange={setCategoryKeys}
              historicalKeys={historicalCategoryKeys}
              showHistoricallyUncategorized={hasUncategorizedItems}
            />
          </div>

          {/* Horse scope — 2QA-B dedicated dialog */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("clients.statement.scope.horseScope")}
            </label>
            <HorseSelectDialog
              value={selectedHorseIds}
              onChange={setSelectedHorseIds}
              horses={scopedHorses}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-background p-4 space-y-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("clients.statement.scope.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleGenerate}>
              {t("clients.statement.scope.generate")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
