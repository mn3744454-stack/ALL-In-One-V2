import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTenant } from "@/contexts/TenantContext";
import { useActivityLog, type ActivityItem } from "@/hooks/useActivityLog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Menu,
  Search,
  FileText,
  Activity,
  Stethoscope,
  FlaskConical,
  Baby,
  ClipboardList,
  ArrowRight,
  Clock,
  User,
  FolderOpen,
} from "lucide-react";

const moduleIcons: Record<string, React.ElementType> = {
  vet: Stethoscope,
  lab: FlaskConical,
  breeding: Baby,
  orders: ClipboardList,
};

const moduleColors: Record<string, string> = {
  vet: "bg-green-100 text-green-700",
  lab: "bg-cyan-100 text-cyan-700",
  breeding: "bg-pink-100 text-pink-700",
  orders: "bg-orange-100 text-orange-700",
};

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const { t, dir } = useI18n();
  const Icon = moduleIcons[item.module] || Activity;
  const colorClass = moduleColors[item.module] || "bg-muted text-muted-foreground";

  const getEventDescription = () => {
    if (item.fromStatus && item.toStatus) {
      return (
        <span className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{item.fromStatus}</Badge>
          <ArrowRight className="w-3 h-3" />
          <Badge variant="outline" className="text-xs">{item.toStatus}</Badge>
        </span>
      );
    }
    return <span className="text-sm">{item.eventType}</span>;
  };

  return (
    <div className="flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {t(`records.modules.${item.module}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {item.entityType}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-navy">{item.eventType}</span>
          {getEventDescription()}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
          </div>
          {item.creatorName && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{item.creatorName}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground text-end shrink-0">
        {format(new Date(item.createdAt), "MMM d, h:mm a")}
      </div>
    </div>
  );
}

function ActivityList({ 
  items, 
  loading,
  hasMore,
  onLoadMore,
}: { 
  items: ActivityItem[]; 
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const { t } = useI18n();

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy mb-1">{t("records.empty")}</h3>
        <p className="text-sm text-muted-foreground">{t("records.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {items.map((item) => (
          <ActivityItemRow key={item.id} item={item} />
        ))}
        
        {hasMore && (
          <div className="p-4 text-center">
            <Button 
              variant="outline" 
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? t("common.loading") : t("records.loadMore")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardRecords() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [limit, setLimit] = useState(20);
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();
  const navigate = useNavigate();

  const activeTab = searchParams.get("tab") || "activity";

  const { items, isLoading, totalCount } = useActivityLog({
    tenantId: activeTenant?.tenant.id,
    module: moduleFilter !== "all" ? moduleFilter : undefined,
    limit,
  });

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.eventType.toLowerCase().includes(query) ||
      item.entityType.toLowerCase().includes(query) ||
      item.creatorName?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 20);
  };

  const goToFileManager = () => {
    navigate("/dashboard/files");
  };

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-navy">{t("records.title")}</h1>
          <div className="w-10" />
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("records.title")}</h1>
            <p className="text-muted-foreground">{t("records.subtitle")}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="w-4 h-4" />
              {t("records.tabs.activity")}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              {t("records.tabs.documents")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                      dir === "rtl" ? "right-3" : "left-3"
                    )} />
                    <Input
                      placeholder={t("records.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
                    />
                  </div>
                  
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={t("records.filters.module")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="vet">{t("records.modules.vet")}</SelectItem>
                      <SelectItem value="lab">{t("records.modules.lab")}</SelectItem>
                      <SelectItem value="breeding">{t("records.modules.breeding")}</SelectItem>
                      <SelectItem value="orders">{t("records.modules.orders")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Activity List */}
            <ActivityList 
              items={filteredItems}
              loading={isLoading}
              hasMore={items.length < totalCount}
              onLoadMore={handleLoadMore}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-navy mb-2">{t("records.documentsTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("records.documentsDesc")}
                </p>
                <Button onClick={goToFileManager}>
                  {t("records.goToFileManager")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
