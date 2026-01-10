import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { useScheduleItems, type ScheduleItem } from "@/hooks/useScheduleItems";
import { useI18n } from "@/i18n";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Stethoscope,
  Syringe,
  Baby,
  ArrowLeftRight,
  GraduationCap,
  FlaskConical,
} from "lucide-react";

const moduleIcons: Record<string, React.ElementType> = {
  vet: Stethoscope,
  vaccinations: Syringe,
  breeding: Baby,
  movement: ArrowLeftRight,
  academy: GraduationCap,
  laboratory: FlaskConical,
};

const moduleColors: Record<string, string> = {
  vet: "bg-green-100 text-green-700",
  vaccinations: "bg-blue-100 text-blue-700",
  breeding: "bg-pink-100 text-pink-700",
  movement: "bg-orange-100 text-orange-700",
  academy: "bg-purple-100 text-purple-700",
  laboratory: "bg-cyan-100 text-cyan-700",
};

export function UpcomingScheduleWidget() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();

  const dateRange = useMemo(
    () => ({
      start: new Date(),
      end: addDays(new Date(), 7),
    }),
    []
  );

  const { items, isLoading } = useScheduleItems({
    tenantId: activeTenant?.tenant.id,
    dateRange,
  });

  const upcoming = items.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <span className="flex items-center gap-1.5 sm:gap-2">
            <CalendarDays className="w-4 h-4 text-gold" />
            <span className="truncate">{t("dashboard.widgets.upcomingSchedule")}</span>
          </span>
          <Link
            to="/dashboard/schedule"
            className="text-xs sm:text-sm font-normal text-gold hover:text-gold-dark flex items-center gap-1 shrink-0"
          >
            <span className="hidden xs:inline">{t("dashboard.widgets.viewAll")}</span>
            <ChevronRight className={cn("w-4 h-4", dir === "rtl" && "rotate-180")} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
            <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/30 mb-2" />
            <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {upcoming.map((item) => {
              const Icon = moduleIcons[item.module] || CalendarDays;
              const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm text-navy truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(item.startAt), "MMM d, h:mm a")}</span>
                      {item.horseName && (
                        <>
                          <span className="hidden xs:inline">•</span>
                          <span className="hidden xs:inline truncate">{item.horseName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {item.status && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 hidden sm:flex">
                      {item.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
