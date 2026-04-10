-- Drop V1 (15 params) overload
DROP FUNCTION IF EXISTS public.record_horse_movement_with_housing(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid,
  timestamp with time zone, text, text, text, boolean, boolean
);

-- Drop V2 (18 params) overload
DROP FUNCTION IF EXISTS public.record_horse_movement_with_housing(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid,
  timestamp with time zone, text, text, text, boolean, boolean,
  text, uuid, uuid
);