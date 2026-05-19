ALTER TABLE public.horse_breeds
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

ALTER TABLE public.horse_colors
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

UPDATE public.horse_breeds
   SET is_seed = true
 WHERE lower(name) IN ('thoroughbred', 'arabian horse')
    OR name_ar IN ('ثوروبريد', 'خيل عربي');

UPDATE public.horse_colors
   SET is_seed = true
 WHERE lower(name) IN ('bay', 'black', 'blue', 'chestnut', 'jet black')
    OR name_ar IN ('أحمر', 'أسود', 'أزرق', 'أشقر', 'أدهم');

CREATE OR REPLACE FUNCTION public.delete_horse_breed(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_is_seed boolean;
  v_used boolean;
BEGIN
  SELECT tenant_id, is_seed INTO v_tenant, v_is_seed
  FROM public.horse_breeds
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(v_tenant) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF v_is_seed THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'protected_seed');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.horses WHERE breed_id = p_id) INTO v_used;
  IF v_used THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'used_by_horses');
  END IF;

  DELETE FROM public.horse_breeds WHERE id = p_id;
  RETURN jsonb_build_object('deleted', true, 'reason', 'deleted');
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_horse_color(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_is_seed boolean;
  v_used boolean;
BEGIN
  SELECT tenant_id, is_seed INTO v_tenant, v_is_seed
  FROM public.horse_colors
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(v_tenant) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF v_is_seed THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'protected_seed');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.horses WHERE color_id = p_id) INTO v_used;
  IF v_used THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'used_by_horses');
  END IF;

  DELETE FROM public.horse_colors WHERE id = p_id;
  RETURN jsonb_build_object('deleted', true, 'reason', 'deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_horse_breed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_horse_color(uuid) TO authenticated;