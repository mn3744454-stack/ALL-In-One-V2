-- ============================================================
-- INVITATION SECURITY HARDENING - P0/P1 Combined Migration
-- ============================================================

-- ============================================================
-- P1: Add expires_at column with backfill
-- ============================================================

-- 1. Add expires_at column if not exists
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Backfill existing rows: set to created_at + 14 days
UPDATE public.invitations 
SET expires_at = created_at + interval '14 days' 
WHERE expires_at IS NULL;

-- 3. Set NOT NULL constraint
ALTER TABLE public.invitations 
ALTER COLUMN expires_at SET NOT NULL;

-- 4. Set default for new rows (7 days from now)
ALTER TABLE public.invitations 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- 5. Add partial index for pending/preaccepted invitations
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at_pending
ON public.invitations (expires_at)
WHERE status IN ('pending', 'preaccepted');

-- ============================================================
-- P0: Create BEFORE UPDATE trigger for immutability + transitions
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_invitation_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  -- RULE 1: IMMUTABLE FIELDS
  -- These fields cannot be changed after INSERT
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'sender_id is immutable';
  END IF;
  
  IF NEW.invitee_email IS DISTINCT FROM OLD.invitee_email THEN
    RAISE EXCEPTION 'invitee_email is immutable';
  END IF;
  
  IF NEW.proposed_role IS DISTINCT FROM OLD.proposed_role THEN
    RAISE EXCEPTION 'proposed_role is immutable';
  END IF;
  
  IF NEW.assigned_horse_ids IS DISTINCT FROM OLD.assigned_horse_ids THEN
    RAISE EXCEPTION 'assigned_horse_ids is immutable';
  END IF;
  
  IF NEW.token IS DISTINCT FROM OLD.token THEN
    RAISE EXCEPTION 'token is immutable';
  END IF;
  
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;

  -- RULE 2 (enhanced): INVITEE BINDING - self-binding only
  -- invitee_id can only be set to the current authenticated user
  IF OLD.invitee_id IS NULL AND NEW.invitee_id IS NOT NULL THEN
    IF NEW.invitee_id <> auth.uid() THEN
      RAISE EXCEPTION 'invitee_id must bind to current user';
    END IF;
  END IF;
  
  -- Once invitee_id is set, it cannot be changed to a different value
  IF OLD.invitee_id IS NOT NULL AND NEW.invitee_id IS DISTINCT FROM OLD.invitee_id THEN
    RAISE EXCEPTION 'invitee_id cannot be changed once set';
  END IF;

  -- RULE 3: STATUS TRANSITIONS
  -- Terminal states cannot transition to anything else
  IF OLD.status IN ('accepted', 'rejected', 'revoked', 'expired') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Cannot change status from terminal state: %', OLD.status;
    END IF;
  END IF;
  
  -- Valid transitions from pending
  IF OLD.status = 'pending' THEN
    IF NEW.status NOT IN ('pending', 'preaccepted', 'accepted', 'rejected', 'revoked', 'expired') THEN
      RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
    END IF;
  END IF;
  
  -- Valid transitions from preaccepted
  IF OLD.status = 'preaccepted' THEN
    IF NEW.status NOT IN ('preaccepted', 'accepted', 'rejected', 'revoked', 'expired') THEN
      RAISE EXCEPTION 'Invalid status transition from preaccepted to %', NEW.status;
    END IF;
  END IF;

  -- RULE 4: EXPIRY ENFORCEMENT
  -- Cannot accept/preaccept/reject an expired invitation
  IF NEW.status IN ('accepted', 'preaccepted', 'rejected') AND OLD.expires_at <= now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_enforce_invitation_update_rules ON public.invitations;

CREATE TRIGGER trg_enforce_invitation_update_rules
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invitation_update_rules();

-- ============================================================
-- P0: Remove dangerous UPDATE RLS policy
-- ============================================================

DROP POLICY IF EXISTS invitations_update ON public.invitations;

