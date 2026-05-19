-- Replace delete RPCs: fix tenant check, drop is_seed protection, return linked horse names
CREATE OR REPLACE FUNCTION public.delete_horse_breed(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_used_count integer;
  v_horses jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.horse_breeds WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(auth.uid(), v_tenant) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  SELECT count(*) INTO v_used_count FROM public.horses WHERE breed_id = p_id;
  IF v_used_count > 0 THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'name_ar', h.name_ar)), '[]'::jsonb)
      INTO v_horses
      FROM (
        SELECT id, name, name_ar FROM public.horses
         WHERE breed_id = p_id
         ORDER BY created_at ASC NULLS LAST
         LIMIT 5
      ) h;
    RETURN jsonb_build_object(
      'deleted', false,
      'reason', 'used_by_horses',
      'used_count', v_used_count,
      'horses', v_horses
    );
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
  v_used_count integer;
  v_horses jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.horse_colors WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(auth.uid(), v_tenant) THEN
    RETURN jsonb_build_object('deleted', false, 'reason', 'not_found');
  END IF;

  SELECT count(*) INTO v_used_count FROM public.horses WHERE color_id = p_id;
  IF v_used_count > 0 THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'name_ar', h.name_ar)), '[]'::jsonb)
      INTO v_horses
      FROM (
        SELECT id, name, name_ar FROM public.horses
         WHERE color_id = p_id
         ORDER BY created_at ASC NULLS LAST
         LIMIT 5
      ) h;
    RETURN jsonb_build_object(
      'deleted', false,
      'reason', 'used_by_horses',
      'used_count', v_used_count,
      'horses', v_horses
    );
  END IF;

  DELETE FROM public.horse_colors WHERE id = p_id;
  RETURN jsonb_build_object('deleted', true, 'reason', 'deleted');
END;
$$;

-- New update RPCs: allow renaming any row, including seeded or used ones
CREATE OR REPLACE FUNCTION public.update_horse_breed(p_id uuid, p_name text, p_name_ar text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_name text;
  v_name_ar text;
  v_row public.horse_breeds%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.horse_breeds WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(auth.uid(), v_tenant) THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'not_found');
  END IF;

  v_name := btrim(coalesce(p_name, ''));
  v_name_ar := nullif(btrim(coalesce(p_name_ar, '')), '');

  IF v_name = '' THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'invalid_name');
  END IF;

  BEGIN
    UPDATE public.horse_breeds
       SET name = v_name, name_ar = v_name_ar
     WHERE id = p_id
     RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'duplicate_name');
  END;

  RETURN jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'row', jsonb_build_object(
      'id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'name', v_row.name,
      'name_ar', v_row.name_ar,
      'is_seed', v_row.is_seed
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_horse_color(p_id uuid, p_name text, p_name_ar text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_name text;
  v_name_ar text;
  v_row public.horse_colors%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.horse_colors WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'not_found');
  END IF;

  IF NOT public.is_tenant_member(auth.uid(), v_tenant) THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'not_found');
  END IF;

  v_name := btrim(coalesce(p_name, ''));
  v_name_ar := nullif(btrim(coalesce(p_name_ar, '')), '');

  IF v_name = '' THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'invalid_name');
  END IF;

  BEGIN
    UPDATE public.horse_colors
       SET name = v_name, name_ar = v_name_ar
     WHERE id = p_id
     RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'duplicate_name');
  END;

  RETURN jsonb_build_object(
    'updated', true,
    'reason', 'updated',
    'row', jsonb_build_object(
      'id', v_row.id,
      'tenant_id', v_row.tenant_id,
      'name', v_row.name,
      'name_ar', v_row.name_ar,
      'is_seed', v_row.is_seed
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_horse_breed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_horse_color(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_horse_breed(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_horse_color(uuid, text, text) TO authenticated;