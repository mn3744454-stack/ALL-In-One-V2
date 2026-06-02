-- Phase B: Horse Owner Account Shell — additive identity bridge on horses
-- Adds owner_tenant_id (nullable) so Horse Owner tenants can author and read
-- their own horses without touching existing stable workflows.

ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS owner_tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_horses_owner_tenant_id
  ON public.horses (owner_tenant_id)
  WHERE owner_tenant_id IS NOT NULL;

-- Additive SELECT policy: a Horse Owner tenant member can read horses where
-- owner_tenant_id matches their active tenant. Stable/scoped policy untouched.
DROP POLICY IF EXISTS "Owner tenant members can view owned horses" ON public.horses;
CREATE POLICY "Owner tenant members can view owned horses"
  ON public.horses
  FOR SELECT
  TO authenticated
  USING (
    owner_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = horses.owner_tenant_id
        AND tm.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = horses.owner_tenant_id
        AND t.type = 'horse_owner'
    )
  );

-- Additive INSERT policy: Horse Owner tenant members can insert horses
-- only when tenant_id = owner_tenant_id = their active horse_owner tenant.
DROP POLICY IF EXISTS "Owner tenant members can insert owned horses" ON public.horses;
CREATE POLICY "Owner tenant members can insert owned horses"
  ON public.horses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_tenant_id IS NOT NULL
    AND owner_tenant_id = tenant_id
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = horses.owner_tenant_id
        AND tm.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = horses.owner_tenant_id
        AND t.type = 'horse_owner'
    )
  );

-- Additive UPDATE policy: Horse Owner tenant members can update only the
-- horses they own (owner_tenant_id-scoped). Stable policy untouched.
DROP POLICY IF EXISTS "Owner tenant members can update owned horses" ON public.horses;
CREATE POLICY "Owner tenant members can update owned horses"
  ON public.horses
  FOR UPDATE
  TO authenticated
  USING (
    owner_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = horses.owner_tenant_id
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    owner_tenant_id IS NOT NULL
    AND owner_tenant_id = tenant_id
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = horses.owner_tenant_id
        AND tm.is_active = true
    )
  );
