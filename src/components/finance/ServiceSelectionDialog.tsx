import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import type { InvoiceCatalogItem } from "@/hooks/finance/useInvoiceCatalogSources";
import { useServiceCategories } from "@/hooks/finance/useServiceCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: InvoiceCatalogItem[]; // active items already filtered upstream
  onApply: (selected: InvoiceCatalogItem[]) => void;
}

export function ServiceSelectionDialog({ open, onOpenChange, services, onApply }: Props) {
  const { t, lang } = useI18n();
  const { categories } = useServiceCategories(true);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("__all__");
  const [picked, setPicked] = useState<Record<string, InvoiceCatalogItem>>({});

  // Reset draft each time we open
  useEffect(() => {
    if (open) {
      setPicked({});
      setQ("");
      setCatFilter("__all__");
    }
  }, [open]);

  const getName = (s: InvoiceCatalogItem) =>
    lang === "ar" ? (s.nameAr || s.name) : (s.name || s.nameAr || "");
  const getCatName = (s: InvoiceCatalogItem) =>
    lang === "ar" ? (s.categoryNameAr || s.categoryName || "") : (s.categoryName || s.categoryNameAr || "");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s) => {
      if (catFilter !== "__all__" && s.categoryId !== catFilter) return false;
      if (!term) return true;
      const hay = [s.name, s.nameAr, s.description, getCatName(s)]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [services, q, catFilter, lang]);

  const selectedList = Object.values(picked);
  const totals = useMemo(() => {
    const missing: InvoiceCatalogItem[] = [];
    const byCcy: Record<string, number> = {};
    for (const s of selectedList) {
      if (s.unitPrice == null) { missing.push(s); continue; }
      const ccy = s.currency || "SAR";
      byCcy[ccy] = (byCcy[ccy] || 0) + s.unitPrice;
    }
    return { byCcy, missing };
  }, [selectedList]);

  const toggle = (s: InvoiceCatalogItem) => {
    setPicked((prev) => {
      const n = { ...prev };
      if (n[s.id]) delete n[s.id]; else n[s.id] = s;
      return n;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl xl:max-w-3xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle>{t("finance.invoices.servicesDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 border-b flex flex-col sm:flex-row gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("finance.invoices.servicesDialogSearch")}
            className="flex-1 h-9"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="sm:w-[240px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("finance.invoices.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {lang === "ar" ? (c.name_ar || c.name) : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {services.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("finance.invoices.servicesDialogEmpty")}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    {t("common.noResults")}
                  </div>
                )}
                {filtered.map((s) => {
                  const isPicked = !!picked[s.id];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s)}
                      className={cn(
                        "w-full text-start border rounded-lg p-3 flex items-start gap-3 hover:bg-muted/40 transition",
                        isPicked && "border-primary bg-primary/5"
                      )}
                    >
                      <Checkbox checked={isPicked} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{getName(s)}</div>
                        <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                          {getCatName(s) && <span>{getCatName(s)}</span>}
                          {s.isTaxable === false && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {t("finance.invoices.taxBadgeExempt")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        {s.unitPrice == null ? (
                          <Badge variant="outline" className="text-[10px]">
                            {t("finance.invoices.missingPrice")}
                          </Badge>
                        ) : (
                          <div className="font-mono text-sm tabular-nums" dir="ltr">
                            {s.unitPrice.toFixed(2)} {s.currency || ""}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-background flex-col gap-2 sm:flex-row sm:items-center pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="text-xs text-muted-foreground me-auto flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-medium">
              {t("finance.invoices.selectedCount").replace("{{count}}", String(selectedList.length))}
            </span>
            {Object.entries(totals.byCcy).map(([ccy, sum]) => (
              <span key={ccy} className="font-mono tabular-nums" dir="ltr">
                {sum.toFixed(2)} {ccy}
              </span>
            ))}
            {totals.missing.length > 0 && (
              <span className="text-amber-600">
                {t("finance.invoices.missingPrice")}: {totals.missing.length}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={selectedList.length === 0}
              onClick={() => {
                onApply(selectedList);
                onOpenChange(false);
              }}
            >
              <Package className="w-4 h-4 me-1.5" />
              {t("finance.invoices.apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
