/**
 * 2QA-B — Dedicated Horse Selection Dialog.
 * Trigger + centered modal (mobile: full-screen). Draft-selection contract
 * mirrors CategoryMultiSelect:
 *   - opening copies applied `value` → local `draft`
 *   - Cancel / X / outside click discards `draft`
 *   - Apply commits normalized sorted IDs via `onChange`
 *   - Clear Selection empties draft (represents All Horses)
 *
 * The horse list is provided by the caller (StatementScopeSelector), which
 * pre-scopes it to the active tenant + customer using the same source it
 * already used before 2QA-B. This dialog is intentionally source-agnostic
 * so Laboratory (lab_horses) vs Stable (horses) sources remain preserved
 * by the caller.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, Search, X, Rabbit } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export interface HorseSelectOption {
  id: string;
  name: string;
  name_ar: string | null;
  /** Optional supported identifiers used for search. */
  registration_number?: string | null;
  microchip_number?: string | null;
  passport_number?: string | null;
  ueln?: string | null;
}

interface HorseSelectDialogProps {
  value: string[];
  onChange: (nextIds: string[]) => void;
  horses: HorseSelectOption[];
  className?: string;
  /** Optional custom trigger label when no selection. */
  emptyLabel?: string;
}

export function HorseSelectDialog({
  value,
  onChange,
  horses,
  className,
  emptyLabel,
}: HorseSelectDialogProps) {
  const { t, lang, dir } = useI18n();
  const isRTL = dir === "rtl";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(value));

  useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setSearch("");
    }
  }, [open, value]);

  const nameOf = (h: HorseSelectOption) =>
    (isRTL ? h.name_ar || h.name : h.name || h.name_ar) || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return horses;
    return horses.filter((h) => {
      const en = (h.name || "").toLowerCase();
      const ar = (h.name_ar || "").toLowerCase();
      const reg = (h.registration_number || "").toLowerCase();
      const chip = (h.microchip_number || "").toLowerCase();
      const passport = (h.passport_number || "").toLowerCase();
      const ueln = (h.ueln || "").toLowerCase();
      return (
        en.includes(q) ||
        ar.includes(q) ||
        reg.includes(q) ||
        chip.includes(q) ||
        passport.includes(q) ||
        ueln.includes(q)
      );
    });
  }, [horses, search]);

  const toggle = (id: string) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clear = () => setDraft(new Set());
  const cancel = () => setOpen(false);
  const apply = () => {
    onChange(Array.from(draft).sort());
    setOpen(false);
  };

  const triggerLabel = useMemo(() => {
    if (value.length === 0)
      return emptyLabel || t("clients.statement.scope.allHorses");
    if (value.length === 1) {
      const h = horses.find((x) => x.id === value[0]);
      return h ? nameOf(h) : t("clients.statement.scope.oneHorseSelected");
    }
    return t("clients.statement.scope.nHorsesSelected").replace(
      "{count}",
      String(value.length),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, horses, t, lang]);

  const dirtyCount = useMemo(() => {
    const applied = new Set(value);
    if (applied.size !== draft.size) return 1;
    for (const k of draft) if (!applied.has(k)) return 1;
    return 0;
  }, [draft, value]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("w-full justify-between h-10", className)}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Rabbit className="w-4 h-4 shrink-0 opacity-70" />
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
            "w-screen h-[100dvh] max-w-full rounded-none",
            "sm:w-full sm:max-w-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-lg",
          )}
        >
          <DialogHeader className="p-4 pb-3 border-b shrink-0">
            <DialogTitle className="text-base pe-8">
              {t("clients.statement.scope.selectHorsesTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="p-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("clients.statement.scope.searchHorsesByIdentifier")}
                className="ps-9 h-10"
                aria-label={t("clients.statement.scope.searchHorsesByIdentifier")}
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
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
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
                {t("clients.statement.scope.allHorses")}
              </span>
            </button>

            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("clients.statement.scope.noMatchingHorses")}
              </p>
            ) : (
              filtered.map((h) => {
                const checked = draft.has(h.id);
                const sub = [
                  h.registration_number,
                  h.microchip_number,
                  h.passport_number,
                  h.ueln,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <label
                    key={h.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted cursor-pointer min-h-[44px]",
                      checked && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(h.id)}
                      aria-label={nameOf(h)}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{nameOf(h)}</span>
                      {sub && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {sub}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>

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
                onClick={clear}
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
    </>
  );
}
