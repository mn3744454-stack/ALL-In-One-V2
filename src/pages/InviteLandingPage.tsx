import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2, CheckCircle, Loader2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction" | "horse_owner" | "trainer" | "doctor";

interface PreacceptResult {
  success: boolean;
  error?: string;
  invitation_id?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_type?: TenantType;
  proposed_role?: string;
  status?: string;
}

interface FinalizeResult {
  success: boolean;
  error?: string;
  member_id?: string;
  tenant_id?: string;
  role?: string;
  status?: string;
  already_member?: boolean;
}

export default function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveTenant, refreshTenants } = useTenant();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<PreacceptResult | null>(null);
  const [success, setSuccess] = useState(false);

  const preacceptInvitation = async () => {
    if (!token) {
      setError(t("inviteLanding.invalidLink"));
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc("preaccept_invitation", { _token: token });

      if (rpcError) {
        console.error("Preaccept RPC error:", rpcError);
        setError(t("inviteLanding.loadFailed"));
        setLoading(false);
        return;
      }

      const result = data as unknown as PreacceptResult;
      if (!result.success) {
        const errorMap: Record<string, string> = {
          expired: t("inviteLanding.errors.expired"),
          revoked: t("inviteLanding.errors.revoked"),
          already_processed: t("inviteLanding.errors.alreadyProcessed"),
        };
        setError(errorMap[result.error || ""] || t("inviteLanding.errors.notFound"));
        setLoading(false);
        return;
      }

      setInvitationData(result);
      setLoading(false);
    } catch (err) {
      console.error("Preaccept error:", err);
      setError(t("inviteLanding.errors.unexpected"));
      setLoading(false);
    }
  };

  const finalizeInvitation = async () => {
    if (!token) { setError(t("inviteLanding.invalidLink")); return; }
    setFinalizing(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("finalize_invitation_acceptance", { _token: token });

      if (rpcError) {
        console.error("Finalize RPC error:", rpcError);
        setError(t("inviteLanding.acceptFailed"));
        setFinalizing(false);
        return;
      }

      const result = data as unknown as FinalizeResult;
      if (!result.success) {
        const errorMap: Record<string, string> = {
          expired: t("inviteLanding.errors.expired"),
          revoked: t("inviteLanding.errors.revoked"),
          rejected: t("inviteLanding.errors.alreadyDeclined"),
          email_mismatch: t("inviteLanding.errors.emailMismatch"),
          email_unavailable: t("inviteLanding.errors.emailUnavailable"),
        };
        setError(errorMap[result.error || ""] || t("inviteLanding.acceptFailed"));
        setFinalizing(false);
        return;
      }

      setSuccess(true);
      toast.success(t("inviteLanding.acceptedSuccess"));
      await refreshTenants();
      if (result.tenant_id) setActiveTenant(result.tenant_id);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err) {
      console.error("Finalize error:", err);
      setError(t("inviteLanding.errors.unexpected"));
      setFinalizing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) finalizeInvitation();
    else preacceptInvitation();
  }, [token, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet><title>{t("inviteLanding.loadingTitle")}</title></Helmet>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("inviteLanding.loadingDetails")}</p>
        </div>
      </div>
    );
  }

  if (finalizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet><title>{t("inviteLanding.acceptingTitle")}</title></Helmet>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("inviteLanding.acceptingDetails")}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet><title>{t("inviteLanding.successTitle")}</title></Helmet>
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("inviteLanding.welcome")}</h1>
          <p className="text-muted-foreground">{t("inviteLanding.redirecting")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Helmet><title>{t("inviteLanding.errorTitle")}</title></Helmet>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>{t("inviteLanding.errorHeading")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("inviteLanding.unableToProcess")}</AlertTitle>
              <AlertDescription>{t("inviteLanding.errorExplanation")}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button asChild><Link to="/auth">{t("inviteLanding.signIn")}</Link></Button>
              <Button variant="outline" asChild><Link to="/">{t("inviteLanding.goHome")}</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationData) {
    const roleLabel = t(`notifications.roles.${invitationData.proposed_role || ""}`) || invitationData.proposed_role;
    const tenantTypeLabel = t(`onboarding.tenantTypes.${invitationData.tenant_type || ""}`) || invitationData.tenant_type;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Helmet><title>{t("inviteLanding.joinTitle")} {invitationData.tenant_name}</title></Helmet>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t("inviteLanding.youreInvited")}</CardTitle>
            <CardDescription>{t("inviteLanding.invitedToJoin")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("inviteLanding.organization")}</span>
                <span className="font-semibold">{invitationData.tenant_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("inviteLanding.type")}</span>
                <Badge variant="secondary">{tenantTypeLabel}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("inviteLanding.yourRole")}</span>
                <Badge variant="outline">{roleLabel}</Badge>
              </div>
            </div>
            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                <Link to={`/auth?next=/invite/${token}`}>
                  <UserPlus className="h-4 w-4 me-2" />
                  {t("inviteLanding.continueToSignIn")}
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">{t("inviteLanding.signInHint")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
