-- PATCH finalize_invitation_acceptance: Add HR auto-upsert (External) after horse access persistence
-- This is the PATCHED version that preserves all existing logic exactly

CREATE OR REPLACE FUNCTION public.finalize_invitation_acceptance(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  ---- BEGIN PATCH: HR auto-upsert (External) ----
  INSERT INTO public.hr_employees (
    tenant_id,
    user_id,
    full_name,
    email,
    employee_type,
    employment_kind,
    is_active,
    created_by
  )
  VALUES (
    v_inv.tenant_id,
    v_user_id,
    COALESCE(
      (SELECT p.full_name FROM public.profiles p WHERE p.id = v_user_id),
      (SELECT p.email FROM public.profiles p WHERE p.id = v_user_id),
      v_inv.invitee_email,
      'Unknown'
    ),
    (SELECT p.email FROM public.profiles p WHERE p.id = v_user_id),
    'other',
    'external',
    true,
    v_inv.sender_id
  )
  ON CONFLICT ON CONSTRAINT hr_employees_tenant_user_uniq
  DO UPDATE SET
    is_active = true,
    employment_kind = EXCLUDED.employment_kind,
    full_name = COALESCE(EXCLUDED.full_name, hr_employees.full_name),
    email = COALESCE(EXCLUDED.email, hr_employees.email),
    updated_at = now();
  ---- END PATCH ----

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
$function$;