-- Allow users to add themselves as members when they have a valid pending invitation
CREATE POLICY "Users can join via invitation"
ON public.tenant_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.invitations inv
    WHERE inv.tenant_id = tenant_members.tenant_id
    AND inv.proposed_role::text = tenant_members.role::text
    AND inv.status = 'pending'
    AND (
      inv.invitee_id = auth.uid() 
      OR inv.invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  )
);