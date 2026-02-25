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

type TenantType = "stable" | "clinic" | "lab" | "academy" | "pharmacy" | "transport" | "auction" | "horse_owner" | "trainer" | "doctor";

const tenantTypeLabels: Record<TenantType, string> = {
  stable: "Stable",
  clinic: "Veterinary Clinic",
  lab: "Laboratory",
  academy: "Riding Academy",
  pharmacy: "Pharmacy",
  transport: "Transport Company",
  auction: "Auction House",
  horse_owner: "Horse Owner",
  trainer: "Independent Trainer",
  doctor: "Independent Doctor",
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Administrator",
  manager: "Manager",
  foreman: "Foreman",
  vet: "Veterinarian",
  trainer: "Trainer",
  employee: "Employee",
};

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

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<PreacceptResult | null>(null);
  const [success, setSuccess] = useState(false);

  // Preaccept flow (for anonymous/logged-out users)
  const preacceptInvitation = async () => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc("preaccept_invitation", {
        _token: token,
      });

      if (rpcError) {
        console.error("Preaccept RPC error:", rpcError);
        setError("Failed to load invitation details. Please try again.");
        setLoading(false);
        return;
      }

      const result = data as unknown as PreacceptResult;
      if (!result.success) {
        // Map specific error codes to user-friendly messages
        let errorMessage = "Invitation not found or has already been processed";
        if (result.error === "expired") {
          errorMessage = "This invitation has expired";
        } else if (result.error === "revoked") {
          errorMessage = "This invitation has been revoked";
        } else if (result.error === "already_processed") {
          errorMessage = "This invitation has already been processed";
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      setInvitationData(result);
      setLoading(false);
    } catch (err) {
      console.error("Preaccept error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  // Finalize flow (for authenticated users)
  const finalizeInvitation = async () => {
    if (!token) {
      setError("Invalid invitation link");
      return;
    }

    setFinalizing(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("finalize_invitation_acceptance", {
        _token: token,
      });

      if (rpcError) {
        console.error("Finalize RPC error:", rpcError);
        setError("Failed to accept invitation. Please try again.");
        setFinalizing(false);
        return;
      }

      const result = data as unknown as FinalizeResult;
      if (!result.success) {
        // Map specific error codes to user-friendly messages
        let errorMessage = "Failed to accept invitation";
        if (result.error === "expired") {
          errorMessage = "This invitation has expired";
        } else if (result.error === "revoked") {
          errorMessage = "This invitation has been revoked";
        } else if (result.error === "rejected") {
          errorMessage = "This invitation was already declined";
        } else if (result.error === "email_mismatch") {
          errorMessage = "This invitation was sent to a different email address";
        } else if (result.error === "email_unavailable") {
          errorMessage = "Unable to verify your email. Please update your profile.";
        }
        setError(errorMessage);
        setFinalizing(false);
        return;
      }

      // Success! Refresh tenants and switch to the new tenant
      setSuccess(true);
      toast.success("Invitation accepted successfully!");

      // Refresh tenant list to include the new membership
      await refreshTenants();

      // Set the active tenant to the invited one
      if (result.tenant_id) {
        setActiveTenant(result.tenant_id);
      }

      // Brief delay to show success state, then navigate
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("Finalize error:", err);
      setError("An unexpected error occurred");
      setFinalizing(false);
    }
  };

  useEffect(() => {
    // Wait for auth state to settle
    if (authLoading) return;

    if (user) {
      // User is authenticated - finalize immediately
      finalizeInvitation();
    } else {
      // User is not authenticated - preaccept to show invitation details
      preacceptInvitation();
    }
  }, [token, user, authLoading]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet>
          <title>Loading Invitation | Khail</title>
        </Helmet>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  // Finalizing state (authenticated user processing)
  if (finalizing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet>
          <title>Accepting Invitation | Khail</title>
        </Helmet>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Accepting invitation...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet>
          <title>Invitation Accepted | Khail</title>
        </Helmet>
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome!</h1>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Helmet>
          <title>Invitation Error | Khail</title>
        </Helmet>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to process invitation</AlertTitle>
              <AlertDescription>
                This invitation may have expired, been revoked, or already been accepted.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Go to Homepage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preaccept success - show invitation details (for logged-out users)
  if (invitationData) {
    const tenantType = invitationData.tenant_type as TenantType;
    const tenantTypeLabel = tenantTypeLabels[tenantType] || tenantType;
    const roleLabel = roleLabels[invitationData.proposed_role || ""] || invitationData.proposed_role;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Helmet>
          <title>Join {invitationData.tenant_name} | Khail</title>
        </Helmet>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription>
              You've been invited to join an organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Organization</span>
                <span className="font-semibold">{invitationData.tenant_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="secondary">{tenantTypeLabel}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Role</span>
                <Badge variant="outline">{roleLabel}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                <Link to={`/auth?next=/invite/${token}`}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Continue to Sign In / Sign Up
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll need to sign in or create an account to accept this invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - shouldn't reach here
  return null;
}
