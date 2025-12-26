import * as React from "react";
import { format, setHours, setMinutes, setMonth, setYear } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  showTime?: boolean;
  disabled?: boolean;
  className?: string;
}

const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date and time",
  showTime = true,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const [minuteInput, setMinuteInput] = React.useState("");
  
  // Generate year options (current year ± 10)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Parse time from value
  const hours24 = value ? value.getHours() : 12;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minutes = value ? value.getMinutes() : 0;
  const period = hours24 >= 12 ? "PM" : "AM";
  
  // Calendar display month/year
  const displayMonth = value ? value.getMonth() : new Date().getMonth();
  const displayYear = value ? value.getFullYear() : currentYear;

  React.useEffect(() => {
    setMinuteInput(minutes.toString().padStart(2, "0"));
  }, [minutes]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    
    // Preserve time when changing date
    if (value) {
      date.setHours(value.getHours());
      date.setMinutes(value.getMinutes());
    } else {
      date.setHours(12);
      date.setMinutes(0);
    }
    onChange(date);
  };

  const handleMonthChange = (month: string) => {
    const newDate = value ? new Date(value) : new Date();
    newDate.setMonth(parseInt(month));
    onChange(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = value ? new Date(value) : new Date();
    newDate.setFullYear(parseInt(year));
    onChange(newDate);
  };

  const handleHourChange = (hour: string) => {
    if (!value) {
      const newDate = new Date();
      newDate.setMinutes(0);
      newDate.setSeconds(0);
      const hourNum = parseInt(hour);
      const adjustedHour = period === "PM" && hourNum !== 12 ? hourNum + 12 : 
                          period === "AM" && hourNum === 12 ? 0 : hourNum;
      newDate.setHours(adjustedHour);
      onChange(newDate);
      return;
    }
    
    const hourNum = parseInt(hour);
    const adjustedHour = period === "PM" && hourNum !== 12 ? hourNum + 12 : 
                        period === "AM" && hourNum === 12 ? 0 : hourNum;
    const newDate = setHours(value, adjustedHour);
    onChange(newDate);
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinuteInput(val);
    
    if (val.length > 0) {
      const minuteNum = Math.min(59, Math.max(0, parseInt(val) || 0));
      if (!value) {
        const newDate = new Date();
        newDate.setSeconds(0);
        newDate.setHours(12);
        newDate.setMinutes(minuteNum);
        onChange(newDate);
      } else {
        const newDate = setMinutes(value, minuteNum);
        onChange(newDate);
      }
    }
  };

  const handleMinuteInputBlur = () => {
    // Format the minute on blur
    const minuteNum = parseInt(minuteInput) || 0;
    setMinuteInput(Math.min(59, Math.max(0, minuteNum)).toString().padStart(2, "0"));
  };

  const handlePeriodChange = (newPeriod: string) => {
    if (!newPeriod || !value) return;
    
    const currentHour = value.getHours();
    let newHour: number;
    
    if (newPeriod === "PM" && currentHour < 12) {
      newHour = currentHour + 12;
    } else if (newPeriod === "AM" && currentHour >= 12) {
      newHour = currentHour - 12;
    } else {
      return;
    }
    
    const newDate = setHours(value, newHour);
    onChange(newDate);
  };

  const handleSetNow = () => {
    const now = new Date();
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(now.getHours());
      newDate.setMinutes(now.getMinutes());
      newDate.setSeconds(0);
      onChange(newDate);
    } else {
      now.setSeconds(0);
      onChange(now);
    }
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    
    if (showTime) {
      return format(value, "dd/MM/yyyy hh:mm a");
    }
    return format(value, "dd/MM/yyyy");
  };

  // Generate hours 1-12
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-auto p-0",
          isMobile ? "max-w-[95vw]" : ""
        )} 
        align="start"
      >
        <div className={cn(
          "flex",
          isMobile ? "flex-col" : "flex-row"
        )}>
          {/* Calendar with Month/Year Selectors */}
          <div className="p-3">
            {/* Month and Year Selectors */}
            <div className="flex gap-2 mb-3">
              <Select
                value={displayMonth.toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={displayYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              month={value || new Date(displayYear, displayMonth)}
              onMonthChange={(date) => {
                if (value) {
                  const newDate = new Date(value);
                  newDate.setMonth(date.getMonth());
                  newDate.setFullYear(date.getFullYear());
                  onChange(newDate);
                }
              }}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
          
          {/* Time Picker */}
          {showTime && (
            <div className={cn(
              "border-border p-4 flex flex-col gap-3",
              isMobile ? "border-t" : "border-l"
            )}>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              
              <div className={cn(
                "flex items-center gap-2",
                isMobile ? "justify-center" : ""
              )}>
                {/* Hours */}
                <Select
                  value={hours12.toString()}
                  onValueChange={handleHourChange}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-xl font-bold text-muted-foreground">:</span>
                
                {/* Minutes - Editable Input */}
                <Input
                  value={minuteInput}
                  onChange={handleMinuteInputChange}
                  onBlur={handleMinuteInputBlur}
                  className="w-[70px] text-center"
                  placeholder="00"
                  maxLength={2}
                />
              </div>
              
              {/* AM/PM Toggle */}
              <ToggleGroup 
                type="single" 
                value={period}
                onValueChange={handlePeriodChange}
                className="justify-center"
              >
                <ToggleGroupItem 
                  value="AM" 
                  aria-label="AM"
                  className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  AM
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="PM" 
                  aria-label="PM"
                  className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  PM
                </ToggleGroupItem>
              </ToggleGroup>
              
              {/* Now Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetNow}
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Now
              </Button>
            </div>
          )}
        </div>
        
        {/* Done button for mobile */}
        {isMobile && (
          <div className="p-3 border-t border-border">
            <Button 
              className="w-full" 
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}