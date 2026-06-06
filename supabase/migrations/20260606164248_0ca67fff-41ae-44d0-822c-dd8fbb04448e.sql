
-- B2.4 Owner Hosted Horses — read-only projection RPC.
-- SECURITY DEFINER, scoped to active membership in p_owner_tenant_id.
-- Returns only curated owner-safe fields. Does NOT expose unit/branch labels,
-- internal moves, lab, vet, or financial data.

CREATE OR REPLACE FUNCTION public.get_owner_hosted_horses(p_owner_tenant_id uuid)
RETURNS TABLE (
  horse_id uuid,
  horse_name text,
  horse_name_ar text,
  avatar_url text,
  contract_id uuid,
  contract_status text,
  operational_phase text,
  expected_arrival_at timestamptz,
  admitted_at timestamptz,
  checked_out_at timestamptz,
  stable_tenant_id uuid,
  stable_name text,
  stable_name_ar text,
  open_service_requests_count integer,
  last_owner_visible_update_at timestamptz,
  visibility_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Membership gate: caller must be an active member of the owner tenant.
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id   = auth.uid()
      AND tm.tenant_id = p_owner_tenant_id
      AND tm.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH owner_contracts AS (
    SELECT
      bc.id                  AS contract_id,
      bc.horse_id,
      bc.status              AS contract_status,
      bc.operational_phase   AS operational_phase,
      bc.expected_arrival_at,
      bc.activated_at,
      bc.ended_at,
      bc.stable_tenant_id,
      bc.updated_at,
      ROW_NUMBER() OVER (
        PARTITION BY bc.horse_id
        ORDER BY
          CASE
            WHEN bc.status = 'active' THEN 0
            WHEN bc.status = 'pending' THEN 1
            ELSE 2
          END,
          bc.updated_at DESC
      ) AS rn
    FROM public.boarding_contracts bc
    WHERE bc.owner_tenant_id = p_owner_tenant_id
      AND bc.stable_tenant_id IS DISTINCT FROM p_owner_tenant_id
  ),
  primary_contract AS (
    SELECT * FROM owner_contracts WHERE rn = 1
  )
  SELECT
    h.id                              AS horse_id,
    h.name                            AS horse_name,
    h.name_ar                         AS horse_name_ar,
    h.avatar_url                      AS avatar_url,
    pc.contract_id                    AS contract_id,
    pc.contract_status                AS contract_status,
    pc.operational_phase::text        AS operational_phase,
    pc.expected_arrival_at            AS expected_arrival_at,
    pc.activated_at                   AS admitted_at,
    pc.ended_at                       AS checked_out_at,
    pc.stable_tenant_id               AS stable_tenant_id,
    st.name                           AS stable_name,
    st.name_ar                        AS stable_name_ar,
    COALESCE((
      SELECT COUNT(*)::int
      FROM public.service_requests sr
      WHERE sr.boarding_contract_id = pc.contract_id
        AND sr.status IN ('pending', 'approved')
        AND COALESCE(sr.fulfillment_status, '') <> 'fulfilled'
    ), 0)                             AS open_service_requests_count,
    GREATEST(
      pc.updated_at,
      COALESCE(pc.activated_at, 'epoch'::timestamptz),
      COALESCE(pc.ended_at, 'epoch'::timestamptz),
      COALESCE(pc.expected_arrival_at, 'epoch'::timestamptz)
    )                                 AS last_owner_visible_update_at,
    'contract_join'::text             AS visibility_source
  FROM primary_contract pc
  JOIN public.horses  h ON h.id = pc.horse_id
  JOIN public.tenants st ON st.id = pc.stable_tenant_id
  WHERE h.tenant_id = p_owner_tenant_id
  ORDER BY
    CASE pc.contract_status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
    h.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_hosted_horses(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_hosted_horses(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_owner_hosted_horses(uuid) IS
  'B2.4 Owner Hosted Horses MVB. SECURITY DEFINER projection: returns curated, '
  'owner-safe summary rows for horses owned by p_owner_tenant_id and hosted at '
  'other stable tenants. Caller must be an active member of p_owner_tenant_id; '
  'non-members receive an empty result. Does NOT expose unit/branch/admission/'
  'lab/vet/financial detail.';