-- ============================================================
-- P0: Create reject_invitation RPC with strict email check
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_invitation(
  _invitation_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_status text;
  v_user_id uuid;
  v_user_email text;
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

  -- Lock and fetch invitation (only pending/preaccepted and not expired)
  SELECT id, invitee_email, expires_at, status
  INTO v_inv
  FROM public.invitations
  WHERE id = _invitation_id
    AND status IN ('pending', 'preaccepted')
    AND expires_at > now()
  FOR UPDATE;

  -- Handle not found cases with specific error messages
  IF v_inv IS NULL THEN
    SELECT status INTO v_status
    FROM public.invitations
    WHERE id = _invitation_id;

    IF v_status IS NOT NULL THEN
      IF v_status = 'expired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      ELSIF v_status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'revoked');
      ELSIF v_status IN ('accepted', 'rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_processed');
      END IF;
      -- Check if expired by expires_at
      IF EXISTS (
        SELECT 1 FROM public.invitations 
        WHERE id = _invitation_id AND expires_at <= now()
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Validate invitee identity (email match) - STRICT
  IF v_inv.invitee_email IS NOT NULL THEN
    IF v_user_email IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_unavailable');
    END IF;
    IF lower(v_inv.invitee_email) <> lower(v_user_email) THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
    END IF;
  END IF;

  -- Update invitation to rejected
  UPDATE public.invitations
  SET 
    status = 'rejected',
    role_accepted = false,
    horses_accepted = false,
    rejection_reason = _reason,
    responded_at = now(),
    invitee_id = v_user_id
  WHERE id = _invitation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- P0: Create revoke_invitation RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_invitation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_status text;
  v_user_id uuid;
  v_is_authorized boolean := false;
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  -- Lock and fetch invitation (only pending/preaccepted and not expired)
  SELECT id, sender_id, tenant_id, expires_at, status
  INTO v_inv
  FROM public.invitations
  WHERE id = _invitation_id
    AND status IN ('pending', 'preaccepted')
    AND expires_at > now()
  FOR UPDATE;

  -- Handle not found cases with specific error messages
  IF v_inv IS NULL THEN
    SELECT status INTO v_status
    FROM public.invitations
    WHERE id = _invitation_id;

    IF v_status IS NOT NULL THEN
      IF v_status = 'expired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      ELSIF v_status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_revoked');
      ELSIF v_status IN ('accepted', 'rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_processed');
      END IF;
      -- Check if expired by expires_at
      IF EXISTS (
        SELECT 1 FROM public.invitations 
        WHERE id = _invitation_id AND expires_at <= now()
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Authorization check: sender OR owner/manager of tenant
  IF v_inv.sender_id = v_user_id THEN
    v_is_authorized := true;
  ELSE
    -- Check if user is owner/manager of the tenant
    SELECT EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE tenant_id = v_inv.tenant_id
        AND user_id = v_user_id
        AND role IN ('owner', 'manager')
        AND is_active = true
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Update invitation to revoked
  UPDATE public.invitations
  SET 
    status = 'revoked',
    responded_at = now()
  WHERE id = _invitation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- P1: Update preaccept_invitation to enforce expiry + revoked
-- ============================================================

CREATE OR REPLACE FUNCTION public.preaccept_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_status text;
  v_tenant_name text;
  v_sender_name text;
BEGIN
  -- Lock and fetch invitation (only pending and not expired)
  SELECT 
    i.id,
    i.tenant_id,
    i.sender_id,
    i.invitee_email,
    i.proposed_role,
    i.assigned_horse_ids,
    i.status,
    i.expires_at
  INTO v_inv
  FROM public.invitations i
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
  FOR UPDATE;

  -- Handle not found cases with specific error messages
  IF v_inv IS NULL THEN
    SELECT status INTO v_status
    FROM public.invitations
    WHERE token = _token;

    IF v_status IS NOT NULL THEN
      IF v_status = 'expired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      ELSIF v_status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'error', 'revoked');
      ELSIF v_status IN ('accepted', 'rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'already_processed');
      ELSIF v_status = 'preaccepted' THEN
        -- Already preaccepted, return the data again (idempotent)
        SELECT 
          i.id,
          i.tenant_id,
          i.sender_id,
          i.invitee_email,
          i.proposed_role,
          i.assigned_horse_ids,
          i.status,
          i.expires_at
        INTO v_inv
        FROM public.invitations i
        WHERE i.token = _token;
        
        -- Get tenant and sender names
        SELECT name INTO v_tenant_name FROM public.tenants WHERE id = v_inv.tenant_id;
        SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_inv.sender_id;
        
        RETURN jsonb_build_object(
          'success', true,
          'already_preaccepted', true,
          'invitation_id', v_inv.id,
          'tenant_id', v_inv.tenant_id,
          'tenant_name', v_tenant_name,
          'sender_name', v_sender_name,
          'proposed_role', v_inv.proposed_role,
          'assigned_horse_ids', v_inv.assigned_horse_ids,
          'expires_at', v_inv.expires_at
        );
      END IF;
      -- Check if expired by expires_at
      IF EXISTS (
        SELECT 1 FROM public.invitations 
        WHERE token = _token AND expires_at <= now()
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'expired');
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Get tenant and sender names
  SELECT name INTO v_tenant_name FROM public.tenants WHERE id = v_inv.tenant_id;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_inv.sender_id;

  -- Update status to preaccepted
  UPDATE public.invitations
  SET status = 'preaccepted'
  WHERE id = v_inv.id;

  -- Return invitation details for display
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_inv.id,
    'tenant_id', v_inv.tenant_id,
    'tenant_name', v_tenant_name,
    'sender_name', v_sender_name,
    'proposed_role', v_inv.proposed_role,
    'assigned_horse_ids', v_inv.assigned_horse_ids,
    'expires_at', v_inv.expires_at
  );
END;
$$;

-- ============================================================
-- P1: Update finalize_invitation_acceptance to enforce expiry + revoked
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_invitation_acceptance(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inv record;
  v_status text;
  v_user_id uuid;
  v_user_email text;
  v_existing_member uuid;
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

  -- Handle not found cases with specific error messages
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
        -- Already accepted - idempotent success
        SELECT tenant_id, proposed_role INTO v_inv.tenant_id, v_inv.proposed_role
        FROM public.invitations WHERE token = _token;
        RETURN jsonb_build_object(
          'success', true,
          'already_accepted', true,
          'tenant_id', v_inv.tenant_id,
          'role', v_inv.proposed_role,
          'message', 'Invitation was already accepted'
        );
      END IF;
      -- Check if expired by expires_at
      IF EXISTS (
        SELECT 1 FROM public.invitations 
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

  -- Check if user is already a member of this tenant
  SELECT id INTO v_existing_member
  FROM public.tenant_members
  WHERE tenant_id = v_inv.tenant_id AND user_id = v_user_id;

  IF v_existing_member IS NOT NULL THEN
    -- Update existing membership role if needed
    UPDATE public.tenant_members
    SET role = v_inv.proposed_role, is_active = true
    WHERE id = v_existing_member;
  ELSE
    -- Create new tenant membership
    INSERT INTO public.tenant_members (tenant_id, user_id, role, is_active)
    VALUES (v_inv.tenant_id, v_user_id, v_inv.proposed_role, true);
  END IF;

  -- Update invitation to accepted
  UPDATE public.invitations
  SET 
    status = 'accepted',
    role_accepted = true,
    horses_accepted = true,
    responded_at = now(),
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

-- ============================================================
-- Grants for RPCs
-- ============================================================

GRANT EXECUTE ON FUNCTION public.reject_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preaccept_invitation(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_invitation_acceptance(text) TO authenticated;