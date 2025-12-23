import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { invitationSchema, safeValidate } from "@/lib/validations";

type TenantRole = "owner" | "manager" | "foreman" | "vet" | "trainer" | "employee";
type InvitationStatus = "pending" | "accepted" | "rejected";

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

interface CreateInvitationData {
  invitee_email: string;
  proposed_role: TenantRole;
  assigned_horse_ids?: string[];
}

export const useInvitations = () => {
  const { activeTenant } = useTenant();
  const { user, profile } = useAuth();
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSentInvitations = async () => {
    if (!activeTenant) return;

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("tenant_id", activeTenant.tenant_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSentInvitations(data as Invitation[]);
    }
  };

  const fetchReceivedInvitations = async () => {
    if (!user || !profile) return;

    // RLS policy handles filtering to only show invitations for the current user
    // No need for client-side .or() filter - this prevents potential query injection
    const { data, error } = await supabase
      .from("invitations")
      .select(`
        *,
        tenant:tenants(id, name, type),
        sender:profiles!invitations_sender_id_fkey(id, full_name, email)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReceivedInvitations(data as unknown as Invitation[]);
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
  }, [activeTenant?.tenant_id, user?.id, profile?.email]);

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

    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        tenant_id: activeTenant.tenant_id,
        sender_id: user.id,
        invitee_email: validatedData.invitee_email,
        proposed_role: validatedData.proposed_role,
        assigned_horse_ids: validatedData.assigned_horse_ids,
      })
      .select()
      .single();

    if (!error) {
      await fetchSentInvitations();
    }

    return { data: invitation as Invitation | null, error };
  };

  const respondToInvitation = async (
    invitationId: string,
    roleAccepted: boolean,
    horsesAccepted: boolean,
    rejectionReason?: string
  ) => {
    const status: InvitationStatus = roleAccepted ? "accepted" : "rejected";

    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status,
        role_accepted: roleAccepted,
        horses_accepted: horsesAccepted,
        rejection_reason: rejectionReason,
        responded_at: new Date().toISOString(),
        invitee_id: user?.id,
      })
      .eq("id", invitationId);

    if (updateError) {
      return { error: updateError };
    }

    // If accepted, create tenant membership
    if (roleAccepted) {
      const invitation = receivedInvitations.find((i) => i.id === invitationId);
      if (invitation && user) {
        const { error: memberError } = await supabase
          .from("tenant_members")
          .insert({
            tenant_id: invitation.tenant_id,
            user_id: user.id,
            role: invitation.proposed_role,
            can_invite: false,
            can_manage_horses: invitation.proposed_role === "foreman" || invitation.proposed_role === "manager",
          });

        if (memberError) {
          return { error: memberError };
        }
      }
    }

    await fetchReceivedInvitations();
    return { error: null };
  };

  return {
    sentInvitations,
    receivedInvitations,
    loading,
    createInvitation,
    respondToInvitation,
    refresh: async () => {
      await Promise.all([fetchSentInvitations(), fetchReceivedInvitations()]);
    },
  };
};
