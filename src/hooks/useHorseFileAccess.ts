/**
 * Phase 1.e.f.8.1.3 — Horse Profile UI Execution Preparation.
 *
 * Lightweight wrapper around the SECURITY DEFINER RPC `get_horse_file_access`.
 * The frontend MUST NOT compute sensitive access mode for the Horse File.
 * This hook is the only sanctioned source of the access envelope.
 *
 * Rules enforced here:
 *  - calls only the public access RPC (never the private `_resolve_*` helpers,
 *    never the share-token RPC, never the full projection in this phase);
 *  - query key is scoped by horse_id + active_tenant_id + viewer user id so
 *    account/tenant switching invalidates the cached envelope automatically;
 *  - on error or malformed shape, the adapter falls back to a safe
 *    `no_access` envelope so identity-leakage paths fail closed.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HorseAccessMode =
  | "owner_authority"
  | "current_host_operational"
  | "previous_host_historical"
  | "provider_scoped"
  | "invited_owner_read"
  | "shared_link_read"
  | "public_read"
  | "owner_bridge_not_provisioned"
  | "no_access";

export interface HorseAccessEnvelope {
  mode: HorseAccessMode;
  reason_code: string | null;
  viewer_user_id: string | null;
  viewer_tenant_id: string | null;
  snapshot_only: boolean;
  badges: string[];
  warnings: string[];
  section_perms: Record<string, unknown>;
  action_perms: Record<string, unknown>;
}

const SAFE_NO_ACCESS: HorseAccessEnvelope = {
  mode: "no_access",
  reason_code: "frontend_fallback",
  viewer_user_id: null,
  viewer_tenant_id: null,
  snapshot_only: true,
  badges: [],
  warnings: [],
  section_perms: {},
  action_perms: {},
};

const KNOWN_MODES: ReadonlySet<HorseAccessMode> = new Set<HorseAccessMode>([
  "owner_authority",
  "current_host_operational",
  "previous_host_historical",
  "provider_scoped",
  "invited_owner_read",
  "shared_link_read",
  "public_read",
  "owner_bridge_not_provisioned",
  "no_access",
]);

function adapt(raw: unknown): HorseAccessEnvelope {
  if (!raw || typeof raw !== "object") return SAFE_NO_ACCESS;
  const r = raw as Record<string, unknown>;
  const modeRaw = typeof r.mode === "string" ? r.mode : "no_access";
  const mode: HorseAccessMode = KNOWN_MODES.has(modeRaw as HorseAccessMode)
    ? (modeRaw as HorseAccessMode)
    : "no_access";
  return {
    mode,
    reason_code: typeof r.reason_code === "string" ? r.reason_code : null,
    viewer_user_id: typeof r.viewer_user_id === "string" ? r.viewer_user_id : null,
    viewer_tenant_id: typeof r.viewer_tenant_id === "string" ? r.viewer_tenant_id : null,
    snapshot_only: r.snapshot_only === true,
    badges: Array.isArray(r.badges) ? (r.badges as string[]) : [],
    warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
    section_perms:
      r.section_perms && typeof r.section_perms === "object"
        ? (r.section_perms as Record<string, unknown>)
        : {},
    action_perms:
      r.action_perms && typeof r.action_perms === "object"
        ? (r.action_perms as Record<string, unknown>)
        : {},
  };
}

export function useHorseFileAccess(
  horseId: string | null | undefined,
  activeTenantId: string | null | undefined,
) {
  // Viewer id is part of the query key so simulation / account switch can't
  // leak a stale envelope across identities.
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setViewerUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setViewerUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const query = useQuery({
    queryKey: ["horse-file-access", horseId, activeTenantId, viewerUserId],
    enabled: !!horseId && !!activeTenantId,
    staleTime: 30_000,
    retry: 1,
    queryFn: async (): Promise<HorseAccessEnvelope> => {
      const { data, error } = await supabase.rpc("get_horse_file_access", {
        p_horse_id: horseId as string,
        p_active_tenant_id: activeTenantId as string,
      });
      if (error) throw error;
      return adapt(data);
    },
  });

  return {
    access: query.data ?? null,
    loading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    // Fail-closed default for any consumer that wants a non-null envelope.
    safeAccess: query.data ?? (query.isLoading ? null : SAFE_NO_ACCESS),
  };
}
