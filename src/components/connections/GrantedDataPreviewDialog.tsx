import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { useConsentGrants } from "@/hooks/connections";
import { Database, FileText, Calendar, Shield, Beaker } from "lucide-react";

interface GrantedDataPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantId: string;
  resourceType: string;
  dateFrom?: string;
  dateTo?: string;
}

interface GrantedDataResponse {
  grant_id: string;
  resource_type: string;
  access_level: string;
  horse_ids: string[] | null;
  effective_from: string | null;
  effective_to: string | null;
  lab_results?: unknown[];
  vet_records?: unknown[];
  breeding_records?: unknown[];
}

export function GrantedDataPreviewDialog({
  open,
  onOpenChange,
  grantId,
  resourceType,
  dateFrom,
  dateTo,
}: GrantedDataPreviewDialogProps) {
  const { t } = useI18n();
  const { getGrantedData } = useConsentGrants();
  const [data, setData] = useState<GrantedDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && grantId) {
      loadData();
    }
  }, [open, grantId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getGrantedData(grantId, dateFrom, dateTo);
      setData(result as unknown as GrantedDataResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const getResourceIcon = () => {
    switch (resourceType) {
      case "lab_results":
        return <Beaker className="h-5 w-5" />;
      case "vet_records":
        return <FileText className="h-5 w-5" />;
      case "breeding_records":
        return <Database className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getDataArray = (): unknown[] => {
    if (!data) return [];
    if (resourceType === "lab_results" && Array.isArray(data.lab_results)) {
      return data.lab_results;
    }
    if (resourceType === "vet_records" && Array.isArray(data.vet_records)) {
      return data.vet_records;
    }
    if (
      resourceType === "breeding_records" &&
      Array.isArray(data.breeding_records)
    ) {
      return data.breeding_records;
    }
    return [];
  };

  const dataArray = getDataArray();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getResourceIcon()}
            {t("connections.sharedWithMe.previewTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(`connections.grants.resourceTypes.${resourceType}` as keyof typeof t)}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
          </div>
        ) : data ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{data.access_level}</Badge>
                    </div>
                    {data.horse_ids && data.horse_ids.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          {t("connections.sharedWithMe.horsesCount")}:{" "}
                        </span>
                        <span className="font-medium">
                          {data.horse_ids.length}
                        </span>
                      </div>
                    )}
                    {(data.effective_from || data.effective_to) && (
                      <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {data.effective_from || "∞"} →{" "}
                          {data.effective_to || "∞"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Data Content */}
              {dataArray.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {resourceType === "lab_results" && (
                        <>
                          <Beaker className="h-4 w-4" />
                          {t("connections.sharedWithMe.labResultsCount")}:{" "}
                          {dataArray.length}
                        </>
                      )}
                      {resourceType !== "lab_results" && (
                        <>
                          <FileText className="h-4 w-4" />
                          Records: {dataArray.length}
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-64">
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(dataArray, null, 2)}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No data available for this grant</p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
