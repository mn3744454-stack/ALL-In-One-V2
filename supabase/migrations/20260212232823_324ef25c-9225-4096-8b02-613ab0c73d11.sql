
-- Phase 1: Push Notifications Infrastructure (without vault)

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 0) Internal settings table (no vault needed)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value)
VALUES
  ('push_edge_secret', 'CHANGE_ME_PUSH_SECRET'),
  ('push_edge_url', 'https://vhxglsvxwwpmoqjabfmj.supabase.co/functions/v1/send-push-notification')
ON CONFLICT (key) DO NOTHING;

REVOKE ALL ON public.app_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._get_app_setting(p_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = p_key LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._get_app_setting(text) FROM anon, authenticated;

-- 1) push_subscriptions
CREATE TABLE public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  device_label  text,
  platform      text DEFAULT 'unknown',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint),
  CONSTRAINT push_subscriptions_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions (user_id, is_active);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) notification_preferences
CREATE TABLE public.notification_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,
  push_messages     boolean NOT NULL DEFAULT true,
  push_results      boolean NOT NULL DEFAULT true,
  push_status       boolean NOT NULL DEFAULT true,
  push_invitations  boolean NOT NULL DEFAULT true,
  push_partnerships boolean NOT NULL DEFAULT true,
  in_app_sound      boolean NOT NULL DEFAULT true,
  quiet_start       time,
  quiet_end         time,
  quiet_timezone    text DEFAULT 'Asia/Riyadh',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_preferences_touch ON public.notification_preferences;

CREATE TRIGGER trg_notification_preferences_touch
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public._touch_updated_at();

-- 3) Trigger: on notifications INSERT, call edge function via pg_net
CREATE OR REPLACE FUNCTION public._push_on_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payload jsonb;
  _url text;
  _push_secret text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'id',          NEW.id,
    'user_id',     NEW.user_id,
    'tenant_id',   NEW.tenant_id,
    'event_type',  NEW.event_type,
    'title',       NEW.title,
    'body',        NEW.body,
    'entity_type', NEW.entity_type,
    'entity_id',   NEW.entity_id,
    'created_at',  NEW.created_at
  );

  _url := public._get_app_setting('push_edge_url');
  IF _url IS NULL OR _url = '' THEN
    _url := 'https://vhxglsvxwwpmoqjabfmj.supabase.co/functions/v1/send-push-notification';
  END IF;

  _push_secret := public._get_app_setting('push_edge_secret');

  IF _push_secret IS NOT NULL AND _push_secret != '' AND _push_secret != 'CHANGE_ME_PUSH_SECRET' THEN
    PERFORM net.http_post(
      url     := _url,
      body    := _payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', _push_secret
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_notification_insert ON public.notifications;

CREATE TRIGGER trg_push_on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public._push_on_notification_insert();
