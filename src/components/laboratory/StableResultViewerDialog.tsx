import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FlaskConical, Calendar, Building2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import type { StableLabResult } from "@/hooks/laboratory/useStableLabResults";

interface StableResultViewerDialogProps {
  result: StableLabResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StableResultViewerDialog({ result, open, onOpenChange }: StableResultViewerDialogProps) {
  const { t } = useI18n();

  const getFlagIcon = (flag: string | null) => {
    switch (flag) {
      case 'normal': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const resultData = (result.result_data || {}) as Record<string, unknown>;
  const interpretation = result.interpretation;
  const horseName = result.horse_name_snapshot || result.horse_name || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {result.template_name || result.test_description || t("laboratory.results.unknownTest")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.preview.horse")}</p>
              <p className="font-semibold">{horseName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.stableResults.labName")}</p>
              <p className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {result.lab_tenant_name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.results.statusFilter")}</p>
              <Badge
                variant="outline"
                className={
                  result.status === 'final' ? 'border-green-600 text-green-600' :
                  result.status === 'reviewed' ? 'border-blue-600 text-blue-600' :
                  'border-yellow-600 text-yellow-600'
                }
              >
                {t(`laboratory.results.status.${result.status}`) || result.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.stableResults.publishedAt")}</p>
              <p className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {result.published_at ? format(new Date(result.published_at), "PPP") : "—"}
              </p>
            </div>
            {result.physical_sample_id && (
              <div>
                <p className="text-xs text-muted-foreground uppercase">{t("laboratory.preview.sampleId")}</p>
                <p className="font-mono text-sm">{result.physical_sample_id}</p>
              </div>
            )}
          </div>

          {/* Flags */}
          {result.flags && (
            <div className="flex items-center gap-2">
              {getFlagIcon(result.flags)}
              <span className="capitalize font-medium">{result.flags}</span>
            </div>
          )}

          <Separator />

          {/* Result data */}
          {Object.keys(resultData).length > 0 ? (
            <div className="space-y-2">
              <h4 className="font-medium">{t("laboratory.preview.testResults")}</h4>
              <div className="space-y-2">
                {Object.entries(resultData).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{key}</span>
                    <span className="font-mono">{value !== null && value !== undefined ? String(value) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t("laboratory.sharedResult.noResultData")}</p>
          )}

          {/* Interpretation */}
          {interpretation && Object.keys(interpretation).length > 0 && (
            <>
              <Separator />
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">{t("laboratory.preview.interpretation")}</h4>
                <p className="text-sm text-muted-foreground">
                  {typeof interpretation === 'string' ? interpretation : JSON.stringify(interpretation)}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
