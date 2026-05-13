
-- 1. Enable RLS and lock down app_settings (server-side only)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all client access" ON public.app_settings;
CREATE POLICY "Deny all client access"
  ON public.app_settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 2. Restrict anonymous reads on tenants to safe public columns only
REVOKE SELECT ON public.tenants FROM anon;
GRANT SELECT (
  id, name, name_ar, type, description, description_ar, logo_url, slug,
  is_public, is_listed, public_name, public_description, public_phone,
  public_email, public_website, public_location_text, region, cover_url,
  tags, created_at
) ON public.tenants TO anon;
