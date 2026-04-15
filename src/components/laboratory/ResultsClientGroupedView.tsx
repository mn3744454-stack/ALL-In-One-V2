import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, User, FileText, CheckCircle2, AlertTriangle, Building2, Clock } from "lucide-react";
import type { LabResult } from "@/hooks/laboratory/useLabResults";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getLabClientDisplayName } from "@/lib/laboratory/clientDisplay";

type ResultGroupState = 'all_final' | 'all_reviewed' | 'all_draft' | 'mixed';

interface ClientResultGroup {
  clientId: string | null;
  clientName: string;
  senderStable: string | null;
  samples: Array<{
    sample: LabSample;
    results: LabResult[];
    horseName: string;
  }>;
  totalResults: number;
  draftCount: number;
  reviewedCount: number;
  finalCount: number;
  groupState: ResultGroupState;
}

interface ResultsClientGroupedViewProps {
  results: LabResult[];
  samples: LabSample[];
  onSampleClick?: (sampleId: string) => void;
}

function deriveResultGroupState(draftCount: number, reviewedCount: number, finalCount: number, total: number): ResultGroupState {
  if (total === 0) return 'all_draft';
  if (finalCount === total) return 'all_final';
  if (reviewedCount === total) return 'all_reviewed';
  if (draftCount === total) return 'all_draft';
  return 'mixed';
}

function ResultGroupStateBadge({ state, t }: { state: ResultGroupState; t: (key: string) => string }) {
  const config = {
    all_final: { label: t("laboratory.groupState.allFinal"), icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" },
    all_reviewed: { label: t("laboratory.groupState.allReviewed"), icon: CheckCircle2, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" },
    all_draft: { label: t("laboratory.groupState.allDraft"), icon: Clock, className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800" },
    mixed: { label: t("laboratory.groupState.mixed"), icon: AlertTriangle, className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
  }[state];

  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      <Icon className="h-3 w-3 me-1" />
      {config.label}
    </Badge>
  );
}

export function ResultsClientGroupedView({ 
  results, 
  samples,
  onSampleClick 
}: ResultsClientGroupedViewProps) {
  const { t } = useI18n();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const clientGroups = useMemo((): ClientResultGroup[] => {
    const resultsBySample = new Map<string, LabResult[]>();
    results.forEach(r => {
      const existing = resultsBySample.get(r.sample_id) || [];
      existing.push(r);
      resultsBySample.set(r.sample_id, existing);
    });

    const sampleGroups = new Map<string | null, Array<{
      sample: LabSample;
      results: LabResult[];
      horseName: string;
    }>>();

    resultsBySample.forEach((sampleResults, sampleId) => {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;

      const clientId = sample.client_id;
      const horseName = sample.horse?.name || sample.horse?.name_ar || sample.horse_name || t("laboratory.results.unknownHorse");
      
      const existing = sampleGroups.get(clientId) || [];
      existing.push({ sample, results: sampleResults, horseName });
      sampleGroups.set(clientId, existing);
    });

    const groups: ClientResultGroup[] = [];
    
    sampleGroups.forEach((clientSamples, clientId) => {
      const firstSample = clientSamples[0]?.sample;
      const clientName = getLabClientDisplayName(firstSample, { fallback: t("laboratory.clientGrouped.noClientAssigned") }) || t("laboratory.clientGrouped.noClientAssigned");
      const senderStable = firstSample?.lab_request?.initiator_tenant_name_snapshot || null;
      
      let draftCount = 0;
      let reviewedCount = 0;
      let finalCount = 0;

      clientSamples.forEach(cs => {
        cs.results.forEach(r => {
          if (r.status === 'draft') draftCount++;
          else if (r.status === 'reviewed') reviewedCount++;
          else if (r.status === 'final') finalCount++;
        });
      });

      const totalResults = clientSamples.reduce((acc, cs) => acc + cs.results.length, 0);

      groups.push({
        clientId,
        clientName,
        senderStable,
        samples: clientSamples,
        totalResults,
        draftCount,
        reviewedCount,
        finalCount,
        groupState: deriveResultGroupState(draftCount, reviewedCount, finalCount, totalResults),
      });
    });

    groups.sort((a, b) => a.clientName.localeCompare(b.clientName));
    return groups;
  }, [results, samples, t]);

  const toggleExpanded = (clientKey: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientKey)) next.delete(clientKey);
      else next.add(clientKey);
      return next;
    });
  };

  if (clientGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">{t("laboratory.clientGrouped.noClients")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("laboratory.clientGrouped.noClientsDesc")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clientGroups.map(group => {
        const clientKey = group.clientId || 'no-client';
        const isExpanded = expandedClients.has(clientKey);
        const finalPercent = group.totalResults > 0 
          ? (group.finalCount / group.totalResults) * 100 
          : 0;

        return (
          <Card 
            key={clientKey} 
            className={cn(
              "hover:shadow-md transition-shadow",
              group.groupState === 'all_final' && "border-green-200 dark:border-green-800/50",
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{group.clientName}</h3>
                    {group.senderStable && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{group.senderStable}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>
                        {t("laboratory.results.samplesCount").replace("{{count}}", String(group.samples.length))}
                      </span>
                      <span>•</span>
                      <span>
                        {t("laboratory.results.resultsCount").replace("{{count}}", String(group.totalResults))}
                      </span>
                    </div>
                  </div>
                </div>
                <ResultGroupStateBadge state={group.groupState} t={t} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Status distribution badges */}
              <div className="flex flex-wrap gap-1.5">
                {group.draftCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200">
                    {t("laboratory.resultStatus.draft")}: {group.draftCount}
                  </Badge>
                )}
                {group.reviewedCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200">
                    {t("laboratory.resultStatus.reviewed")}: {group.reviewedCount}
                  </Badge>
                )}
                {group.finalCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200">
                    {t("laboratory.resultStatus.final")}: {group.finalCount}
                  </Badge>
                )}
              </div>

              {/* Finalized progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("laboratory.results.finalizedProgress")}</span>
                  <span className="font-medium">{Math.round(finalPercent)}%</span>
                </div>
                <Progress value={finalPercent} className="h-2" />
              </div>

              {/* Collapsible samples */}
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(clientKey)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                    <span>{t("laboratory.results.showSamples")}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {group.samples.map((sampleGroup) => {
                      const allFinal = sampleGroup.results.every(r => r.status === 'final');
                      const hasDraft = sampleGroup.results.some(r => r.status === 'draft');
                      
                      return (
                        <div
                          key={sampleGroup.sample.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-sm",
                            allFinal && "opacity-60",
                          )}
                          onClick={() => onSampleClick?.(sampleGroup.sample.id)}
                        >
                          {allFinal ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : hasDraft ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="flex-1 truncate">{sampleGroup.horseName}</span>
                          <Badge variant="outline" className="text-xs">
                            {sampleGroup.results.length}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
