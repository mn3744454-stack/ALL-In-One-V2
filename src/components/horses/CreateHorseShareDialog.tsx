import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import { useHorseShares, CreateShareOptions } from "@/hooks/useHorseShares";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreateHorseShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseId: string;
  horseName: string;
}

export function CreateHorseShareDialog({
  open,
  onOpenChange,
  horseId,
  horseName,
}: CreateHorseShareDialogProps) {
  const { t, dir } = useI18n();
  const { packs, fetchPacks, createShare, getShareUrl } = useHorseShares(horseId);

  const [selectedPackKey, setSelectedPackKey] = useState("medical_summary");
  const [lockToEmail, setLockToEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expiresIn, setExpiresIn] = useState("7"); // days
  const [customizeScope, setCustomizeScope] = useState(false);
  const [includeVet, setIncludeVet] = useState(true);
  const [includeLab, setIncludeLab] = useState(true);
  const [includeFiles, setIncludeFiles] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPacks();
      // Reset state
      setCreatedShareUrl(null);
      setCopied(false);
      setSelectedPackKey("medical_summary");
      setLockToEmail(false);
      setRecipientEmail("");
      setDateFrom("");
      setDateTo("");
      setExpiresIn("7");
      setCustomizeScope(false);
    }
  }, [open, fetchPacks]);

  // Update scope toggles when pack changes
  useEffect(() => {
    const selectedPack = packs.find((p) => p.key === selectedPackKey);
    if (selectedPack && !customizeScope) {
      setIncludeVet(selectedPack.scope.includeVet ?? false);
      setIncludeLab(selectedPack.scope.includeLab ?? false);
      setIncludeFiles(selectedPack.scope.includeFiles ?? false);
    }
  }, [selectedPackKey, packs, customizeScope]);

  const handleCreate = async () => {
    setCreating(true);

    const expiresAt = expiresIn && expiresIn !== "never"
      ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const opts: CreateShareOptions = {
      packKey: selectedPackKey,
      recipientEmail: lockToEmail && recipientEmail ? recipientEmail : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      expiresAt,
    };

    if (customizeScope || selectedPackKey === "custom") {
      opts.customScope = { includeVet, includeLab, includeFiles };
    }

    const result = await createShare(opts);
    setCreating(false);

    if (result) {
      const url = getShareUrl(result.token);
      setCreatedShareUrl(url);
      // Auto-copy to clipboard
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopy = async () => {
    if (!createdShareUrl) return;
    await navigator.clipboard.writeText(createdShareUrl);
    setCopied(true);
    toast({ title: t("horseShare.linkCopied") });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    if (createdShareUrl) {
      window.open(createdShareUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t("horseShare.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("horseShare.createDescription").replace("{{name}}", horseName)}
          </DialogDescription>
        </DialogHeader>

        {!createdShareUrl ? (
          <div className="space-y-4 py-4">
            {/* Pack Selection */}
            <div className="space-y-2">
              <Label>{t("horseShare.pack")}</Label>
              <Select value={selectedPackKey} onValueChange={setSelectedPackKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packs.map((pack) => (
                    <SelectItem key={pack.key} value={pack.key}>
                      {pack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {packs.find((p) => p.key === selectedPackKey)?.description && (
                <p className="text-xs text-muted-foreground">
                  {packs.find((p) => p.key === selectedPackKey)?.description}
                </p>
              )}
            </div>

            {/* Customize Scope Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="customize-scope">{t("horseShare.customize")}</Label>
              <Switch
                id="customize-scope"
                checked={customizeScope}
                onCheckedChange={setCustomizeScope}
              />
            </div>

            {/* Scope Toggles */}
            {(customizeScope || selectedPackKey === "custom") && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-vet"
                    checked={includeVet}
                    onCheckedChange={(c) => setIncludeVet(c === true)}
                  />
                  <Label htmlFor="include-vet" className="font-normal">
                    {t("horseShare.includeVet")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-lab"
                    checked={includeLab}
                    onCheckedChange={(c) => setIncludeLab(c === true)}
                  />
                  <Label htmlFor="include-lab" className="font-normal">
                    {t("horseShare.includeLab")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-files"
                    checked={includeFiles}
                    onCheckedChange={(c) => setIncludeFiles(c === true)}
                  />
                  <Label htmlFor="include-files" className="font-normal">
                    {t("horseShare.includeFiles")}
                  </Label>
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("horseShare.dateFrom")}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("horseShare.dateTo")}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label>{t("horseShare.expiresIn")}</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("horseShare.expires1Day")}</SelectItem>
                  <SelectItem value="7">{t("horseShare.expires7Days")}</SelectItem>
                  <SelectItem value="30">{t("horseShare.expires30Days")}</SelectItem>
                  <SelectItem value="90">{t("horseShare.expires90Days")}</SelectItem>
                  <SelectItem value="never">{t("horseShare.expiresNever")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Lock */}
            <div className="flex items-center justify-between">
              <Label htmlFor="lock-email">{t("horseShare.lockToEmail")}</Label>
              <Switch
                id="lock-email"
                checked={lockToEmail}
                onCheckedChange={setLockToEmail}
              />
            </div>

            {lockToEmail && (
              <div className="space-y-2">
                <Label>{t("horseShare.recipientEmail")}</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("horseShare.emailLockHint")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-md border bg-muted/50 p-4">
              <Label className="text-sm text-muted-foreground mb-2 block">
                {t("horseShare.shareLink")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdShareUrl}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenLink}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("horseShare.linkCreatedHint")}
            </p>
          </div>
        )}

        <DialogFooter>
          {!createdShareUrl ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? t("common.loading") : t("horseShare.createShare")}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
