import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export type SampleFilterTab = 'today' | 'received' | 'unreceived' | 'processing' | 'cancelled' | 'retest';

interface SamplesFilterTabsProps {
  activeTab: SampleFilterTab;
  onTabChange: (tab: SampleFilterTab) => void;
  counts?: {
    all?: number;
    today?: number;
    received?: number;
    unreceived?: number;
    processing?: number;
    cancelled?: number;
    retest?: number;
  };
}

const tabKeys: SampleFilterTab[] = ['today', 'received', 'unreceived', 'processing', 'cancelled', 'retest'];

export function SamplesFilterTabs({ activeTab, onTabChange, counts }: SamplesFilterTabsProps) {
  const { t } = useI18n();

  const getLabel = (tabId: SampleFilterTab): string => {
    return t(`laboratory.filterTabs.${tabId}`);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-max min-w-full justify-center rtl:flex-row-reverse">
        {tabKeys.map((tabId) => {
          const count = counts?.[tabId];
          return (
            <button
              key={tabId}
              onClick={() => onTabChange(tabId)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeTab === tabId
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <span>{getLabel(tabId)}</span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full",
                  activeTab === tabId
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

