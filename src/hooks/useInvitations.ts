import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { invitationSchema, safeValidate } from "@/lib/validations";
import { useRealtimeTable } from "@/hooks/useRealtimeInvalidation";
import { useQueryClient } from "@tanstack/react-query";

// Note: "admin" is kept for backward compatibility with existing database records but is not used in UI
type TenantRole = "owner" | "admin" | "manager" | "foreman" | "vet" | "trainer" | "employee";
// Include new invitation statuses from P0 migration
type InvitationStatus = "pending" | "preaccepted" | "accepted" | "rejected" | "expired" | "revoked";

// Full invitation type for sent invitations (fetched via RLS)
interface Invitation {
  id: string;
  tenant_id: string;
  sender_id: string;
  invitee_email: string;
  invitee_id: string | null;
  proposed_role: TenantRole;
  assigned_horse_ids: string[];
  status: InvitationStatus;
  role_accepted: boolean | null;
  horses_accepted: boolean | null;
  rejection_reason: string | null;
  responded_at: string | null;
  created_at: string;
  token: string;
  tenant?: {
    id: string;
    name: string;
    type: string;
  };
  sender?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Received invitation type from RPC (minimal safe fields)
interface ReceivedInvitation {
  id: string;
  token: string;
  status: InvitationStatus;
  proposed_role: TenantRole;
  tenant_id: string;
  tenant_name: string;
  sender_display_name: string;
  created_at: string;
  expires_at: string;
}

interface CreateInvitationData {
  invitee_email: string;
  proposed_role: TenantRole;
  assigned_horse_ids?: string[];
}

export const useInvitations = () => {
  const { activeTenant } = useTenant();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeKey, setRealtimeKey] = useState(0);

  // Subscribe to realtime updates for invitations
  useRealtimeTable(
    'invitations',
    [
      ['invitations-sent', activeTenant?.tenant_id],
      ['invitations-received', user?.id],
    ]
  );

  // Listen to realtime invalidation and refetch
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'invitations-sent'
      ) {
        fetchSentInvitations();
      }
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'invitations-received'
      ) {
        fetchReceivedInvitations();
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Direct realtime subscription for immediate updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('invitations-realtime')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
        },
        () => {
          // Refetch both on any change
          fetchSentInvitations();
          fetchReceivedInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeTenant?.tenant_id]);

  const fetchSentInvitations = async () => {
    if (!activeTenant || !user) return;

    // Only fetch invitations sent by the current user (RLS enforces this too)
    const { data, error } = await supabase
      .from("invitations")
      .select("*, token")
      .eq("tenant_id", activeTenant.tenant_id)
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSentInvitations(data as Invitation[]);
    }
  };

  const fetchReceivedInvitations = async () => {
    if (!user) return;

    // Use SECURITY DEFINER RPC to fetch pending invitations
    // This works even before user is a tenant member
    const { data, error } = await supabase.rpc("get_my_pending_invitations");

    if (!error && data) {
      setReceivedInvitations(data as ReceivedInvitation[]);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchSentInvitations(), fetchReceivedInvitations()]);
      setLoading(false);
    };

    if (user) {
      fetchAll();
    }
  }, [activeTenant?.tenant_id, user?.id]);

  const createInvitation = async (data: CreateInvitationData) => {
    if (!activeTenant || !user) {
      return { data: null, error: new Error("No active tenant or user") };
    }

    // Validate input data
    const validation = safeValidate(invitationSchema, data);
    if (!validation.success) {
      return { data: null, error: new Error(validation.errors.join(", ")) };
    }

    const validatedData = validation.data;

    // Insert invitation - rely on DB default for token generation
    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        tenant_id: activeTenant.tenant_id,
        sender_id: user.id,
        invitee_email: validatedData.invitee_email,
        proposed_role: validatedData.proposed_role,
        assigned_horse_ids: validatedData.assigned_horse_ids ?? [],
        // token is generated by DB default (gen_random_uuid()::text)
      })
      .select()
      .single();

    if (!error && invitation) {
      // Send invitation email via edge function
      // Edge function will build the link server-side using the token
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            invitation_id: invitation.id,
            tenant_id: activeTenant.tenant_id,
          }
        });

        if (emailError) {
          console.warn('Failed to send invitation email:', emailError);
          // Don't fail the invitation creation, just log the warning
        }
      } catch (emailError) {
        console.warn('Failed to send invitation email:', emailError);
        // Don't fail the invitation creation, just log the warning
      }

      await fetchSentInvitations();
    }

    return { data: invitation as Invitation | null, error };
  };

  const respondToInvitation = async (
    token: string,
    accept: boolean,
    rejectionReason?: string
  ): Promise<{ data: { tenant_id: string } | null; error: Error | null }> => {
    if (accept) {
      // Use atomic RPC for acceptance
      const { data, error } = await supabase.rpc("finalize_invitation_acceptance", {
        _token: token,
      });

      if (error) {
        console.error("finalize_invitation_acceptance RPC error:", error);
        return { data: null, error };
      }

      console.log("finalize_invitation_acceptance result:", data);
      
      // RPC returns { success: boolean, tenant_id: string, role: string, message: string }
      // Cast to expected shape since Supabase types it as Json
      const result = data as { success: boolean; tenant_id: string; role: string; message: string } | null;
      
      if (!result?.success) {
        const errorMsg = result?.message || "Failed to accept invitation";
        console.error("finalize_invitation_acceptance failed:", errorMsg);
        return { data: null, error: new Error(errorMsg) };
      }

      await fetchReceivedInvitations();
      return { data: { tenant_id: result.tenant_id }, error: null };
    } else {
      // Use RPC for rejection (secure, server-validated)
      const invitation = receivedInvitations.find((i) => i.token === token);
      if (!invitation) {
        return { data: null, error: new Error("Invitation not found") };
      }

      const { data, error: rpcError } = await supabase.rpc("reject_invitation", {
        _invitation_id: invitation.id,
        _reason: rejectionReason || null,
      });

      if (rpcError) {
        console.error("reject_invitation RPC error:", rpcError);
        return { data: null, error: rpcError };
      }

      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) {
        const errorMsg = result?.error || "Failed to reject invitation";
        return { data: null, error: new Error(errorMsg) };
      }

      await fetchReceivedInvitations();
      return { data: null, error: null };
    }
  };

  const revokeInvitation = async (invitationId: string): Promise<{ success: boolean; error: Error | null }> => {
    const { data, error: rpcError } = await supabase.rpc("revoke_invitation", {
      _invitation_id: invitationId,
    });

    if (rpcError) {
      console.error("revoke_invitation RPC error:", rpcError);
      return { success: false, error: rpcError };
    }

    const result = data as { success: boolean; error?: string } | null;
    if (!result?.success) {
      const errorMsg = result?.error || "Failed to revoke invitation";
      return { success: false, error: new Error(errorMsg) };
    }

    await fetchSentInvitations();
    return { success: true, error: null };
  };

  return {
    sentInvitations,
    receivedInvitations,
    loading,
    createInvitation,
    respondToInvitation,
    revokeInvitation,
    refresh: async () => {
      await Promise.all([fetchSentInvitations(), fetchReceivedInvitations()]);
    },
  };
};
