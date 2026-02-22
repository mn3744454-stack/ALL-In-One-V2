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
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {tabKeys.map((tabId) => {
        const count = counts?.[tabId];
        return (
          <button
            key={tabId}
            onClick={() => onTabChange(tabId)}
            className={cn(
              "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border min-h-[36px]",
              activeTab === tabId
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <span>{getLabel(tabId)}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center min-w-4 h-4 px-1 text-xs rounded-full",
                activeTab === tabId
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
