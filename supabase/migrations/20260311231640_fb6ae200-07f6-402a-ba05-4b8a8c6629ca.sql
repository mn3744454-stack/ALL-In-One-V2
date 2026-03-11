
-- =====================================================
-- Phase E: Horse-domain notification triggers
-- Uses existing _notify_tenant_members helper function
-- =====================================================

-- 1) Boarding admission notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_boarding_admission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Admission activated
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'active'
    THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.admission_created',
        'Horse admitted',
        'A horse has been admitted to boarding',
        'boarding_admission',
        NEW.id
      );
    END IF;

    -- Checkout initiated
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'checkout_pending'
    THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.checkout_initiated',
        'Checkout initiated',
        'A boarding checkout has been initiated',
        'boarding_admission',
        NEW.id
      );
    END IF;

    -- Checkout completed
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'checked_out'
    THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'boarding.checkout_completed',
        'Horse checked out',
        'A horse has been checked out from boarding',
        'boarding_admission',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_boarding_admission_change failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_boarding_admission ON public.boarding_admissions;
CREATE TRIGGER trg_notify_boarding_admission
  AFTER UPDATE ON public.boarding_admissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_boarding_admission_change();


-- 2) Horse movement notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_horse_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Movement scheduled (INSERT with status='scheduled')
    IF TG_OP = 'INSERT' AND NEW.movement_status = 'scheduled' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'movement.scheduled',
        'Departure scheduled',
        'A horse departure has been scheduled',
        'horse_movement',
        NEW.id
      );
    END IF;

    -- Movement dispatched (UPDATE status -> dispatched)
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
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_horse_movement failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_horse_movement ON public.horse_movements;
CREATE TRIGGER trg_notify_horse_movement
  AFTER INSERT OR UPDATE ON public.horse_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_horse_movement();


-- 3) Incoming horse movement notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_incoming_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_tenant uuid;
BEGIN
  BEGIN
    -- New incoming pending (notify receiver)
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      PERFORM public._notify_tenant_members(
        NEW.tenant_id,
        'movement.incoming_pending',
        'Incoming horse',
        'A horse is incoming to your facility',
        'incoming_horse_movement',
        NEW.id
      );
    END IF;

    -- Incoming confirmed (notify sender)
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'completed'
       AND NEW.sender_tenant_id IS NOT NULL
    THEN
      PERFORM public._notify_tenant_members(
        NEW.sender_tenant_id,
        'movement.incoming_confirmed',
        'Arrival confirmed',
        'Your horse arrival has been confirmed at the destination',
        'incoming_horse_movement',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_incoming_movement failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_incoming_movement ON public.incoming_horse_movements;
CREATE TRIGGER trg_notify_incoming_movement
  AFTER INSERT OR UPDATE ON public.incoming_horse_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_incoming_movement();
