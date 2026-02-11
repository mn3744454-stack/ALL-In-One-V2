
-- ============================================================
-- Phase 0: Notifications + Lab Request Messaging Foundation
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  tenant_id   uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  title       text NOT NULL,
  body        text,
  entity_type text,
  entity_id   uuid,
  is_read     boolean NOT NULL DEFAULT false,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- 2) lab_request_messages table
CREATE TABLE IF NOT EXISTS public.lab_request_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       uuid NOT NULL REFERENCES public.lab_requests(id) ON DELETE CASCADE,
  sender_user_id   uuid NOT NULL,
  sender_tenant_id uuid REFERENCES public.tenants(id),
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_request_messages_thread
  ON public.lab_request_messages (request_id, created_at ASC);

-- 3) Privileges hardening
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
REVOKE ALL ON TABLE public.lab_request_messages FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT ON TABLE public.lab_request_messages TO authenticated;

-- 4) RLS: notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can view own notifications') THEN
    EXECUTE $p$
      CREATE POLICY "Users can view own notifications"
        ON public.notifications FOR SELECT
        USING (user_id = auth.uid());
    $p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can update own notifications read state') THEN
    EXECUTE $p$
      CREATE POLICY "Users can update own notifications read state"
        ON public.notifications FOR UPDATE
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    $p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can delete own notifications') THEN
    EXECUTE $p$
      CREATE POLICY "Users can delete own notifications"
        ON public.notifications FOR DELETE
        USING (user_id = auth.uid());
    $p$;
  END IF;
END $$;

-- Immutable guard trigger
CREATE OR REPLACE FUNCTION public.notifications_immutable_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id     IS DISTINCT FROM OLD.user_id     THEN RAISE EXCEPTION 'Cannot change user_id on notifications'; END IF;
  IF NEW.tenant_id   IS DISTINCT FROM OLD.tenant_id   THEN RAISE EXCEPTION 'Cannot change tenant_id on notifications'; END IF;
  IF NEW.event_type  IS DISTINCT FROM OLD.event_type  THEN RAISE EXCEPTION 'Cannot change event_type on notifications'; END IF;
  IF NEW.title       IS DISTINCT FROM OLD.title       THEN RAISE EXCEPTION 'Cannot change title on notifications'; END IF;
  IF NEW.body        IS DISTINCT FROM OLD.body        THEN RAISE EXCEPTION 'Cannot change body on notifications'; END IF;
  IF NEW.entity_type IS DISTINCT FROM OLD.entity_type THEN RAISE EXCEPTION 'Cannot change entity_type on notifications'; END IF;
  IF NEW.entity_id   IS DISTINCT FROM OLD.entity_id   THEN RAISE EXCEPTION 'Cannot change entity_id on notifications'; END IF;
  IF NEW.created_at  IS DISTINCT FROM OLD.created_at  THEN RAISE EXCEPTION 'Cannot change created_at on notifications'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_immutable_guard ON public.notifications;
CREATE TRIGGER trg_notifications_immutable_guard
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_immutable_guard();

-- 5) RLS: lab_request_messages
ALTER TABLE public.lab_request_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lab_request_messages' AND policyname='Members of request tenants can view messages') THEN
    EXECUTE $p$
      CREATE POLICY "Members of request tenants can view messages"
        ON public.lab_request_messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.lab_requests lr
            WHERE lr.id = request_id
              AND (
                EXISTS (
                  SELECT 1 FROM public.tenant_members tm
                  WHERE tm.tenant_id = lr.initiator_tenant_id
                    AND tm.user_id = auth.uid()
                    AND tm.is_active = true
                )
                OR
                EXISTS (
                  SELECT 1 FROM public.tenant_members tm
                  WHERE tm.tenant_id = lr.lab_tenant_id
                    AND tm.user_id = auth.uid()
                    AND tm.is_active = true
                )
              )
          )
        );
    $p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lab_request_messages' AND policyname='Members of request tenants can send messages') THEN
    EXECUTE $p$
      CREATE POLICY "Members of request tenants can send messages"
        ON public.lab_request_messages FOR INSERT
        WITH CHECK (
          sender_user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.lab_requests lr
            WHERE lr.id = request_id
              AND (
                EXISTS (
                  SELECT 1 FROM public.tenant_members tm
                  WHERE tm.tenant_id = lr.initiator_tenant_id
                    AND tm.user_id = auth.uid()
                    AND tm.is_active = true
                )
                OR
                EXISTS (
                  SELECT 1 FROM public.tenant_members tm
                  WHERE tm.tenant_id = lr.lab_tenant_id
                    AND tm.user_id = auth.uid()
                    AND tm.is_active = true
                )
              )
          )
          AND (
            sender_tenant_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.lab_requests lr2
              WHERE lr2.id = request_id
                AND sender_tenant_id IN (lr2.initiator_tenant_id, lr2.lab_tenant_id)
            )
          )
        );
    $p$;
  END IF;
END $$;

REVOKE UPDATE, DELETE ON TABLE public.lab_request_messages FROM authenticated;

-- 6) Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname='supabase_realtime')
        AND n.nspname='public'
        AND c.relname='notifications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname='supabase_realtime')
        AND n.nspname='public'
        AND c.relname='lab_request_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_request_messages';
    END IF;
  END IF;
END $$;

-- 7) Non-blocking trigger functions

