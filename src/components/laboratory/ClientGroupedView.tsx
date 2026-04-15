import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, User, FlaskConical, Building2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getLabClientDisplayName } from "@/lib/laboratory/clientDisplay";

type GroupState = 'complete' | 'in_progress' | 'mixed' | 'pending';

interface ClientGroup {
  clientId: string | null;
  clientName: string;
  senderStable: string | null;
  samples: LabSample[];
  horses: Array<{
    horseId: string | null;
    horseName: string;
    dailyNumber: number | null;
    sampleId: string;
    status: string;
  }>;
  totalTests: number;
  completedSamples: number;
  dailyNumberRange: { min: number; max: number } | null;
  groupState: GroupState;
}

interface ClientGroupedViewProps {
  samples: LabSample[];
  onSampleClick?: (sampleId: string) => void;
}

function deriveGroupState(samples: LabSample[]): GroupState {
  if (samples.length === 0) return 'pending';
  const allCompleted = samples.every(s => s.status === 'completed');
  const allPending = samples.every(s => s.status === 'draft');
  const hasCompleted = samples.some(s => s.status === 'completed');
  const hasActive = samples.some(s => s.status === 'processing' || s.status === 'accessioned');
  
  if (allCompleted) return 'complete';
  if (allPending) return 'pending';
  if (hasCompleted || hasActive) return 'mixed';
  return 'in_progress';
}

function GroupStateBadge({ state, t }: { state: GroupState; t: (key: string) => string }) {
  const config = {
    complete: { label: t("laboratory.groupState.complete"), icon: CheckCircle2, className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" },
    in_progress: { label: t("laboratory.groupState.inProgress"), icon: Clock, className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" },
    mixed: { label: t("laboratory.groupState.mixed"), icon: AlertTriangle, className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
    pending: { label: t("laboratory.groupState.pending"), icon: Clock, className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800" },
  }[state];

  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      <Icon className="h-3 w-3 me-1" />
      {config.label}
    </Badge>
  );
}

export function ClientGroupedView({ samples, onSampleClick }: ClientGroupedViewProps) {
  const { t } = useI18n();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const clientGroups = useMemo((): ClientGroup[] => {
    const groupMap = new Map<string, ClientGroup>();

    samples.forEach(sample => {
      const clientKey = sample.client_id || 'no-client';
      const clientName = getLabClientDisplayName(sample, { fallback: t("laboratory.clientGrouped.noClient") }) || t("laboratory.clientGrouped.noClient");
      const senderStable = sample.lab_request?.initiator_tenant_name_snapshot || null;

      if (!groupMap.has(clientKey)) {
        groupMap.set(clientKey, {
          clientId: sample.client_id,
          clientName,
          senderStable,
          samples: [],
          horses: [],
          totalTests: 0,
          completedSamples: 0,
          dailyNumberRange: null,
          groupState: 'pending',
        });
      }

      const group = groupMap.get(clientKey)!;
      group.samples.push(sample);
      // Keep first non-null sender
      if (!group.senderStable && senderStable) group.senderStable = senderStable;
      
      const horseName = sample.horse?.name || sample.horse_name || t("laboratory.samples.unknownHorse");
      
      group.horses.push({
        horseId: sample.horse_id,
        horseName,
        dailyNumber: sample.daily_number,
        sampleId: sample.id,
        status: sample.status,
      });

      group.totalTests += sample.templates?.length || 0;
      if (sample.status === 'completed') group.completedSamples++;

      if (sample.daily_number !== null) {
        if (!group.dailyNumberRange) {
          group.dailyNumberRange = { min: sample.daily_number, max: sample.daily_number };
        } else {
          group.dailyNumberRange.min = Math.min(group.dailyNumberRange.min, sample.daily_number);
          group.dailyNumberRange.max = Math.max(group.dailyNumberRange.max, sample.daily_number);
        }
      }
    });

    // Derive group state after all samples are added
    groupMap.forEach(group => {
      group.groupState = deriveGroupState(group.samples);
    });

    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.dailyNumberRange && b.dailyNumberRange) return a.dailyNumberRange.min - b.dailyNumberRange.min;
      if (a.dailyNumberRange) return -1;
      if (b.dailyNumberRange) return 1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [samples, t]);

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
        const progressPercent = group.samples.length > 0 
          ? (group.completedSamples / group.samples.length) * 100 
          : 0;

        return (
          <Card 
            key={clientKey} 
            className={cn(
              "hover:shadow-md transition-shadow",
              group.groupState === 'complete' && "border-green-200 dark:border-green-800/50",
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
                    <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-muted-foreground">
                      <span>{group.horses.length} {t("laboratory.clientGrouped.horses")}</span>
                      <span>•</span>
                      <span>{group.samples.length} {t("laboratory.clientGrouped.samples")}</span>
                      {group.dailyNumberRange && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {group.dailyNumberRange.min === group.dailyNumberRange.max
                              ? `#${group.dailyNumberRange.min}`
                              : `#${group.dailyNumberRange.min}-${group.dailyNumberRange.max}`
                            }
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <GroupStateBadge state={group.groupState} t={t} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-xs text-muted-foreground">
                {group.totalTests} {t("laboratory.clientGrouped.tests")}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("laboratory.clientGrouped.progress")}</span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(clientKey)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                    <span>{t("laboratory.clientGrouped.showHorses")}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {group.horses.map((horse, idx) => {
                      const isComplete = horse.status === 'completed';
                      const isCancelled = horse.status === 'cancelled';
                      return (
                        <div
                          key={`${horse.sampleId}-${idx}`}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-sm",
                            isComplete && "opacity-60",
                            isCancelled && "opacity-40 line-through",
                          )}
                          onClick={() => onSampleClick?.(horse.sampleId)}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="flex-1 truncate">{horse.horseName}</span>
                          <Badge 
                            variant={horse.dailyNumber !== null ? "secondary" : "outline"} 
                            className={cn(
                              "text-xs font-mono shrink-0",
                              horse.dailyNumber === null && "text-muted-foreground"
                            )}
                          >
                            {horse.dailyNumber !== null ? `#${horse.dailyNumber}` : "-"}
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
