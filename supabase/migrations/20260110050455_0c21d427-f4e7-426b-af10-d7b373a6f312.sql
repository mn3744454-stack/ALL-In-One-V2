-- PATCH A: Secure Storage Object Policies for horse-media bucket
-- ================================================================

-- A1. Helper function to extract tenant_id from storage path (in public schema)
CREATE OR REPLACE FUNCTION public.get_tenant_id_from_storage_path(object_path text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NULLIF(split_part(object_path, '/', 1), '')::uuid
$$;

-- A2. Drop existing overly-permissive storage policies
DROP POLICY IF EXISTS "Authenticated users can delete horse media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update horse media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload horse media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view horse media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can view their media" ON storage.objects;
DROP POLICY IF EXISTS "Tenant members can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Managers can update their tenant media" ON storage.objects;
DROP POLICY IF EXISTS "Managers can delete their tenant media" ON storage.objects;

-- A3. Create secure tenant-isolated policies

-- SELECT: Tenant members can view files in their tenant folder
CREATE POLICY "Tenant members can view their media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'horse-media'
  AND public.is_tenant_member(auth.uid(), public.get_tenant_id_from_storage_path(name))
);

-- INSERT: Tenant members can upload to their tenant folder only
CREATE POLICY "Tenant members can upload to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'horse-media'
  AND public.is_tenant_member(auth.uid(), public.get_tenant_id_from_storage_path(name))
);

-- UPDATE: Only managers can update files in their tenant folder
CREATE POLICY "Managers can update their tenant media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'horse-media'
  AND (
    public.can_manage_horses(auth.uid(), public.get_tenant_id_from_storage_path(name))
    OR public.can_manage_tenant_services(auth.uid(), public.get_tenant_id_from_storage_path(name))
  )
);

-- DELETE: Only managers can delete files in their tenant folder
CREATE POLICY "Managers can delete their tenant media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'horse-media'
  AND (
    public.can_manage_horses(auth.uid(), public.get_tenant_id_from_storage_path(name))
    OR public.can_manage_tenant_services(auth.uid(), public.get_tenant_id_from_storage_path(name))
  )
);

-- PATCH D: Hardening initialize_tenant_defaults
-- ================================================================

-- Update function to validate caller is owner of tenant
CREATE OR REPLACE FUNCTION public.initialize_tenant_defaults(
  p_tenant_id uuid,
  p_tenant_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SECURITY: Validate caller is owner of this tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE id = p_tenant_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You must be the owner of this tenant to initialize defaults';
  END IF;

  -- Laboratory defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'laboratory',
    CASE WHEN p_tenant_type = 'lab' THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type = 'lab' THEN '{"lab_mode": "full"}'::jsonb
      WHEN p_tenant_type IN ('stable', 'clinic') THEN '{"lab_mode": "requests"}'::jsonb
      ELSE '{"lab_mode": "none"}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Vet defaults (visits)
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'vet',
    CASE WHEN p_tenant_type IN ('clinic', 'vet') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('clinic', 'vet') THEN '{"enabled": true}'::jsonb
      WHEN p_tenant_type = 'stable' THEN '{"enabled": false}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Housing defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'housing',
    CASE WHEN p_tenant_type IN ('stable', 'clinic') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('stable', 'clinic') THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Movement defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'movement',
    CASE WHEN p_tenant_type IN ('stable', 'clinic', 'transport') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('stable', 'clinic', 'transport') THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Breeding defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'breeding',
    CASE WHEN p_tenant_type = 'stable' THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type = 'stable' THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;
END;
$$;