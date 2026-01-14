-- Add a regular column for collection date only (for indexing purposes)
ALTER TABLE lab_samples 
ADD COLUMN IF NOT EXISTS collection_date_only date;

-- Create a trigger function to auto-populate collection_date_only
CREATE OR REPLACE FUNCTION set_collection_date_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.collection_date_only := (NEW.collection_date AT TIME ZONE 'Asia/Riyadh')::date;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_set_collection_date_only ON lab_samples;
CREATE TRIGGER trg_set_collection_date_only
  BEFORE INSERT OR UPDATE OF collection_date ON lab_samples
  FOR EACH ROW
  EXECUTE FUNCTION set_collection_date_only();

-- Backfill existing data
UPDATE lab_samples 
SET collection_date_only = (collection_date AT TIME ZONE 'Asia/Riyadh')::date
WHERE collection_date_only IS NULL;