/**
 * 2QA-B — Dedicated Category Selection Dialog.
 * Replaces the previous nested Popover/Sheet with a responsive centered Dialog
 * (mobile: full-screen). Draft-selection contract:
 *   - opening copies applied `value` → local `draft`
 *   - Cancel / X / outside click discards `draft`
 *   - Apply commits normalized sorted keys via onChange
 *   - Clear Selection empties draft (represents All Categories)
 * OR semantics across selected keys. Empty selection = All Categories.
 */
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Search, X, Tags, Settings2 } from "lucide-react";
import {
  useServiceCategories,
  displayCategoryName,
  type ServiceCategory,
} from "@/hooks/finance/useServiceCategories";
import { ServiceCategoryManagerDialog } from "@/components/finance/ServiceCategoryManagerDialog";
import { usePermissions } from "@/hooks/usePermissions";

interface CategoryMultiSelectProps {
  /** Selected category keys. Empty array = All Categories. */
  value: string[];
  onChange: (nextKeys: string[]) => void;
  /** Category keys referenced only by historical snapshots (archived). */
  historicalKeys?: string[];
  /** True when current statement data contains items with no category snapshot. */
  showHistoricallyUncategorized?: boolean;
  className?: string;
}

const UNCATEGORIZED_KEY = "__uncategorized__";

