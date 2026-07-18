/**
 * 2QA-C — Shared tenant-scoped Service Category selector.
 *
 * Backs any service catalog surface that must write `category_id` on a
 * service row (lab_services, tenant_services, lab_test_types, ...). Reads
 * only from `tenant_service_categories` for the active tenant; never
 * accepts arbitrary free-text category values. Includes a permission-gated
 * "Add New Category" bridge into ServiceCategoryManagerDialog so authorized
 * users are not blocked when a category is missing.
 *
 * Contract:
 *  - value: the linked tenant_service_categories.id (or null when unmapped)
 *  - onChange: emits a category id, or null when explicitly cleared
 *  - Archived categories are only shown when they match `value` (with an
 *    "Archived" badge); they are not offered as fresh choices.
 *  - Technical `key` is intentionally hidden from ordinary users.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, Plus, Search, Settings2, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  displayCategoryName,
  useServiceCategories,
  type ServiceCategory,
} from "@/hooks/finance/useServiceCategories";
import { usePermissions } from "@/hooks/usePermissions";
import { ServiceCategoryManagerDialog } from "./ServiceCategoryManagerDialog";

interface Props {
  value: string | null | undefined;
  onChange: (categoryId: string | null) => void;
  /** Show inline error style when true (e.g., required-not-selected). */
  invalid?: boolean;
  /** Optional visual size for the trigger. */
  className?: string;
  /** Optional external "required" hint for empty label. */
  required?: boolean;
  /** Disable trigger. */
  disabled?: boolean;
}

export function ServiceCategorySelect({
  value,
  onChange,
  invalid,
  className,
  required,
  disabled,
}: Props) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";
  const { isOwner, hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("services.manage");

  // Include archived so a currently-linked archived category still renders.
  const { categories, isLoading } = useServiceCategories(true);

  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const linked = useMemo(
    () => categories.find((c) => c.id === value) || null,
    [categories, value],
  );

  const activeChoices = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeChoices;
    return activeChoices.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.name_ar || "").toLowerCase().includes(q)
      );
    });
  }, [activeChoices, search]);

  const triggerLabel = (() => {
    if (linked) {
      const primary = displayCategoryName(linked, lang as "ar" | "en");
      return (
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{primary}</span>
          {!linked.is_active && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
              {isRTL ? "مؤرشف" : "Archived"}
            </Badge>
          )}
        </span>
      );
    }
    return (
      <span className="text-muted-foreground truncate">
        {isRTL ? "اختر التصنيف" : "Select Category"}
      </span>
    );
  })();

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm",
          "hover:bg-accent/40 transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-destructive" : "border-input",
          className,
        )}
      >
        {triggerLabel}
        <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex flex-col gap-0 p-0 overflow-hidden",
            "w-screen h-[100dvh] max-w-full rounded-none",
            "sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[80vh] sm:rounded-lg",
          )}
        >
          <DialogHeader className="p-4 pb-3 border-b shrink-0">
            <DialogTitle className="text-base pe-8">
              {isRTL ? "اختر التصنيف" : "Select Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 border-b flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRTL ? "ابحث..." : "Search..."}
                className="ps-9 h-10"
              />
            </div>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0"
                onClick={() => setManagerOpen(true)}
                aria-label={
                  isRTL ? "إدارة تصنيفات الخدمات" : "Manage Service Categories"
                }
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {/* Unmapped / clear */}
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm min-h-[44px] text-start",
                  value == null
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent/40",
                )}
              >
                <span className="flex items-center gap-2">
                  <X className="h-4 w-4 opacity-60" />
                  {isRTL ? "بدون تصنيف" : "No category"}
                </span>
                {value == null && <Check className="h-4 w-4" />}
              </button>

              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("common.loading")}
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {isRTL ? "لا توجد تصنيفات متاحة" : "No categories available"}
                </p>
              ) : (
                filtered.map((cat) => {
                  const primary = displayCategoryName(cat, lang as "ar" | "en");
                  const secondary =
                    lang === "ar" ? cat.name : cat.name_ar || "";
                  const selected = cat.id === value;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onChange(cat.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm min-h-[44px] text-start",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent/40",
                      )}
                    >
                      <span className="flex flex-col min-w-0">
                        <span className="truncate font-medium">{primary}</span>
                        {secondary && (
                          <span
                            className="truncate text-xs text-muted-foreground"
                            dir={lang === "ar" ? "ltr" : "rtl"}
                          >
                            {secondary}
                          </span>
                        )}
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}

              {/* Archived currently-linked category (kept discoverable) */}
              {linked && !linked.is_active && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm min-h-[44px] text-start bg-primary/5 border border-dashed"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate">
                      {displayCategoryName(linked, lang as "ar" | "en")}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {isRTL ? "مؤرشف" : "Archived"}
                    </Badge>
                  </span>
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          </ScrollArea>

          {canManage && (
            <div className="p-3 border-t shrink-0 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setManagerOpen(true)}
              >
                <Plus className="h-4 w-4 me-2" />
                {isRTL ? "إضافة تصنيف جديد" : "Add New Category"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ServiceCategoryManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
      />
    </>
  );
}
