
-- Connection horse access table for operational collaborator scoping
CREATE TABLE public.connection_horse_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  horse_id UUID NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'readwrite')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, horse_id)
);

ALTER TABLE public.connection_horse_access ENABLE ROW LEVEL SECURITY;

-- RLS: Members of either tenant in the connection can view
CREATE POLICY "connection_horse_access_select"
ON public.connection_horse_access FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.connections c
    JOIN public.tenant_members tm ON tm.user_id = auth.uid() AND tm.is_active = true
    WHERE c.id = connection_horse_access.connection_id
      AND (c.initiator_tenant_id = tm.tenant_id OR c.recipient_tenant_id = tm.tenant_id)
  )
);

-- RLS: Only members of the initiator tenant (the one who invited) can manage
CREATE POLICY "connection_horse_access_manage"
ON public.connection_horse_access FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.connections c
    JOIN public.tenant_members tm ON tm.user_id = auth.uid() AND tm.is_active = true
    WHERE c.id = connection_horse_access.connection_id
      AND c.initiator_tenant_id = tm.tenant_id
      AND tm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.connections c
    JOIN public.tenant_members tm ON tm.user_id = auth.uid() AND tm.is_active = true
    WHERE c.id = connection_horse_access.connection_id
      AND c.initiator_tenant_id = tm.tenant_id
      AND tm.role IN ('owner', 'manager')
  )
);
