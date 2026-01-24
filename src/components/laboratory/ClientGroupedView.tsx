import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, User, FlaskConical } from "lucide-react";
import type { LabSample } from "@/hooks/laboratory/useLabSamples";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { getLabClientDisplayName } from "@/lib/laboratory/clientDisplay";

interface ClientGroup {
  clientId: string | null;
  clientName: string;
  samples: LabSample[];
  horses: Array<{
    horseId: string | null;
    horseName: string;
    dailyNumber: number | null;
    sampleId: string;
  }>;
  totalTests: number;
  completedSamples: number;
  dailyNumberRange: { min: number; max: number } | null;
}

interface ClientGroupedViewProps {
  samples: LabSample[];
  onSampleClick?: (sampleId: string) => void;
}

export function ClientGroupedView({ samples, onSampleClick }: ClientGroupedViewProps) {
  const { t, dir } = useI18n();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Group samples by client
  const clientGroups = useMemo((): ClientGroup[] => {
    const groupMap = new Map<string, ClientGroup>();

    samples.forEach(sample => {
      const clientKey = sample.client_id || 'no-client';
      // Use centralized helper for client name resolution
      const clientName = getLabClientDisplayName(sample, { fallback: t("laboratory.clientGrouped.noClient") }) || t("laboratory.clientGrouped.noClient");

      if (!groupMap.has(clientKey)) {
        groupMap.set(clientKey, {
          clientId: sample.client_id,
          clientName,
          samples: [],
          horses: [],
          totalTests: 0,
          completedSamples: 0,
          dailyNumberRange: null,
        });
      }

      const group = groupMap.get(clientKey)!;
      group.samples.push(sample);
      
      // Get horse name (from joined horse or from horse_name field for external horses)
      const horseName = sample.horse?.name || sample.horse_name || t("laboratory.samples.unknownHorse");
      
      group.horses.push({
        horseId: sample.horse_id,
        horseName,
        dailyNumber: sample.daily_number,
        sampleId: sample.id,
      });

      // Count templates/tests
      group.totalTests += sample.templates?.length || 0;

      // Count completed samples
      if (sample.status === 'completed') {
        group.completedSamples++;
      }

      // Track daily number range
      if (sample.daily_number !== null) {
        if (!group.dailyNumberRange) {
          group.dailyNumberRange = { min: sample.daily_number, max: sample.daily_number };
        } else {
          group.dailyNumberRange.min = Math.min(group.dailyNumberRange.min, sample.daily_number);
          group.dailyNumberRange.max = Math.max(group.dailyNumberRange.max, sample.daily_number);
        }
      }
    });

    return Array.from(groupMap.values()).sort((a, b) => {
      // Sort by daily number range (earliest first)
      if (a.dailyNumberRange && b.dailyNumberRange) {
        return a.dailyNumberRange.min - b.dailyNumberRange.min;
      }
      if (a.dailyNumberRange) return -1;
      if (b.dailyNumberRange) return 1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [samples, t]);

  const toggleExpanded = (clientKey: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientKey)) {
        next.delete(clientKey);
      } else {
        next.add(clientKey);
      }
      return next;
    });
  };

  if (clientGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">{t("laboratory.clientGrouped.noClients")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("laboratory.clientGrouped.noClientsDesc")}
        </p>
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
          <Card key={clientKey} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{group.clientName}</h3>
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
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Tests count */}
              <div className="text-xs text-muted-foreground">
                {group.totalTests} {t("laboratory.clientGrouped.tests")}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("laboratory.clientGrouped.progress")}</span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Collapsible horses list */}
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(clientKey)}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between h-8 text-xs"
                  >
                    <span>{t("laboratory.clientGrouped.showHorses")}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {group.horses.map((horse, idx) => (
                      <div
                        key={`${horse.sampleId}-${idx}`}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
                          "text-sm"
                        )}
                        onClick={() => onSampleClick?.(horse.sampleId)}
                      >
                        <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{horse.horseName}</span>
                        {/* Show daily number or placeholder */}
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
                    ))}
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
