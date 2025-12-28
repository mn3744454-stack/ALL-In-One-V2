import { useLabEvents, type LabEventEntityType } from "@/hooks/laboratory/useLabEvents";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Play, 
  FileText,
  RefreshCw,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LabTimelineProps {
  entityType?: LabEventEntityType;
  entityId?: string;
  limit?: number;
}

const eventIcons: Record<string, React.ReactNode> = {
  created: <FlaskConical className="h-4 w-4" />,
  status_changed: <RefreshCw className="h-4 w-4" />,
  updated: <FileText className="h-4 w-4" />,
  finalized: <CheckCircle2 className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: "bg-muted",
  accessioned: "bg-blue-500",
  processing: "bg-amber-500",
  completed: "bg-success",
  cancelled: "bg-destructive",
  reviewed: "bg-blue-500",
  final: "bg-success",
};

export function LabTimeline({ entityType, entityId, limit = 50 }: LabTimelineProps) {
  const { events, loading } = useLabEvents({ entity_type: entityType, entity_id: entityId });

  const displayedEvents = limit ? events.slice(0, limit) : events;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
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
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No events yet</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {displayedEvents.map((event, index) => {
        const icon = eventIcons[event.event_type] || <FileText className="h-4 w-4" />;
        const statusColor = event.to_status ? statusColors[event.to_status] : "bg-muted";
        const creatorName = event.creator?.full_name || "System";
        const creatorInitials = creatorName.slice(0, 2).toUpperCase();

        let description = "";
        switch (event.event_type) {
          case 'created':
            description = `${event.entity_type === 'lab_sample' ? 'Sample' : 'Result'} created`;
            break;
          case 'status_changed':
            description = `Status changed from ${event.from_status || 'unknown'} to ${event.to_status || 'unknown'}`;
            break;
          case 'finalized':
            description = "Result finalized";
            break;
          case 'updated':
            description = `${event.entity_type === 'lab_sample' ? 'Sample' : 'Result'} updated`;
            break;
          default:
            description = event.event_type.replace(/_/g, ' ');
        }

        return (
          <div key={event.id} className="relative flex gap-3 pl-2">
            {/* Icon circle */}
            <div className={cn(
              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-white",
              statusColor
            )}>
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={event.creator?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{creatorInitials}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{creatorName}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(event.created_at), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
