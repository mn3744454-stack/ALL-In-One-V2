import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/contexts/TenantContext";
import { useActivityLog, type ActivityItem } from "@/hooks/useActivityLog";
import { useI18n } from "@/i18n";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Activity,
  ChevronRight,
  Stethoscope,
  FlaskConical,
  Baby,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

const moduleIcons: Record<string, React.ElementType> = {
  vet: Stethoscope,
  lab: FlaskConical,
  breeding: Baby,
  orders: ClipboardList,
};

const moduleColors: Record<string, string> = {
  vet: "text-green-600 bg-green-100",
  lab: "text-cyan-600 bg-cyan-100",
  breeding: "text-pink-600 bg-pink-100",
  orders: "text-blue-600 bg-blue-100",
};

export function RecentActivityWidget() {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();

  const { items, isLoading } = useActivityLog({
    tenantId: activeTenant?.tenant.id,
    limit: 5,
  });

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

  const getEventLabel = (item: ActivityItem) => {
    const eventLabels: Record<string, string> = {
      created: t("records.events.created"),
      updated: t("records.events.updated"),
      status_changed: t("records.events.statusChanged"),
      deleted: t("records.events.deleted"),
    };
    return eventLabels[item.eventType] || item.eventType;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gold" />
            {t("dashboard.widgets.recentActivity")}
          </span>
          <Link
            to="/dashboard/records"
            className="text-sm font-normal text-gold hover:text-gold-dark flex items-center gap-1"
          >
            {t("dashboard.widgets.viewAll")}
            <ChevronRight className={cn("w-4 h-4", dir === "rtl" && "rotate-180")} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{t("records.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = moduleIcons[item.module] || Activity;
              const colorClass = moduleColors[item.module] || "text-gray-600 bg-gray-100";

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-navy">
                        {getEventLabel(item)}
                      </p>
                      {item.fromStatus && item.toStatus && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{item.fromStatus}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-navy">{item.toStatus}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.creatorName && <span>{item.creatorName} • </span>}
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
