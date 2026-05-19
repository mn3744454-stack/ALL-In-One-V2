ALTER TABLE public.horse_owners
  ADD COLUMN owner_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN phones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN representative_name text,
  ADD COLUMN representative_name_ar text,
  ADD COLUMN representative_title text,
  ADD COLUMN representative_email text,
  ADD COLUMN representative_phones jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.horse_owners
  ADD CONSTRAINT horse_owners_owner_type_check
  CHECK (owner_type IN ('individual','organization'));

UPDATE public.horse_owners
SET phones = jsonb_build_array(jsonb_build_object(
  'number', phone,
  'label', 'mobile',
  'is_whatsapp', false,
  'is_primary', true
))
WHERE (phones IS NULL OR phones = '[]'::jsonb)
  AND phone IS NOT NULL
  AND btrim(phone) <> '';