import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Link2, 
  Copy, 
  Check, 
  Trash2, 
  Loader2,
  Calendar,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useLabResultShares } from "@/hooks/laboratory/useLabResultShares";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface ResultSharePanelProps {
  resultId: string;
  resultStatus: string;
}

export function ResultSharePanel({ resultId, resultStatus }: ResultSharePanelProps) {
  const { t } = useI18n();
  const { shares, loading, createShare, revokeShare, getShareUrl } = useLabResultShares(resultId);
  const [useAlias, setUseAlias] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isFinal = resultStatus === 'final';
  const activeShares = shares.filter(s => !s.revoked_at);
  const revokedShares = shares.filter(s => s.revoked_at);

  const handleCreateShare = async () => {
    setIsCreating(true);
    try {
      const share = await createShare(resultId, {
        useAlias,
        expiresAt: expiresAt || null,
        resultStatus,
      });
      
      if (share) {
        // Copy URL to clipboard automatically
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
    if (share.revoked_at) return { label: t("laboratory.share.revoked"), variant: 'destructive' as const };
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return { label: t("laboratory.share.expired"), variant: 'secondary' as const };
    }
    return { label: t("laboratory.share.active"), variant: 'default' as const };
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {useAlias ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="use-alias" className="text-sm">
                {useAlias ? t("laboratory.share.hideHorseName") : t("laboratory.share.showRealName")}
              </Label>
            </div>
            <Switch
              id="use-alias"
              checked={useAlias}
              onCheckedChange={setUseAlias}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-at" className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {t("laboratory.share.expiryDate")}
            </Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="max-w-[200px]"
            />
          </div>

          <Button 
            onClick={handleCreateShare} 
            disabled={isCreating}
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
          <h5 className="text-sm font-medium text-muted-foreground">{t("laboratory.share.activeLinks")}</h5>
          <div className="space-y-2">
            {activeShares.map((share) => {
              const status = getShareStatus(share);
              const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
              
              return (
                <div 
                  key={share.id} 
                  className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                      {share.use_alias && (
                        <Badge variant="outline" className="text-xs">
                          <EyeOff className="h-3 w-3 me-1" />
                          {t("laboratory.share.alias")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("laboratory.share.created")} {format(new Date(share.created_at), "MMM d, yyyy")}
                      {share.expires_at && (
                        <span className={isExpired ? 'text-destructive' : ''}>
                          {" • "}{t("laboratory.share.expires")} {format(new Date(share.expires_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => handleCopyUrl(share.share_token, share.id)}
                      disabled={isExpired}
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
                      onClick={() => window.open(getShareUrl(share.share_token), '_blank')}
                      disabled={isExpired}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(share.id)}
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
              {revokedShares.map((share) => (
                <div 
                  key={share.id} 
                  className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-muted/30 opacity-60"
                >
                  <div className="min-w-0 flex-1">
                    <Badge variant="destructive" className="text-xs mb-1">
                      {t("laboratory.share.revoked")}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {t("laboratory.share.created")} {format(new Date(share.created_at), "MMM d")}
                      {" • "}{t("laboratory.share.revoked")} {format(new Date(share.revoked_at!), "MMM d")}
                    </p>
                  </div>
                </div>
              ))}
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
