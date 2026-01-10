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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gold" />
            {t("dashboard.widgets.upcomingSchedule")}
          </span>
          <Link
            to="/dashboard/schedule"
            className="text-sm font-normal text-gold hover:text-gold-dark flex items-center gap-1"
          >
            {t("dashboard.widgets.viewAll")}
            <ChevronRight className={cn("w-4 h-4", dir === "rtl" && "rotate-180")} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t("schedule.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((item) => {
              const Icon = moduleIcons[item.module] || CalendarDays;
              const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground";

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-navy truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(item.startAt), "MMM d, h:mm a")}</span>
                      {item.horseName && (
                        <>
                          <span>•</span>
                          <span className="truncate">{item.horseName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {item.status && (
                    <Badge variant="outline" className="text-xs shrink-0">
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
