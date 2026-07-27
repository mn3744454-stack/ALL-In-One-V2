import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { BilingualClientName } from "./BilingualClientName";

interface ClientPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (clientId: string) => void;
}

/**
 * Lightweight client picker used by the Invoice-page secondary "Record Client
 * Payment" entry point. Filters the tenant's clients list by name, phone, or
 * Arabic name, then hands the selected id back to the caller — which opens
 * the shared `MultiInvoicePaymentDialog` keyed by that id.
 */
export function ClientPickerDialog({ open, onOpenChange, onSelect }: ClientPickerDialogProps) {
  const { t, dir } = useI18n();
  const { clients, loading } = useClients();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedId(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.name_ar ?? "").toLowerCase().includes(q) ||
            (c.phone ?? "").includes(q),
        )
      : clients;
    return list.slice(0, 100);
  }, [clients, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("finance.multiInvoicePayment.selectClient")}</DialogTitle>
          <DialogDescription>
            {t("finance.multiInvoicePayment.selectClientDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            />
            <Input
              autoFocus
              placeholder={t("finance.multiInvoicePayment.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={dir === "rtl" ? "pr-10" : "pl-10"}
            />
          </div>

          <ScrollArea className="h-72 rounded-md border">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("common.noResults")}
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => {
                  const active = selectedId === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-start p-3 hover:bg-accent transition ${
                          active ? "bg-accent" : ""
                        }`}
                      >
                        <BilingualClientName
                          client={c}
                          stack
                          primaryClassName="text-sm font-medium"
                        />
                        {c.phone && (
                          <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                            {c.phone}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              if (selectedId) {
                onSelect(selectedId);
                onOpenChange(false);
              }
            }}
            disabled={!selectedId}
          >
            {t("finance.multiInvoicePayment.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
