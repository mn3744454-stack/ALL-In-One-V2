-- =====================================================
-- P0 Fix: Snapshot trigger + lab_request_services RLS + Data cleanup (HARDENED)
-- =====================================================

-- A1) SECURITY DEFINER trigger to guarantee non-NULL snapshots on lab_requests INSERT
CREATE OR REPLACE FUNCTION public.fn_populate_lab_request_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_alias TEXT;
  v_horse_name TEXT;
  v_horse_name_ar TEXT;
  v_tenant_name TEXT;
BEGIN
  -- Horse snapshot resolution (only if horse_id provided and snapshot missing)
  IF NEW.horse_id IS NOT NULL AND NEW.horse_name_snapshot IS NULL THEN
    SELECT h.name, h.name_ar
      INTO v_horse_name, v_horse_name_ar
    FROM public.horses h
    WHERE h.id = NEW.horse_id
      AND h.tenant_id = NEW.tenant_id
    LIMIT 1;
    IF v_horse_name IS NULL THEN
      RAISE EXCEPTION 'Horse % not found for tenant %', NEW.horse_id, NEW.tenant_id;
    END IF;
    -- Try active alias first (privacy-respecting)
    SELECT ha.alias
      INTO v_alias
    FROM public.horse_aliases ha
    WHERE ha.horse_id = NEW.horse_id
      AND ha.tenant_id = NEW.tenant_id
      AND ha.is_active = true
    ORDER BY ha.created_at DESC
    LIMIT 1;
    IF v_alias IS NOT NULL THEN
      NEW.horse_name_snapshot := v_alias;
      NEW.horse_name_ar_snapshot := v_horse_name_ar;
    ELSE
      NEW.horse_name_snapshot := v_horse_name;
      NEW.horse_name_ar_snapshot := v_horse_name_ar;
    END IF;
  END IF;

  -- Horse snapshot JSONB
  IF NEW.horse_id IS NOT NULL AND NEW.horse_snapshot IS NULL THEN
    SELECT jsonb_build_object('breed', h.breed, 'color', h.color)
    INTO NEW.horse_snapshot
    FROM public.horses h
    WHERE h.id = NEW.horse_id
      AND h.tenant_id = NEW.tenant_id
    LIMIT 1;
  END IF;

  -- Initiator tenant name snapshot
  IF NEW.initiator_tenant_id IS NOT NULL AND NEW.initiator_tenant_name_snapshot IS NULL THEN
    SELECT t.name INTO v_tenant_name
    FROM public.tenants t
    WHERE t.id = NEW.initiator_tenant_id
    LIMIT 1;
    IF v_tenant_name IS NULL THEN
      RAISE EXCEPTION 'Cannot resolve tenant name for initiator_tenant_id %', NEW.initiator_tenant_id;
    END IF;
    NEW.initiator_tenant_name_snapshot := v_tenant_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_populate_lab_request_snapshots ON public.lab_requests;
CREATE TRIGGER trg_populate_lab_request_snapshots
  BEFORE INSERT ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_populate_lab_request_snapshots();

-- A2) Fix RLS: Allow Lab tenant members to SELECT lab_request_services
DROP POLICY IF EXISTS lrs_select_via_lab_tenant ON public.lab_request_services;
CREATE POLICY lrs_select_via_lab_tenant
  ON public.lab_request_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_requests r
      WHERE r.id = public.lab_request_services.lab_request_id
        AND r.lab_tenant_id IS NOT NULL
        AND is_active_tenant_member(auth.uid(), r.lab_tenant_id)
    )
  );

-- A3) Data cleanup: Backfill NULL snapshots
UPDATE public.lab_requests lr SET
  horse_name_snapshot = COALESCE(
    (SELECT ha.alias FROM public.horse_aliases ha
     WHERE ha.horse_id = lr.horse_id AND ha.tenant_id = lr.tenant_id AND ha.is_active = true
     ORDER BY ha.created_at DESC LIMIT 1),
    (SELECT h.name FROM public.horses h WHERE h.id = lr.horse_id AND h.tenant_id = lr.tenant_id)
  ),
  horse_name_ar_snapshot = COALESCE(
    lr.horse_name_ar_snapshot,
    (SELECT h.name_ar FROM public.horses h WHERE h.id = lr.horse_id AND h.tenant_id = lr.tenant_id)
  ),
  initiator_tenant_name_snapshot = COALESCE(
    lr.initiator_tenant_name_snapshot,
    (SELECT t.name FROM public.tenants t WHERE t.id = lr.initiator_tenant_id)
  ),
  horse_snapshot = COALESCE(
    lr.horse_snapshot,
    (SELECT jsonb_build_object('breed', h.breed, 'color', h.color)
     FROM public.horses h WHERE h.id = lr.horse_id AND h.tenant_id = lr.tenant_id)
  )
WHERE lr.horse_name_snapshot IS NULL AND lr.horse_id IS NOT NULL;

-- Repair lab_horses with name='Unknown'
UPDATE public.lab_horses lh SET
  name = COALESCE(
    (SELECT lr.horse_name_snapshot FROM public.lab_requests lr
     WHERE lr.horse_id = lh.linked_horse_id AND lr.horse_name_snapshot IS NOT NULL
     ORDER BY lr.created_at DESC LIMIT 1),
    (SELECT h.name FROM public.horses h WHERE h.id = lh.linked_horse_id),
    lh.name
  ),
  name_ar = COALESCE(
    (SELECT lr.horse_name_ar_snapshot FROM public.lab_requests lr
     WHERE lr.horse_id = lh.linked_horse_id AND lr.horse_name_ar_snapshot IS NOT NULL
     ORDER BY lr.created_at DESC LIMIT 1),
    (SELECT h.name_ar FROM public.horses h WHERE h.id = lh.linked_horse_id),
    lh.name_ar
  )
WHERE lh.name = 'Unknown' AND lh.linked_horse_id IS NOT NULL;