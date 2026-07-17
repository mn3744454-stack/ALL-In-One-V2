/**
 * Phase 1.e.f.8.1.4.d.3.fix.1.r1.qa1.local — Local Record Custodial Completion.
 *
 * Thin wrapper around the SECURITY DEFINER RPC `complete_local_horse_record`.
 * The RPC is the ONLY sanctioned way to fill safe missing fields on a
 * Stable-local horse record without granting Horse Owner authority. The
 * frontend never touches the `horses` table directly for local completion.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompleteLocalHorseRecordArgs {
  horseId: string;
  activeTenantId: string;
  payload: Record<string, string | null>;
}

export interface CompleteLocalHorseRecordResponse {
  ok: boolean;
  reason_code?: string | null;
  field?: string | null;
  updated_fields?: string[];
  capabilities?: {
    can_complete_local_record: boolean;
    local_record_completion_reason: string | null;
    local_record_completion_editable_fields: string[];
  };
}

export function useCompleteLocalHorseRecord() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      args: CompleteLocalHorseRecordArgs,
    ): Promise<CompleteLocalHorseRecordResponse> => {
      const { data, error } = await (supabase.rpc as any)(
        "complete_local_horse_record",
        {
          p_horse_id: args.horseId,
          p_active_tenant_id: args.activeTenantId,
          p_payload: args.payload,
        },
      );
      if (error) throw error;
      const resp = (data ?? {}) as CompleteLocalHorseRecordResponse;
      if (!resp.ok) {
        const err = new Error(resp.reason_code || "local_record_completion_failed");
        (err as any).reason_code = resp.reason_code || "local_record_completion_failed";
        (err as any).field = resp.field ?? undefined;
        throw err;
      }
      return resp;
    },
    onSuccess: (_data, vars) => {
      // Invalidate the horse file + access envelope so hero, completeness and
      // capabilities refresh immediately after a successful write.
      qc.invalidateQueries({ queryKey: ["horse-file-access", vars.horseId] });
      qc.invalidateQueries({ queryKey: ["horse-file", vars.horseId] });
      qc.invalidateQueries({ queryKey: ["horse-file-projection", vars.horseId] });
      qc.invalidateQueries({ queryKey: ["horses"] });
    },
  });
}
