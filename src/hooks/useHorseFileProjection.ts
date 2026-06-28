/**
 * Phase 1.e.f.8.1.4.b — Projection Header-only Slice.
 *
 * Thin, fail-closed wrapper around the SECURITY DEFINER RPC
 * `get_unified_horse_file_projection`.
 *
 * Rules enforced here:
 *  - Only the public projection RPC is called (never the private
 *    `_resolve_*` helpers, never the share-token RPC).
 *  - `p_include_tabs: ['overview']` keeps the payload narrow (header is
 *    always returned regardless of this parameter).
 *  - Query key is scoped by horseId + activeTenantId + viewerUserId +
 *    includeTabs so account/tenant switching invalidates the cache.
 *  - On error / null / malformed / unexpected mode the adapter returns
 *    `null` so the UI can fail closed. The hook never leaks raw projection
 *    JSON to the UI.
 *  - Only header.name / header.name_ar / header.status are consumed in
 *    this slice. All `sections.*`, `ownership.*`, owner PII, share tokens,
 *    edit flags, etc. are intentionally ignored.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HorseAccessMode } from "@/hooks/useHorseFileAccess";

export type HorseFieldSource = "canonical" | "snapshot" | "redacted";

export interface HorseHeaderField<T = string | null> {
  value: T;
  source: HorseFieldSource;
}

export interface HorseProjectionHeader {
  name: HorseHeaderField<string | null>;
  name_ar: HorseHeaderField<string | null>;
  status: string | null;
}

export interface HorseProjectionAdapted {
  horseId: string;
  accessMode: HorseAccessMode;
  header: HorseProjectionHeader;
  isNoAccess: boolean;
}

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

const KNOWN_SOURCES: ReadonlySet<HorseFieldSource> = new Set<HorseFieldSource>([
  "canonical",
  "snapshot",
  "redacted",
]);

function adaptField(raw: unknown): HorseHeaderField<string | null> {
  // Backend `_field()` shape: { value, source, editable, reason }.
  // Unknown / missing → redacted, null value (fail closed for the field).
  if (!raw || typeof raw !== "object") {
    return { value: null, source: "redacted" };
  }
  const r = raw as Record<string, unknown>;
  const sourceRaw = typeof r.source === "string" ? r.source : "redacted";
  const source: HorseFieldSource = KNOWN_SOURCES.has(sourceRaw as HorseFieldSource)
    ? (sourceRaw as HorseFieldSource)
    : "redacted";
  const value = typeof r.value === "string" ? r.value : null;
  // If the field is explicitly redacted, never expose any value.
  if (source === "redacted") {
    return { value: null, source: "redacted" };
  }
  return { value, source };
}

function adapt(raw: unknown): HorseProjectionAdapted | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const horseId = typeof r.horse_id === "string" ? r.horse_id : null;
  if (!horseId) return null;

  const access = (r.access && typeof r.access === "object")
    ? (r.access as Record<string, unknown>)
    : null;
  const modeRaw = access && typeof access.mode === "string" ? access.mode : null;
  if (!modeRaw || !KNOWN_MODES.has(modeRaw as HorseAccessMode)) return null;
  const accessMode = modeRaw as HorseAccessMode;

  const header = (r.header && typeof r.header === "object")
    ? (r.header as Record<string, unknown>)
    : {};

  // header.status is `to_jsonb(text)` → string or null. Anything else is dropped.
  const statusRaw = (header as Record<string, unknown>).status;
  const status = typeof statusRaw === "string" ? statusRaw : null;

  return {
    horseId,
    accessMode,
    isNoAccess: accessMode === "no_access",
    header: {
      name: adaptField((header as Record<string, unknown>).name),
      name_ar: adaptField((header as Record<string, unknown>).name_ar),
      status,
    },
  };
}

interface UseHorseFileProjectionOptions {
  /** Pass false (e.g. access not yet confirmed) to keep the RPC quiet. */
  enabled?: boolean;
}

export function useHorseFileProjection(
  horseId: string | null | undefined,
  activeTenantId: string | null | undefined,
  options: UseHorseFileProjectionOptions = {},
) {
  const enabledExternal = options.enabled !== false;
  const includeTabs = ["overview"] as const;

  // Viewer id is part of the query key so account-switch / simulation cannot
  // leak a previous viewer's projection.
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
    queryKey: [
      "horse-file-projection",
      horseId,
      activeTenantId,
      viewerUserId,
      includeTabs.join(","),
    ],
    enabled: enabledExternal && !!horseId && !!activeTenantId,
    staleTime: 30_000,
    retry: 1,
    queryFn: async (): Promise<HorseProjectionAdapted | null> => {
      const { data, error } = await supabase.rpc(
        "get_unified_horse_file_projection",
        {
          p_horse_id: horseId as string,
          p_active_tenant_id: activeTenantId as string,
          p_include_tabs: [...includeTabs],
        },
      );
      if (error) throw error;
      return adapt(data);
    },
  });

  const projection = query.data ?? null;

  return {
    projection,
    loading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    /**
     * True when projection is unusable (loading-finished + error / null /
     * adapter-rejected / no_access). The UI MUST fail closed in this case
     * and must NOT fall back to legacy identity in projection-driven fields.
     */
    unavailable:
      !query.isLoading &&
      (query.isError || !projection || projection.isNoAccess),
  };
}
