import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLabResults } from "@/hooks/laboratory/useLabResults";
import { useSampleInvoiceMap } from "@/hooks/laboratory/useSampleInvoiceMap";
import { usePermissions } from "@/hooks/usePermissions";
import { useLabSamples, type LabSample } from "@/hooks/laboratory/useLabSamples";
import { deriveSamplingProgress } from "@/hooks/laboratory/useLabSubmissionSamplingProgress";
import { SampleCard } from "./SampleCard";
import { SubmissionSamplingProgress } from "./SubmissionSamplingProgress";
import { BatchCreateSamplesDialog, type BatchEligibleChild } from "./BatchCreateSamplesDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, ChevronDown, ChevronUp, FlaskConical, Hourglass, Layers, Plus, PackageCheck, PackageX } from "lucide-react";
import { formatStandardDate } from "@/lib/displayHelpers";
import { useI18n } from "@/i18n";
import type { LabRequest } from "@/hooks/laboratory/useLabRequests";

interface SubmissionGroupedSamplesViewProps {
  samples: LabSample[];
  onSampleClick?: (sampleId: string) => void;
  pendingOnly?: boolean;
  /** Phase 6C — inline single-horse Create Sample launcher (reuses existing wizard). */
  onCreateSampleFromRequest?: (req: LabRequest) => void;
}

interface SubmissionMetaRow {
  id: string;
  created_at: string;
  initiator_tenant_name_snapshot: string | null;
  description: string | null;
}

interface AcceptedChildRow {
  id: string;
  submission_id: string | null;
  lab_decision: string | null;
  specimen_received_at: string | null;
  horse_id: string | null;
  horse_name_snapshot: string | null;
  horse_name_ar_snapshot: string | null;
  horse_snapshot: Record<string, unknown> | null;
  test_description: string | null;
  horse?: { id: string; name: string; name_ar: string | null } | null;
}

/**
 * Phase 6B — Submission-grouped Samples view.
 *
 * Reuses Phase 6A foundation (`deriveSamplingProgress`, `SubmissionSamplingProgress`,
 * existing `SampleCard`) and wraps the flat sample list into per-submission groups.
 *
 * For each submission group it shows:
 *  - submission ref + sender + date + sampling progress bar
 *  - all sample cards in that submission
 *  - placeholder rows for accepted-but-unsampled horses (so pending work is visible
 *    even when no `lab_samples` row exists yet)
 *
 * Samples without a `submission_id` (legacy / non-submission walk-ins) are bucketed
 * into a single "No submission" group so nothing disappears.
 */
