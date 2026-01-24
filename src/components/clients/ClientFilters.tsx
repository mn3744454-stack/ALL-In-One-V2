import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ClientStatus, ClientType } from "@/hooks/useClients";

interface ClientFiltersProps {
  statusFilter: ClientStatus | "all" | "withBalance";
  onStatusChange: (status: ClientStatus | "all" | "withBalance") => void;
  typeFilter: ClientType | "all";
  onTypeChange: (type: ClientType | "all") => void;
}

export function ClientFilters({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: ClientFiltersProps) {
  const { t } = useI18n();

  const statusOptions: { value: ClientStatus | "all" | "withBalance"; label: string }[] = [
    { value: "all", label: t("clients.filters.all") },
    { value: "active", label: t("clients.filters.active") },
    { value: "inactive", label: t("clients.filters.inactive") },
    { value: "withBalance", label: t("clients.filters.withBalance") },
  ];

  const typeOptions: { value: ClientType | "all"; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "individual", label: t("clients.types.individual") },
    { value: "organization", label: t("clients.types.organization") },
    { value: "farm", label: t("clients.types.farm") },
    { value: "clinic", label: t("clients.types.clinic") },
  ];

  return (
    <div className="space-y-3">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant={statusFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onStatusChange(option.value)}
            className={cn(
              "text-xs",
              statusFilter === option.value && "bg-primary text-primary-foreground"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap gap-2">
        {typeOptions.map((option) => (
          <Button
            key={option.value}
            variant={typeFilter === option.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onTypeChange(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
