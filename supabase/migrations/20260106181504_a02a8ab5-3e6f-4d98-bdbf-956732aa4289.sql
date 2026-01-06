
-- Fix search_path for functions created in this migration
CREATE OR REPLACE FUNCTION public.can_manage_movement(user_id uuid, p_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_members.user_id = $1
      AND tenant_members.tenant_id = $2
      AND tenant_members.is_active = true
      AND (
        tenant_members.role IN ('owner', 'manager')
        OR tenant_members.can_manage_horses = true
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_horse_current_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' OR NEW.movement_type = 'transfer' THEN
    UPDATE public.horses 
    SET current_location_id = NEW.to_location_id,
        updated_at = now()
    WHERE id = NEW.horse_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.horses 
    SET current_location_id = NULL,
        updated_at = now()
    WHERE id = NEW.horse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
