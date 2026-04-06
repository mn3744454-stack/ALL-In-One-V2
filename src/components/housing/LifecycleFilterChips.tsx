import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export type LifecycleFilter = 'active' | 'deactivated' | 'archived' | 'all';

interface LifecycleFilterChipsProps {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
  counts?: { active?: number; deactivated?: number; archived?: number; all?: number };
  /** Context label suffix — e.g. "Branches", "Facilities", "Units" */
  context: 'branches' | 'facilities' | 'units';
}

const LIFECYCLE_STATES: LifecycleFilter[] = ['active', 'deactivated', 'archived', 'all'];

export function LifecycleFilterChips({ value, onChange, counts, context }: LifecycleFilterChipsProps) {
  const { t } = useI18n();

  const getLabel = (state: LifecycleFilter) => {
    const contextKey = `housing.lifecycle.${state}${context.charAt(0).toUpperCase() + context.slice(1)}`;
    return t(contextKey as any);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LIFECYCLE_STATES.map((state) => {
        const isActive = value === state;
        const count = counts?.[state];
        const showCount = count !== undefined && count > 0 && state !== 'all';
        return (
          <button
            key={state}
            type="button"
            onClick={() => onChange(state)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {getLabel(state)}
            {showCount && (
              <span className={cn(
                "min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
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
