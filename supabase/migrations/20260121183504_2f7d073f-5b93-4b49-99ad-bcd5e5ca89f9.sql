CREATE OR REPLACE FUNCTION public.get_my_pending_invitations()
RETURNS TABLE (
  id uuid,
  token text,
  status public.invitation_status,
  proposed_role public.tenant_role,
  tenant_id uuid,
  tenant_name text,
  sender_display_name text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- ✅ Use Auth JWT email as the source of truth (more secure than profiles.email)
  v_email := lower(auth.jwt() ->> 'email');
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.token,
    i.status,
    i.proposed_role,
    i.tenant_id,
    t.name as tenant_name,
    COALESCE(i.sender_display_name, p.full_name, 'Unknown') as sender_display_name,
    i.created_at,
    i.expires_at
  FROM public.invitations i
  JOIN public.tenants t ON t.id = i.tenant_id
  LEFT JOIN public.profiles p ON p.id = i.sender_id
  WHERE
    i.status IN ('pending', 'preaccepted')
    AND i.expires_at > now()
    AND (
      (i.invitee_id IS NOT NULL AND i.invitee_id = v_user_id)
      OR (i.invitee_email IS NOT NULL AND lower(i.invitee_email) = v_email)
    )
  ORDER BY i.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_pending_invitations() TO authenticated;