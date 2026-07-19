-- 2QA-C technical closure: drop obsolete text-parameter overload of get_lab_services_for_viewer.
-- The current UUID signature (uuid, boolean, text, uuid) is kept.
DROP FUNCTION IF EXISTS public.get_lab_services_for_viewer(uuid, boolean, text, text);