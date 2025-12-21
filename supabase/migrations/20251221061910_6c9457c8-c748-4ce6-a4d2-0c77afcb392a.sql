-- Fix: Recreate view without SECURITY DEFINER (use default SECURITY INVOKER)
-- This is safer as it uses the permissions of the querying user
DROP VIEW IF EXISTS public.public_tenant_directory;

CREATE VIEW public.public_tenant_directory 
WITH (security_invoker = true)
AS
SELECT 
  id,
  slug,
  type,
  COALESCE(public_name, name) as display_name,
  public_description,
  public_location_text,
  region,
  logo_url,
  cover_url,
  tags,
  is_listed,
  created_at
FROM public.tenants
WHERE is_public = true;

-- Add RLS policy to allow public read of public tenants
CREATE POLICY "Anyone can view public tenants"
ON public.tenants
FOR SELECT
USING (is_public = true);

-- Grant access to the view
GRANT SELECT ON public.public_tenant_directory TO anon;
GRANT SELECT ON public.public_tenant_directory TO authenticated;