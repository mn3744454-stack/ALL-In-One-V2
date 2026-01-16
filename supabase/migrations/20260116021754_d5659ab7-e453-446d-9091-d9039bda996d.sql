-- =====================================================
-- INVITATIONS: Token-based preaccept + finalize (atomic)
-- + orphan cleanup
-- =====================================================

-- 0) Ensure enum values exist (safe to re-run)
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'preaccepted';
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'revoked';

-- 1) Ensure required columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='preaccepted_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN preaccepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='accepted_at'
  ) THEN
    ALTER TABLE public.invitations ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invitations' AND column_name='token'
  ) THEN
    ALTER TABLE public.invitations
      ADD COLUMN token text UNIQUE DEFAULT (gen_random_uuid())::text;
  END IF;
END $$;

-- 2) Ensure token default exists + no NULLs (safe)
UPDATE public.invitations
SET token = (gen_random_uuid())::text
WHERE token IS NULL;

ALTER TABLE public.invitations
ALTER COLUMN token SET DEFAULT (gen_random_uuid())::text;

ALTER TABLE public.invitations
ALTER COLUMN token SET NOT NULL;

-- 3) RPC: preaccept (anon) - DOES NOT return PII
CREATE OR REPLACE FUNCTION public.preaccept_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_tenant record;
BEGIN
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = _token
    AND status = 'pending'
  FOR UPDATE;

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;

  SELECT id, name, type INTO v_tenant
  FROM public.tenants
  WHERE id = v_inv.tenant_id;

  UPDATE public.invitations
  SET status = 'preaccepted',
      preaccepted_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'tenant_id', v_tenant.id,
    'tenant_name', v_tenant.name,
    'tenant_type', v_tenant.type,
    'proposed_role', v_inv.proposed_role,
    'status', 'preaccepted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preaccept_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.preaccept_invitation(text) TO authenticated;

-- 4) RPC: finalize accept (authenticated) - atomic: invitation + membership
CREATE OR REPLACE FUNCTION public.finalize_invitation_acceptance(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_user_id uuid;
  v_user_email text;
  v_member_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Prefer profiles for email (stable inside public schema)
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = _token
    AND status IN ('pending', 'preaccepted')
  FOR UPDATE;

  IF v_inv IS NULL THEN
    -- idempotent: if already accepted, return membership if exists
    SELECT * INTO v_inv
    FROM public.invitations
    WHERE token = _token
      AND status = 'accepted';

    IF v_inv IS NOT NULL THEN
      SELECT id INTO v_member_id
      FROM public.tenant_members
      WHERE tenant_id = v_inv.tenant_id
        AND user_id = v_user_id;

      IF v_member_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'member_id', v_member_id, 'already_member', true);
      END IF;
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;

  -- Validate email match if invitee_email present
  IF v_inv.invitee_email IS NOT NULL AND v_user_email IS NOT NULL AND
     lower(v_inv.invitee_email) <> lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation sent to a different email');
  END IF;

  -- If already a member, just mark accepted (idempotent)
  SELECT id INTO v_member_id
  FROM public.tenant_members
  WHERE tenant_id = v_inv.tenant_id
    AND user_id = v_user_id;

  IF v_member_id IS NULL THEN
    INSERT INTO public.tenant_members (
      tenant_id, user_id, role, can_invite, can_manage_horses, is_active
    ) VALUES (
      v_inv.tenant_id,
      v_user_id,
      v_inv.proposed_role,
      false,
      v_inv.proposed_role IN ('foreman','manager'),
      true
    )
    RETURNING id INTO v_member_id;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted',
      invitee_id = v_user_id,
      responded_at = now(),
      accepted_at = now(),
      role_accepted = true
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'tenant_id', v_inv.tenant_id,
    'role', v_inv.proposed_role,
    'status', 'accepted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_invitation_acceptance(text) TO authenticated;

-- 5) Cleanup: orphan accepted invitations (accepted but no tenant_members) -> preaccepted
UPDATE public.invitations i
SET status = 'preaccepted',
    accepted_at = NULL,
    preaccepted_at = COALESCE(i.preaccepted_at, i.responded_at, now())
WHERE i.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = i.tenant_id
      AND tm.user_id = i.invitee_id
  );