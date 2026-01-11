import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, LayoutGrid } from "lucide-react";
import type { HorseOrderType } from "@/hooks/useHorseOrderTypes";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";

interface PinnedTabsProps {
  pinnedTabs: HorseOrderType[];
  moreTypes: HorseOrderType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string | null) => void;
}

export function PinnedTabs({
  pinnedTabs,
  moreTypes,
  selectedTypeId,
  onSelectType,
}: PinnedTabsProps) {
  const { t } = useI18n();
  const { isRTL } = useRTL();
  const [moreOpen, setMoreOpen] = useState(false);

  const allSelected = selectedTypeId === null;
  const selectedFromMore = moreTypes.some((t) => t.id === selectedTypeId);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      <Tabs
        value={selectedTypeId || "all"}
        onValueChange={(val) => onSelectType(val === "all" ? null : val)}
        className="shrink-0"
      >
        <TabsList className={`bg-muted/50 h-9 ${isRTL ? "flex-row-reverse" : ""}`}>
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-3"
          >
            {t("common.all")}
          </TabsTrigger>
          {pinnedTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm px-3 max-w-[120px] truncate"
            >
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {moreTypes.length > 0 && (
        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedFromMore ? "secondary" : "outline"}
              size="sm"
              className="gap-1 shrink-0"
            >
              <LayoutGrid className="w-4 h-4" />
              {t("common.more")}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
            {moreTypes.map((type) => (
              <DropdownMenuItem
                key={type.id}
                onClick={() => {
                  onSelectType(type.id);
                  setMoreOpen(false);
                }}
                className={selectedTypeId === type.id ? "bg-accent" : ""}
              >
                {type.name}
                {type.category && (
                  <span className="ms-auto text-xs text-muted-foreground">
                    {type.category}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
