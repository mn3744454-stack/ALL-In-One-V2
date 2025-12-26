import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export function DateTimePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "اختر التاريخ والوقت",
  showTime = true,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Parse time from value
  const hours24 = value ? value.getHours() : 12;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minutes = value ? value.getMinutes() : 0;
  const period = hours24 >= 12 ? "PM" : "AM";

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

  const handleMinuteChange = (minute: string) => {
    if (!value) {
      const newDate = new Date();
      newDate.setSeconds(0);
      newDate.setHours(12);
      newDate.setMinutes(parseInt(minute));
      onChange(newDate);
      return;
    }
    
    const newDate = setMinutes(value, parseInt(minute));
    onChange(newDate);
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

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    
    if (showTime) {
      return format(value, "dd/MM/yyyy hh:mm a");
    }
    return format(value, "dd/MM/yyyy");
  };

  // Generate hours 1-12
  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes in 5-minute intervals
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

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
          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
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
                <span>الوقت</span>
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
                
                {/* Minutes */}
                <Select
                  value={minutes.toString()}
                  onValueChange={handleMinuteChange}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map((minute) => (
                      <SelectItem key={minute} value={minute.toString()}>
                        {minute.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  aria-label="صباحاً"
                  className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  AM
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="PM" 
                  aria-label="مساءً"
                  className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  PM
                </ToggleGroupItem>
              </ToggleGroup>
              
              {/* Quick time presets */}
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  { label: "9 ص", hour: 9, period: "AM" },
                  { label: "12 م", hour: 12, period: "PM" },
                  { label: "3 م", hour: 15, period: "PM" },
                  { label: "6 م", hour: 18, period: "PM" },
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      const newDate = value ? new Date(value) : new Date();
                      newDate.setHours(preset.hour);
                      newDate.setMinutes(0);
                      newDate.setSeconds(0);
                      onChange(newDate);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
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
              تم
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
