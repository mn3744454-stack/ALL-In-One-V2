-- =====================================================
-- P0-2: Fix get_shared_lab_result for Walk-in Horses & Clients
-- Must DROP first since return type is changing
-- =====================================================

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
      -- Use alias ONLY when horse_id exists; otherwise walk-in fallback
      WHEN s.use_alias AND ls.horse_id IS NOT NULL
        THEN public.get_horse_display_name(ls.horse_id, true)
      ELSE COALESCE(h.name, ls.horse_name, 'Unknown Horse')
    END as horse_display_name,
    t.name as template_name,
    COALESCE(ten.public_name, ten.name) as tenant_display_name,
    COALESCE(c.name, ls.client_name) as client_display_name
  FROM public.lab_result_shares s
  JOIN public.lab_results r ON r.id = s.result_id
  JOIN public.lab_samples ls ON ls.id = r.sample_id
  LEFT JOIN public.horses h ON h.id = ls.horse_id
  LEFT JOIN public.clients c ON c.id = ls.client_id
  JOIN public.lab_templates t ON t.id = r.template_id
  JOIN public.tenants ten ON ten.id = r.tenant_id
  WHERE s.share_token = _share_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND r.status = 'final'
  LIMIT 1;
$$;

-- Tighten default exposure (optional but recommended)
REVOKE ALL ON FUNCTION public.get_shared_lab_result(text) FROM PUBLIC;

-- Grant access (required for public shared page)
GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO authenticated;