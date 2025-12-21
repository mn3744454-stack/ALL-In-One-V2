-- Step 3A: Public Business Directory
-- Add public profile columns to tenants table

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_listed boolean DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_description text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_phone text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_email text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_website text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_location_text text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create a secure VIEW for public tenant directory
-- This ensures only public fields are exposed
CREATE OR REPLACE VIEW public.public_tenant_directory AS
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

-- Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public.public_tenant_directory TO anon;
GRANT SELECT ON public.public_tenant_directory TO authenticated;

-- Function to check slug availability
CREATE OR REPLACE FUNCTION public.is_slug_available(check_slug text, exclude_tenant_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE slug = check_slug
    AND (exclude_tenant_id IS NULL OR id != exclude_tenant_id)
  )
$$;

-- Function to generate unique slug from name
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase and replace non-alphanumeric with hyphens
  base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9\u0621-\u064A]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure minimum length
  IF length(base_slug) < 3 THEN
    base_slug := base_slug || '-business';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to get public tenant by slug (returns NULL if not public)
CREATE OR REPLACE FUNCTION public.get_public_tenant(tenant_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  type tenant_type,
  display_name text,
  public_description text,
  public_phone text,
  public_email text,
  public_website text,
  public_location_text text,
  region text,
  logo_url text,
  cover_url text,
  tags text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.slug,
    t.type,
    COALESCE(t.public_name, t.name) as display_name,
    t.public_description,
    t.public_phone,
    t.public_email,
    t.public_website,
    t.public_location_text,
    t.region,
    t.logo_url,
    t.cover_url,
    t.tags,
    t.created_at
  FROM public.tenants t
  WHERE t.slug = tenant_slug AND t.is_public = true
$$;

-- Seed 6 example tenants for demo
INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'إسطبل الرياض الملكي',
  'stable'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'riyadh-royal-stables',
  true,
  true,
  'Royal Riyadh Stables',
  'Premier equestrian facility offering world-class boarding, training, and riding lessons. Home to champion Arabian horses with state-of-the-art facilities.',
  'Riyadh, Saudi Arabia',
  'riyadh',
  ARRAY['boarding', 'training', 'lessons', 'arabian']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'عيادة الخيل البيطرية',
  'clinic'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'al-khail-vet-clinic',
  true,
  true,
  'Al-Khail Veterinary Clinic',
  'Comprehensive veterinary care for horses including emergency services, dental care, and reproductive services. 24/7 availability.',
  'Jeddah, Saudi Arabia',
  'jeddah',
  ARRAY['veterinary', 'emergency', 'dental', 'reproduction']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'مختبر التحاليل البيطرية',
  'lab'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'gulf-equine-lab',
  true,
  true,
  'Gulf Equine Laboratory',
  'Advanced diagnostic laboratory specializing in equine health testing, DNA analysis, and performance testing.',
  'Dammam, Saudi Arabia',
  'dammam',
  ARRAY['diagnostics', 'dna-testing', 'bloodwork', 'performance']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'أكاديمية الفروسية السعودية',
  'academy'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'saudi-equestrian-academy',
  true,
  true,
  'Saudi Equestrian Academy',
  'Elite riding academy offering beginner to advanced courses in dressage, show jumping, and traditional Arabian horsemanship.',
  'Riyadh, Saudi Arabia',
  'riyadh',
  ARRAY['training', 'dressage', 'jumping', 'courses']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'صيدلية الخيول البيطرية',
  'pharmacy'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'equine-pharma-ksa',
  true,
  true,
  'Equine Pharma KSA',
  'Specialized equine pharmacy providing medications, supplements, and health products. Licensed veterinary pharmacists on staff.',
  'Mecca, Saudi Arabia',
  'mecca',
  ARRAY['medications', 'supplements', 'health-products']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.tenants (name, type, owner_id, slug, is_public, is_listed, public_name, public_description, public_location_text, region, tags)
SELECT 
  'شركة نقل الخيول المتميزة',
  'transport'::tenant_type,
  (SELECT id FROM auth.users LIMIT 1),
  'elite-horse-transport',
  true,
  true,
  'Elite Horse Transport',
  'Professional horse transportation services across the GCC. Climate-controlled vehicles, experienced handlers, and full insurance coverage.',
  'Riyadh, Saudi Arabia',
  'riyadh',
  ARRAY['transport', 'domestic', 'international', 'insured']
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;