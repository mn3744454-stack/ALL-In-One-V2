import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, User, Building, Warehouse, Stethoscope, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useClients, Client, ClientType } from "@/hooks/useClients";

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
  placeholder = "Select client",
  disabled = false,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const { clients, loading } = useClients();

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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
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
                  Outstanding
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>No clients found</CommandEmpty>
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
                  <div className="flex w-full items-center gap-3 text-xs text-muted-foreground ml-6">
                    {client.phone && <span>{client.phone}</span>}
                    {(client.outstanding_balance || 0) > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        Due: {formatCurrency(client.outstanding_balance || 0)}
                      </span>
                    )}
                    {client.credit_limit && (
                      <span className="text-muted-foreground">
                        Credit limit: {formatCurrency(client.credit_limit)}
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
  );
}