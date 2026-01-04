import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SampleFilterTab = 'all' | 'today' | 'received' | 'unreceived' | 'retest';

interface SamplesFilterTabsProps {
  activeTab: SampleFilterTab;
  onTabChange: (tab: SampleFilterTab) => void;
  counts?: {
    all?: number;
    today?: number;
    received?: number;
    unreceived?: number;
    retest?: number;
  };
}

const tabs: { id: SampleFilterTab; label: string; labelAr: string }[] = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'today', label: 'Today', labelAr: 'اليوم' },
  { id: 'received', label: 'Received', labelAr: 'مستلم' },
  { id: 'unreceived', label: 'Unreceived', labelAr: 'غير مستلم' },
  { id: 'retest', label: 'Retest', labelAr: 'إعادة' },
];

export function SamplesFilterTabs({ activeTab, onTabChange, counts }: SamplesFilterTabsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-max min-w-full">
        {tabs.map((tab) => {
          const count = counts?.[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
