import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, List, Table, Grid2X2, Grid3X3, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'list' | 'grid';
export type GridColumns = 2 | 3 | 4;

interface ViewSwitcherProps {
  viewMode: ViewMode;
  gridColumns: GridColumns;
  onViewModeChange: (mode: ViewMode) => void;
  onGridColumnsChange: (columns: GridColumns) => void;
  showTable?: boolean;
  className?: string;
  /** Show text labels alongside icons (recommended for clarity) */
  showLabels?: boolean;
}

const GRID_ICONS = {
  2: Grid2X2,
  3: Grid3X3,
  4: LayoutGrid,
};

export function ViewSwitcher({
  viewMode,
  gridColumns,
  onViewModeChange,
  onGridColumnsChange,
  showTable = true,
  showLabels = true,
  className,
}: ViewSwitcherProps) {
  const { t } = useI18n();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Toggle buttons with labels */}
      <div className="flex items-center border border-border rounded-lg p-1 bg-muted/30">
        {showTable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('table')}
            className={cn(
              "h-9 px-3 gap-2",
              viewMode === 'table' && "bg-background shadow-sm"
            )}
            title={t('common.table')}
          >
            <Table className="h-4 w-4" />
            {showLabels && <span className="text-sm">{t('common.table')}</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('list')}
          className={cn(
            "h-9 px-3 gap-2",
            viewMode === 'list' && "bg-background shadow-sm"
          )}
          title={t('common.list')}
        >
          <List className="h-4 w-4" />
          {showLabels && <span className="text-sm">{t('common.list')}</span>}
        </Button>
        
        {/* Grid dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-3 gap-2",
                viewMode === 'grid' && "bg-background shadow-sm"
              )}
              title={t('common.grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              {showLabels && <span className="text-sm">{t('common.grid')}</span>}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem
              onClick={() => {
                onViewModeChange('grid');
                onGridColumnsChange(2);
              }}
              className={cn(
                viewMode === 'grid' && gridColumns === 2 && "bg-accent"
              )}
            >
              <Grid2X2 className="h-4 w-4 me-2" />
              {t('common.columns2')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onViewModeChange('grid');
                onGridColumnsChange(3);
              }}
              className={cn(
                viewMode === 'grid' && gridColumns === 3 && "bg-accent"
              )}
            >
              <Grid3X3 className="h-4 w-4 me-2" />
              {t('common.columns3')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onViewModeChange('grid');
                onGridColumnsChange(4);
              }}
              className={cn(
                viewMode === 'grid' && gridColumns === 4 && "bg-accent"
              )}
            >
              <LayoutGrid className="h-4 w-4 me-2" />
              {t('common.columns4')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Helper to get grid class based on columns
export function getGridClass(columns: GridColumns, viewMode: ViewMode): string {
  if (viewMode === 'list') {
    return 'grid grid-cols-1 gap-3';
  }
  
  if (viewMode === 'table') {
    return ''; // Table has its own structure
  }

  // Grid mode
  switch (columns) {
    case 2:
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    case 3:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    case 4:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  }
}
