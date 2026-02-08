-- ============================================================
-- Phase A: Single-Primary Enforcement + RPC Function
-- Zero-Tech-Debt UHP Implementation
-- ============================================================

-- A.2: Partial unique index to enforce single primary per horse/relationship
-- This prevents multiple is_primary=true rows for the same horse/tenant/relationship
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_horse_links_one_primary
  ON party_horse_links(tenant_id, lab_horse_id, relationship_type)
  WHERE is_primary = true;

-- A.1: RPC function with built-in authorization and advisory lock
CREATE OR REPLACE FUNCTION public.set_primary_party_horse_link(
  p_tenant_id uuid,
  p_client_id uuid,
  p_lab_horse_id uuid,
  p_relationship_type text DEFAULT 'lab_customer'
)
RETURNS party_horse_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result party_horse_links;
  v_user_id uuid;
  v_lock_key bigint;
BEGIN
  -- Get the current user ID (MUST be authenticated)
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required: No authenticated user';
  END IF;
  
  -- Authorization check: user must be an active tenant member
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = v_user_id
      AND tm.is_active = true
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: User is not an active member of this tenant';
  END IF;

  -- Advisory lock to prevent race conditions
  -- Create a stable lock key from tenant_id + lab_horse_id + relationship_type
  v_lock_key := hashtext(p_tenant_id::text || p_lab_horse_id::text || p_relationship_type);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Step 1: Clear existing primary for this tenant + horse + relationship
  UPDATE party_horse_links
  SET is_primary = false
  WHERE tenant_id = p_tenant_id
    AND lab_horse_id = p_lab_horse_id
    AND relationship_type = p_relationship_type
    AND is_primary = true;

  -- Step 2: Upsert the target link as primary
  -- created_by is ALWAYS set to auth.uid() (no arbitrary p_created_by allowed)
  INSERT INTO party_horse_links (
    tenant_id, client_id, lab_horse_id, relationship_type, is_primary, created_by
  )
  VALUES (
    p_tenant_id, p_client_id, p_lab_horse_id, p_relationship_type, true, v_user_id
  )
  ON CONFLICT (tenant_id, client_id, lab_horse_id, relationship_type)
  DO UPDATE SET
    is_primary = true,
    created_by = COALESCE(party_horse_links.created_by, v_user_id)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (function validates internally)
GRANT EXECUTE ON FUNCTION public.set_primary_party_horse_link TO authenticated;