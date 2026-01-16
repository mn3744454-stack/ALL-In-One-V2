-- Set default for token column
UPDATE public.invitations SET token = gen_random_uuid()::text WHERE token IS NULL;

ALTER TABLE public.invitations ALTER COLUMN token SET DEFAULT gen_random_uuid()::text;