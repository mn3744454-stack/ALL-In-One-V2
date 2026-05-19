-- Pass 2: Multi emergency contacts JSONB column on boarding_admissions
-- Keeps legacy emergency_contact text column for one release.

ALTER TABLE public.boarding_admissions
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill legacy single-text emergency_contact into structured array.
UPDATE public.boarding_admissions
SET emergency_contacts = jsonb_build_array(
  jsonb_build_object(
    'name', emergency_contact,
    'name_ar', null,
    'relationship', null,
    'phones', jsonb_build_array(
      jsonb_build_object(
        'number', emergency_contact,
        'label', 'other',
        'is_whatsapp', false,
        'is_primary', true
      )
    )
  )
)
WHERE emergency_contact IS NOT NULL
  AND length(trim(emergency_contact)) > 0
  AND (
    emergency_contacts IS NULL
    OR emergency_contacts = '[]'::jsonb
  );
