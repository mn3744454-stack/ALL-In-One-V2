import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Check, X, Loader2, Lock } from "lucide-react";
const AcceptConnectionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  const initialToken = searchParams.get("token") || "";
  const hasTokenFromUrl = Boolean(searchParams.get("token"));
  const [token, setToken] = useState(initialToken);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    if (!token.trim()) {
      toast({
        title: t("common.error"),
        description: t("common.required"),
        variant: "destructive",
      });
      return;
    }

    setIsAccepting(true);
    try {
      const { error } = await supabase.rpc("accept_connection", {
        _token: token.trim(),
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("connections.accepted"),
      });
      navigate("/dashboard/settings/connections");
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Failed to accept connection",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!token.trim()) {
      toast({
        title: t("common.error"),
        description: t("common.required"),
        variant: "destructive",
      });
      return;
    }

    setIsRejecting(true);
    try {
      const { error } = await supabase.rpc("reject_connection", {
        _token: token.trim(),
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("connections.rejected"),
      });
      navigate("/dashboard/settings/connections");
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : "Failed to reject connection",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const isLoading = isAccepting || isRejecting;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Link2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>{t("connections.acceptPage.title")}</CardTitle>
          <CardDescription>
            {t("connections.acceptPage.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Indicator */}
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border/50">
            <Lock className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-primary">{t("connections.acceptPage.secureLabel")}</span>
              <span className="text-muted-foreground mx-1">—</span>
              <span className="text-muted-foreground">{t("connections.acceptPage.domainLabel")}</span>
              <span className="font-mono text-xs ms-1">{window.location.host}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">{t("connections.acceptPage.tokenLabel")}</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={isLoading}
              autoFocus={!hasTokenFromUrl}
            />
            {hasTokenFromUrl && token && (
              <p className="text-xs text-muted-foreground">
                {t("connections.acceptPage.tokenFromLink")}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isLoading || !token.trim()}
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              ) : (
                <Check className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              )}
              {t("connections.accept")}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReject}
              disabled={isLoading || !token.trim()}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              ) : (
                <X className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              )}
              {t("connections.reject")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptConnectionPage;
