-- Add structured phones jsonb column to hr_employees
ALTER TABLE public.hr_employees
  ADD COLUMN IF NOT EXISTS phones jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: for each employee with a legacy phone but empty phones array,
-- seed phones with one primary mobile entry
UPDATE public.hr_employees
SET phones = jsonb_build_array(
  jsonb_build_object(
    'number', phone,
    'label', 'mobile',
    'is_whatsapp', false,
    'is_primary', true
  )
)
WHERE phone IS NOT NULL
  AND phone <> ''
  AND (phones IS NULL OR phones = '[]'::jsonb);
