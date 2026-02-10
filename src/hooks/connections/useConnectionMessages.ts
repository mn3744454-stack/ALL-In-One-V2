import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface ConnectionMessage {
  id: string;
  connection_id: string;
  sender_user_id: string;
  sender_tenant_id: string | null;
  body: string;
  created_at: string;
}

export function useConnectionMessages(connectionId: string | undefined) {
  const { user } = useAuth();
  const { activeTenant } = useTenant();
  const queryClient = useQueryClient();
  const queryKey = ["connection-messages", connectionId];

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!connectionId) return [];
      // Use rpc/raw query since types may not be regenerated yet
      const { data, error } = await supabase
        .from("connection_messages" as any)
        .select("*")
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ConnectionMessage[];
    },
    enabled: !!connectionId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!connectionId) return;
    const channel = supabase
      .channel(`conn-msg-${connectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "connection_messages",
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          queryClient.setQueryData(queryKey, (old: ConnectionMessage[] | undefined) => {
            if (!old) return [payload.new as ConnectionMessage];
            if (old.some((m) => m.id === (payload.new as ConnectionMessage).id)) return old;
            return [...old, payload.new as ConnectionMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!connectionId || !user?.id) throw new Error("Missing context");
      const { data, error } = await supabase
        .from("connection_messages" as any)
        .insert({
          connection_id: connectionId,
          sender_user_id: user.id,
          sender_tenant_id: activeTenant?.tenant_id || null,
          body: body.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ConnectionMessage;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(queryKey, (old: ConnectionMessage[] | undefined) => {
        if (!old) return [newMsg];
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage,
  };
}
