
-- Add invitee_phone column to invitations for phone-based invitations
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS invitee_phone text;

-- Make invitee_email nullable (phone can be used instead)
ALTER TABLE public.invitations ALTER COLUMN invitee_email DROP NOT NULL;

-- Add a check constraint: at least one of email or phone must be provided
ALTER TABLE public.invitations ADD CONSTRAINT invitations_email_or_phone_required
  CHECK (invitee_email IS NOT NULL OR invitee_phone IS NOT NULL);

-- Create index on phone for lookup
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_phone ON public.invitations(invitee_phone) WHERE invitee_phone IS NOT NULL;
