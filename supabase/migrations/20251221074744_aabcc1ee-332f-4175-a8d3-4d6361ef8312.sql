-- Create tenant_services table
CREATE TABLE public.tenant_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  price_display TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_services ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_services_updated_at
  BEFORE UPDATE ON public.tenant_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function for checking owner/admin role
CREATE OR REPLACE FUNCTION public.can_manage_tenant_services(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND role IN ('owner', 'admin')
    AND is_active = true
  )
$$;

-- Policy: Anyone can read public services from public tenants
CREATE POLICY "Anyone can read public services"
ON public.tenant_services FOR SELECT
USING (
  is_public = true 
  AND is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = tenant_id AND t.is_public = true
  )
);

-- Policy: Tenant members can view all services for their tenant
CREATE POLICY "Tenant members can view all services"
ON public.tenant_services FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Policy: Owners and admins can insert services
CREATE POLICY "Owners and admins can insert services"
ON public.tenant_services FOR INSERT
WITH CHECK (can_manage_tenant_services(auth.uid(), tenant_id));

-- Policy: Owners and admins can update services
CREATE POLICY "Owners and admins can update services"
ON public.tenant_services FOR UPDATE
USING (can_manage_tenant_services(auth.uid(), tenant_id));

-- Policy: Owners and admins can delete services
CREATE POLICY "Owners and admins can delete services"
ON public.tenant_services FOR DELETE
USING (can_manage_tenant_services(auth.uid(), tenant_id));