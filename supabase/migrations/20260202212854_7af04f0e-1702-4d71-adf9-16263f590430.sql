-- Migration: Add multi-phone support for clients and Arabic name for lab_horses

-- Add phones column for multiple phone numbers support
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phones jsonb DEFAULT '[]';

-- Add name_ar column for lab_horses
ALTER TABLE lab_horses ADD COLUMN IF NOT EXISTS name_ar text;

-- Add comment for documentation
COMMENT ON COLUMN clients.phones IS 'Array of phone entries: {number, label, is_whatsapp, is_primary}';
COMMENT ON COLUMN lab_horses.name_ar IS 'Arabic name of the horse';