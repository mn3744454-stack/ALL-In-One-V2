import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Key, Link2, Trash2, CheckCircle } from "lucide-react";
import { useClientClaimTokens } from "@/hooks/connections";
import { useI18n } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

interface ClientPortalSectionProps {
  clientId: string;
  claimedAt?: string | null;
}

export function ClientPortalSection({
  clientId,
  claimedAt,
}: ClientPortalSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { activeToken, generateToken, revokeToken, isLoading } =
    useClientClaimTokens(clientId);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateToken = async () => {
    try {
      const token = await generateToken.mutateAsync(clientId);
      setGeneratedToken(token);
    } catch {
      // Error handled by hook
    }
  };

  const handleCopyToken = async () => {
    const tokenToCopy = generatedToken || activeToken?.token;
    if (!tokenToCopy) return;

    try {
      await navigator.clipboard.writeText(tokenToCopy);
      setCopied(true);
      toast({
        title: t("common.success"),
        description: t("connections.portal.tokenCopied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("common.error"),
        description: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleRevokeToken = async () => {
    const tokenToRevoke = activeToken?.token;
    if (!tokenToRevoke) return;

    try {
      await revokeToken.mutateAsync(tokenToRevoke);
      setGeneratedToken(null);
    } catch {
      // Error handled by hook
    }
  };

  if (claimedAt) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-primary">
              {t("connections.portal.claimed")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {t("connections.portal.claimedOn")}{" "}
            {new Date(claimedAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            {t("connections.portal.title")}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeToken || generatedToken ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={generatedToken || activeToken?.token || ""}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {t("connections.portal.tokenActive")}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRevokeToken}
                disabled={revokeToken.isPending}
              >
                <Trash2 className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                {t("connections.portal.revoke")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-2">
              {t("connections.portal.description")}
            </p>
            <Button
              onClick={handleGenerateToken}
              disabled={generateToken.isPending || isLoading}
              size="sm"
            >
              <Key className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {generateToken.isPending
                ? t("common.loading")
                : t("connections.portal.generate")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
