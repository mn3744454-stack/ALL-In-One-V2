import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Calendar, Building2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/i18n";
import type { StableResultGroup, StableLabResult } from "@/hooks/laboratory/useStableLabResults";

interface StableResultViewerDialogProps {
  group: StableResultGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StableResultViewerDialog({ group, open, onOpenChange }: StableResultViewerDialogProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(group.results[0]?.id || "");

  const getFlagIcon = (flag: string | null) => {
    switch (flag) {
      case 'normal': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'abnormal': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {group.testDescription || t("laboratory.results.unknownTest")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta info header */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.preview.horse")}</p>
              <p className="font-semibold">{group.horseName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.stableResults.labName")}</p>
              <p className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {group.labName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("laboratory.stableResults.publishedAt")}</p>
              <p className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {group.publishedAt ? format(new Date(group.publishedAt), "PPP") : "—"}
              </p>
            </div>
            {group.physicalSampleId && (
              <div>
                <p className="text-xs text-muted-foreground uppercase">{t("laboratory.preview.sampleId")}</p>
                <p className="font-mono text-sm">{group.physicalSampleId}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Results - tabs if multiple, inline if single */}
          {group.results.length === 1 ? (
            <ResultDataView result={group.results[0]} getFlagIcon={getFlagIcon} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full flex-wrap h-auto gap-1">
                {group.results.map((r) => (
                  <TabsTrigger key={r.id} value={r.id} className="text-xs gap-1">
                    {r.flags && getFlagIcon(r.flags)}
                    {r.template_name || "Result"}
                  </TabsTrigger>
                ))}
              </TabsList>
              {group.results.map((r) => (
                <TabsContent key={r.id} value={r.id}>
                  <ResultDataView result={r} getFlagIcon={getFlagIcon} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultDataView({
  result,
  getFlagIcon,
}: {
  result: StableLabResult;
  getFlagIcon: (f: string | null) => React.ReactNode;
}) {
  const { t } = useI18n();
  const resultData = (result.result_data || {}) as Record<string, unknown>;
  const interpretation = result.interpretation;

  return (
    <div className="space-y-3">
      {/* Flags */}
      {result.flags && (
        <div className="flex items-center gap-2">
          {getFlagIcon(result.flags)}
          <span className="capitalize font-medium">{result.flags}</span>
        </div>
      )}

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
  );
}
