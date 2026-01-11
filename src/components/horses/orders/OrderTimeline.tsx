import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { tStatus } from "@/i18n/labels";
import type { HorseOrderEvent } from "@/hooks/useHorseOrderEvents";

interface OrderTimelineProps {
  events: HorseOrderEvent[];
  loading: boolean;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <Plus className="w-4 h-4 text-green-600" />,
  status_changed: <ArrowRight className="w-4 h-4 text-blue-600" />,
  updated: <Edit className="w-4 h-4 text-amber-600" />,
  deleted: <XCircle className="w-4 h-4 text-red-600" />,
};

export function OrderTimeline({ events, loading }: OrderTimelineProps) {
  const { t } = useI18n();

  const getEventDescription = (event: HorseOrderEvent): string => {
    switch (event.event_type) {
      case "created":
        return t("orders.timeline.created");
      case "status_changed":
        return t("orders.timeline.statusChanged")
          .replace("{{from}}", tStatus(event.from_status || ""))
          .replace("{{to}}", tStatus(event.to_status || ""));
      case "updated":
        return t("orders.timeline.updated");
      case "deleted":
        return t("orders.timeline.deleted");
      default:
        return event.event_type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orders.timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orders.timeline.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("orders.timeline.noActivity")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("orders.timeline.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4 pl-2">
              {/* Icon */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border shadow-sm">
                {eventIcons[event.event_type] || (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium">{getEventDescription(event)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {event.creator && (
                    <>
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={event.creator.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {event.creator.full_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{event.creator.full_name || t("common.unknown")}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{format(new Date(event.created_at), "MMM d, yyyy HH:mm")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
