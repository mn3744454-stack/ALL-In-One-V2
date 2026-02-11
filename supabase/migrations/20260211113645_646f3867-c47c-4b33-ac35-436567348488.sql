
-- ============================================================
-- MIGRATION: Fix RPC + Add dual-tenant columns to lab_requests
-- + Add requester (stable) RLS + Tighten UPDATE guard
-- ============================================================

SET search_path = public;

-- 1) FIX RPC: get_connection_party_names — replace p.username with p.email
CREATE OR REPLACE FUNCTION public.get_connection_party_names(_connection_ids uuid[])
RETURNS TABLE(entity_id uuid, display_name text, entity_kind text, entity_subtype text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_tenant_ids uuid[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT array_agg(tm.tenant_id) INTO _user_tenant_ids
  FROM public.tenant_members tm
  WHERE tm.user_id = _user_id AND tm.is_active = true;

  _user_tenant_ids := COALESCE(_user_tenant_ids, ARRAY[]::uuid[]);

  RETURN QUERY
  WITH authorized_connections AS (
    SELECT c.id, c.initiator_tenant_id, c.recipient_tenant_id,
           c.initiator_user_id, c.recipient_profile_id
    FROM public.connections c
    WHERE c.id = ANY(_connection_ids)
      AND (
        c.initiator_tenant_id = ANY(_user_tenant_ids)
        OR c.recipient_tenant_id = ANY(_user_tenant_ids)
        OR c.initiator_user_id = _user_id
        OR c.recipient_profile_id = _user_id
      )
  ),
  tenant_ids AS (
    SELECT DISTINCT tid FROM (
      SELECT initiator_tenant_id AS tid FROM authorized_connections WHERE initiator_tenant_id IS NOT NULL
      UNION
      SELECT recipient_tenant_id AS tid FROM authorized_connections WHERE recipient_tenant_id IS NOT NULL
    ) sub
  ),
  profile_ids AS (
    SELECT DISTINCT pid FROM (
      SELECT initiator_user_id AS pid FROM authorized_connections WHERE initiator_user_id IS NOT NULL
      UNION
      SELECT recipient_profile_id AS pid FROM authorized_connections WHERE recipient_profile_id IS NOT NULL
    ) sub
  )
  SELECT t.id AS entity_id,
         COALESCE(NULLIF(btrim(t.name), ''), ('Tenant ' || left(t.id::text, 8) || '…')) AS display_name,
         'tenant'::text AS entity_kind,
         t.type::text AS entity_subtype
  FROM public.tenants t
  WHERE t.id IN (SELECT tid FROM tenant_ids)

  UNION ALL

  SELECT p.id AS entity_id,
         COALESCE(
           NULLIF(btrim(p.full_name), ''),
           NULLIF(btrim(p.email), ''),
           ('Profile ' || left(p.id::text, 8) || '…')
         ) AS display_name,
         'profile'::text AS entity_kind,
         NULL::text AS entity_subtype
  FROM public.profiles p
  WHERE p.id IN (SELECT pid FROM profile_ids);
END;
$$;

-- 2) ADD dual-tenant columns to lab_requests
ALTER TABLE public.lab_requests
  ADD COLUMN IF NOT EXISTS initiator_tenant_id uuid REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS lab_tenant_id uuid REFERENCES public.tenants(id);

-- 3) Backfill: existing rows have tenant_id = requester (stable)
UPDATE public.lab_requests
SET initiator_tenant_id = tenant_id
WHERE initiator_tenant_id IS NULL;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_lab_requests_lab_tenant
  ON public.lab_requests(lab_tenant_id)
  WHERE lab_tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_requests_initiator_tenant
  ON public.lab_requests(initiator_tenant_id)
  WHERE initiator_tenant_id IS NOT NULL;

-- 5) RLS POLICIES

DROP POLICY IF EXISTS "Requester tenant can view own requests" ON public.lab_requests;
CREATE POLICY "Requester tenant can view own requests"
  ON public.lab_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Requester tenant can create requests" ON public.lab_requests;
CREATE POLICY "Requester tenant can create requests"
  ON public.lab_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Lab tenant can view incoming requests" ON public.lab_requests;
CREATE POLICY "Lab tenant can view incoming requests"
  ON public.lab_requests
  FOR SELECT
  USING (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_requests.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Lab tenant can update incoming requests" ON public.lab_requests;
CREATE POLICY "Lab tenant can update incoming requests"
  ON public.lab_requests
  FOR UPDATE
  USING (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_requests.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  )
  WITH CHECK (
    lab_tenant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public.lab_requests.lab_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- 6) BEFORE UPDATE trigger — immutable guard
CREATE OR REPLACE FUNCTION public.lab_requests_immutable_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id on lab_requests';
  END IF;
  IF NEW.initiator_tenant_id IS DISTINCT FROM OLD.initiator_tenant_id THEN
    RAISE EXCEPTION 'Cannot change initiator_tenant_id on lab_requests';
  END IF;
  IF NEW.lab_tenant_id IS DISTINCT FROM OLD.lab_tenant_id THEN
    RAISE EXCEPTION 'Cannot change lab_tenant_id on lab_requests';
  END IF;
  IF NEW.horse_id IS DISTINCT FROM OLD.horse_id THEN
    RAISE EXCEPTION 'Cannot change horse_id on lab_requests';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot change created_by on lab_requests';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot change created_at on lab_requests';
  END IF;
  IF NEW.test_description IS DISTINCT FROM OLD.test_description THEN
    RAISE EXCEPTION 'Cannot change test_description on lab_requests';
  END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'Cannot change notes on lab_requests';
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    RAISE EXCEPTION 'Cannot change priority on lab_requests';
  END IF;
  IF NEW.expected_by IS DISTINCT FROM OLD.expected_by THEN
    RAISE EXCEPTION 'Cannot change expected_by on lab_requests';
  END IF;
  IF NEW.external_lab_name IS DISTINCT FROM OLD.external_lab_name THEN
    RAISE EXCEPTION 'Cannot change external_lab_name on lab_requests';
  END IF;
  IF NEW.external_lab_id IS DISTINCT FROM OLD.external_lab_id THEN
    RAISE EXCEPTION 'Cannot change external_lab_id on lab_requests';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_requests_immutable_guard ON public.lab_requests;
CREATE TRIGGER trg_lab_requests_immutable_guard
  BEFORE UPDATE ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.lab_requests_immutable_guard();
