
-- ===========================================
-- P0 D1: Fix horse_care_notes.title NOT NULL
-- ===========================================
ALTER TABLE public.horse_care_notes ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.horse_care_notes ALTER COLUMN title SET DEFAULT NULL;

-- ===========================================
-- P0 D2: Wire boarding permissions into RBAC
-- Only insert for roles that actually exist in tenant_roles
-- ===========================================
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, pk.key, true
FROM public.tenant_roles tr
CROSS JOIN (VALUES
  ('boarding.admission.view'),
  ('boarding.admission.create'),
  ('boarding.admission.update'),
  ('boarding.admission.checkout'),
  ('boarding.checkout.override_balance')
) AS pk(key)
WHERE tr.role_key = 'manager'
ON CONFLICT DO NOTHING;

-- Grant view/create/update to staff where staff role exists
INSERT INTO public.tenant_role_permissions (tenant_id, role_key, permission_key, granted)
SELECT tr.tenant_id, tr.role_key, pk.key, true
FROM public.tenant_roles tr
CROSS JOIN (VALUES
  ('boarding.admission.view'),
  ('boarding.admission.create'),
  ('boarding.admission.update')
) AS pk(key)
WHERE tr.role_key = 'staff'
ON CONFLICT DO NOTHING;

-- ===========================================
-- P1 D7: Fix care notes UPDATE RLS policy conflict
-- ===========================================
DROP POLICY IF EXISTS "horse_care_notes_update" ON public.horse_care_notes;

-- ===========================================
-- P1 D4: Add boarding tables to realtime publication
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.boarding_admissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boarding_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.horse_care_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stable_service_plans;

-- ===========================================
-- P1 D6: Trigger to sync transfer with active admission
-- ===========================================
CREATE OR REPLACE FUNCTION public.sync_admission_on_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.movement_type = 'transfer' AND NEW.to_unit_id IS NOT NULL THEN
    UPDATE public.boarding_admissions
    SET
      unit_id = NEW.to_unit_id,
      area_id = NEW.to_area_id,
      updated_at = now()
    WHERE horse_id = NEW.horse_id
      AND tenant_id = NEW.tenant_id
      AND status IN ('active', 'checkout_pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admission_on_transfer ON public.horse_movements;
CREATE TRIGGER trg_sync_admission_on_transfer
  AFTER INSERT ON public.horse_movements
  FOR EACH ROW
  WHEN (NEW.movement_type = 'transfer')
  EXECUTE FUNCTION public.sync_admission_on_transfer();
