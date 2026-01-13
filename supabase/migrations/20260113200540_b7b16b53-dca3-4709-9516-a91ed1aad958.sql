-- Add daily sample number column
ALTER TABLE lab_samples ADD COLUMN IF NOT EXISTS daily_number INTEGER;

-- Add support for external horses (walk-in / platform horses)
ALTER TABLE lab_samples ALTER COLUMN horse_id DROP NOT NULL;
ALTER TABLE lab_samples ADD COLUMN IF NOT EXISTS horse_name TEXT;
ALTER TABLE lab_samples ADD COLUMN IF NOT EXISTS horse_external_id UUID;
ALTER TABLE lab_samples ADD COLUMN IF NOT EXISTS horse_metadata JSONB DEFAULT '{}';

-- Create function for auto-generating daily sample number
CREATE OR REPLACE FUNCTION set_daily_sample_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.daily_number IS NULL THEN
    SELECT COALESCE(MAX(daily_number), 0) + 1 INTO NEW.daily_number
    FROM lab_samples
    WHERE tenant_id = NEW.tenant_id
    AND DATE(created_at AT TIME ZONE '+03') = DATE(NOW() AT TIME ZONE '+03');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily number
DROP TRIGGER IF EXISTS trg_set_daily_sample_number ON lab_samples;
CREATE TRIGGER trg_set_daily_sample_number
BEFORE INSERT ON lab_samples
FOR EACH ROW EXECUTE FUNCTION set_daily_sample_number();