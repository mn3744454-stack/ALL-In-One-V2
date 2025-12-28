import { useVetEvents, type VetEvent } from "@/hooks/vet/useVetEvents";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Plus, 
  ArrowRight, 
  Pencil, 
  Syringe,
  Calendar,
  CheckCircle,
} from "lucide-react";

interface VetTimelineProps {
  entityType?: string;
  entityId?: string;
}

const eventIcons: Record<string, React.ElementType> = {
  created: Plus,
  status_changed: ArrowRight,
  updated: Pencil,
  dose_changed: Syringe,
  scheduled: Calendar,
  completed: CheckCircle,
};

const eventColors: Record<string, string> = {
  created: "bg-blue-500",
  status_changed: "bg-amber-500",
  updated: "bg-slate-500",
  dose_changed: "bg-purple-500",
  scheduled: "bg-cyan-500",
  completed: "bg-success",
};

function getEventDescription(event: VetEvent): string {
  const payload = event.payload as Record<string, unknown> | null;
  
  switch (event.event_type) {
    case 'created':
      return `Created ${event.entity_type.replace('_', ' ')}`;
    case 'status_changed':
      return `Status changed from ${event.from_status} to ${event.to_status}`;
    case 'updated':
      return 'Details updated';
    default:
      return event.event_type.replace(/_/g, ' ');
  }
}

export function VetTimeline({ entityType, entityId }: VetTimelineProps) {
  const { events, loading } = useVetEvents(entityType, entityId);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
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
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {events.map((event) => {
        const Icon = eventIcons[event.event_type] || Pencil;
        const color = eventColors[event.event_type] || "bg-slate-500";
        const description = getEventDescription(event);

        return (
          <div key={event.id} className="relative flex gap-4 pl-4">
            {/* Icon */}
            <div className={`relative z-10 w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-sm text-navy font-medium">{description}</p>
              
              <div className="flex items-center gap-2 mt-1">
                {event.creator && (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={event.creator.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {event.creator.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {event.creator.full_name}
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