export function CategoryMultiSelect({
  value,
  onChange,
  historicalKeys = [],
  showHistoricallyUncategorized = false,
  className,
}: CategoryMultiSelectProps) {
  const { t, lang } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  // Category management stays gated to owners / services.manage (matches RLS).
  const canManageCategories = isOwner || hasPermission("services.manage");
  const { categories: activeCategories, isLoading } = useServiceCategories(false);
  const { categories: allCategories } = useServiceCategories(true);

  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(value));

  // Copy applied → draft on every open. Also clears search text.
  useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setSearch("");
    }
  }, [open, value]);

  const historicalCategories = useMemo<ServiceCategory[]>(() => {
    if (!historicalKeys.length) return [];
    const activeKeys = new Set(activeCategories.map((c) => c.key));
    return allCategories.filter(
      (c) => historicalKeys.includes(c.key) && !activeKeys.has(c.key),
    );
  }, [historicalKeys, allCategories, activeCategories]);

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCategories;
    return activeCategories.filter((c) => {
      const en = (c.name || "").toLowerCase();
      const ar = (c.name_ar || "").toLowerCase();
      // NOTE: technical key intentionally not matched — spec forbids surfacing keys.
      return en.includes(q) || ar.includes(q);
    });
  }, [activeCategories, search]);

  const filteredHistorical = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historicalCategories;
    return historicalCategories.filter((c) => {
      const en = (c.name || "").toLowerCase();
      const ar = (c.name_ar || "").toLowerCase();
      return en.includes(q) || ar.includes(q);
    });
  }, [historicalCategories, search]);

  const toggle = (key: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearAll = () => setDraft(new Set());

  const apply = () => {
    onChange(Array.from(draft).sort());
    setOpen(false);
  };

  const cancel = () => setOpen(false);

  const selectedNames = useMemo(() => {
    if (!value.length) return [];
    return value.map((k) => {
      if (k === UNCATEGORIZED_KEY)
        return t("clients.statement.scope.historicallyUncategorized");
      const cat = allCategories.find((c) => c.key === k);
      return cat ? displayCategoryName(cat, lang as "ar" | "en") : "";
    });
  }, [value, allCategories, lang, t]);

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return t("clients.statement.scope.allCategories");
    if (value.length === 1) return selectedNames[0] || t("clients.statement.scope.oneCategorySelected");
    return t("clients.statement.scope.nCategoriesSelected").replace(
      "{count}",
      String(value.length),
    );
  }, [value.length, selectedNames, t]);

  const dirtyCount = useMemo(() => {
    const applied = new Set(value);
    if (applied.size !== draft.size) return draft.size + applied.size;
    for (const k of draft) if (!applied.has(k)) return 1;
    return 0;
  }, [draft, value]);

  return (
    <>
      <Button
        variant="outline"
        className={cn("w-full justify-between h-10", className)}
        onClick={() => setOpen(true)}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Tags className="w-4 h-4 shrink-0 opacity-70" />
          <span className="truncate text-sm">{triggerLabel}</span>
          {value.length > 0 && (
            <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
              {value.length}
            </Badge>
          )}
        </span>
        <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex flex-col gap-0 p-0 overflow-hidden",
            // Mobile: full-screen. Desktop: comfortable modal.
            "w-screen h-[100dvh] max-w-full rounded-none",
            "sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-lg",
          )}
        >
          <DialogHeader className="p-4 pb-3 border-b shrink-0">
            <DialogTitle className="text-base pe-8">
              {t("clients.statement.scope.selectCategoriesTitle")}
            </DialogTitle>
          </DialogHeader>

          {/* Search + Manage shortcut */}
          <div className="p-3 border-b flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("clients.statement.scope.searchCategories")}
                className="ps-9 h-10"
                aria-label={t("clients.statement.scope.searchCategories")}
                autoFocus={false}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label={t("common.clear")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {canManageCategories && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setManagerOpen(true)}
                aria-label={t("clients.statement.manageCategories")}
                title={t("clients.statement.manageCategories")}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Options — single scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {/* All */}
            <button
              type="button"
              onClick={() => setDraft(new Set())}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors min-h-[44px]",
                draft.size === 0 && "bg-primary/5 text-primary font-medium",
              )}
              aria-pressed={draft.size === 0}
            >
              <span className="flex-1 text-start">
                {t("clients.statement.scope.allCategories")}
              </span>
            </button>

            {showHistoricallyUncategorized && (
              <label
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px]",
                  draft.has(UNCATEGORIZED_KEY) && "bg-primary/5",
                )}
              >
                <Checkbox
                  checked={draft.has(UNCATEGORIZED_KEY)}
                  onCheckedChange={() => toggle(UNCATEGORIZED_KEY)}
                />
                <span className="flex-1">
                  {t("clients.statement.scope.historicallyUncategorized")}
                </span>
              </label>
            )}

            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("common.loading")}
              </p>
            ) : filteredActive.length === 0 && filteredHistorical.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("clients.statement.scope.noMatchingCategories")}
              </p>
            ) : (
              filteredActive.map((cat) => {
                const checked = draft.has(cat.key);
                return (
                  <label
                    key={cat.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px]",
                      checked && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(cat.key)}
                      aria-label={displayCategoryName(cat, lang as "ar" | "en")}
                    />
                    <span className="flex-1">
                      {displayCategoryName(cat, lang as "ar" | "en")}
                    </span>
                  </label>
                );
              })
            )}

            {filteredHistorical.length > 0 && (
              <>
                <Separator className="my-2" />
                <p className="px-3 py-1 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
                  {t("clients.statement.scope.historicalCategories")}
                </p>
                {filteredHistorical.map((cat) => {
                  const checked = draft.has(cat.key);
                  return (
                    <label
                      key={cat.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px] opacity-80",
                        checked && "bg-primary/5 opacity-100",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(cat.key)}
                      />
                      <span className="flex-1">
                        {displayCategoryName(cat, lang as "ar" | "en")}
                      </span>
                    </label>
                  );
                })}
              </>
            )}
          </div>

          {/* Sticky footer */}
          <div className="border-t bg-background p-3 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                {t("clients.statement.scope.nSelected").replace(
                  "{count}",
                  String(draft.size),
                )}
              </span>
              {dirtyCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {t("clients.statement.scope.unappliedChanges")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={draft.size === 0}
                className="flex-1 min-h-[40px]"
              >
                {t("clients.statement.scope.clearSelections")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
                className="flex-1 min-h-[40px]"
              >
                {t("clients.statement.scope.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={apply}
                className="flex-1 min-h-[40px]"
              >
                {t("clients.statement.scope.apply")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ServiceCategoryManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
      />
    </>
  );
}
