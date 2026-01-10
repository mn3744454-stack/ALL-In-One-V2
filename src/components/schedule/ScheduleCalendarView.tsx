import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns";
import {
  CalendarDays,
  Clock,
  Stethoscope,
  Syringe,
  Baby,
  ArrowLeftRight,
  GraduationCap,
  FlaskConical,
  GripVertical,
} from "lucide-react";
import type { ScheduleItem } from "@/hooks/useScheduleItems";

const moduleIcons: Record<string, React.ElementType> = {
  vet: Stethoscope,
  vaccinations: Syringe,
  breeding: Baby,
  movement: ArrowLeftRight,
  academy: GraduationCap,
  laboratory: FlaskConical,
};

const moduleColors: Record<string, string> = {
  vet: "bg-green-100 text-green-700 border-green-300",
  vaccinations: "bg-blue-100 text-blue-700 border-blue-300",
  breeding: "bg-pink-100 text-pink-700 border-pink-300",
  movement: "bg-orange-100 text-orange-700 border-orange-300",
  academy: "bg-purple-100 text-purple-700 border-purple-300",
  laboratory: "bg-cyan-100 text-cyan-700 border-cyan-300",
};

// Draggable Event Card
function DraggableEventCard({
  item,
  isDragging,
}: {
  item: ScheduleItem;
  isDragging?: boolean;
}) {
  const { t } = useI18n();
  const Icon = moduleIcons[item.module] || CalendarDays;
  const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground border-border";

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 p-1 sm:p-1.5 rounded border text-[10px] sm:text-xs cursor-grab active:cursor-grabbing transition-all",
        colorClass,
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-0 group-hover:opacity-50 shrink-0 hidden sm:block" />
      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
      <span className="truncate flex-1 leading-tight">{item.title}</span>
    </div>
  );
}

// Droppable Day Cell
function DroppableDay({
  date,
  items,
  isCurrentMonth,
  onItemClick,
}: {
  date: Date;
  items: ScheduleItem[];
  isCurrentMonth: boolean;
  onItemClick?: (item: ScheduleItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  const dayItems = items.filter((item) => isSameDay(new Date(item.startAt), date));
  // Show 2 items on mobile, 3 on desktop
  const displayItems = dayItems.slice(0, 2);
  const moreCount = dayItems.length - 2;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-16 sm:min-h-24 p-0.5 sm:p-1 border-b border-e transition-colors",
        !isCurrentMonth && "bg-muted/30",
        isToday(date) && "bg-gold/5",
        isOver && "bg-gold/20 ring-2 ring-gold ring-inset"
      )}
    >
      <div
        className={cn(
          "text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full",
          isToday(date) && "bg-gold text-white",
          !isCurrentMonth && "text-muted-foreground"
        )}
      >
        {format(date, "d")}
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        {displayItems.map((item) => (
          <div key={item.id} onClick={() => onItemClick?.(item)}>
            <DraggableEventCard item={item} />
          </div>
        ))}
        {moreCount > 0 && (
          <div className="text-[10px] sm:text-xs text-muted-foreground text-center">
            +{moreCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Drag Overlay Card
function DragOverlayCard({ item }: { item: ScheduleItem }) {
  const Icon = moduleIcons[item.module] || CalendarDays;
  const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground border-border";

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border text-xs shadow-xl cursor-grabbing",
        colorClass
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.title}</span>
    </div>
  );
}

interface ScheduleCalendarViewProps {
  items: ScheduleItem[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onItemClick?: (item: ScheduleItem) => void;
  onReschedule?: (itemId: string, module: string, newDate: Date) => Promise<void>;
}

export function ScheduleCalendarView({
  items,
  selectedDate,
  onDateSelect,
  onItemClick,
  onReschedule,
}: ScheduleCalendarViewProps) {
  const { t, dir } = useI18n();
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [rescheduleInfo, setRescheduleInfo] = useState<{
    item: ScheduleItem;
    newDate: Date;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get calendar days for the month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "EEE"));
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current?.item as ScheduleItem;
    setActiveItem(item);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);

      const { active, over } = event;
      if (!over || !active.data.current?.item) return;

      const item = active.data.current.item as ScheduleItem;
      const targetDate = over.data.current?.date as Date;

      if (!targetDate) return;

      // Check if it's a different day
      const originalDate = new Date(item.startAt);
      if (isSameDay(originalDate, targetDate)) return;

      // Show confirmation dialog
      setRescheduleInfo({ item, newDate: targetDate });
    },
    []
  );

  const handleConfirmReschedule = useCallback(async () => {
    if (!rescheduleInfo || !onReschedule) return;

    try {
      await onReschedule(
        rescheduleInfo.item.id,
        rescheduleInfo.item.module,
        rescheduleInfo.newDate
      );
    } catch (error) {
      console.error("Reschedule failed:", error);
    } finally {
      setRescheduleInfo(null);
    }
  }, [rescheduleInfo, onReschedule]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card>
        <CardContent className="p-0">
          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="py-2 text-center text-xs font-medium text-muted-foreground border-e last:border-e-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => (
              <DroppableDay
                key={format(date, "yyyy-MM-dd")}
                date={date}
                items={items}
                isCurrentMonth={isSameMonth(date, selectedDate)}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? <DragOverlayCard item={activeItem} /> : null}
      </DragOverlay>

      {/* Reschedule Confirmation */}
      <AlertDialog
        open={!!rescheduleInfo}
        onOpenChange={() => setRescheduleInfo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedule.calendar.confirmReschedule")}</AlertDialogTitle>
            <AlertDialogDescription>
              {rescheduleInfo && (
                <>
                  Move "{rescheduleInfo.item.title}" to {format(rescheduleInfo.newDate, "EEEE, MMMM d, yyyy")}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReschedule}>
              {t("schedule.calendar.reschedule")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
}
