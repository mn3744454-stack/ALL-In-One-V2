import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import type { StableServicePlan } from "@/hooks/useStableServicePlans";
import { normalizeIncludes } from "@/lib/planIncludes";
import type { InvoiceCatalogItem } from "@/hooks/finance/useInvoiceCatalogSources";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: StableServicePlan[]; // active plans; may be empty (empty state)
  services: InvoiceCatalogItem[]; // used to resolve included service names
  onApply: (selected: StableServicePlan[]) => void;
}

export function PackageSelectionDialog({ open, onOpenChange, plans, services, onApply }: Props) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, StableServicePlan>>({});

  useEffect(() => {
    if (open) { setPicked({}); setQ(""); }
  }, [open]);

  const serviceById = useMemo(() => {
    const m = new Map<string, InvoiceCatalogItem>();
    for (const s of services) m.set(s.id, s);
    return m;
  }, [services]);

  const getPlanName = (p: StableServicePlan) =>
    lang === "ar" ? (p.name_ar || p.name) : p.name;
  const getSvcName = (s: InvoiceCatalogItem) =>
    lang === "ar" ? (s.nameAr || s.name) : (s.name || s.nameAr || "");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return plans.filter((p) => {
      if (!term) return true;
      const included = normalizeIncludes(p.includes)
        .map((e) => serviceById.get(e.service_id))
        .filter(Boolean)
        .map((s) => `${s!.name} ${s!.nameAr ?? ""}`).join(" ");
      const hay = `${p.name} ${p.name_ar ?? ""} ${included}`.toLowerCase();
      return hay.includes(term);
    });
  }, [plans, q, serviceById]);

  const selectedList = Object.values(picked);
  const toggle = (p: StableServicePlan) => {
    setPicked((prev) => {
      const n = { ...prev };
      if (n[p.id]) delete n[p.id]; else n[p.id] = p;
      return n;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl xl:max-w-3xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle>{t("finance.invoices.packagesDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 border-b">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("finance.invoices.packagesDialogSearch")}
            className="h-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {plans.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
              {t("finance.invoices.packagesDialogEmpty")}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    {t("common.noResults")}
                  </div>
                )}
                {filtered.map((p) => {
                  const includes = normalizeIncludes(p.includes);
                  const isPicked = !!picked[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p)}
                      className={cn(
                        "w-full text-start border rounded-lg p-3 flex items-start gap-3 hover:bg-muted/40 transition",
                        isPicked && "border-primary bg-primary/5"
                      )}
                    >
                      <Checkbox checked={isPicked} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{getPlanName(p)}</div>
                        <div className="text-xs text-muted-foreground">
                          {includes.length} {t("finance.invoices.servicesIncluded")}
                          {p.billing_cycle ? ` · ${p.billing_cycle}` : ""}
                          {!p.is_active && (
                            <Badge variant="secondary" className="ms-2 text-[10px]">
                              {t("common.inactive")}
                            </Badge>
                          )}
                        </div>
                        {includes.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {includes.slice(0, 6).map((e) => {
                              const svc = serviceById.get(e.service_id);
                              return (
                                <span
                                  key={e.service_id}
                                  className="text-[10px] bg-muted rounded px-1.5 py-0.5"
                                >
                                  {svc ? getSvcName(svc) : e.service_id.slice(0, 6)}
                                </span>
                              );
                            })}
                            {includes.length > 6 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{includes.length - 6}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-end shrink-0 font-mono tabular-nums text-sm" dir="ltr">
                        {Number(p.base_price).toFixed(2)} {p.currency}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-background flex-col gap-2 sm:flex-row sm:items-center pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="text-xs text-muted-foreground me-auto">
            <span className="font-medium">
              {t("finance.invoices.selectedCount").replace("{{count}}", String(selectedList.length))}
            </span>
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
              <Layers className="w-4 h-4 me-1.5" />
              {t("finance.invoices.apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
