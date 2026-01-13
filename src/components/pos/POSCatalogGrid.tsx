import React, { useState, useMemo } from "react";
import { useI18n } from "@/i18n";
import { useRTL } from "@/hooks/useRTL";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogItem {
  id: string;
  name: string;
  name_ar?: string | null;
  unit_price: number | null;
  category?: string | null;
  is_active?: boolean;
}

interface POSCatalogGridProps {
  items: CatalogItem[];
  onItemSelect: (item: CatalogItem) => void;
  isLoading?: boolean;
}

export function POSCatalogGrid({ items, onItemSelect, isLoading }: POSCatalogGridProps) {
  const { t, language } = useI18n();
  const { isRTL } = useRTL();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => item.is_active !== false);

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.name_ar?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    return filtered;
  }, [items, search, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [items]);

  const getDisplayName = (item: CatalogItem) => {
    if (language === "ar" && item.name_ar) return item.name_ar;
    return item.name;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b sticky top-0 bg-background z-10">
        <div className="relative">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("h-11", isRTL ? "pr-10" : "pl-10")}
          />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className={cn(
            "flex gap-1 mt-2 overflow-x-auto pb-1",
            isRTL && "flex-row-reverse"
          )}>
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap min-h-[36px] flex items-center"
              onClick={() => setSelectedCategory(null)}
            >
              {t("common.all", "All")}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap min-h-[36px] flex items-center"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Items grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2 p-2">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemSelect(item)}
              className={cn(
                "flex flex-col p-3 rounded-lg border bg-card hover:bg-accent/50",
                "transition-colors min-h-[80px] text-start relative",
                "active:scale-95 touch-manipulation",
                item.unit_price === null && "border-yellow-500/50"
              )}
            >
              {item.unit_price === null && (
                <AlertCircle className="absolute top-1 right-1 h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium text-sm line-clamp-2">
                {getDisplayName(item)}
              </span>
              <span className={cn(
                "mt-auto text-sm font-semibold",
                item.unit_price === null ? "text-yellow-600" : "text-primary"
              )}>
                {item.unit_price !== null 
                  ? `${item.unit_price.toFixed(2)}`
                  : t("finance.pos.priceMissing", "No price")
                }
              </span>
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {t("common.noResults", "No items found")}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
