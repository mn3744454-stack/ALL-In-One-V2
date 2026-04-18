-- Phase 3: Personal notification control center foundation
-- Add preset + per-family delivery preferences to notification_preferences.
-- Keeps existing channel/category toggles intact (they remain the channel layer).

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS preset text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS family_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.notification_preferences.preset IS
  'Phase 3 personal preset: all | leadership | finance | lab | operations | minimal | custom';

COMMENT ON COLUMN public.notification_preferences.family_preferences IS
  'Phase 3: per-family delivery level. Shape: { [family]: { level: "all"|"important"|"critical"|"off" } }';
