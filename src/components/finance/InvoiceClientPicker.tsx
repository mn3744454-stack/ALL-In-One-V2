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
import { ChevronsUpDown, Plus, Search, Check, User } from "lucide-react";
import { useI18n } from "@/i18n";
import { useClients, type Client, type CreateClientData } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients";
import { BilingualName } from "@/components/ui/BilingualName";
import { cn } from "@/lib/utils";

interface InvoiceClientPickerProps {
  selectedClientId: string;
  onSelect: (clientId: string, client: Client | null) => void;
  placeholder?: string;
}

/**
 * Picker dialog for selecting a client on an invoice.
 * Bilingual search (name + name_ar), and "+ Add new client" bridge
 * that reuses ClientFormDialog and auto-selects the created client.
 */
export function InvoiceClientPicker({
  selectedClientId,
  onSelect,
  placeholder,
}: InvoiceClientPickerProps) {
  const { t, lang } = useI18n();
  const { clients, createClient } = useClients();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.name_ar?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(search)
    );
  }, [clients, search]);

  const handleAddSave = async (data: CreateClientData) => {
    const created = await createClient(data);
    if (created) {
      onSelect(created.id, created);
      setAddOpen(false);
      setOpen(false);
    }
    return created;
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        onClick={() => setOpen(true)}
        className="w-full justify-between font-normal"
      >
        <span className="truncate text-start flex-1 min-w-0">
          {selected ? (
            <BilingualName
              name={selected.name}
              nameAr={selected.name_ar}
              primaryClassName="text-sm font-normal"
              secondaryClassName="text-xs text-muted-foreground"
            />
          ) : (
            <span className="text-muted-foreground">
              {placeholder || t("finance.invoices.selectClient")}
            </span>
          )}
        </span>
        <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle>{t("finance.invoices.selectClient")}</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-3 border-b shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("finance.invoices.searchClient")}
                className="ps-9"
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("finance.invoices.addNewClient")}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("finance.invoices.noClientsFound")}
                </p>
              ) : (
                filtered.map((c) => {
                  const isSelected = c.id === selectedClientId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c.id, c);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-start hover:bg-muted/50 transition-colors",
                        isSelected && "bg-muted"
                      )}
                    >
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <BilingualName
                          name={c.name}
                          nameAr={c.name_ar}
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

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        client={null}
        onSave={handleAddSave}
        initialName={search}
      />
    </>
  );
}
