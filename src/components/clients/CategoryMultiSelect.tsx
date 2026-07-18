/**
 * Slice 2A — Shared responsive category multi-select.
 * Mobile: Sheet with search + checkboxes + sticky Apply/Clear footer.
 * Desktop: Popover with the same interaction model.
 *
 * OR semantics across selected keys. Empty selection = All Categories.
 * Never renders a horizontally-overflowing pill row on mobile.
 */
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
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
  /** Optional list of category keys that appear only in historical statement
   *  data (archived categories still referenced by snapshot). Shown in a
   *  dedicated Historical group when provided. */
  historicalKeys?: string[];
  /** Whether to expose the "Historically Uncategorized" pseudo-key. Only pass
   *  true when the current Statement data actually contains that bucket. */
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
  const { t, lang, dir } = useI18n();
  const { hasPermission, isOwner } = usePermissions();
  // Slice 2 Correction 4 — Category management is gated to owners and
  // holders of `services.manage`, matching the Slice 1 RLS contract on
  // tenant_service_categories. The entry point is hidden otherwise.
  const canManageCategories = isOwner || hasPermission("services.manage");
  const { categories: activeCategories, isLoading } = useServiceCategories(false);
  const { categories: allCategories } = useServiceCategories(true);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(value));

  useEffect(() => {
    if (open) setDraft(new Set(value));
  }, [open, value]);

  // Categories referenced only through historical snapshots (archived but still
  // present in visible statement data).
  const historicalCategories = useMemo<ServiceCategory[]>(() => {
    if (!historicalKeys.length) return [];
    const activeKeys = new Set(activeCategories.map((c) => c.key));
    return allCategories.filter(
      (c) => historicalKeys.includes(c.key) && !activeKeys.has(c.key)
    );
  }, [historicalKeys, allCategories, activeCategories]);

  const filteredActive = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCategories;
    return activeCategories.filter((c) => {
      const en = (c.name || "").toLowerCase();
      const ar = (c.name_ar || "").toLowerCase();
      const key = c.key.toLowerCase();
      return en.includes(q) || ar.includes(q) || key.includes(q);
    });
  }, [activeCategories, search]);

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

  const selectedNames = useMemo(() => {
    if (!value.length) return [];
    const all = [...allCategories];
    return value.map((k) => {
      if (k === UNCATEGORIZED_KEY) return t("clients.statement.scope.historicallyUncategorized");
      const cat = all.find((c) => c.key === k);
      return cat ? displayCategoryName(cat, lang as "ar" | "en") : k;
    });
  }, [value, allCategories, lang, t]);

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return t("clients.statement.scope.allCategories");
    if (value.length === 1) return selectedNames[0];
    return t("clients.statement.scope.nCategoriesSelected").replace(
      "{count}",
      String(value.length)
    );
  }, [value.length, selectedNames, t]);

  const trigger = (
    <Button
      variant="outline"
      className={cn("w-full justify-between h-10", className)}
      onClick={() => setOpen(true)}
      type="button"
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
  );

  const body = (
    <div className="flex flex-col h-full">
      {/* Search + inline Manage entry point (Slice 2C — Correction B) */}
      <div className="p-3 border-b flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.statement.scope.searchCategories")}
            className="ps-9"
            aria-label={t("clients.statement.scope.searchCategories")}
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
            className="h-9 w-9 shrink-0"
            onClick={() => setManagerOpen(true)}
            aria-label={t("clients.statement.manageCategories")}
            title={t("clients.statement.manageCategories")}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>


      {/* Options */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[200px] max-h-[55vh]">
        {/* All */}
        <button
          type="button"
          onClick={() => setDraft(new Set())}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors min-h-[44px]",
            draft.size === 0 && "bg-primary/5 text-primary font-medium"
          )}
        >
          <span className="flex-1 text-start">
            {t("clients.statement.scope.allCategories")}
          </span>
        </button>

        {showHistoricallyUncategorized && (
          <label
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px]",
              draft.has(UNCATEGORIZED_KEY) && "bg-primary/5"
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
        ) : filteredActive.length === 0 && !search ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </p>
        ) : (
          filteredActive.map((cat) => {
            const checked = draft.has(cat.key);
            return (
              <label
                key={cat.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px]",
                  checked && "bg-primary/5"
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

        {historicalCategories.length > 0 && (
          <>
            <Separator className="my-2" />
            <p className="px-3 py-1 text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
              {t("clients.statement.scope.historicalCategories")}
            </p>
            {historicalCategories.map((cat) => {
              const checked = draft.has(cat.key);
              return (
                <label
                  key={cat.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px] opacity-80",
                    checked && "bg-primary/5 opacity-100"
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
      <div className="border-t bg-background p-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={draft.size === 0}
          className="flex-1"
        >
          {t("clients.statement.scope.clearSelections")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={apply}
          className="flex-1"
        >
          {t("clients.statement.scope.apply")}
          {draft.size > 0 && (
            <Badge variant="secondary" className="ms-2 h-5 px-1.5 text-xs">
              {draft.size}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side={dir === "rtl" ? "left" : "right"}
            className="w-full sm:max-w-md flex flex-col p-0"
          >
            <SheetHeader className="p-3 border-b">
              <SheetTitle className="text-base">
                {t("clients.statement.scope.categoriesLabel")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0">{body}</div>
          </SheetContent>
        </Sheet>
        <ServiceCategoryManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-[380px] p-0">
          {body}
        </PopoverContent>
      </Popover>
      <ServiceCategoryManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

