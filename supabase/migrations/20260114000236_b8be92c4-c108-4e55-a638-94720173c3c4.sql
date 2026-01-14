-- Add unique constraint on daily_number per tenant per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_samples_unique_daily_number 
ON lab_samples (tenant_id, collection_date_only, daily_number)
WHERE daily_number IS NOT NULL;