import { format } from "date-fns";
import { History, Plus, RefreshCw, Check, X, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BreedingEvent } from "@/hooks/breeding/useBreedingEvents";

interface EntityTimelineProps {
  events: BreedingEvent[];
  loading: boolean;
}

const eventIcons: Record<string, React.ElementType> = {
  created: Plus,
  updated: RefreshCw,
  status_changed: RefreshCw,
  result_changed: RefreshCw,
  verification_changed: Check,
  dose_changed: AlertCircle,
};

const eventColors: Record<string, string> = {
  created: "bg-emerald-500",
  updated: "bg-blue-500",
  status_changed: "bg-amber-500",
  result_changed: "bg-purple-500",
  verification_changed: "bg-cyan-500",
  dose_changed: "bg-orange-500",
};

export function EntityTimeline({ events, loading }: EntityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const getEventDescription = (event: BreedingEvent): string => {
    const payload = event.payload || {};
    
    switch (event.event_type) {
      case "created":
        return `Record created`;
      case "updated":
        return `Details updated`;
      case "status_changed":
        return `Status changed from "${event.from_status}" to "${event.to_status}"`;
      case "result_changed":
        return `Result changed from "${payload.from || event.from_status}" to "${payload.to || event.to_status}"`;
      case "verification_changed":
        return `Verification changed from "${payload.from}" to "${payload.to}"`;
      case "dose_changed":
        return `Doses changed from ${payload.from} to ${payload.to}`;
      default:
        return event.event_type.replace(/_/g, " ");
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {events.map((event) => {
          const Icon = eventIcons[event.event_type] || History;
          const color = eventColors[event.event_type] || "bg-slate-500";

          return (
            <div key={event.id} className="relative flex gap-4 pl-0">
              <div className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full", color)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getEventDescription(event)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {event.creator && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={event.creator.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {(event.creator.full_name || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{event.creator.full_name || "User"}</span>
                    </div>
                  )}
                  <span>•</span>
                  <span>{format(new Date(event.created_at), "PPp")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
