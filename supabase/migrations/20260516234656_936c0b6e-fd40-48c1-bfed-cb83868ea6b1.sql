CREATE OR REPLACE FUNCTION public.get_stable_lab_results(
  _stable_tenant_id uuid,
  _horse_id uuid DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        lr.sample_id,
        lt.name        AS template_name,
        lt.name_ar     AS template_name_ar,
        -- L4-a-1: widened template context for rich receiving-side rendering.
        -- Returned via the gated SECURITY DEFINER RPC; no direct cross-tenant
        -- access to lab_templates is exposed.
        lt.fields         AS template_fields,
        lt.normal_ranges  AS template_normal_ranges,
        lt.groups         AS template_groups,
        ls.physical_sample_id,
        ls.horse_name,
        lreq.id AS request_id,
        lreq.test_description,
        lreq.horse_id,
        lreq.horse_name_snapshot,
        lreq.horse_name_ar_snapshot,
        lreq.lab_tenant_id,
        lab_tenant.name AS lab_tenant_name
      FROM public.lab_results lr
      JOIN public.lab_samples  ls   ON ls.id = lr.sample_id
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