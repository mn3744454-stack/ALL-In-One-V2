import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export type ResultFilterTab = 'all' | 'today' | 'draft' | 'reviewed' | 'final';

interface ResultsFilterTabsProps {
  activeTab: ResultFilterTab;
  onTabChange: (tab: ResultFilterTab) => void;
  counts?: {
    all?: number;
    today?: number;
    draft?: number;
    reviewed?: number;
    final?: number;
  };
}

const tabKeys: ResultFilterTab[] = ['all', 'today', 'draft', 'reviewed', 'final'];

export function ResultsFilterTabs({ activeTab, onTabChange, counts }: ResultsFilterTabsProps) {
  const { t } = useI18n();

  const getLabel = (tabId: ResultFilterTab): string => {
    if (tabId === 'all') return t("laboratory.filterTabs.all");
    if (tabId === 'today') return t("laboratory.filterTabs.today");
    return t(`laboratory.resultStatus.${tabId}`);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-0.5 p-1 bg-muted rounded-lg w-max min-w-full rtl:flex-row-reverse">
        {tabKeys.map((tabId) => {
          const count = counts?.[tabId];
          return (
            <button
              key={tabId}
              onClick={() => onTabChange(tabId)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                activeTab === tabId
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <span>{getLabel(tabId)}</span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-4 h-4 px-1 text-xs rounded-full",
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