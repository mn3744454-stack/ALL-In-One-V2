import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  className?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
}: DateRangeFilterProps) {
  const { t, dir } = useI18n();

  const handleClear = () => {
    onDateFromChange(undefined);
    onDateToChange(undefined);
  };

  const hasFilters = dateFrom || dateTo;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* From Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-start font-normal min-w-[140px]",
              !dateFrom && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 me-2" />
            {dateFrom ? format(new Date(dateFrom), "PPP") : t("laboratory.filters.fromDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom ? new Date(dateFrom) : undefined}
            onSelect={(date) => onDateFromChange(date ? date.toISOString().split('T')[0] : undefined)}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* To Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-start font-normal min-w-[140px]",
              !dateTo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 me-2" />
            {dateTo ? format(new Date(dateTo), "PPP") : t("laboratory.filters.toDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo ? new Date(dateTo) : undefined}
            onSelect={(date) => onDateToChange(date ? date.toISOString().split('T')[0] : undefined)}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={handleClear}
        >
          <X className="h-4 w-4 me-1" />
          {t("laboratory.filters.clearDates")}
        </Button>
      )}
    </div>
  );
}
