
-- 1. Add columns to lab_result_shares
ALTER TABLE public.lab_result_shares
  ADD COLUMN IF NOT EXISTS display_name_mode text NOT NULL DEFAULT 'real',
  ADD COLUMN IF NOT EXISTS alias_name_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS source_horse_kind text NULL,
  ADD COLUMN IF NOT EXISTS source_horse_id uuid NULL;

-- 2. Constraints
ALTER TABLE public.lab_result_shares
  DROP CONSTRAINT IF EXISTS lab_result_shares_display_name_mode_chk;
ALTER TABLE public.lab_result_shares
  ADD CONSTRAINT lab_result_shares_display_name_mode_chk
  CHECK (display_name_mode IN ('real', 'alias', 'sender_snapshot'));

ALTER TABLE public.lab_result_shares
  DROP CONSTRAINT IF EXISTS lab_result_shares_alias_required_chk;
ALTER TABLE public.lab_result_shares
  ADD CONSTRAINT lab_result_shares_alias_required_chk
  CHECK (
    display_name_mode <> 'alias'
    OR (alias_name_snapshot IS NOT NULL AND length(btrim(alias_name_snapshot)) > 0)
  );

ALTER TABLE public.lab_result_shares
  DROP CONSTRAINT IF EXISTS lab_result_shares_source_kind_chk;
ALTER TABLE public.lab_result_shares
  ADD CONSTRAINT lab_result_shares_source_kind_chk
  CHECK (source_horse_kind IS NULL OR source_horse_kind IN ('platform', 'lab', 'walkin', 'unknown'));

-- 3. Redefine get_shared_lab_result with per-link alias + lab_horses fallback
DROP FUNCTION IF EXISTS public.get_shared_lab_result(text);

CREATE FUNCTION public.get_shared_lab_result(_share_token text)
RETURNS TABLE (
  result_id uuid,
  status text,
  result_data jsonb,
  interpretation jsonb,
  flags text,
  created_at timestamptz,
  horse_display_name text,
  template_name text,
  tenant_display_name text,
  client_display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id as result_id,
    r.status,
    r.result_data,
    r.interpretation,
    r.flags,
    r.created_at,
    CASE
      -- Per-link alias snapshot: the lab chose to hide the real name on this link.
      WHEN s.display_name_mode = 'alias' AND s.alias_name_snapshot IS NOT NULL
        THEN s.alias_name_snapshot
      -- Sender snapshot: show what the requesting party submitted (sample inline name).
      WHEN s.display_name_mode = 'sender_snapshot'
        THEN COALESCE(req.horse_name_snapshot, ls.horse_name, 'Unknown Horse')
      -- Real-name fallback: lab-local horse → platform horse → inline sample name.
      ELSE COALESCE(lh.name, h.name, ls.horse_name, 'Unknown Horse')
    END as horse_display_name,
    t.name as template_name,
    COALESCE(ten.public_name, ten.name) as tenant_display_name,
    COALESCE(c.name, ls.client_name) as client_display_name
  FROM public.lab_result_shares s
  JOIN public.lab_results r ON r.id = s.result_id
  JOIN public.lab_samples ls ON ls.id = r.sample_id
  LEFT JOIN public.lab_horses lh ON lh.id = ls.lab_horse_id
  LEFT JOIN public.horses h ON h.id = ls.horse_id
  LEFT JOIN public.clients c ON c.id = ls.client_id
  LEFT JOIN public.lab_requests req ON req.id = ls.lab_request_id
  JOIN public.lab_templates t ON t.id = r.template_id
  JOIN public.tenants ten ON ten.id = r.tenant_id
  WHERE s.share_token = _share_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND r.status = 'final'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_lab_result(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO authenticated;
