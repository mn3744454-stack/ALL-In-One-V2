
DROP POLICY IF EXISTS invitations_insert ON public.invitations;

CREATE POLICY invitations_insert ON public.invitations
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = invitations.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.can_invite = true OR tm.role = ANY (ARRAY['owner'::tenant_role, 'manager'::tenant_role, 'foreman'::tenant_role]))
  )
  AND (
    proposed_role <> 'owner'::tenant_role
    OR EXISTS (
      SELECT 1 FROM tenant_members tm2
      WHERE tm2.tenant_id = invitations.tenant_id
        AND tm2.user_id = auth.uid()
        AND tm2.is_active = true
        AND tm2.role = 'owner'::tenant_role
    )
  )
);
