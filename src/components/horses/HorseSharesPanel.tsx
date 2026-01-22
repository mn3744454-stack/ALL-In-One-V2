import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useHorseShares, HorseShare } from "@/hooks/useHorseShares";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Ban,
  Clock,
  Mail,
  Link2,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { CreateHorseShareDialog } from "./CreateHorseShareDialog";
import { toast } from "@/hooks/use-toast";

interface HorseSharesPanelProps {
  horseId: string;
  horseName: string;
}

export function HorseSharesPanel({ horseId, horseName }: HorseSharesPanelProps) {
  const { t, dir } = useI18n();
  const {
    activeShares,
    expiredOrRevokedShares,
    loading,
    canManage,
    fetchShares,
    revokeShare,
    getShareUrl,
  } = useHorseShares(horseId);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<HorseShare | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleCopy = async (share: HorseShare) => {
    const url = getShareUrl(share.token);
    await navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    toast({ title: t("horseShare.linkCopied") });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenLink = (share: HorseShare) => {
    window.open(getShareUrl(share.token), "_blank");
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    await revokeShare(revokeTarget.id);
    setRevoking(false);
    setRevokeTarget(null);
  };

  const getShareStatus = (share: HorseShare): { label: string; variant: "default" | "secondary" | "destructive" } => {
    if (share.status === "revoked") {
      return { label: t("horseShare.statusRevoked"), variant: "destructive" };
    }
    if (share.expires_at && new Date(share.expires_at) <= new Date()) {
      return { label: t("horseShare.statusExpired"), variant: "secondary" };
    }
    return { label: t("horseShare.statusActive"), variant: "default" };
  };

  const renderShareCard = (share: HorseShare, isActive: boolean) => {
    const status = getShareStatus(share);
    const packName = share.pack?.name || t("horseShare.customPack");

    return (
      <div
        key={share.id}
        className="flex flex-col gap-3 rounded-lg border p-3 bg-card"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-sm font-medium">{packName}</span>
          </div>
          {isActive && canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(share)}
              >
                {copiedId === share.id ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenLink(share)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setRevokeTarget(share)}
              >
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(share.created_at), "PP")}
          </span>
          {share.expires_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("horseShare.expiresLabel")}: {format(new Date(share.expires_at), "PP")}
            </span>
          )}
          {share.recipient_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {share.recipient_email}
            </span>
          )}
        </div>

        <div className="flex gap-2 text-xs">
          {share.scope.includeVet && (
            <Badge variant="outline" className="text-xs">
              {t("horseShare.vetLabel")}
            </Badge>
          )}
          {share.scope.includeLab && (
            <Badge variant="outline" className="text-xs">
              {t("horseShare.labLabel")}
            </Badge>
          )}
          {share.scope.includeFiles && (
            <Badge variant="outline" className="text-xs">
              {t("horseShare.filesLabel")}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-gold" />
            {t("horseShare.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
            {t("horseShare.title")}
          </CardTitle>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("horseShare.create")}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activeShares.length === 0 && expiredOrRevokedShares.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("horseShare.noShares")}
            </p>
          ) : (
            <>
              {activeShares.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("horseShare.activeShares")} ({activeShares.length})
                  </h4>
                  {activeShares.map((share) => renderShareCard(share, true))}
                </div>
              )}

              {expiredOrRevokedShares.length > 0 && (
                <Collapsible open={showExpired} onOpenChange={setShowExpired}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-muted-foreground"
                    >
                      <span className="text-sm">
                        {t("horseShare.expiredOrRevoked")} ({expiredOrRevokedShares.length})
                      </span>
                      {showExpired ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {expiredOrRevokedShares.map((share) => renderShareCard(share, false))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateHorseShareDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        horseId={horseId}
        horseName={horseName}
      />

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("horseShare.revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("horseShare.revokeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? t("common.loading") : t("horseShare.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