export function SubmissionGroupedSamplesView({
  samples,
  onSampleClick,
  pendingOnly = false,
  onCreateSampleFromRequest,
}: SubmissionGroupedSamplesViewProps) {
  const { t } = useI18n();
  const { activeTenant, activeRole } = useTenant();
  const tenantId = activeTenant?.tenant?.id;
  const { isLabTenant, labMode } = useModuleAccess();
  const isLabFull = isLabTenant && labMode === "full";

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [batchOpen, setBatchOpen] = useState<{
    submissionId: string | null;
    shortRef: string | null;
    sender: string | null;
    eligible: BatchEligibleChild[];
  } | null>(null);

  // Submission ids referenced by the current sample slice
  const submissionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of samples) {
      const subId = s.lab_request?.submission_id;
      if (subId) ids.add(subId);
    }
    return Array.from(ids);
  }, [samples]);

  // Submission metadata (for header date + sender fallback)
  const { data: submissionMeta } = useQuery({
    queryKey: ["lab-submissions-meta", tenantId, submissionIds.sort().join(",")],
    queryFn: async (): Promise<Record<string, SubmissionMetaRow>> => {
      if (!tenantId || submissionIds.length === 0) return {};
      const filterCol = isLabFull ? "lab_tenant_id" : "initiator_tenant_id";
      const { data, error } = await supabase
        .from("lab_submissions")
        .select("id, created_at, initiator_tenant_name_snapshot, description")
        .in("id", submissionIds)
        .eq(filterCol, tenantId);
      if (error) throw error;
      const map: Record<string, SubmissionMetaRow> = {};
      for (const row of data || []) map[row.id] = row as SubmissionMetaRow;
      return map;
    },
    enabled: !!tenantId && submissionIds.length > 0,
    staleTime: 30_000,
  });

  // All accepted children for these submissions — used to show pending unsampled work
  const { data: acceptedChildren } = useQuery({
    queryKey: ["lab-submissions-accepted-children", tenantId, submissionIds.sort().join(",")],
    queryFn: async (): Promise<AcceptedChildRow[]> => {
      if (!tenantId || submissionIds.length === 0) return [];
      const filterCol = isLabFull ? "lab_tenant_id" : "tenant_id";
      const { data, error } = await supabase
        .from("lab_requests")
        .select("id, submission_id, lab_decision, specimen_received_at, horse_id, horse_name_snapshot, horse_name_ar_snapshot, horse_snapshot, test_description, horse:horses(id, name, name_ar)")
        .in("submission_id", submissionIds)
        .eq(filterCol, tenantId);
      if (error) throw error;
      return (data || []) as unknown as AcceptedChildRow[];
    },
    enabled: !!tenantId && submissionIds.length > 0,
    staleTime: 30_000,
  });

  // Group samples by submission_id; null submission gets its own bucket
  const grouped = useMemo(() => {
    const map = new Map<string | "_none", LabSample[]>();
    for (const s of samples) {
      const key = s.lab_request?.submission_id || "_none";
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [samples]);

  // Children per submission
  const childrenBySubmission = useMemo(() => {
    const map = new Map<string, AcceptedChildRow[]>();
    for (const c of acceptedChildren || []) {
      if (!c.submission_id) continue;
      const arr = map.get(c.submission_id) || [];
      arr.push(c);
      map.set(c.submission_id, arr);
    }
    return map;
  }, [acceptedChildren]);

  // Phase 6A progress per submission
  const progressBySubmission = useMemo(() => {
    const map = new Map<string, ReturnType<typeof deriveSamplingProgress>>();
    for (const subId of submissionIds) {
      const children = childrenBySubmission.get(subId) || [];
      const samplesForSub = grouped.get(subId) || [];
      const sampledIds = new Set<string>();
      for (const s of samplesForSub) {
        if (s.lab_request_id && s.status !== "cancelled") sampledIds.add(s.lab_request_id);
      }
      map.set(
        subId,
        deriveSamplingProgress(
          subId,
          children.map((c) => ({ id: c.id, lab_decision: c.lab_decision as any })),
          sampledIds
        )
      );
    }
    return map;
  }, [submissionIds, childrenBySubmission, grouped]);

  // Shared bits for SampleCard
  const { results, reviewResult, finalizeResult } = useLabResults();
  const sampleIds = useMemo(() => samples.map((s) => s.id), [samples]);
  const { sampleInvoiceMap } = useSampleInvoiceMap(sampleIds);
  const resultsCountBySample = useMemo(() => {
    const m: Record<string, number> = {};
    results.forEach((r) => { m[r.sample_id] = (m[r.sample_id] || 0) + 1; });
    return m;
  }, [results]);
  const { canManage } = useLabSamples({});
  const { hasPermission, isOwner } = usePermissions();
  const canCreateInvoice = isOwner || activeRole === "owner" || activeRole === "manager";

  // Build ordered group list (newest submission first)
  const orderedGroups = useMemo(() => {
    const items: Array<{
      key: string;
      submissionId: string | null;
      samples: LabSample[];
      children: AcceptedChildRow[];
      progress: ReturnType<typeof deriveSamplingProgress> | null;
      headerDate: string | null;
      sender: string | null;
    }> = [];

    for (const [key, sList] of grouped.entries()) {
      if (key === "_none") {
        items.push({
          key: "_none",
          submissionId: null,
          samples: sList,
          children: [],
          progress: null,
          headerDate: null,
          sender: null,
        });
        continue;
      }
      const meta = submissionMeta?.[key];
      const firstSample = sList[0];
      items.push({
        key,
        submissionId: key,
        samples: sList,
        children: childrenBySubmission.get(key) || [],
        progress: progressBySubmission.get(key) || null,
        headerDate: meta?.created_at || firstSample?.created_at || null,
        sender:
          meta?.initiator_tenant_name_snapshot ||
          firstSample?.lab_request?.initiator_tenant_name_snapshot ||
          null,
      });
    }

    // Sort: real submissions newest first, "_none" last
    items.sort((a, b) => {
      if (a.key === "_none") return 1;
      if (b.key === "_none") return -1;
      const ad = a.headerDate ? Date.parse(a.headerDate) : 0;
      const bd = b.headerDate ? Date.parse(b.headerDate) : 0;
      return bd - ad;
    });

    if (pendingOnly) {
      return items.filter(
        (g) => g.progress && (g.progress.state === "none" || g.progress.state === "partial")
      );
    }
    return items;
  }, [grouped, submissionMeta, childrenBySubmission, progressBySubmission, pendingOnly]);

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {orderedGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {t("laboratory.submissionGrouped.empty") || "No submissions match the current filters."}
          </p>
        </div>
      ) : (
        orderedGroups.map((group) => {
          const isCollapsed = collapsed[group.key] === true;
          const sampledRequestIds = new Set(
            group.samples.map((s) => s.lab_request_id).filter(Boolean) as string[]
          );
          const unsampledChildren = group.children.filter(
            (c) => (c.lab_decision || "pending_review") === "accepted" && !sampledRequestIds.has(c.id)
          );

          // Phase 6C — eligibility = accepted + specimen received + not yet sampled
          const eligibleChildren: BatchEligibleChild[] = unsampledChildren
            .filter((c) => !!c.specimen_received_at)
            .map((c) => ({
              request_id: c.id,
              horse_id: c.horse_id,
              horse_name: c.horse?.name || c.horse_name_snapshot || (t("laboratory.samples.unknownHorse") as string),
              horse_name_ar: c.horse?.name_ar || c.horse_name_ar_snapshot,
              horse_snapshot: c.horse_snapshot,
              test_description: c.test_description,
            }));
          const eligibleCount = eligibleChildren.length;

          const shortRef = group.submissionId
            ? group.submissionId.slice(0, 6).toUpperCase()
            : null;

          // Phase 6B.1 — collapsed-state preview: first 2 horse names
          const horseNames: string[] = [];
          for (const c of group.children) {
            const name = c.horse?.name || c.horse_name_snapshot;
            if (name && !horseNames.includes(name)) horseNames.push(name);
          }
          if (horseNames.length === 0) {
            for (const s of group.samples) {
              const name = (s as any).lab_request?.horse_name_snapshot || (s as any).horse?.name;
              if (name && !horseNames.includes(name)) horseNames.push(name);
            }
          }
          const horsesPreview = horseNames.slice(0, 2).join(", ");
          const horsesMore = horseNames.length > 2 ? horseNames.length - 2 : 0;
          const sampleCount = group.samples.length;

          const buildLabRequestForChild = (c: AcceptedChildRow): LabRequest => ({
            id: c.id,
            tenant_id: tenantId || "",
            horse_id: c.horse_id || "",
            external_lab_name: null,
            external_lab_id: null,
            status: "received",
            priority: "normal",
            test_description: c.test_description || "",
            notes: null,
            requested_at: "",
            expected_by: null,
            received_at: c.specimen_received_at,
            result_share_token: null,
            result_url: null,
            result_file_path: null,
            created_by: "",
            created_at: "",
            updated_at: "",
            is_demo: false,
            initiator_tenant_id: null,
            lab_tenant_id: null,
            submission_id: group.submissionId,
            horse_name_snapshot: c.horse_name_snapshot,
            horse_name_ar_snapshot: c.horse_name_ar_snapshot,
            horse_snapshot: c.horse_snapshot,
            initiator_tenant_name_snapshot: group.sender,
            horse: c.horse || undefined,
            lab_decision: "accepted",
            specimen_received_at: c.specimen_received_at,
          });


          return (
            <Card key={group.key} className="overflow-hidden">
              <CardHeader
                className="pb-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCollapsed(group.key)}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-background border flex items-center justify-center shrink-0">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {group.submissionId ? (
                          <h3 className="font-semibold text-sm font-mono">
                            {t("laboratory.samplingProgress.submissionRef") || "Sub"} #{shortRef}
                          </h3>
                        ) : (
                          <h3 className="font-semibold text-sm">
                            {t("laboratory.submissionGrouped.noSubmission") || "Standalone samples"}
                          </h3>
                        )}
                        {group.sender && (
                          <Badge variant="outline" className="text-[11px] h-5 gap-1 font-normal">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">{group.sender}</span>
                          </Badge>
                        )}
                        {group.headerDate && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatStandardDate(group.headerDate)}
                          </span>
                        )}
                      </div>
                      {/* Phase 6B.1 — compact preview line */}
                      {(horsesPreview || sampleCount > 0) && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                          {horsesPreview && (
                            <span className="truncate">
                              {horsesPreview}
                              {horsesMore > 0 && ` +${horsesMore}`}
                            </span>
                          )}
                          {sampleCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              <FlaskConical className="h-3 w-3 me-1" />
                              {sampleCount}
                            </Badge>
                          )}
                        </div>
                      )}
                      {group.progress && (
                        <div className="mt-2 max-w-md">
                          <SubmissionSamplingProgress progress={group.progress} variant="bar" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
                    aria-hidden="true"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </span>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="pt-4 space-y-3">
                  {/* Sample cards in this submission */}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.samples.map((sample) => (
                      <SampleCard
                        key={sample.id}
                        sample={sample}
                        canManage={canManage}
                        canCreateInvoice={canCreateInvoice}
                        completedResultsCount={resultsCountBySample[sample.id] || 0}
                        onClick={() => onSampleClick?.(sample.id)}
                      />
                    ))}
                  </div>

                  {/* Accepted-but-unsampled placeholder rows */}
                  {unsampledChildren.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Hourglass className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("laboratory.submissionGrouped.awaitingSampleCreation") ||
                            "Accepted, awaiting sample creation"}{" "}
                          ({unsampledChildren.length})
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {unsampledChildren.map((c) => {
                          const horseName =
                            c.horse?.name || c.horse_name_snapshot || t("laboratory.samples.unknownHorse");
                          return (
                            <div
                              key={c.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm truncate">{horseName}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              >
                                {t("laboratory.samplingProgress.awaitingSample") || "Awaiting sample"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {t("laboratory.submissionGrouped.batchHint") ||
                          "Batch creation will be available in the next phase."}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
