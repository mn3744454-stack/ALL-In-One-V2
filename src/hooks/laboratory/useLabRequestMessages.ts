import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface LabRequestMessage {
  id: string;
  request_id: string;
  sender_user_id: string;
  sender_tenant_id: string | null;
  body: string;
  created_at: string;
}

export function useLabRequestMessages(requestId: string | null) {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const queryKey = ["lab-request-messages", requestId];

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("lab_request_messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as LabRequestMessage[];
    },
    enabled: !!requestId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel(`lab-messages-${requestId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "lab_request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload: any) => {
          console.log('[LabMessagesRealtime:event]', payload.eventType, payload.new?.id, payload.new?.request_id, 'filter:', requestId);
          queryClient.setQueryData(queryKey, (old: LabRequestMessage[] = []) => {
            // Avoid duplicates
            if (old.some((m) => m.id === payload.new.id)) return old;
            return [...old, payload.new as LabRequestMessage];
          });
        }
      )
      .subscribe((status) => console.log('[LabMessagesRealtime]', status));

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [requestId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!requestId || !user?.id) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("lab_request_messages")
        .insert({
          request_id: requestId,
          sender_user_id: user.id,
          sender_tenant_id: activeTenant?.tenant_id || null,
          body: body.trim(),
        })
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
