CREATE POLICY "Connected tenant members can view granted horses"
ON public.horses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.connection_horse_access cha
    JOIN public.connections c
      ON c.id = cha.connection_id
    JOIN public.tenant_members tm
      ON tm.user_id = auth.uid()
     AND tm.is_active = true
    WHERE cha.horse_id = horses.id
      AND c.status = 'accepted'
      AND c.revoked_at IS NULL
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND cha.access_level IN ('read','readwrite')
      AND (
        (c.initiator_tenant_id = horses.tenant_id AND c.recipient_tenant_id = tm.tenant_id)
        OR
        (c.recipient_tenant_id = horses.tenant_id AND c.initiator_tenant_id = tm.tenant_id)
      )
  )
);