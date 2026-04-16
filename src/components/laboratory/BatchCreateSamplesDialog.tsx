import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FlaskConical, Loader2, Layers } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useLabSamples } from "@/hooks/laboratory/useLabSamples";
import { toast } from "sonner";

/**
 * Phase 6C — Eligible child shape for batch creation.
 *
 * One row per `lab_request` that is:
 *   - lab_decision = 'accepted'
 *   - specimen_received_at is not null
 *   - has no existing active sample (caller pre-filters this)
 */
export interface BatchEligibleChild {
  request_id: string;
  horse_id: string | null;
  horse_name: string;
  horse_name_ar?: string | null;
  horse_snapshot?: Record<string, unknown> | null;
  test_description?: string | null;
}

interface BatchCreateSamplesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionId: string | null;
  submissionShortRef: string | null;
  senderName: string | null;
  eligibleChildren: BatchEligibleChild[];
  onSuccess?: () => void;
}

/**
 * Phase 6C — Batch Create Samples wrapper.
 *
 * This is a deliberate fan-out wrapper over the existing single-sample creation
 * path (`useLabSamples().createSample`). It does NOT fork creation logic.
 *
 * Operator flow:
 *   1. See pre-filtered list of eligible accepted+received horses for one submission.
 *   2. Toggle which horses to include (default: all).
 *   3. Set shared collection date and optional shared notes.
 *   4. Optionally set per-horse physical sample ID (auto-prefilled from short ref).
 *   5. Submit → sequential fan-out, each create reuses same insert path.
 *
 * Single-horse Create Sample wizard remains intact for one-off cases.
 */
export function BatchCreateSamplesDialog({
  open,
  onOpenChange,
  submissionId,
  submissionShortRef,
  senderName,
  eligibleChildren,
  onSuccess,
}: BatchCreateSamplesDialogProps) {
  const { t } = useI18n();
  const { createSample } = useLabSamples({});

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [collectionDate, setCollectionDate] = useState<Date>(new Date());
  const [sharedNotes, setSharedNotes] = useState("");
  const [sampleIds, setSampleIds] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      const initSel: Record<string, boolean> = {};
      const initIds: Record<string, string> = {};
      eligibleChildren.forEach((c, idx) => {
        initSel[c.request_id] = true;
        initIds[c.request_id] = submissionShortRef
          ? `${submissionShortRef}-${String(idx + 1).padStart(2, "0")}`
          : "";
      });
      setSelected(initSel);
      setSampleIds(initIds);
      setCollectionDate(new Date());
      setSharedNotes("");
      setSubmitting(false);
      setProgress(null);
    }
  }, [open, eligibleChildren, submissionShortRef]);

  const includedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const toggleAll = (next: boolean) => {
    const updated: Record<string, boolean> = {};
    eligibleChildren.forEach((c) => {
      updated[c.request_id] = next;
    });
    setSelected(updated);
  };

  const handleSubmit = async () => {
    const toCreate = eligibleChildren.filter((c) => selected[c.request_id]);
    if (toCreate.length === 0) {
      toast.error(
        t("laboratory.batchCreate.errorNoSelection") ||
          "Select at least one horse to create samples for."
      );
      return;
    }

    setSubmitting(true);
    setProgress({ done: 0, total: toCreate.length });
    const isoDate = collectionDate.toISOString();

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < toCreate.length; i++) {
      const child = toCreate[i];
      try {
        const snapshot = child.horse_snapshot || null;
        await createSample({
          // Reuse same single-create path
          horse_id: child.horse_id || undefined,
          horse_name: child.horse_id ? undefined : child.horse_name,
          horse_metadata: snapshot
            ? (snapshot as Record<string, unknown>)
            : undefined,
          collection_date: isoDate,
          physical_sample_id: sampleIds[child.request_id]?.trim() || undefined,
          notes: sharedNotes.trim() || undefined,
          lab_request_id: child.request_id,
          // Specimen already received at intake → mark accessioned immediately
          status: "accessioned",
        });
        successes++;
      } catch (err) {
        console.error("Batch create failed for request", child.request_id, err);
        failures++;
      }
      setProgress({ done: i + 1, total: toCreate.length });
    }

    setSubmitting(false);

    if (successes > 0) {
      toast.success(
        (t("laboratory.batchCreate.successCount") || "{count} samples created").replace(
          "{count}",
          String(successes)
        )
      );
    }
    if (failures > 0) {
      toast.error(
        (t("laboratory.batchCreate.failureCount") || "{count} failed").replace(
          "{count}",
          String(failures)
        )
      );
    }

    if (successes > 0) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t("laboratory.batchCreate.title") || "Batch create samples"}
          </DialogTitle>
          <DialogDescription>
            {submissionShortRef && (
              <span className="font-mono me-2">#{submissionShortRef}</span>
            )}
            {senderName && <span className="me-2">· {senderName}</span>}
            <span>
              {(
                t("laboratory.batchCreate.eligibleSummary") ||
                "{count} eligible (accepted + specimen received)"
              ).replace("{count}", String(eligibleChildren.length))}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Shared metadata */}
          <div className="grid gap-3 sm:grid-cols-2 p-3 rounded-lg border bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("laboratory.batchCreate.collectionDate") || "Collection date"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-start font-normal h-9"
                    disabled={submitting}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {format(collectionDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={collectionDate}
                    onSelect={(d) => d && setCollectionDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("laboratory.batchCreate.sharedNotes") || "Shared notes (optional)"}
              </Label>
              <Textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                rows={1}
                className="resize-none min-h-9 h-9 py-1.5"
                placeholder={
                  t("laboratory.batchCreate.sharedNotesPlaceholder") ||
                  "Applied to all selected samples"
                }
                disabled={submitting}
              />
            </div>
          </div>

          {/* Per-horse list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                {(
                  t("laboratory.batchCreate.includedHorses") ||
                  "Included horses ({selected}/{total})"
                )
                  .replace("{selected}", String(includedCount))
                  .replace("{total}", String(eligibleChildren.length))}
              </Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleAll(true)}
                  disabled={submitting}
                >
                  {t("common.selectAll") || "Select all"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleAll(false)}
                  disabled={submitting}
                >
                  {t("common.clear") || "Clear"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {eligibleChildren.map((c) => {
                const isOn = !!selected[c.request_id];
                return (
                  <div
                    key={c.request_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      isOn ? "bg-background" : "bg-muted/30 opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={isOn}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({
                          ...prev,
                          [c.request_id]: v === true,
                        }))
                      }
                      disabled={submitting}
                    />
                    <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {c.horse_name}
                      </div>
                      {c.test_description && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.test_description}
                        </div>
                      )}
                    </div>
                    <div className="w-32 sm:w-40 shrink-0">
                      <Input
                        value={sampleIds[c.request_id] || ""}
                        onChange={(e) =>
                          setSampleIds((prev) => ({
                            ...prev,
                            [c.request_id]: e.target.value,
                          }))
                        }
                        placeholder={
                          t("laboratory.batchCreate.sampleIdPlaceholder") ||
                          "Sample ID"
                        }
                        className="h-8 text-xs"
                        disabled={submitting || !isOn}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground mt-2">
              {t("laboratory.batchCreate.reuseNote") ||
                "Each sample uses the same creation path as the single-horse wizard."}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || includedCount === 0}
          >
            {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {submitting && progress
              ? `${progress.done}/${progress.total}`
              : (
                  t("laboratory.batchCreate.submit") ||
                  "Create {count} samples"
                ).replace("{count}", String(includedCount))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