-- Helper: fan-out notifications to active tenant members
CREATE OR REPLACE FUNCTION public._notify_tenant_members(
  _tenant_id uuid,
  _event_type text,
  _title text,
  _body text,
  _entity_type text,
  _entity_id uuid,
  _exclude_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _count int := 0;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN;
  END IF;

  FOR _member IN
    SELECT tm.user_id
    FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant_id
      AND tm.is_active = true
      AND (_exclude_user_id IS NULL OR tm.user_id <> _exclude_user_id)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE entity_id = _entity_id
        AND event_type = _event_type
        AND user_id = _member.user_id
        AND created_at > now() - interval '10 seconds'
    ) THEN
      INSERT INTO public.notifications (user_id, tenant_id, event_type, title, body, entity_type, entity_id)
      VALUES (_member.user_id, _tenant_id, _event_type, _title, _body, _entity_type, _entity_id);
      _count := _count + 1;
    END IF;
  END LOOP;

  IF _count > 50 THEN
    RAISE NOTICE '_notify_tenant_members: fan-out of % for event % on entity %', _count, _event_type, _entity_id;
  END IF;
END;
$$;

-- 7a) Connection INSERT (pending)
CREATE OR REPLACE FUNCTION public.notify_on_connection_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.status = 'pending' AND NEW.recipient_tenant_id IS NOT NULL THEN
      PERFORM public._notify_tenant_members(
        NEW.recipient_tenant_id,
        'connection.request_received',
        'New partnership request',
        'You have received a new partnership request',
        'connection',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_connection_created failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_created ON public.connections;
CREATE TRIGGER trg_notify_connection_created
  AFTER INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_connection_created();

-- 7b) Connection UPDATE status
CREATE OR REPLACE FUNCTION public.notify_on_connection_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF OLD.status = 'pending'
       AND NEW.status IN ('accepted', 'rejected')
       AND NEW.initiator_tenant_id IS NOT NULL
    THEN
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        CASE WHEN NEW.status = 'accepted' THEN 'connection.accepted' ELSE 'connection.rejected' END,
        CASE WHEN NEW.status = 'accepted' THEN 'Partnership accepted' ELSE 'Partnership rejected' END,
        CASE WHEN NEW.status = 'accepted' THEN 'Your partnership request has been accepted' ELSE 'Your partnership request was rejected' END,
        'connection',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_connection_status_change failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_connection_status_change ON public.connections;
CREATE TRIGGER trg_notify_connection_status_change
  AFTER UPDATE OF status ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_connection_status_change();

-- 7c) Lab request INSERT
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.lab_tenant_id IS NOT NULL THEN
      PERFORM public._notify_tenant_members(
        NEW.lab_tenant_id,
        'lab_request.new',
        'New lab request',
        COALESCE(NULLIF(NEW.test_description, ''), 'A new lab test request has been submitted'),
        'lab_request',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_created failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lab_request_created ON public.lab_requests;
CREATE TRIGGER trg_notify_lab_request_created
  AFTER INSERT ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lab_request_created();

-- 7d) Lab request UPDATE status / result
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.initiator_tenant_id IS NOT NULL
    THEN
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        'lab_request.status_changed',
        'Lab request status updated',
        format('Request status changed to %s', NEW.status),
        'lab_request',
        NEW.id
      );
    END IF;

    IF NEW.initiator_tenant_id IS NOT NULL
       AND (
         (NEW.result_url IS NOT NULL AND OLD.result_url IS NULL)
         OR
         (NEW.result_file_path IS NOT NULL AND OLD.result_file_path IS NULL)
       )
    THEN
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        'lab_request.result_published',
        'Lab results available',
        'Results have been published for your lab request',
        'lab_request',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_updated failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lab_request_updated ON public.lab_requests;
CREATE TRIGGER trg_notify_lab_request_updated
  AFTER UPDATE ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lab_request_updated();

-- 7e) Lab request message INSERT
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _target_tenant_id uuid;
BEGIN
  BEGIN
    SELECT initiator_tenant_id, lab_tenant_id, test_description
      INTO _req
    FROM public.lab_requests
    WHERE id = NEW.request_id;

    IF _req IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.sender_tenant_id IS NOT NULL THEN
      IF NEW.sender_tenant_id = _req.initiator_tenant_id THEN
        _target_tenant_id := _req.lab_tenant_id;
      ELSIF NEW.sender_tenant_id = _req.lab_tenant_id THEN
        _target_tenant_id := _req.initiator_tenant_id;
      ELSE
        _target_tenant_id := NULL;
      END IF;
    END IF;

    IF _target_tenant_id IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.tenant_members
        WHERE tenant_id = _req.initiator_tenant_id
          AND user_id = NEW.sender_user_id
          AND is_active = true
      ) THEN
        _target_tenant_id := _req.lab_tenant_id;
      ELSE
        _target_tenant_id := _req.initiator_tenant_id;
      END IF;
    END IF;

    IF _target_tenant_id IS NOT NULL THEN
      PERFORM public._notify_tenant_members(
        _target_tenant_id,
        'lab_request.message_added',
        'New message on lab request',
        LEFT(NEW.body, 100),
        'lab_request_message',
        NEW.request_id,
        NEW.sender_user_id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lab_request_message ON public.lab_request_messages;
CREATE TRIGGER trg_notify_lab_request_message
  AFTER INSERT ON public.lab_request_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lab_request_message();
