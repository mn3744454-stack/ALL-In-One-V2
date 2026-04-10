import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useServices } from "@/hooks/useServices";
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
import { useState, useMemo } from "react";

const SERVICE_KIND_GROUPS = [
  { kind: 'boarding', labelKey: 'services.kinds.boarding' },
  { kind: 'vet', labelKey: 'services.kinds.vet' },
  { kind: 'breeding', labelKey: 'services.kinds.breeding' },
  { kind: 'training', labelKey: 'services.kinds.training' },
  { kind: 'transport', labelKey: 'services.kinds.transport' },
  { kind: 'service', labelKey: 'services.kinds.general' },
] as const;

interface Props {
  value: IncludedServiceEntry[];
  onChange: (entries: IncludedServiceEntry[]) => void;
}

export function PlanIncludedServicesPicker({ value, onChange }: Props) {
  const { t, lang } = useI18n();
  const { data: allServices = [] } = useServices();
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeServices = allServices.filter(s => s.is_active);
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
      <Label>{t('services.packages.includedServices')}</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
          {value.map(entry => {
            const svc = activeServices.find(s => s.id === entry.service_id);
            const display = svc
              ? displayServiceName(svc.name, svc.name_ar, lang)
              : entry.label;
            const isVet = svc?.service_kind === 'vet';
            return (
              <Badge key={entry.service_id} variant="secondary" className={`gap-1 pe-1 ${isVet ? 'border-emerald-300 dark:border-emerald-700' : ''}`}>
                {display}
                {isVet && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">●</span>}
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
              {t('services.packages.addIncludedService')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder={t('services.packages.searchServices')} />
              <CommandList>
                <CommandEmpty>{t('services.packages.noServicesFound')}</CommandEmpty>
                {SERVICE_KIND_GROUPS.map(group => {
                  const groupServices = availableServices.filter(s => s.service_kind === group.kind);
                  if (groupServices.length === 0) return null;
                  return (
                    <CommandGroup key={group.kind} heading={t(group.labelKey)}>
                      {groupServices.map(svc => (
                        <CommandItem
                          key={svc.id}
                          value={svc.name}
                          onSelect={() => addService(svc.id)}
                        >
                          {displayServiceName(svc.name, svc.name_ar, lang)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {activeServices.length === 0 && value.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {t('services.packages.noServicesAvailable')}
        </p>
      )}
    </div>
  );
}
