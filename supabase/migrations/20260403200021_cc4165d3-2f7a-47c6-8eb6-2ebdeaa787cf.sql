
CREATE OR REPLACE FUNCTION public.finalize_invitation_acceptance(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv record;
  v_status text;
  v_user_id uuid;
  v_user_email text;
  v_existing_member uuid;
  v_member_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE id = v_user_id;

  SELECT
    i.id,
    i.tenant_id,
    i.sender_id,
    i.invitee_email,
    i.proposed_role,
    i.assigned_horse_ids,
    i.status
  INTO v_inv
  FROM public.invitations i
  WHERE i.token = _token
    AND i.status IN ('pending', 'preaccepted')
    AND i.expires_at > now()
  FOR UPDATE;

  IF v_inv IS NULL THEN
    SELECT status INTO v_status
    FROM public.invitations
    WHERE token = _token;

    IF v_status IS NOT NULL THEN
      IF v_status = 'expired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      ELSIF v_status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'revoked');
      ELSIF v_status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'error', 'rejected');
      ELSIF v_status = 'accepted' THEN
        SELECT tenant_id, proposed_role INTO v_inv.tenant_id, v_inv.proposed_role
        FROM public.invitations
        WHERE token = _token;
        RETURN jsonb_build_object(
          'success', true,
          'already_accepted', true,
          'tenant_id', v_inv.tenant_id,
          'role', v_inv.proposed_role,
          'message', 'Invitation was already accepted'
        );
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.invitations
        WHERE token = _token AND expires_at <= now()
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_inv.invitee_email IS NOT NULL THEN
    IF v_user_email IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_unavailable');
    END IF;
    IF lower(v_inv.invitee_email) <> lower(v_user_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
    END IF;
  END IF;

  SELECT id INTO v_existing_member
  FROM public.tenant_members
  WHERE tenant_id = v_inv.tenant_id
    AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    UPDATE public.tenant_members
    SET role = v_inv.proposed_role,
        is_active = true
    WHERE id = v_existing_member;
    v_member_id := v_existing_member;
  ELSE
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    VALUES (v_inv.tenant_id, v_user_id, v_inv.proposed_role, true)
    RETURNING id INTO v_member_id;
  END IF;

  IF v_inv.assigned_horse_ids IS NOT NULL AND array_length(v_inv.assigned_horse_ids, 1) > 0 THEN
    INSERT INTO public.member_horse_access (tenant_member_id, horse_id, granted_by)
    SELECT
      v_member_id,
      unnest(v_inv.assigned_horse_ids)::uuid,
      v_inv.sender_id
    ON CONFLICT (tenant_member_id, horse_id) DO NOTHING;
  END IF;

  -- HR auto-upsert: create or link hr_employees row
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
      v_inv.invitee_email,
      'Unknown'
    ),
    COALESCE(
      (SELECT p.email FROM public.profiles p WHERE p.id = v_user_id),
      v_inv.invitee_email
    ),
    'other',
    'external',
    true,
    v_inv.sender_id
  )
  ON CONFLICT ON CONSTRAINT hr_employees_tenant_user_uniq
  DO UPDATE SET
    is_active = true,
    full_name = COALESCE(EXCLUDED.full_name, hr_employees.full_name),
    email = COALESCE(EXCLUDED.email, hr_employees.email),
    updated_at = now();

  UPDATE public.invitations
  SET status = 'accepted',
      role_accepted = true,
      horses_accepted = true,
      responded_at = now(),
      accepted_at = now(),
      invitee_id = v_user_id
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_inv.tenant_id,
    'role', v_inv.proposed_role,
    'message', 'Successfully joined the organization'
  );
END;
$$;
