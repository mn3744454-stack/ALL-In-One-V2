-- =====================================================
-- INVITATIONS: HORSE ASSIGNMENT FIX + SAFE BACKFILL
-- Single prompt to paste into Lovable (Modify Database)
-- =====================================================

-- =====================================================
-- TASK 1: Patch finalize_invitation_acceptance
-- Restores: sender_id selection, v_member_id capture,
-- member_horse_access persistence, accepted_at setting
-- =====================================================

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
  v_member_id uuid;  -- ✅ capture tenant_member.id for horse assignment
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  -- Get user's email from profiles
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE id = v_user_id;

  -- Lock and fetch invitation (pending or preaccepted, not expired)
  SELECT
    i.id,
    i.tenant_id,
    i.sender_id,          -- ✅ needed for granted_by
    i.invitee_email,
    i.proposed_role,
    i.assigned_horse_ids, -- ✅ used for horse access persistence
    i.status
  INTO v_inv
  FROM public.invitations i
  WHERE i.token = _token
    AND i.status IN ('pending', 'preaccepted')
    AND i.expires_at > now()
  FOR UPDATE;

  -- Handle not found / terminal states
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
        -- Idempotent success
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
      -- expired by time even if status not set
      IF EXISTS (
        SELECT 1
        FROM public.invitations
        WHERE token = _token AND expires_at <= now()
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Validate invitee identity (email match)
  IF v_inv.invitee_email IS NOT NULL THEN
    IF v_user_email IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_unavailable');
    END IF;
    IF lower(v_inv.invitee_email) <> lower(v_user_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
    END IF;
  END IF;

  -- Check if user already a tenant member
  SELECT id INTO v_existing_member
  FROM public.tenant_members
  WHERE tenant_id = v_inv.tenant_id
    AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    UPDATE public.tenant_members
    SET role = v_inv.proposed_role,
        is_active = true
    WHERE id = v_existing_member;
    v_member_id := v_existing_member; -- ✅
  ELSE
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    VALUES (v_inv.tenant_id, v_user_id, v_inv.proposed_role, true)
    RETURNING id INTO v_member_id; -- ✅
  END IF;

  -- ✅ Persist horse assignments from invitation
  IF v_inv.assigned_horse_ids IS NOT NULL AND array_length(v_inv.assigned_horse_ids, 1) > 0 THEN
    INSERT INTO public.member_horse_access (tenant_member_id, horse_id, granted_by)
    SELECT
      v_member_id,
      unnest(v_inv.assigned_horse_ids)::uuid,
      v_inv.sender_id
    ON CONFLICT (tenant_member_id, horse_id) DO NOTHING;
  END IF;

  -- Mark invitation accepted (also set accepted_at)
  UPDATE public.invitations
  SET status = 'accepted',
      role_accepted = true,
      horses_accepted = true,
      responded_at = now(),
      accepted_at = now(), -- ✅
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

-- =====================================================
-- TASK 2A: Backfill missing member_horse_access rows
-- (Safe: INSERT into member_horse_access only; no triggers on invitations)
-- =====================================================

INSERT INTO public.member_horse_access (tenant_member_id, horse_id, granted_by)
SELECT
  tm.id AS tenant_member_id,
  unnest(i.assigned_horse_ids)::uuid AS horse_id,
  i.sender_id AS granted_by
FROM public.invitations i
JOIN public.tenant_members tm
  ON tm.tenant_id = i.tenant_id
  AND tm.user_id = i.invitee_id
WHERE i.status = 'accepted'
  AND i.invitee_id IS NOT NULL
  AND i.assigned_horse_ids IS NOT NULL
  AND array_length(i.assigned_horse_ids, 1) > 0
ON CONFLICT (tenant_member_id, horse_id) DO NOTHING;

-- =====================================================
-- TASK 2B: Backfill accepted_at SAFELY (NO trigger disable)
-- Important: avoid touching rows that might violate your update trigger rules.
-- If you must update even expired rows, do it in a separate migration with
-- correct trigger name. For now, keep it safe.
-- =====================================================

UPDATE public.invitations
SET accepted_at = COALESCE(responded_at, now())
WHERE status = 'accepted'
  AND accepted_at IS NULL
  AND expires_at > now();