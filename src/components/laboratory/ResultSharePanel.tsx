import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
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
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatStandardDate, formatStandardDateTime12 } from "@/lib/displayHelpers";
import { useLabResultShares } from "@/hooks/laboratory/useLabResultShares";
import { useHorseAliases } from "@/hooks/laboratory/useHorseAliases";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface ResultSharePanelProps {
  resultId: string;
  resultStatus: string;
  horseId?: string | null;
}

export function ResultSharePanel({ resultId, resultStatus, horseId }: ResultSharePanelProps) {
  const { t } = useI18n();
  const { shares, loading, createShare, revokeShare, getShareUrl } = useLabResultShares(resultId);
  const { getActiveAlias, setAlias } = useHorseAliases(horseId ?? undefined);
  const [useAlias, setUseAlias] = useState(false);
  const [aliasName, setAliasName] = useState("");
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isFinal = resultStatus === "final";
  const aliasSupported = !!horseId;
  const activeAlias = horseId ? getActiveAlias(horseId) : null;

  // Prefill alias input when user enables alias mode
  useEffect(() => {
    if (useAlias && !aliasName && activeAlias?.alias) {
      setAliasName(activeAlias.alias);
    }
  }, [useAlias, activeAlias, aliasName]);

  const activeShares = shares.filter((s) => !s.revoked_at);
  const revokedShares = shares.filter((s) => s.revoked_at);

  const handleCreateShare = async () => {
    if (useAlias) {
      if (!aliasSupported) {
        toast.error(t("laboratory.share.aliasUnavailable"));
        return;
      }
      const trimmed = aliasName.trim();
      if (!trimmed) {
        toast.error(t("laboratory.share.aliasRequired"));
        return;
      }
      // Upsert alias if changed
      if (!activeAlias || activeAlias.alias !== trimmed) {
        setIsCreating(true);
        const aliasRow = await setAlias(horseId!, trimmed);
        if (!aliasRow) {
          setIsCreating(false);
          return;
        }
      }
    }

    setIsCreating(true);
    try {
      const share = await createShare(resultId, {
        useAlias,
        expiresAt: expiresDate ? expiresDate.toISOString() : null,
        resultStatus,
      });

      if (share) {
        const url = `${window.location.origin}${getShareUrl(share.share_token)}`;
        await navigator.clipboard.writeText(url);
        toast.success(t("laboratory.share.linkCreated"));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async (shareToken: string, shareId: string) => {
    const url = `${window.location.origin}${getShareUrl(shareToken)}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    toast.success(t("laboratory.share.linkCopiedClipboard"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (shareId: string) => {
    await revokeShare(shareId);
  };

  const getShareStatus = (share: typeof shares[0]) => {
    if (share.revoked_at) return { label: t("laboratory.share.revoked"), variant: "destructive" as const };
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { label: t("laboratory.share.expired"), variant: "secondary" as const };
    }
    return { label: t("laboratory.share.active"), variant: "default" as const };
  };

  const createDisabled =
    isCreating || (useAlias && (!aliasSupported || !aliasName.trim()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium">{t("laboratory.share.title")}</h4>
      </div>

      {!isFinal && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            {t("laboratory.share.notFinalWarning")}
          </p>
        </div>
      )}

      {isFinal && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          {/* Alias toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {useAlias ? (
                <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <Label htmlFor="use-alias" className="text-sm">
                {t("laboratory.share.aliasToggleLabel")}
              </Label>
            </div>
            <Switch
              id="use-alias"
              checked={useAlias}
              onCheckedChange={(checked) => {
                setUseAlias(checked);
                if (!checked) setAliasName("");
              }}
              disabled={!aliasSupported}
            />
          </div>

          {/* Alias input when toggle on */}
          {useAlias && (
            <div className="space-y-2">
              {aliasSupported ? (
                <>
                  <Label htmlFor="alias-name" className="text-sm">
                    {t("laboratory.share.aliasInputLabel")}
                  </Label>
                  <Input
                    id="alias-name"
                    value={aliasName}
                    onChange={(e) => setAliasName(e.target.value)}
                    placeholder={t("laboratory.share.aliasPlaceholder")}
                    maxLength={64}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("laboratory.share.aliasHelper")}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("laboratory.share.aliasUnavailable")}
                </p>
              )}
            </div>
          )}

          {/* Expiry date with dd-MM-yyyy picker */}
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
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresDate}
                    onSelect={setExpiresDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
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
            onClick={handleCreateShare}
            disabled={createDisabled}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Link2 className="h-4 w-4 me-2" />
            )}
            {t("laboratory.share.createShareLink")}
          </Button>
        </div>
      )}

      {/* Active Shares */}
      {activeShares.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">
            {t("laboratory.share.activeLinks")}
          </h5>
          <div className="space-y-2">
            {activeShares.map((share) => {
              const status = getShareStatus(share);
              const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
              const creatorName = share.creator?.full_name || "—";
              const aliasDisplay = share.use_alias ? activeAlias?.alias || null : null;

              return (
                <div
                  key={share.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg bg-background"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {share.use_alias ? (
                          <>
                            <EyeOff className="h-3 w-3 me-1" />
                            {t("laboratory.share.alias")}
                            {aliasDisplay ? `: ${aliasDisplay}` : ""}
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 me-1" />
                            {t("laboratory.share.realName")}
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>
                        {t("laboratory.share.createdOn")}: {formatStandardDate(share.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t("laboratory.share.createdBy")}: {creatorName}
                      </span>
                      {share.expires_at && (
                        <span className={isExpired ? "text-destructive" : ""}>
                          {t("laboratory.share.expiresOn")}: {formatStandardDate(share.expires_at)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => handleCopyUrl(share.share_token, share.id)}
                      disabled={!!isExpired}
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
                      className="min-h-11 min-w-11"
                      onClick={() => window.open(getShareUrl(share.share_token), "_blank")}
                      disabled={!!isExpired}
                      aria-label={t("laboratory.share.open")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(share.id)}
                      aria-label={t("laboratory.share.revoke")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revoked Shares */}
      {revokedShares.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <details className="group">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              {t("laboratory.share.revokedLinks")} ({revokedShares.length})
            </summary>
            <div className="mt-2 space-y-2">
              {revokedShares.map((share) => {
                const creatorName = share.creator?.full_name || "—";
                const aliasDisplay = share.use_alias ? activeAlias?.alias || null : null;
                return (
                  <div
                    key={share.id}
                    className="p-3 border rounded-lg bg-muted/30 opacity-80 space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {t("laboratory.share.revoked")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {share.use_alias ? (
                          <>
                            <EyeOff className="h-3 w-3 me-1" />
                            {t("laboratory.share.alias")}
                            {aliasDisplay ? `: ${aliasDisplay}` : ""}
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 me-1" />
                            {t("laboratory.share.realName")}
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>
                        {t("laboratory.share.createdOn")}: {formatStandardDate(share.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t("laboratory.share.createdBy")}: {creatorName}
                      </span>
                      {share.expires_at && (
                        <span>
                          {t("laboratory.share.expiresOn")}: {formatStandardDate(share.expires_at)}
                        </span>
                      )}
                      <span>
                        {t("laboratory.share.revokedOn")}: {formatStandardDate(share.revoked_at!)}
                      </span>
                    </p>
                  </div>
                );
              })}
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
