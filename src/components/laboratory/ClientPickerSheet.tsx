import { useState, useMemo } from "react";
import { Check, Search, User, Building, Warehouse, Stethoscope, AlertCircle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClients, Client, ClientType, CreateClientData } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients";
import { useI18n } from "@/i18n";

interface ClientPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClientId?: string | null;
  onClientSelect: (clientId: string | null, client?: Client) => void;
}

const typeIcons: Record<ClientType, React.ReactNode> = {
  individual: <User className="h-4 w-4" />,
  organization: <Building className="h-4 w-4" />,
  farm: <Warehouse className="h-4 w-4" />,
  clinic: <Stethoscope className="h-4 w-4" />,
};

const typeLabels: Record<ClientType, string> = {
  individual: "Individual",
  organization: "Organization",
  farm: "Farm",
  clinic: "Clinic",
};

export function ClientPickerSheet({
  open,
  onOpenChange,
  selectedClientId,
  onClientSelect,
}: ClientPickerSheetProps) {
  const [searchValue, setSearchValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { clients, loading, createClient, canManage } = useClients();
  const { t, dir } = useI18n();

  const activeClients = useMemo(() => {
    return clients.filter(c => c.status === "active");
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!searchValue.trim()) return activeClients;
    const q = searchValue.toLowerCase();
    return activeClients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.name_ar && c.name_ar.includes(searchValue)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [activeClients, searchValue]);

  const handleSelect = (client: Client) => {
    onClientSelect(client.id, client);
    onOpenChange(false);
    setSearchValue("");
  };

  const handleQuickAdd = () => {
    onOpenChange(false);
    setQuickAddOpen(true);
  };

  const handleQuickAddSave = async (data: CreateClientData) => {
    const newClient = await createClient(data);
    if (newClient) {
      onClientSelect(newClient.id, newClient);
      setQuickAddOpen(false);
      return newClient;
    }
    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dir === "rtl" ? "ar-SA" : "en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <DialogTitle>{t("laboratory.createSample.selectClient")}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("clients.search")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="ps-10"
                autoFocus
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Add */}
          {canManage && (
            <div className="px-4 py-2 border-b shrink-0">
              <Button
                variant="ghost"
                className="w-full justify-start text-primary gap-2"
                onClick={handleQuickAdd}
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">{t("clients.quickAdd")}</span>
                {searchValue && (
                  <span className="text-muted-foreground text-sm">"{searchValue}"</span>
                )}
              </Button>
            </div>
          )}

          {/* Scrollable Client List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t("common.loading")}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  {t("common.noResults")}
                </div>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    className={cn(
                      "w-full flex flex-col gap-1 p-3 rounded-lg text-start transition-colors min-h-[56px]",
                      "hover:bg-muted/50 active:bg-muted",
                      selectedClientId === client.id && "bg-primary/5 border border-primary/30"
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedClientId === client.id ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <span className="shrink-0">{typeIcons[client.type]}</span>
                        )}
                        <span className="font-medium truncate">{client.name}</span>
                        {client.name_ar && (
                          <span className="text-muted-foreground text-sm truncate" dir="rtl">
                            {client.name_ar}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {typeLabels[client.type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ms-6">
                      {client.phone && <span dir="ltr">{client.phone}</span>}
                      {(client.outstanding_balance || 0) > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          {formatCurrency(client.outstanding_balance || 0)}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <ClientFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSave={handleQuickAddSave}
        initialName={searchValue}
      />
    </>
  );
}
