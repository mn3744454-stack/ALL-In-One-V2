
-- Phase 11: Notification architecture upgrade
-- 1) Add metadata JSONB column
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2) Upgrade helper to accept metadata
CREATE OR REPLACE FUNCTION public._notify_tenant_members(
  _tenant_id uuid,
  _event_type text,
  _title text,
  _body text,
  _entity_type text,
  _entity_id uuid,
  _exclude_user_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
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
      INSERT INTO public.notifications (user_id, tenant_id, event_type, title, body, entity_type, entity_id, metadata)
      VALUES (_member.user_id, _tenant_id, _event_type, _title, _body, _entity_type, _entity_id, _metadata);
      _count := _count + 1;
    END IF;
  END LOOP;

  IF _count > 50 THEN
    RAISE NOTICE '_notify_tenant_members: fan-out of % for event % on entity %', _count, _event_type, _entity_id;
  END IF;
END;
$$;

-- 3a) Connection INSERT (pending) — with actor_tenant_name
CREATE OR REPLACE FUNCTION public.notify_on_connection_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _initiator_name text;
BEGIN
  BEGIN
    IF NEW.status = 'pending' AND NEW.recipient_tenant_id IS NOT NULL THEN
      SELECT name INTO _initiator_name FROM public.tenants WHERE id = NEW.initiator_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.recipient_tenant_id,
        'connection.request_received',
        'New partnership request',
        'You have received a new partnership request',
        'connection',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.initiator_tenant_id,
          'actor_tenant_name', COALESCE(_initiator_name, 'Unknown')
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_connection_created failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3b) Connection UPDATE status — with actor_tenant_name + status
CREATE OR REPLACE FUNCTION public.notify_on_connection_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipient_name text;
BEGIN
  BEGIN
    IF OLD.status = 'pending'
       AND NEW.status IN ('accepted', 'rejected')
       AND NEW.initiator_tenant_id IS NOT NULL
    THEN
      SELECT name INTO _recipient_name FROM public.tenants WHERE id = NEW.recipient_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        CASE WHEN NEW.status = 'accepted' THEN 'connection.accepted' ELSE 'connection.rejected' END,
        CASE WHEN NEW.status = 'accepted' THEN 'Partnership accepted' ELSE 'Partnership rejected' END,
        CASE WHEN NEW.status = 'accepted' THEN 'Your partnership request has been accepted' ELSE 'Your partnership request was rejected' END,
        'connection',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.recipient_tenant_id,
          'actor_tenant_name', COALESCE(_recipient_name, 'Unknown'),
          'status', NEW.status
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_connection_status_change failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3c) Lab request INSERT — with actor_tenant_name + entity_label
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _initiator_name text;
BEGIN
  BEGIN
    IF NEW.lab_tenant_id IS NOT NULL THEN
      SELECT name INTO _initiator_name FROM public.tenants WHERE id = NEW.initiator_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.lab_tenant_id,
        'lab_request.new',
        'New lab request',
        COALESCE(NULLIF(NEW.test_description, ''), 'A new lab test request has been submitted'),
        'lab_request',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.initiator_tenant_id,
          'actor_tenant_name', COALESCE(_initiator_name, 'Unknown'),
          'entity_label', COALESCE(NULLIF(NEW.test_description, ''), '')
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_created failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3d) Lab request UPDATE status/result — with actor_tenant_name + status
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lab_name text;
BEGIN
  BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.initiator_tenant_id IS NOT NULL
    THEN
      SELECT name INTO _lab_name FROM public.tenants WHERE id = NEW.lab_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        'lab_request.status_changed',
        'Lab request status updated',
        format('Request status changed to %s', NEW.status),
        'lab_request',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.lab_tenant_id,
          'actor_tenant_name', COALESCE(_lab_name, 'Unknown'),
          'status', NEW.status,
          'entity_label', COALESCE(NULLIF(NEW.test_description, ''), '')
        )
      );
    END IF;

    IF NEW.initiator_tenant_id IS NOT NULL
       AND (
         (NEW.result_url IS NOT NULL AND OLD.result_url IS NULL)
         OR
         (NEW.result_file_path IS NOT NULL AND OLD.result_file_path IS NULL)
       )
    THEN
      SELECT name INTO _lab_name FROM public.tenants WHERE id = NEW.lab_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.initiator_tenant_id,
        'lab_request.result_published',
        'Lab results available',
        'Results have been published for your lab request',
        'lab_request',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.lab_tenant_id,
          'actor_tenant_name', COALESCE(_lab_name, 'Unknown'),
          'entity_label', COALESCE(NULLIF(NEW.test_description, ''), '')
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_updated failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3e) Lab request message — with actor_tenant_name + message preview
CREATE OR REPLACE FUNCTION public.notify_on_lab_request_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _target_tenant_id uuid;
  _sender_name text;
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
      SELECT name INTO _sender_name FROM public.tenants WHERE id = NEW.sender_tenant_id;
      PERFORM public._notify_tenant_members(
        _target_tenant_id,
        'lab_request.message_added',
        'New message on lab request',
        LEFT(NEW.body, 100),
        'lab_request_message',
        NEW.request_id,
        NEW.sender_user_id,
        jsonb_build_object(
          'actor_tenant_id', NEW.sender_tenant_id,
          'actor_tenant_name', COALESCE(_sender_name, 'Unknown'),
          'entity_label', COALESCE(NULLIF(_req.test_description, ''), ''),
          'message_preview', LEFT(NEW.body, 80)
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_lab_request_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3f) Boarding admission — with horse_name
CREATE OR REPLACE FUNCTION public.notify_on_boarding_admission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _horse_name text;
BEGIN
  BEGIN
    SELECT name INTO _horse_name FROM public.horses WHERE id = NEW.horse_id;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.admission_created',
        'Horse admitted',
        'A horse has been admitted to boarding',
        'boarding_admission',
        NEW.id,
        NULL,
        jsonb_build_object('horse_name', COALESCE(_horse_name, ''), 'status', 'active')
      );
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'checkout_pending' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.checkout_initiated',
        'Checkout initiated',
        'A boarding checkout has been initiated',
        'boarding_admission',
        NEW.id,
        NULL,
        jsonb_build_object('horse_name', COALESCE(_horse_name, ''), 'status', 'checkout_pending')
      );
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'checked_out' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.checkout_completed',
        'Horse checked out',
        'A horse has been checked out from boarding',
        'boarding_admission',
        NEW.id,
        NULL,
        jsonb_build_object('horse_name', COALESCE(_horse_name, ''), 'status', 'checked_out')
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_boarding_admission_change failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3g) Horse movement — with horse_name
CREATE OR REPLACE FUNCTION public.notify_on_horse_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _horse_name text;
BEGIN
  BEGIN
    SELECT name INTO _horse_name FROM public.horses WHERE id = NEW.horse_id;

    IF TG_OP = 'INSERT' AND NEW.movement_status = 'scheduled' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'movement.scheduled',
        'Departure scheduled',
        'A horse departure has been scheduled',
        'horse_movement',
        NEW.id,
        NULL,
        jsonb_build_object('horse_name', COALESCE(_horse_name, ''))
      );
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.movement_status IS DISTINCT FROM NEW.movement_status
       AND NEW.movement_status = 'dispatched'
    THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'movement.dispatched',
        'Horse dispatched',
        'A horse has been dispatched',
        'horse_movement',
        NEW.id,
        NULL,
        jsonb_build_object('horse_name', COALESCE(_horse_name, ''))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_horse_movement failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3h) Incoming movement — with sender_tenant_name
CREATE OR REPLACE FUNCTION public.notify_on_incoming_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_name text;
  _horse_name text;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      SELECT name INTO _sender_name FROM public.tenants WHERE id = NEW.sender_tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'movement.incoming_pending',
        'Incoming horse',
        'A horse is incoming to your facility',
        'incoming_horse_movement',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.sender_tenant_id,
          'actor_tenant_name', COALESCE(_sender_name, 'Unknown'),
          'horse_name', COALESCE(NEW.horse_name, '')
        )
      );
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'completed'
       AND NEW.sender_tenant_id IS NOT NULL
    THEN
      SELECT name INTO _sender_name FROM public.tenants WHERE id = NEW.tenant_id;
      PERFORM public._notify_tenant_members(
        NEW.sender_tenant_id,
        'movement.incoming_confirmed',
        'Arrival confirmed',
        'Your horse arrival has been confirmed at the destination',
        'incoming_horse_movement',
        NEW.id,
        NULL,
        jsonb_build_object(
          'actor_tenant_id', NEW.tenant_id,
          'actor_tenant_name', COALESCE(_sender_name, 'Unknown'),
          'horse_name', COALESCE(NEW.horse_name, ''),
          'status', 'completed'
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_incoming_movement failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
