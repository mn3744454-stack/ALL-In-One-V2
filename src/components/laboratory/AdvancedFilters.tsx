import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangeFilter } from "./DateRangeFilter";
import { Filter, X, Check, Search, ChevronDown, User, ChevronsUpDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { useClients } from "@/hooks/useClients";
import { useHorses } from "@/hooks/useHorses";
import type { LabSampleStatus } from "@/hooks/laboratory/useLabSamples";
import { cn } from "@/lib/utils";

interface AdvancedFiltersProps {
  // Search
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Date range
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  
  // Client filter
  clientId?: string;
  onClientChange: (clientId: string | undefined) => void;
  
  // Horse filter
  horseId?: string;
  onHorseChange: (horseId: string | undefined) => void;
  
  // Status multi-select
  selectedStatuses: LabSampleStatus[];
  onStatusesChange: (statuses: LabSampleStatus[]) => void;
  statusOptions: { value: LabSampleStatus; label: string }[];
  
  // Clear all
  onClearAll: () => void;
  
  className?: string;
}

export function AdvancedFilters({
  search,
  onSearchChange,
  searchPlaceholder,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  clientId,
  onClientChange,
  horseId,
  onHorseChange,
  selectedStatuses,
  onStatusesChange,
  statusOptions,
  onClearAll,
  className,
}: AdvancedFiltersProps) {
  const { t, dir } = useI18n();
  const { clients } = useClients();
  const { horses } = useHorses();
  
  const [clientOpen, setClientOpen] = useState(false);
  const [horseOpen, setHorseOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  
  const selectedClient = clients.find(c => c.id === clientId);
  const selectedHorse = horses.find(h => h.id === horseId);
  
  const hasActiveFilters = !!(
    search || 
    dateFrom || 
    dateTo || 
    clientId || 
    horseId || 
    selectedStatuses.length > 0
  );
  
  const toggleStatus = (status: LabSampleStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Row 1: Search + Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            dir === 'rtl' ? 'right-3' : 'left-3'
          )} />
          <Input
            placeholder={searchPlaceholder || t("common.search")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("h-9", dir === 'rtl' ? 'pr-9' : 'pl-9')}
          />
        </div>
        
        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={onClearAll}
          >
            <X className="h-4 w-4 me-1" />
            {t("common.clearFilters")}
          </Button>
        )}
      </div>
      
      {/* Row 2: Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Filter */}
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          className="flex-wrap"
        />
        
        {/* Client Filter */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={clientOpen}
              className={cn(
                "h-9 justify-between min-w-[140px]",
                clientId && "border-primary"
              )}
            >
              {selectedClient ? (
                <span className="truncate max-w-[120px]">{selectedClient.name}</span>
              ) : (
                <span className="text-muted-foreground">{t("laboratory.filters.client")}</span>
              )}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("laboratory.filters.searchClient")} />
              <CommandList>
                <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      onClientChange(undefined);
                      setClientOpen(false);
                    }}
                  >
                    <Check className={cn("me-2 h-4 w-4", !clientId ? "opacity-100" : "opacity-0")} />
                    {t("common.all")}
                  </CommandItem>
                  {clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        onClientChange(client.id);
                        setClientOpen(false);
                      }}
                    >
                      <Check
                        className={cn("me-2 h-4 w-4", clientId === client.id ? "opacity-100" : "opacity-0")}
                      />
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Horse Filter */}
        <Popover open={horseOpen} onOpenChange={setHorseOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={horseOpen}
              className={cn(
                "h-9 justify-between min-w-[140px]",
                horseId && "border-primary"
              )}
            >
              {selectedHorse ? (
                <span className="truncate max-w-[120px]">{selectedHorse.name}</span>
              ) : (
                <span className="text-muted-foreground">{t("laboratory.filters.horse")}</span>
              )}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("laboratory.filters.searchHorse")} />
              <CommandList>
                <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      onHorseChange(undefined);
                      setHorseOpen(false);
                    }}
                  >
                    <Check className={cn("me-2 h-4 w-4", !horseId ? "opacity-100" : "opacity-0")} />
                    {t("common.all")}
                  </CommandItem>
                  {horses.map((horse) => (
                    <CommandItem
                      key={horse.id}
                      value={horse.name}
                      onSelect={() => {
                        onHorseChange(horse.id);
                        setHorseOpen(false);
                      }}
                    >
                      <Check
                        className={cn("me-2 h-4 w-4", horseId === horse.id ? "opacity-100" : "opacity-0")}
                      />
                      {horse.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Status Multi-Select */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              role="combobox"
              aria-expanded={statusOpen}
              className={cn(
                "h-9 justify-between min-w-[140px]",
                selectedStatuses.length > 0 && "border-primary"
              )}
            >
              {selectedStatuses.length > 0 ? (
                <span className="flex items-center gap-1">
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {selectedStatuses.length}
                  </Badge>
                  <span className="truncate">{t("laboratory.filters.statuses")}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t("laboratory.filters.status")}</span>
              )}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2" align="start">
            <div className="space-y-1">
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                    selectedStatuses.includes(option.value) && "bg-accent"
                  )}
                  onClick={() => toggleStatus(option.value)}
                >
                  <Checkbox
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {clientId && selectedClient && (
            <Badge variant="secondary" className="gap-1">
              {t("laboratory.filters.client")}: {selectedClient.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onClientChange(undefined)}
              />
            </Badge>
          )}
          {horseId && selectedHorse && (
            <Badge variant="secondary" className="gap-1">
              {t("laboratory.filters.horse")}: {selectedHorse.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onHorseChange(undefined)}
              />
            </Badge>
          )}
          {selectedStatuses.map((status) => {
            const option = statusOptions.find(o => o.value === status);
            return (
              <Badge key={status} variant="secondary" className="gap-1">
                {option?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleStatus(status)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
