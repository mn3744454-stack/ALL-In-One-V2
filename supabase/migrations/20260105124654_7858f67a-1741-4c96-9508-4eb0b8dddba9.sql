-- Add sort_order column to lab_sample_templates to preserve template selection order
ALTER TABLE lab_sample_templates 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;