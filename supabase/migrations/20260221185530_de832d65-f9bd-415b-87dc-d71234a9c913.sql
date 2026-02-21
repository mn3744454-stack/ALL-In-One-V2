
-- Phase 1: Add publish gate columns to lab_results
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS published_to_stable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id);

-- Index for Stable portal queries
CREATE INDEX IF NOT EXISTS idx_lab_results_published 
  ON public.lab_results (published_to_stable, published_at DESC)
  WHERE published_to_stable = true;

-- Index on sample_id if not existing
CREATE INDEX IF NOT EXISTS idx_lab_results_sample_id 
  ON public.lab_results (sample_id);

-- Phase 2: SECURITY DEFINER RPC for Stable to read published results
CREATE OR REPLACE FUNCTION public.get_stable_lab_results(
  _stable_tenant_id uuid,
  _horse_id uuid DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verify caller is a member of the stable tenant
  IF NOT public.is_tenant_member(auth.uid(), _stable_tenant_id) THEN
    RAISE EXCEPTION 'no_access';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(r))
    FROM (
      SELECT 
        lr.id,
        lr.status,
        lr.flags,
        lr.result_data,
        lr.interpretation,
        lr.created_at,
        lr.published_at,
        lr.template_id,
        lt.name as template_name,
        lt.name_ar as template_name_ar,
        ls.physical_sample_id,
        ls.horse_name,
        lreq.id as request_id,
        lreq.test_description,
        lreq.horse_id,
        lreq.horse_name_snapshot,
        lreq.horse_name_ar_snapshot,
        lreq.lab_tenant_id,
        lab_tenant.name as lab_tenant_name
      FROM public.lab_results lr
      JOIN public.lab_samples ls ON ls.id = lr.sample_id
      JOIN public.lab_requests lreq ON lreq.id = ls.lab_request_id
      LEFT JOIN public.lab_templates lt 
        ON lt.id = lr.template_id
       AND lt.tenant_id = lreq.lab_tenant_id
      LEFT JOIN public.tenants lab_tenant ON lab_tenant.id = lreq.lab_tenant_id
      WHERE ls.lab_request_id IS NOT NULL
        AND lreq.initiator_tenant_id = _stable_tenant_id
        AND lr.published_to_stable = true
        AND (
          _horse_id IS NULL 
          OR COALESCE(lreq.horse_id, ls.horse_id) = _horse_id
        )
      ORDER BY lr.published_at DESC NULLS LAST
      LIMIT _limit OFFSET _offset
    ) r
  ), '[]'::jsonb);
END;
$$;

-- Lock down execution and grant to authenticated users (membership check is inside)
REVOKE ALL ON FUNCTION public.get_stable_lab_results(uuid, uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stable_lab_results(uuid, uuid, int, int) TO authenticated;
