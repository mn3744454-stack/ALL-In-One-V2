import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useTenant } from "@/contexts/TenantContext";
import { useScheduleItems, type ScheduleItem } from "@/hooks/useScheduleItems";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import {
  Menu,
  Search,
  CalendarDays,
  List,
  Stethoscope,
  Baby,
  Syringe,
  ArrowLeftRight,
  GraduationCap,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Grid3X3,
} from "lucide-react";
import { DirectionalIcon } from "@/components/ui/directional-icon";
import { ScheduleCalendarView } from "@/components/schedule";
import { MobilePageHeader } from "@/components/navigation";

const moduleIcons: Record<string, React.ElementType> = {
  vet: Stethoscope,
  vet_followups: Stethoscope,
  vaccinations: Syringe,
  breeding: Baby,
  movement: ArrowLeftRight,
  academy: GraduationCap,
  laboratory: FlaskConical,
};

const moduleColors: Record<string, string> = {
  vet: "bg-green-100 text-green-700 border-green-200",
  vet_followups: "bg-emerald-100 text-emerald-700 border-emerald-200",
  vaccinations: "bg-blue-100 text-blue-700 border-blue-200",
  breeding: "bg-pink-100 text-pink-700 border-pink-200",
  movement: "bg-orange-100 text-orange-700 border-orange-200",
  academy: "bg-purple-100 text-purple-700 border-purple-200",
  laboratory: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

function ScheduleItemCard({ item, onClick }: { item: ScheduleItem; onClick?: () => void }) {
  const { t, dir } = useI18n();
  const Icon = moduleIcons[item.module] || CalendarDays;
  const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground";

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-navy truncate">{item.title}</h4>
              {item.status && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{format(new Date(item.startAt), "h:mm a")}</span>
              </div>
              {item.horseName && (
                <div className="flex items-center gap-1">
                  <span className="truncate">{item.horseName}</span>
                </div>
              )}
            </div>
            <Badge variant="secondary" className={cn("mt-2 text-xs", colorClass)}>
              {t(`schedule.modules.${item.module}`)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleList({ 
  items, 
  loading, 
  onItemClick 
}: { 
  items: ScheduleItem[]; 
  loading: boolean;
  onItemClick: (item: ScheduleItem) => void;
}) {
  const { t } = useI18n();
  
  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {};
    items.forEach(item => {
      const dateKey = format(new Date(item.startAt), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy mb-1">{t("schedule.empty")}</h3>
        <p className="text-sm text-muted-foreground">{t("schedule.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedItems.map(([dateKey, dateItems]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="space-y-3">
            {dateItems.map(item => (
              <ScheduleItemCard 
                key={item.id} 
                item={item} 
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleCalendar({
  items,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: {
  items: ScheduleItem[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}) {
  const { dir } = useI18n();
  
  // Get dates that have items
  const datesWithItems = useMemo(() => {
    const dates = new Set<string>();
    items.forEach(item => {
      dates.add(format(new Date(item.startAt), "yyyy-MM-dd"));
    });
    return dates;
  }, [items]);

  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && onDateSelect(date)}
      onMonthChange={onMonthChange}
      className="rounded-xl border bg-white p-4"
      modifiers={{
        hasItems: (date) => datesWithItems.has(format(date, "yyyy-MM-dd")),
      }}
      modifiersStyles={{
        hasItems: {
          fontWeight: "bold",
          textDecoration: "underline",
          textDecorationColor: "hsl(var(--gold))",
        },
      }}
      dir={dir}
    />
  );
}

export default function DashboardSchedule() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<"list" | "calendar" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();
  const navigate = useNavigate();

  const dateRange = useMemo(() => ({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate),
  }), [selectedDate]);

  const { items, isLoading } = useScheduleItems({
    tenantId: activeTenant?.tenant.id,
    dateRange,
    modules: moduleFilter !== "all" ? [moduleFilter] : undefined,
  });

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.horseName?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // For calendar view, filter to selected date
  const calendarDayItems = useMemo(() => {
    return filteredItems.filter(item => 
      isSameDay(new Date(item.startAt), selectedDate)
    );
  }, [filteredItems, selectedDate]);

  const handleItemClick = (item: ScheduleItem) => {
    if (item.routeToOpen) {
      navigate(item.routeToOpen);
    }
  };

  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <MobilePageHeader title={t("schedule.title")} backTo="/dashboard" />

        <div className="p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("schedule.title")}</h1>
            <p className="text-muted-foreground">{t("schedule.subtitle")}</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                  dir === "rtl" ? "right-3" : "left-3"
                )} />
                <Input
                  placeholder={t("schedule.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
                />
              </div>
              
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("schedule.filters.module")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="vet">{t("schedule.modules.vet")}</SelectItem>
                  <SelectItem value="vet_followups">{t("schedule.modules.vetFollowups")}</SelectItem>
                  <SelectItem value="vaccinations">{t("schedule.modules.vaccinations")}</SelectItem>
                  <SelectItem value="breeding">{t("schedule.modules.breeding")}</SelectItem>
                  <SelectItem value="movement">{t("schedule.modules.movement")}</SelectItem>
                  <SelectItem value="academy">{t("schedule.modules.academy")}</SelectItem>
                  <SelectItem value="laboratory">{t("schedule.modules.laboratory")}</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar" | "grid")}>
                <TabsList className="h-9">
                  <TabsTrigger value="list" className="gap-1.5 px-2 sm:px-3">
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("schedule.views.list")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-1.5 px-2 sm:px-3">
                    <CalendarDays className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("schedule.views.calendar")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="grid" className="gap-1.5 px-2 sm:px-3">
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("schedule.calendar.monthView")}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
              >
                <DirectionalIcon 
                  icon={ChevronLeft}
                  className="w-5 h-5" 
                />
              </Button>
              <h2 className="text-lg font-semibold text-navy min-w-48 text-center">
                {format(selectedDate, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
              >
                <DirectionalIcon 
                  icon={ChevronRight}
                  className="w-5 h-5" 
                />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {view === "list" && (
          <ScheduleList 
            items={filteredItems} 
            loading={isLoading}
            onItemClick={handleItemClick}
          />
        )}
        
        {view === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="order-2 lg:order-1 lg:col-span-1">
              <ScheduleCalendar
                items={filteredItems}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onMonthChange={handleMonthChange}
              />
            </div>
            <div className="order-1 lg:order-2 lg:col-span-2">
              <h3 className="text-base lg:text-lg font-semibold text-navy mb-3 lg:mb-4">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
              <ScheduleList 
                items={calendarDayItems} 
                loading={isLoading}
                onItemClick={handleItemClick}
              />
            </div>
          </div>
        )}

        {view === "grid" && (
          <ScheduleCalendarView
            items={filteredItems}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onItemClick={handleItemClick}
          />
        )}
        </div>
      </main>
    </div>
  );
}
