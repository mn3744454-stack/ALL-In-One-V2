import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, User, Building, Warehouse, Stethoscope, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useClients, Client, ClientType, CreateClientData } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients";
import { useI18n } from "@/i18n";

interface ClientSelectorProps {
  selectedClientId?: string | null;
  onClientSelect: (clientId: string | null, client?: Client) => void;
  placeholder?: string;
  disabled?: boolean;
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

export function ClientSelector({
  selectedClientId,
  onClientSelect,
  placeholder,
  disabled = false,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { clients, loading, createClient, canManage } = useClients();
  const { t, dir } = useI18n();

  const activeClients = useMemo(() => {
    return clients.filter(c => c.status === "active");
  }, [clients]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const handleSelect = (clientId: string) => {
    if (clientId === selectedClientId) {
      onClientSelect(null);
    } else {
      const client = clients.find(c => c.id === clientId);
      onClientSelect(clientId, client);
    }
    setOpen(false);
    setSearchValue("");
  };

  const handleQuickAdd = () => {
    setOpen(false);
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

  const effectivePlaceholder = placeholder || t("clients.search");

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {selectedClient ? (
              <div className="flex items-center gap-2 truncate">
                {typeIcons[selectedClient.type]}
                <span className="truncate">{selectedClient.name}</span>
                {(selectedClient.outstanding_balance || 0) > 0 && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                    {t("clients.outstandingBalance")}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{effectivePlaceholder}</span>
            )}
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={t("clients.search")} 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>{t("common.noResults")}</CommandEmpty>
              
              {/* Quick Add Option */}
              {canManage && (
                <>
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleQuickAdd}
                      className="flex items-center gap-2 text-primary cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">{t("clients.quickAdd")}</span>
                      {searchValue && (
                        <span className="text-muted-foreground text-sm">"{searchValue}"</span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup>
                {activeClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.name_ar || ""} ${client.email || ""}`}
                    onSelect={() => handleSelect(client.id)}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedClientId === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {typeIcons[client.type]}
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {typeLabels[client.type]}
                      </Badge>
                    </div>
                    <div className="flex w-full items-center gap-3 text-xs text-muted-foreground ms-6">
                      {client.phone && <span dir="ltr">{client.phone}</span>}
                      {(client.outstanding_balance || 0) > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          {t("clients.outstandingBalance")}: {formatCurrency(client.outstanding_balance || 0)}
                        </span>
                      )}
                      {client.credit_limit && (
                        <span className="text-muted-foreground">
                          {t("clients.form.creditLimit")}: {formatCurrency(client.credit_limit)}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
