import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/contexts/TenantContext";
import { useMediaAssets, type MediaAsset } from "@/hooks/useMediaAssets";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Menu,
  Search,
  Grid3X3,
  List,
  Image,
  Video,
  FileText,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  Lock,
  Users,
  Link,
  HardDrive,
  Images,
  Film,
  FolderOpen,
  Filter,
} from "lucide-react";
import { MobilePageHeader } from "@/components/navigation";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function FileStats({ 
  totalFiles, 
  totalSize, 
  imagesCount, 
  videosCount,
  loading,
}: { 
  totalFiles: number;
  totalSize: number;
  imagesCount: number;
  videosCount: number;
  loading: boolean;
}) {
  const { t } = useI18n();

  const stats = [
    { icon: FolderOpen, label: t("files.stats.totalFiles"), value: totalFiles },
    { icon: HardDrive, label: t("files.stats.totalSize"), value: formatBytes(totalSize) },
    { icon: Images, label: t("files.stats.images"), value: imagesCount },
    { icon: Film, label: t("files.stats.videos"), value: videosCount },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-gold" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-xl font-bold text-navy">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FileCard({ 
  asset, 
  selected,
  onSelect,
  onView,
  onDelete,
}: { 
  asset: MediaAsset;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onView: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}) {
  const { t } = useI18n();
  const isImage = asset.mime_type?.startsWith("image/");
  const isVideo = asset.mime_type?.startsWith("video/");

  const getVisibilityIcon = () => {
    switch (asset.visibility) {
      case "private":
        return <Lock className="w-3 h-3" />;
      case "shared_link":
        return <Link className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  return (
    <Card className={cn(
      "group cursor-pointer transition-all hover:shadow-md",
      selected && "ring-2 ring-gold"
    )}>
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Image className="w-12 h-12 text-muted-foreground" />
            </div>
          ) : isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Video className="w-12 h-12 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Selection checkbox */}
          <div className="absolute top-2 start-2">
            <Checkbox 
              checked={selected}
              onCheckedChange={(checked) => onSelect(asset.id, !!checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Hover actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button 
              size="icon" 
              variant="secondary"
              onClick={() => onView(asset)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="secondary"
              onClick={() => onDelete(asset)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Info */}
        <div className="p-3">
          <p className="font-medium text-sm text-navy truncate" title={asset.filename}>
            {asset.filename}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {formatBytes(asset.size_bytes || 0)}
            </span>
            <Badge variant="outline" className="text-xs gap-1">
              {getVisibilityIcon()}
              {t(`files.visibility.${asset.visibility}`)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(asset.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FileListRow({ 
  asset, 
  selected,
  onSelect,
  onView,
  onDelete,
}: { 
  asset: MediaAsset;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onView: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}) {
  const { t, dir } = useI18n();
  const isImage = asset.mime_type?.startsWith("image/");
  const isVideo = asset.mime_type?.startsWith("video/");
  const Icon = isImage ? Image : isVideo ? Video : FileText;

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
      selected && "bg-gold/5"
    )}>
      <Checkbox 
        checked={selected}
        onCheckedChange={(checked) => onSelect(asset.id, !!checked)}
      />
      
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-navy truncate">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">
          {asset.entity_type} • {formatBytes(asset.size_bytes || 0)}
        </p>
      </div>
      
      <Badge variant="outline" className="shrink-0">
        {t(`files.visibility.${asset.visibility}`)}
      </Badge>
      
      <span className="text-sm text-muted-foreground shrink-0">
        {format(new Date(asset.created_at), "MMM d, yyyy")}
      </span>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={dir === "rtl" ? "start" : "end"}>
          <DropdownMenuItem onClick={() => onView(asset)}>
            <Eye className="w-4 h-4 me-2" />
            {t("files.actions.view")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(asset)} className="text-destructive">
            <Trash2 className="w-4 h-4 me-2" />
            {t("files.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DashboardFileManager() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { activeTenant } = useTenant();
  const { t, dir } = useI18n();

  // Read URL params for deep-linking
  const urlEntityType = searchParams.get("entity_type");
  const urlEntityId = searchParams.get("entity_id");

  const { 
    assets, 
    isLoading, 
    deleteAsset,
    isDeleting,
  } = useMediaAssets({
    tenantId: activeTenant?.tenant.id,
    entityType: urlEntityType || (entityTypeFilter !== "all" ? entityTypeFilter : undefined),
    entityId: urlEntityId || undefined,
  });

  // Filter and compute stats
  const filteredAssets = useMemo(() => {
    let result = assets;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => a.filename.toLowerCase().includes(query));
    }
    
    if (visibilityFilter !== "all") {
      result = result.filter(a => a.visibility === visibilityFilter);
    }
    
    return result;
  }, [assets, searchQuery, visibilityFilter]);

  const stats = useMemo(() => ({
    totalFiles: assets.length,
    totalSize: assets.reduce((sum, a) => sum + (a.size_bytes || 0), 0),
    imagesCount: assets.filter(a => a.mime_type?.startsWith("image/")).length,
    videosCount: assets.filter(a => a.mime_type?.startsWith("video/")).length,
  }), [assets]);

  const handleSelect = (id: string, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleView = (asset: MediaAsset) => {
    // TODO: Implement view modal with signed URL
    toast.info(t("files.viewComingSoon"));
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (confirm(t("files.confirmDelete"))) {
      await deleteAsset(asset.id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`${t("files.confirmBulkDelete")} (${selectedIds.size})`)) {
      for (const id of selectedIds) {
        await deleteAsset(id);
      }
      setSelectedIds(new Set());
    }
  };

  return (
    <div className={cn("min-h-screen bg-cream flex", dir === "rtl" && "flex-row-reverse")}>
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <MobilePageHeader title={t("files.title")} backTo="/dashboard" />

        <div className="p-4 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy">{t("files.title")}</h1>
            <p className="text-muted-foreground">{t("files.subtitle")}</p>
          </div>
        </div>

        {/* Stats */}
        <FileStats {...stats} loading={isLoading} />

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
                  placeholder={t("files.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(dir === "rtl" ? "pr-10" : "pl-10")}
                />
              </div>
              
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("files.filters.entityType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="horse">{t("files.entityTypes.horse")}</SelectItem>
                  <SelectItem value="invoice">{t("files.entityTypes.invoice")}</SelectItem>
                  <SelectItem value="expense">{t("files.entityTypes.expense")}</SelectItem>
                  <SelectItem value="lab_result">{t("files.entityTypes.labResult")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("files.filters.visibility")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="tenant">{t("files.visibility.tenant")}</SelectItem>
                  <SelectItem value="private">{t("files.visibility.private")}</SelectItem>
                  <SelectItem value="shared_link">{t("files.visibility.sharedLink")}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("grid")}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <Checkbox
                  checked={selectedIds.size === filteredAssets.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} {t("files.selected")}
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  {t("files.actions.deleteSelected")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className={cn(
            view === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-2"
          )}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className={view === "grid" ? "aspect-square rounded-lg" : "h-16 rounded-lg"} />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-navy mb-1">{t("files.empty")}</h3>
              <p className="text-sm text-muted-foreground">{t("files.emptyDesc")}</p>
            </CardContent>
          </Card>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => (
              <FileCard
                key={asset.id}
                asset={asset}
                selected={selectedIds.has(asset.id)}
                onSelect={handleSelect}
                onView={handleView}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {filteredAssets.map((asset) => (
                <FileListRow
                  key={asset.id}
                  asset={asset}
                  selected={selectedIds.has(asset.id)}
                  onSelect={handleSelect}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              ))}
            </CardContent>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
