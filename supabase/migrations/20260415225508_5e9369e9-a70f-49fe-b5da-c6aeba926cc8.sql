
CREATE OR REPLACE FUNCTION public.lab_submissions_immutable_guard()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Cannot change tenant_id on lab_submissions';
  END IF;
  IF NEW.initiator_tenant_id IS DISTINCT FROM OLD.initiator_tenant_id THEN
    RAISE EXCEPTION 'Cannot change initiator_tenant_id on lab_submissions';
  END IF;
  IF NEW.lab_tenant_id IS DISTINCT FROM OLD.lab_tenant_id THEN
    RAISE EXCEPTION 'Cannot change lab_tenant_id on lab_submissions';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot change created_by on lab_submissions';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot change created_at on lab_submissions';
  END IF;
  RETURN NEW;
END;
$$;
