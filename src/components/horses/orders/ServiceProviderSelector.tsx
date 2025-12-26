import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Star, Clock, DollarSign, AlertTriangle, Building2 } from "lucide-react";
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
import { useServiceProviders, ServiceProvider, ServiceProviderType } from "@/hooks/useServiceProviders";

interface ServiceProviderSelectorProps {
  selectedProviderId?: string | null;
  onProviderSelect: (providerId: string | null, provider?: ServiceProvider) => void;
  filterByType?: ServiceProviderType;
  placeholder?: string;
  disabled?: boolean;
}

const typeIcons: Record<ServiceProviderType, string> = {
  veterinary: "🏥",
  laboratory: "🔬",
  transportation: "🚚",
  boarding: "🏠",
  breeding: "🧬",
};

const typeLabels: Record<ServiceProviderType, string> = {
  veterinary: "بيطري",
  laboratory: "مختبر",
  transportation: "نقل",
  boarding: "إيواء",
  breeding: "تربية",
};

const statusColors: Record<string, string> = {
  preferred: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  active: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  inactive: "bg-muted text-muted-foreground",
  blacklisted: "bg-destructive/20 text-destructive border-destructive/30",
};

export function ServiceProviderSelector({
  selectedProviderId,
  onProviderSelect,
  filterByType,
  placeholder = "اختر مقدم الخدمة",
  disabled = false,
}: ServiceProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const { providers, loading } = useServiceProviders();

  const filteredProviders = useMemo(() => {
    let result = providers.filter(p => p.status !== "blacklisted");
    if (filterByType) {
      result = result.filter(p => p.type === filterByType);
    }
    // Sort: preferred first, then by rating
    return result.sort((a, b) => {
      if (a.status === "preferred" && b.status !== "preferred") return -1;
      if (b.status === "preferred" && a.status !== "preferred") return 1;
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [providers, filterByType]);

  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId);
  }, [providers, selectedProviderId]);

  const handleSelect = (providerId: string) => {
    if (providerId === selectedProviderId) {
      onProviderSelect(null);
    } else {
      const provider = providers.find(p => p.id === providerId);
      onProviderSelect(providerId, provider);
    }
    setOpen(false);
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
          {selectedProvider ? (
            <div className="flex items-center gap-2 truncate">
              <span>{typeIcons[selectedProvider.type]}</span>
              <span className="truncate">{selectedProvider.name_ar || selectedProvider.name}</span>
              {selectedProvider.rating && (
                <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                  <Star className="h-3 w-3 fill-current" />
                  {selectedProvider.rating}
                </span>
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
          <CommandInput placeholder="ابحث عن مقدم خدمة..." className="text-right" dir="rtl" />
          <CommandList>
            <CommandEmpty>لا يوجد مقدمي خدمات</CommandEmpty>
            <CommandGroup>
              {filteredProviders.map((provider) => (
                <CommandItem
                  key={provider.id}
                  value={`${provider.name} ${provider.name_ar || ""}`}
                  onSelect={() => handleSelect(provider.id)}
                  className="flex flex-col items-start gap-1 py-3"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedProviderId === provider.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{typeIcons[provider.type]}</span>
                      <span className="font-medium">{provider.name_ar || provider.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {provider.status === "preferred" && (
                        <Badge variant="outline" className={statusColors.preferred}>
                          مفضل
                        </Badge>
                      )}
                      {provider.is_emergency_provider && (
                        <Badge variant="outline" className="bg-red-500/20 text-red-600 border-red-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          طوارئ
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-3 text-xs text-muted-foreground mr-6">
                    {provider.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        {provider.rating}
                        {provider.review_count && (
                          <span className="text-muted-foreground">({provider.review_count})</span>
                        )}
                      </span>
                    )}
                    {provider.estimated_response_time && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {provider.estimated_response_time}
                      </span>
                    )}
                    {provider.average_cost && (
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" />
                        {provider.average_cost} ر.س
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabels[provider.type]}
                    </Badge>
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
