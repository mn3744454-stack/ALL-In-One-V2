
-- =============================================================================
-- Phase 1: Lab Services Catalog
-- 1) Create lab_services table
-- 2) RLS policies for own-tenant CRUD + cross-tenant read via public/partnership
-- 3) SECURITY DEFINER RPC for safe cross-tenant reads
-- =============================================================================

-- 1) Create lab_services table
CREATE TABLE public.lab_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text,
  category text,
  description text,
  sample_type text,
  turnaround_hours int,
  price numeric,
  currency text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lab_services_tenant_active ON public.lab_services (tenant_id, is_active);
CREATE INDEX idx_lab_services_tenant_category ON public.lab_services (tenant_id, category);

-- Enable RLS
ALTER TABLE public.lab_services ENABLE ROW LEVEL SECURITY;

-- Lab tenant members can do full CRUD on their own tenant's services
CREATE POLICY "lab_services_select_own"
  ON public.lab_services FOR SELECT
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "lab_services_insert_own"
  ON public.lab_services FOR INSERT
  WITH CHECK (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "lab_services_update_own"
  ON public.lab_services FOR UPDATE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "lab_services_delete_own"
  ON public.lab_services FOR DELETE
  USING (public.is_active_tenant_member(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_lab_services_updated_at
  BEFORE UPDATE ON public.lab_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 2) SECURITY DEFINER RPC: get_lab_services_for_viewer
-- Allows cross-tenant reads when: lab is public OR accepted B2B partnership exists
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_lab_services_for_viewer(
  _lab_tenant_id uuid,
  _only_active boolean DEFAULT true,
  _search text DEFAULT '',
  _category text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  name_ar text,
  code text,
  category text,
  description text,
  sample_type text,
  turnaround_hours int,
  price numeric,
  currency text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _is_own_member boolean;
  _is_public_lab boolean;
  _has_partnership boolean;
  _search_pattern text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is a member of the lab tenant (own tenant)
  _is_own_member := public.is_active_tenant_member(_user_id, _lab_tenant_id);

  IF NOT _is_own_member THEN
    -- Check if lab is public
    SELECT t.is_public INTO _is_public_lab
    FROM public.tenants t WHERE t.id = _lab_tenant_id;

    IF _is_public_lab IS NOT TRUE THEN
      -- Check for accepted B2B partnership between caller's active tenant and this lab
      SELECT EXISTS (
        SELECT 1 FROM public.connections c
        JOIN public.tenant_members tm ON tm.user_id = _user_id AND tm.is_active = true
        WHERE c.connection_type = 'b2b'
          AND c.status = 'accepted'
          AND (
            (c.initiator_tenant_id = tm.tenant_id AND c.recipient_tenant_id = _lab_tenant_id)
            OR
            (c.recipient_tenant_id = tm.tenant_id AND c.initiator_tenant_id = _lab_tenant_id)
          )
      ) INTO _has_partnership;

      IF NOT _has_partnership THEN
        -- No access: return empty
        RETURN;
      END IF;
    END IF;
  END IF;

  _search_pattern := '%' || COALESCE(btrim(_search), '') || '%';

  RETURN QUERY
  SELECT
    ls.id, ls.name, ls.name_ar, ls.code, ls.category,
    ls.description, ls.sample_type, ls.turnaround_hours,
    ls.price, ls.currency, ls.is_active
  FROM public.lab_services ls
  WHERE ls.tenant_id = _lab_tenant_id
    AND (NOT _only_active OR ls.is_active = true)
    AND (_search = '' OR ls.name ILIKE _search_pattern OR ls.name_ar ILIKE _search_pattern OR ls.code ILIKE _search_pattern)
    AND (_category IS NULL OR ls.category = _category)
  ORDER BY ls.category NULLS LAST, ls.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lab_services_for_viewer(uuid, boolean, text, text) TO authenticated;
