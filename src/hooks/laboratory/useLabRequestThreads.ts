import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LabRequestThread {
  request_id: string;
  horse_name: string;
  horse_name_ar: string | null;
  test_description: string;
  last_message_body: string;
  last_message_at: string;
  last_sender_tenant_id: string | null;
  message_count: number;
}

export function useLabRequestThreads() {
  const { user } = useAuth();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["lab-request-threads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lab_request_threads");
      if (error) throw error;
      return (data ?? []) as LabRequestThread[];
    },
    enabled: !!user?.id,
  });

  return { threads, loading: isLoading };
}
