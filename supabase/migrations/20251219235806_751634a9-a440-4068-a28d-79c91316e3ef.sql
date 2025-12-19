-- Add owner_id column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Backfill existing tenants with owner from tenant_members
UPDATE public.tenants t
SET owner_id = (
  SELECT tm.user_id 
  FROM public.tenant_members tm 
  WHERE tm.tenant_id = t.id AND tm.role = 'owner' 
  LIMIT 1
);

-- Make owner_id NOT NULL after backfill
ALTER TABLE public.tenants 
ALTER COLUMN owner_id SET NOT NULL;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users with a session can create tenants" ON public.tenants;

-- Create new INSERT policy enforcing ownership
CREATE POLICY "Users can create tenants as owner"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());