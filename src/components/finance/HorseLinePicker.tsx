import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronsUpDown, Plus, Search, Check, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { cn } from "@/lib/utils";

export interface HorseLinePickerOption {
  id: string;
  name: string;
  name_ar?: string | null;
}

interface HorseLinePickerProps {
  horses: HorseLinePickerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Label 1 — tenant-aware Quick Add. Owner controls creation flow. */
  onQuickAdd?: () => void;
  canQuickAdd?: boolean;
  quickAddDisabledReason?: string;
}

/**
 * Picker dialog for selecting a horse on an invoice line item.
 * - Bilingual search (matches name + name_ar)
 * - "No horse (client-level)" option always present
 * - "+ Add new horse" bridge — actual creation flow is owner-controlled
 *   (Label 1 wires it to the correct registry: lab_horses for Lab issuers,
 *   platform horses for Stable issuers).
 */
export function HorseLinePicker({
  horses,
  selectedId,
  onSelect,
  onQuickAdd,
  canQuickAdd = true,
  quickAddDisabledReason,
}: HorseLinePickerProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selected = useMemo(
    () => horses.find((h) => h.id === selectedId) || null,
    [horses, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return horses;
    return horses.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.name_ar?.toLowerCase().includes(q)
    );
  }, [horses, search]);

  const triggerLabel = selected
    ? null
    : selectedId === null && false
    ? t("finance.invoices.noHorseClientLevel")
    : t("finance.invoices.selectHorse");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        onClick={() => setOpen(true)}
        className="w-full h-8 justify-between font-normal text-xs"
      >
        <span className="truncate text-start flex-1 min-w-0">
          {selected ? (
            <span className="flex items-center gap-1">
              <span aria-hidden>🐴</span>
              <BilingualName
                name={selected.name}
                nameAr={selected.name_ar}
                inline
                primaryClassName="text-xs"
                secondaryClassName="text-[10px] text-muted-foreground"
              />
            </span>
          ) : (
            <span className="text-muted-foreground">{triggerLabel}</span>
          )}
        </span>
        <ChevronsUpDown className="ms-1 h-3 w-3 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle>{t("finance.invoices.selectHorse")}</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-3 border-b shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("finance.invoices.searchHorse")}
                className="ps-9"
                autoFocus
              />
            </div>
            {onQuickAdd && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canQuickAdd}
                title={!canQuickAdd ? quickAddDisabledReason : undefined}
                onClick={() => {
                  if (!canQuickAdd) return;
                  setOpen(false);
                  onQuickAdd();
                }}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("finance.invoices.addNewHorse")}
              </Button>
            )}
          </div>


          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {/* No horse / client-level option — always available */}
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2 text-start hover:bg-muted/50 transition-colors mb-1",
                  selectedId === null && "bg-muted"
                )}
              >
                <X className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-muted-foreground">
                  {t("finance.invoices.noHorseClientLevel")}
                </span>
                {selectedId === null && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>

              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("finance.invoices.noHorsesFound")}
                </p>
              ) : (
                filtered.map((h) => {
                  const isSelected = h.id === selectedId;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        onSelect(h.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-start hover:bg-muted/50 transition-colors",
                        isSelected && "bg-muted"
                      )}
                    >
                      <span aria-hidden className="shrink-0">🐴</span>
                      <div className="flex-1 min-w-0">
                        <BilingualName
                          name={h.name}
                          nameAr={h.name_ar}
                          primaryClassName="text-sm font-medium"
                          secondaryClassName="text-xs text-muted-foreground"
                        />
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <QuickCreateHorseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(horse) => {
          // Refresh horses list, then auto-select.
          queryClient.invalidateQueries({ queryKey: ["horses", activeTenant?.tenant.id] });
          onSelect(horse.id);
          setAddOpen(false);
          setOpen(false);
        }}
        minimal
      />
    </>
  );
}
