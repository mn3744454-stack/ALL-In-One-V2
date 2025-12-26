-- Create horse ownership history table
CREATE TABLE public.horse_ownership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES horse_owners(id) ON DELETE CASCADE,
  ownership_percentage numeric NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  action text NOT NULL CHECK (action IN ('added', 'updated', 'removed')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  previous_percentage numeric,
  notes text
);

-- Create trigger function to log ownership changes
CREATE OR REPLACE FUNCTION public.log_ownership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO horse_ownership_history (horse_id, owner_id, ownership_percentage, is_primary, action, changed_by)
    VALUES (NEW.horse_id, NEW.owner_id, NEW.ownership_percentage, NEW.is_primary, 'added', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO horse_ownership_history (horse_id, owner_id, ownership_percentage, is_primary, action, changed_by, previous_percentage)
    VALUES (NEW.horse_id, NEW.owner_id, NEW.ownership_percentage, NEW.is_primary, 'updated', auth.uid(), OLD.ownership_percentage);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO horse_ownership_history (horse_id, owner_id, ownership_percentage, is_primary, action, changed_by)
    VALUES (OLD.horse_id, OLD.owner_id, OLD.ownership_percentage, OLD.is_primary, 'removed', auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
CREATE TRIGGER ownership_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON horse_ownership
FOR EACH ROW EXECUTE FUNCTION log_ownership_change();

-- Enable RLS
ALTER TABLE horse_ownership_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for viewing history
CREATE POLICY "Members can view ownership history"
ON horse_ownership_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM horses h
  WHERE h.id = horse_ownership_history.horse_id
  AND is_tenant_member(auth.uid(), h.tenant_id)
));