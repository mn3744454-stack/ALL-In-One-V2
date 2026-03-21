import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useServicesByKind } from "@/hooks/useServices";
import { useI18n } from "@/i18n";
import { displayServiceName } from "@/lib/displayHelpers";
import type { IncludedServiceEntry } from "@/lib/planIncludes";
import { X, Plus } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useState } from "react";

interface Props {
  value: IncludedServiceEntry[];
  onChange: (entries: IncludedServiceEntry[]) => void;
}

export function PlanIncludedServicesPicker({ value, onChange }: Props) {
  const { t, lang } = useI18n();
  const { data: boardingServices = [] } = useServicesByKind('boarding');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeServices = boardingServices.filter(s => s.is_active);
  const selectedIds = new Set(value.map(v => v.service_id));

  const addService = (serviceId: string) => {
    const svc = activeServices.find(s => s.id === serviceId);
    if (!svc || selectedIds.has(serviceId)) return;
    onChange([...value, {
      service_id: serviceId,
      label: svc.name,
    }]);
    setPickerOpen(false);
  };

  const removeService = (serviceId: string) => {
    onChange(value.filter(v => v.service_id !== serviceId));
  };

  const availableServices = activeServices.filter(s => !selectedIds.has(s.id));

  return (
    <div>
      <Label>{t('housing.plans.includedServices')}</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
          {value.map(entry => {
            const svc = activeServices.find(s => s.id === entry.service_id);
            const display = svc
              ? displayServiceName(svc.name, svc.name_ar, lang)
              : entry.label;
            return (
              <Badge key={entry.service_id} variant="secondary" className="gap-1 pe-1">
                {display}
                <button
                  type="button"
                  onClick={() => removeService(entry.service_id)}
                  className="rounded-full hover:bg-destructive/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      {availableServices.length > 0 && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              {t('housing.plans.addIncludedService')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder={t('housing.plans.searchServices')} />
              <CommandList>
                <CommandEmpty>{t('housing.plans.noServicesFound')}</CommandEmpty>
                <CommandGroup>
                  {availableServices.map(svc => (
                    <CommandItem
                      key={svc.id}
                      value={svc.name}
                      onSelect={() => addService(svc.id)}
                    >
                      {displayServiceName(svc.name, svc.name_ar, lang)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {activeServices.length === 0 && value.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {t('housing.plans.noBoardingServices')}
        </p>
      )}
    </div>
  );
}
