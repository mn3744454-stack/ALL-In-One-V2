import { useI18n } from '@/i18n';
import { useEmployeeEvents } from '@/hooks/hr/useEmployeeEvents';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  UserPlus, 
  UserCheck, 
  UserX, 
  ArrowRightLeft, 
  DollarSign,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmployeeTimelineProps {
  employeeId: string;
}

const eventIcons: Record<string, React.ElementType> = {
  created: UserPlus,
  activated: UserCheck,
  deactivated: UserX,
  employment_kind_changed: ArrowRightLeft,
  salary_updated: DollarSign,
  start_date_updated: Calendar,
};

const eventColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  activated: 'bg-blue-100 text-blue-700',
  deactivated: 'bg-red-100 text-red-700',
  employment_kind_changed: 'bg-purple-100 text-purple-700',
  salary_updated: 'bg-amber-100 text-amber-700',
  start_date_updated: 'bg-cyan-100 text-cyan-700',
};

export function EmployeeTimeline({ employeeId }: EmployeeTimelineProps) {
  const { t, dir } = useI18n();
  const { events, isLoading } = useEmployeeEvents(employeeId);

  const getEventLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      created: t('hr.timeline.created'),
      activated: t('hr.timeline.activated'),
      deactivated: t('hr.timeline.deactivated'),
      employment_kind_changed: t('hr.timeline.employmentKindChanged'),
      salary_updated: t('hr.timeline.salaryUpdated'),
      start_date_updated: t('hr.timeline.startDateUpdated'),
    };
    return labels[eventType] || eventType;
  };

  const getEventDetails = (event: { event_type: string; event_payload: Record<string, any> }): string | null => {
    const payload = event.event_payload || {};
    
    switch (event.event_type) {
      case 'employment_kind_changed':
        if (payload.from && payload.to) {
          const fromLabel = payload.from === 'internal' ? t('hr.internal') : t('hr.external');
          const toLabel = payload.to === 'internal' ? t('hr.internal') : t('hr.external');
          return `${fromLabel} → ${toLabel}`;
        }
        break;
      case 'salary_updated':
        if (payload.new_amount) {
          return `${payload.new_amount} ${payload.currency || 'SAR'}`;
        }
        break;
      case 'start_date_updated':
        if (payload.new_date) {
          return format(new Date(payload.new_date), 'PPP');
        }
        break;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          {t('hr.timeline.title')}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
          <History className="w-4 h-4" />
          {t('hr.timeline.title')}
        </div>
        <p className="text-sm text-muted-foreground/70 text-center py-4">
          {t('hr.timeline.noEvents')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <History className="w-4 h-4" />
        {t('hr.timeline.title')}
      </div>
      <div className="space-y-3">
        {events.map((event, index) => {
          const Icon = eventIcons[event.event_type] || History;
          const colorClass = eventColors[event.event_type] || 'bg-gray-100 text-gray-700';
          const details = getEventDetails(event);

          return (
            <div
              key={event.id}
              className={cn(
                "flex items-start gap-3 relative",
                index < events.length - 1 && "pb-3"
              )}
            >
              {/* Timeline line */}
              {index < events.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-8 w-0.5 h-[calc(100%-0.5rem)] bg-border",
                    dir === 'rtl' ? 'right-4' : 'left-4'
                  )}
                />
              )}
              
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                colorClass
              )}>
                <Icon className="w-4 h-4" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {getEventLabel(event.event_type)}
                  </span>
                  {details && (
                    <Badge variant="outline" className="text-xs">
                      {details}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), 'PPp')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
