-- =========================================
-- P0: Horse access scoping for tenant members
-- =========================================

-- 1) Create member_horse_access linking table + indexes + RLS
CREATE TABLE IF NOT EXISTS public.member_horse_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_member_id uuid NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'view',
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid NULL REFERENCES auth.users(id),
  UNIQUE (tenant_member_id, horse_id)
);

CREATE INDEX IF NOT EXISTS idx_mha_tenant_member_id ON public.member_horse_access(tenant_member_id);
CREATE INDEX IF NOT EXISTS idx_mha_horse_id ON public.member_horse_access(horse_id);

ALTER TABLE public.member_horse_access ENABLE ROW LEVEL SECURITY;

-- Ensure privileges exist
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_horse_access TO authenticated;

-- 2) RLS: member can read their own assignments
DROP POLICY IF EXISTS "Members can read own horse access" ON public.member_horse_access;
CREATE POLICY "Members can read own horse access"
ON public.member_horse_access
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.id = member_horse_access.tenant_member_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

-- 3) RLS: privileged roles can manage access within their tenant
DROP POLICY IF EXISTS "Privileged can manage horse access" ON public.member_horse_access;
CREATE POLICY "Privileged can manage horse access"
ON public.member_horse_access
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    JOIN public.tenant_members target_tm ON target_tm.id = member_horse_access.tenant_member_id
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.tenant_id = target_tm.tenant_id
      AND tm.role IN ('owner','manager','foreman')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    JOIN public.tenant_members target_tm ON target_tm.id = member_horse_access.tenant_member_id
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.tenant_id = target_tm.tenant_id
      AND tm.role IN ('owner','manager','foreman')
  )
);

-- 4) Replace horses SELECT policy with scoped policy
DROP POLICY IF EXISTS "Members can view tenant horses" ON public.horses;
CREATE POLICY "Members can view tenant horses (scoped)"
ON public.horses
FOR SELECT
TO authenticated
USING (
  -- privileged roles see all horses in tenant
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = horses.tenant_id
      AND tm.is_active = true
      AND tm.role IN ('owner','manager','foreman')
  )
  OR
  -- others see only assigned horses
  EXISTS (
    SELECT 1
    FROM public.member_horse_access mha
    JOIN public.tenant_members tm ON tm.id = mha.tenant_member_id
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.tenant_id = horses.tenant_id
      AND mha.horse_id = horses.id
  )
);

-- 5) Update finalize_invitation_acceptance to persist horse assignments
-- CRITICAL FIXES: token is TEXT not uuid, explicit cast to uuid for array elements
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
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required', 'error', 'Authentication required');
  END IF;

  -- Prefer profiles for email (public schema)
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
        RETURN jsonb_build_object('success', true, 'member_id', v_member_id, 'already_member', true, 'message', 'Already a member');
      END IF;
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Invitation not found or already processed', 'error', 'Invitation not found or already processed');
  END IF;

  -- Validate email match if invitee_email present
  IF v_inv.invitee_email IS NOT NULL AND v_user_email IS NOT NULL AND
     lower(v_inv.invitee_email) <> lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invitation sent to a different email', 'error', 'Invitation sent to a different email');
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

  -- P0: Persist horse assignments from invitation
  IF v_inv.assigned_horse_ids IS NOT NULL AND array_length(v_inv.assigned_horse_ids, 1) > 0 THEN
    INSERT INTO public.member_horse_access (tenant_member_id, horse_id, granted_by)
    SELECT v_member_id, (unnest(v_inv.assigned_horse_ids))::uuid, v_inv.sender_id
    ON CONFLICT (tenant_member_id, horse_id) DO NOTHING;
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
    'status', 'accepted',
    'message', 'Invitation accepted'
  );
END;
$$;