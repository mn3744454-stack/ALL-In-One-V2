import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface LabRequestMessage {
  id: string;
  request_id: string | null;
  submission_id: string | null;
  sender_user_id: string;
  sender_tenant_id: string | null;
  body: string;
  created_at: string;
}

/**
 * Fetch and send messages for a lab request thread.
 * Supports both legacy request-level threads and new submission-level threads.
 */
export function useLabRequestMessages(
  requestId: string | null,
  submissionId?: string | null
) {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Use submission_id as primary anchor if available, else request_id
  const anchorType = submissionId ? 'submission' : 'request';
  const anchorId = submissionId || requestId;
  const queryKey = ["lab-request-messages", anchorType, anchorId];

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!anchorId) return [];

      let query = supabase
        .from("lab_request_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (anchorType === 'submission') {
        query = query.eq("submission_id", anchorId);
      } else {
        query = query.eq("request_id", anchorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LabRequestMessage[];
    },
    enabled: !!anchorId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!anchorId) return;

    const filterCol = anchorType === 'submission' ? 'submission_id' : 'request_id';
    const channel = supabase
      .channel(`lab-messages-${anchorType}-${anchorId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "lab_request_messages",
          filter: `${filterCol}=eq.${anchorId}`,
        },
        (payload: any) => {
          queryClient.setQueryData(queryKey, (old: LabRequestMessage[] = []) => {
            if (old.some((m) => m.id === payload.new.id)) return old;
            return [...old, payload.new as LabRequestMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [anchorId, anchorType, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!anchorId || !user?.id) throw new Error("Missing context");
      const insertData: Record<string, any> = {
        sender_user_id: user.id,
        sender_tenant_id: activeTenant?.tenant_id || null,
        body: body.trim(),
      };

      if (anchorType === 'submission') {
        insertData.submission_id = anchorId;
      } else {
        insertData.request_id = anchorId;
      }

      const { data, error } = await supabase
        .from("lab_request_messages")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data as LabRequestMessage;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(queryKey, (old: LabRequestMessage[] = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
    },
  });

  return {
    messages,
    loading: isLoading,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
  };
}
