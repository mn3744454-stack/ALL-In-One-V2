import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  ExternalLink,
  User,
  Languages,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  formatStandardDate,
  formatStandardDateTime12,
} from "@/lib/displayHelpers";
import {
  useLabReportShares,
  type LabReportShare,
} from "@/hooks/laboratory/useLabReportShares";
import type { ShareSourceHorseKind } from "@/hooks/laboratory/useLabResultShares";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

export interface ReportShareAnalysis {
  resultId: string;
  templateName: string;
  templateNameAr?: string | null;
  status: string; // 'final' enables sharing
}

interface ReportSharePanelProps {
  sampleId: string;
  analyses: ReportShareAnalysis[];
  reportLocale: "ar" | "en";
  sourceHorseKind?: ShareSourceHorseKind | null;
  sourceHorseId?: string | null;
  defaultSelectedResultIds?: string[];
}

export function ReportSharePanel({
  sampleId,
  analyses,
  reportLocale,
  sourceHorseKind = null,
  sourceHorseId = null,
  defaultSelectedResultIds,
}: ReportSharePanelProps) {
  const { t, lang } = useI18n();
  const { shares, loading, createShare, revokeShare, getShareUrl } =
    useLabReportShares(sampleId);

  const isRTL = lang === "ar";

  const shareableIds = useMemo(
    () => analyses.filter((a) => a.status === "final").map((a) => a.resultId),
    [analyses]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const seed = defaultSelectedResultIds?.length
      ? defaultSelectedResultIds.filter((id) => shareableIds.includes(id))
      : shareableIds;
    return new Set(seed);
  });
  const [useAlias, setUseAlias] = useState(false);
  const [aliasName, setAliasName] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined);
  const [linkLocale, setLinkLocale] = useState<"ar" | "en">(reportLocale);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeShares = shares.filter((s) => !s.revoked_at);
  const revokedShares = shares.filter((s) => s.revoked_at);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(shareableIds));
  const clearAll = () => setSelectedIds(new Set());

  const orderedSelection = analyses
    .filter((a) => selectedIds.has(a.resultId))
    .map((a) => a.resultId);

  const hasShareable = shareableIds.length > 0;
  const trimmedAlias = aliasName.trim();
  const createDisabled =
    isCreating ||
    !hasShareable ||
    orderedSelection.length === 0 ||
    (useAlias && !trimmedAlias);

  const handleCreate = async () => {
    if (orderedSelection.length === 0) {
      toast.error(t("laboratory.reportShare.selectAtLeastOne"));
      return;
    }
    setIsCreating(true);
    try {
      const share = await createShare({
        sampleId,
        resultIds: orderedSelection,
        displayNameMode: useAlias ? "alias" : "real",
        aliasNameSnapshot: useAlias ? trimmedAlias : null,
        sourceHorseKind: sourceHorseKind ?? "unknown",
        sourceHorseId: sourceHorseId ?? null,
        preferredLocale: linkLocale,
        expiresAt: expiresDate ? expiresDate.toISOString() : null,
      });
      if (share) {
        const url = `${window.location.origin}${getShareUrl(share.share_token)}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t("laboratory.reportShare.linkCopied"));
        } catch {
          /* ignore clipboard failure */
        }
        if (useAlias) setAliasName("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async (token: string, id: string) => {
    const url = `${window.location.origin}${getShareUrl(token)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(t("laboratory.share.linkCopiedClipboard"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const analysisLabel = (a: ReportShareAnalysis) =>
    (isRTL ? a.templateNameAr || a.templateName : a.templateName) ||
    a.templateName ||
    a.templateNameAr ||
    "—";

  const renderShareCard = (share: LabReportShare, revoked: boolean) => {
    const isExpired =
      !!share.expires_at && new Date(share.expires_at) < new Date();
    const status = revoked
      ? { label: t("laboratory.share.revoked"), variant: "destructive" as const }
      : isExpired
        ? { label: t("laboratory.share.expired"), variant: "secondary" as const }
        : { label: t("laboratory.share.active"), variant: "default" as const };
    const isAliasMode = share.display_name_mode === "alias";
    const count = share.result_ids?.length ?? 0;
    const names = (share.result_ids || [])
      .map((rid) => analyses.find((a) => a.resultId === rid))
      .filter(Boolean)
      .map((a) => analysisLabel(a as ReportShareAnalysis));
    const shownNames = names.slice(0, 3).join(isRTL ? "، " : ", ");
    const overflow = names.length - 3;

    return (
      <div
        key={share.id}
        className={cn(
          "flex flex-col gap-2 p-3 border rounded-lg bg-background",
          revoked && "opacity-80 bg-muted/30"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t("laboratory.reportShare.linkIncludesNAnalyses", {
              count: String(count),
            })}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {isAliasMode ? (
              <>
                <EyeOff className="h-3 w-3 me-1" />
                {t("laboratory.share.alias")}
                {share.alias_name_snapshot ? `: ${share.alias_name_snapshot}` : ""}
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 me-1" />
                {t("laboratory.share.realName")}
              </>
            )}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Languages className="h-3 w-3 me-1" />
            {share.preferred_locale === "ar"
              ? t("laboratory.report.languageArabic")
              : t("laboratory.report.languageEnglish")}
          </Badge>
        </div>
        {names.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {shownNames}
            {overflow > 0 ? ` +${overflow}` : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
          <span>
            {t("laboratory.share.createdOn")}:{" "}
            {formatStandardDateTime12(share.created_at)}
          </span>
          {share.creator?.full_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {t("laboratory.share.createdBy")}: {share.creator.full_name}
            </span>
          )}
          {share.expires_at && (
            <span className={isExpired ? "text-destructive" : ""}>
              {t("laboratory.share.expiresOn")}:{" "}
              {formatStandardDate(share.expires_at)}
            </span>
          )}
          {revoked && share.revoked_at && (
            <span>
              {t("laboratory.share.revokedOn")}:{" "}
              {formatStandardDateTime12(share.revoked_at)}
            </span>
          )}
        </p>
        {!revoked && (
          <div className="flex items-center gap-1 self-end">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-9 min-w-9"
              onClick={() => handleCopyUrl(share.share_token, share.id)}
              disabled={isExpired}
              aria-label={t("laboratory.share.copy")}
            >
              {copiedId === share.id ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-9 min-w-9"
              onClick={() =>
                window.open(getShareUrl(share.share_token), "_blank")
              }
              disabled={isExpired}
              aria-label={t("laboratory.share.open")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-9 min-w-9 text-destructive hover:text-destructive"
              onClick={() => revokeShare(share.id)}
              aria-label={t("laboratory.share.revoke")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">
          {t("laboratory.reportShare.title")}
        </h4>
      </div>

      {!hasShareable ? (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
          {t("laboratory.share.notFinalWarning")}
        </div>
      ) : (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Analyses checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-sm font-medium">
                {t("laboratory.reportShare.selectedAnalyses")} (
                {orderedSelection.length}/{shareableIds.length})
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={selectAll}
                >
                  {t("laboratory.reportShare.selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearAll}
                >
                  {t("laboratory.reportShare.clear")}
                </Button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pe-1">
              {analyses.map((a, idx) => {
                const disabled = a.status !== "final";
                const checked = selectedIds.has(a.resultId);
                return (
                  <label
                    key={a.resultId}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-sm",
                      disabled
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:bg-muted/60"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        toggleSelected(a.resultId, Boolean(v))
                      }
                      disabled={disabled}
                    />
                    <span className="flex-1 truncate">
                      <span className="text-muted-foreground me-1">
                        #{idx + 1}
                      </span>
                      {analysisLabel(a)}
                    </span>
                    {disabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        {a.status}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
            {orderedSelection.length === 0 && (
              <p className="text-xs text-destructive">
                {t("laboratory.reportShare.selectAtLeastOne")}
              </p>
            )}
          </div>

          <Separator />

          {/* Alias */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {useAlias ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Label htmlFor="report-share-alias" className="text-sm">
                  {t("laboratory.share.aliasToggleLabel")}
                </Label>
              </div>
              <Switch
                id="report-share-alias"
                checked={useAlias}
                onCheckedChange={(c) => {
                  setUseAlias(c);
                  if (!c) setAliasName("");
                }}
              />
            </div>
          </div>
          {useAlias && (
            <div className="space-y-2">
              <Label htmlFor="report-share-alias-name" className="text-sm">
                {t("laboratory.share.aliasInputLabel")}
              </Label>
              <Input
                id="report-share-alias-name"
                value={aliasName}
                onChange={(e) => setAliasName(e.target.value)}
                placeholder={t("laboratory.share.aliasPlaceholder")}
                maxLength={64}
              />
              <p className="text-xs text-muted-foreground">
                {t("laboratory.share.aliasSnapshotHelper")}
              </p>
            </div>
          )}

          {/* Preferred language */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              {t("laboratory.reportShare.preferredLanguage")}
            </Label>
            <Select
              value={linkLocale}
              onValueChange={(v) => setLinkLocale(v as "ar" | "en")}
            >
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  {t("laboratory.report.languageEnglish")}
                </SelectItem>
                <SelectItem value="ar">
                  {t("laboratory.report.languageArabic")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {t("laboratory.share.expiryDate")}
            </Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-start font-normal",
                      !expiresDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 me-2" />
                    {expiresDate
                      ? format(expiresDate, "dd-MM-yyyy")
                      : t("laboratory.share.pickDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-background"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={expiresDate}
                    onSelect={setExpiresDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {expiresDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpiresDate(undefined)}
                >
                  {t("laboratory.share.clearDate")}
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={createDisabled}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Link2 className="h-4 w-4 me-2" />
            )}
            {t("laboratory.reportShare.createReportShareLink")}
          </Button>
        </div>
      )}

      {/* Active shares */}
      {activeShares.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">
            {t("laboratory.reportShare.activeLinks")}
          </h5>
          <div className="space-y-2">
            {activeShares.map((s) => renderShareCard(s, false))}
          </div>
        </div>
      )}

      {/* Revoked shares */}
      {revokedShares.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <details className="group">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              {t("laboratory.reportShare.revokedLinks")} ({revokedShares.length})
            </summary>
            <div className="mt-2 space-y-2">
              {revokedShares.map((s) => renderShareCard(s, true))}
            </div>
          </details>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
