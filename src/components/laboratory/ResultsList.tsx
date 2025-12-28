import { useState } from "react";
import { useLabResults, type LabResultStatus, type LabResultFlags } from "@/hooks/laboratory/useLabResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  CheckCircle2, 
  Eye,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResultsListProps {
  onCreateResult?: () => void;
  onResultClick?: (resultId: string) => void;
}

const statusColors: Record<LabResultStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  final: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const flagColors: Record<LabResultFlags, string> = {
  normal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  abnormal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function ResultsList({ onCreateResult, onResultClick }: ResultsListProps) {
  const [statusFilter, setStatusFilter] = useState<LabResultStatus | 'all'>('all');
  const [flagsFilter, setFlagsFilter] = useState<LabResultFlags | 'all'>('all');
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<string | null>(null);

  const { 
    results, 
    loading, 
    canManage,
    reviewResult,
    finalizeResult,
    deleteResult,
  } = useLabResults({ 
    status: statusFilter !== 'all' ? statusFilter : undefined,
    flags: flagsFilter !== 'all' ? flagsFilter : undefined,
  });

  // Filter by search
  const filteredResults = results.filter(r => {
    if (!search) return true;
    const horseName = r.sample?.horse?.name?.toLowerCase() || '';
    const sampleId = r.sample?.physical_sample_id?.toLowerCase() || '';
    const templateName = r.template?.name?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    return horseName.includes(searchLower) || sampleId.includes(searchLower) || templateName.includes(searchLower);
  });

  const handleDelete = async () => {
    if (!resultToDelete) return;
    await deleteResult(resultToDelete);
    setDeleteDialogOpen(false);
    setResultToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LabResultStatus | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select value={flagsFilter} onValueChange={(v) => setFlagsFilter(v as LabResultFlags | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Flags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Flags</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="abnormal">Abnormal</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canManage && onCreateResult && (
            <Button onClick={onCreateResult}>
              <Plus className="h-4 w-4 mr-2" />
              New Result
            </Button>
          )}
        </div>

        {/* Results Grid */}
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== 'all' || flagsFilter !== 'all' || search 
                ? "Try adjusting your filters" 
                : "Create your first result to get started"}
            </p>
            {canManage && onCreateResult && !search && statusFilter === 'all' && (
              <Button onClick={onCreateResult} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Enter Result
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResults.map((result) => {
              const horseName = result.sample?.horse?.name || 'Unknown Horse';
              const horseInitials = horseName.slice(0, 2).toUpperCase();

              return (
                <Card 
                  key={result.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onResultClick?.(result.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={undefined} alt={horseName} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {horseInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm">{horseName}</h3>
                          <p className="text-xs text-muted-foreground">
                            {result.template?.name || 'Unknown Template'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[result.status]}>
                          {result.status}
                        </Badge>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResultClick?.(result.id); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {result.status === 'draft' && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); reviewResult(result.id); }}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark Reviewed
                                </DropdownMenuItem>
                              )}
                              {result.status === 'reviewed' && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); finalizeResult(result.id); }}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Finalize
                                </DropdownMenuItem>
                              )}
                              {result.status !== 'final' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setResultToDelete(result.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {result.sample?.physical_sample_id && (
                          <span className="font-mono">{result.sample.physical_sample_id}</span>
                        )}
                      </div>
                      {result.flags && (
                        <Badge className={flagColors[result.flags]} variant="outline">
                          {result.flags}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(result.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this result? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
