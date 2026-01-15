-- Phase 0: Add missing columns to lab_templates for feature parity
ALTER TABLE lab_templates
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS category_ar text;