
-- Enforce authorship boundary: stable users cannot update externally-authored care notes
-- This is enforced via an UPDATE policy that checks created_by_role
CREATE OR REPLACE FUNCTION public.is_stable_internal_role(role_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role_name = ANY(ARRAY['owner', 'manager', 'staff', 'groom', 'foreman'])
$$;

-- Drop existing update policy if any and create a stricter one
DO $$
BEGIN
  -- Try to drop existing update policy
  BEGIN
    DROP POLICY IF EXISTS "Members can update own tenant care notes" ON public.horse_care_notes;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END $$;

-- New update policy: members can only update notes they authored OR notes with internal stable roles
CREATE POLICY "Members can update care notes respecting authorship"
  ON public.horse_care_notes
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = auth.uid()
    )
    AND (
      -- Author can always edit their own notes
      created_by = auth.uid()
      -- OR note is from internal stable role (stable staff can edit other stable staff notes)
      OR is_stable_internal_role(created_by_role)
      -- OR updater is not stable internal (external users can edit their own via created_by check above)
    )
  );
