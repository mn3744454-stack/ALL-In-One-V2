CREATE UNIQUE INDEX IF NOT EXISTS boarding_admissions_checkin_movement_id_unique
ON public.boarding_admissions (checkin_movement_id)
WHERE checkin_movement_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS boarding_admissions_checkout_movement_id_unique
ON public.boarding_admissions (checkout_movement_id)
WHERE checkout_movement_id IS NOT NULL;