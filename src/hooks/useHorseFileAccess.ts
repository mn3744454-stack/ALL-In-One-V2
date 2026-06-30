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
  // Phase 1.e.f.8.1.4.c.r1.v1.correction — Access RPC Envelope Adapter.
  //
  // The public RPC `get_horse_file_access` returns a NESTED envelope:
  //   { horse_id, access: { mode, reason_code, snapshot_only, badges, ... },
  //     section_perms, action_perms }
  //
  // Earlier iterations of this adapter expected a FLAT envelope
  // (`{ mode, ... }`) and therefore mis-read every nested success as
  // `no_access`, which made HorseProfile render "الخيل غير موجود" for
  // perfectly valid owner_authority responses (e.g. Yousif / Hakona /
  // Drama after the same-Horse-Owner-tenant backend correction).
  //
  // This adapter now:
  //  - prefers `raw.access` when it is a non-null object (canonical shape);
  //  - falls back to a flat `raw` only when `raw.mode` is present (kept
  //    for backwards safety with any legacy/test code);
  //  - pulls `section_perms` / `action_perms` from the OUTER envelope when
  //    nested (that's where the RPC actually puts them) and from `raw`
  //    when flat;
  //  - validates `mode` against the known mode set; any unknown / missing
  //    value collapses to a fail-closed `no_access` envelope. No frontend
  //    role / name / tenant-type inference is performed — the backend
  //    remains the only source of authority.
  if (!raw || typeof raw !== "object") return SAFE_NO_ACCESS;
  const outer = raw as Record<string, unknown>;

  const nested =
    outer.access && typeof outer.access === "object"
      ? (outer.access as Record<string, unknown>)
      : null;

  // Pick the envelope that actually carries `mode`.
  let envelope: Record<string, unknown> | null = null;
  if (nested && typeof nested.mode === "string") {
    envelope = nested;
  } else if (typeof outer.mode === "string") {
    envelope = outer;
  } else {
    return SAFE_NO_ACCESS;
  }

  const modeRaw = typeof envelope.mode === "string" ? envelope.mode : "no_access";
  const mode: HorseAccessMode = KNOWN_MODES.has(modeRaw as HorseAccessMode)
    ? (modeRaw as HorseAccessMode)
    : "no_access";

  // section_perms / action_perms live on the OUTER envelope when the RPC
  // returns the nested shape. When the legacy flat shape is in use they
  // sit alongside `mode`. Either way prefer outer first, then envelope.
  const sectionPermsSource =
    outer.section_perms && typeof outer.section_perms === "object"
      ? (outer.section_perms as Record<string, unknown>)
      : envelope.section_perms && typeof envelope.section_perms === "object"
        ? (envelope.section_perms as Record<string, unknown>)
        : {};

  const actionPermsSource =
    outer.action_perms && typeof outer.action_perms === "object"
      ? (outer.action_perms as Record<string, unknown>)
      : envelope.action_perms && typeof envelope.action_perms === "object"
        ? (envelope.action_perms as Record<string, unknown>)
        : {};

  return {
    mode,
    reason_code:
      typeof envelope.reason_code === "string" ? envelope.reason_code : null,
    viewer_user_id:
      typeof envelope.viewer_user_id === "string" ? envelope.viewer_user_id : null,
    viewer_tenant_id:
      typeof envelope.viewer_tenant_id === "string"
        ? envelope.viewer_tenant_id
        : null,
    snapshot_only: envelope.snapshot_only === true,
    badges: Array.isArray(envelope.badges) ? (envelope.badges as string[]) : [],
    warnings: Array.isArray(envelope.warnings)
      ? (envelope.warnings as string[])
      : [],
    section_perms: sectionPermsSource,
    action_perms: actionPermsSource,
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
