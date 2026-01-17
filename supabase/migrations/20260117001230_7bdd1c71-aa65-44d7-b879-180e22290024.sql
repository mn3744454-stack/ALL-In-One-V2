-- Add sender_display_name column to invitations table
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS sender_display_name text;

COMMENT ON COLUMN public.invitations.sender_display_name IS
'Cached sender display name at time of invitation creation; avoids joining profiles (private).';

-- Backfill existing rows (best-effort)
UPDATE public.invitations i
SET sender_display_name = p.full_name
FROM public.profiles p
WHERE i.sender_display_name IS NULL
  AND p.id = i.sender_id;

-- Auto-fill on future inserts via trigger
CREATE OR REPLACE FUNCTION public.set_invitation_sender_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.sender_display_name IS NULL THEN
    SELECT full_name INTO NEW.sender_display_name
    FROM public.profiles
    WHERE id = NEW.sender_id;
  END IF;

  -- Fallback (still better than Unknown)
  IF NEW.sender_display_name IS NULL THEN
    NEW.sender_display_name := 'A team member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_invitation_sender_display_name ON public.invitations;

CREATE TRIGGER trg_set_invitation_sender_display_name
BEFORE INSERT ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_sender_display_name();