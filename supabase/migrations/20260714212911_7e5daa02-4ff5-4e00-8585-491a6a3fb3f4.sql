CREATE OR REPLACE FUNCTION public.update_horse_identity(p_horse_id uuid, p_active_tenant_id uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_auth        jsonb;
  v_allowed     text[] := ARRAY[
    'name','name_ar','gender','birth_date',
    'breed_id','color_id',
    'is_pony','is_gelded',
    'registration_number','microchip_number','passport_number','ueln',
    'mane_marks','body_marks','legs_marks','distinctive_marks_notes',
    'avatar_url'
  ];
  v_blocked     text[] := ARRAY['height','weight','breed','color'];
  v_key         text;
  v_val         jsonb;
  v_updated     text[] := ARRAY[]::text[];
  v_sets        text[] := ARRAY[]::text[];
  v_sql         text;
  v_gender      text;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'malformed_payload',
      'reason_code', 'malformed_payload'
    );
  END IF;

  IF (SELECT count(*) FROM jsonb_object_keys(p_payload)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'empty_payload',
      'reason_code', 'empty_payload'
    );
  END IF;

  -- Pre-scan: reject any explicitly blocked identity field BEFORE authority
  -- check so a payload like {name:'x', weight:500} is rejected atomically
  -- with no database write.
  FOR v_key IN SELECT * FROM jsonb_object_keys(p_payload) LOOP
    IF v_key = ANY (v_blocked) THEN
      RETURN jsonb_build_object(
        'success', false,
        'horse_id', p_horse_id,
        'error_code', 'blocked_field',
        'reason_code', 'blocked_field',
        'field', v_key
      );
    END IF;
  END LOOP;

  v_auth := public._resolve_horse_write_authority(
    p_horse_id, p_active_tenant_id, 'horse.identity.update'
  );

  IF (v_auth->>'allowed') <> 'true' THEN
    RETURN jsonb_build_object(
      'success', false,
      'horse_id', p_horse_id,
      'authority_mode', v_auth->>'authority_mode',
      'authority_source', v_auth->>'authority_source',
      'reason_code', v_auth->>'reason_code',
      'error_code', COALESCE(v_auth->>'reason_code', 'no_write_authority')
    );
  END IF;

  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_payload) LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RETURN jsonb_build_object(
        'success', false,
        'horse_id', p_horse_id,
        'error_code', 'unsupported_field',
        'reason_code', 'unsupported_field',
        'field', v_key
      );
    END IF;

    IF v_key = 'name' THEN
      IF jsonb_typeof(v_val) <> 'string' OR length(trim(v_val #>> '{}')) = 0 THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    IF v_key = 'gender' THEN
      IF jsonb_typeof(v_val) <> 'string' THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
      v_gender := v_val #>> '{}';
      IF v_gender NOT IN ('male','female') THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    IF v_key = 'breed_id' AND jsonb_typeof(v_val) = 'string' THEN
      IF NOT EXISTS (SELECT 1 FROM public.horse_breeds b WHERE b.id = (v_val #>> '{}')::uuid) THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;
    IF v_key = 'color_id' AND jsonb_typeof(v_val) = 'string' THEN
      IF NOT EXISTS (SELECT 1 FROM public.horse_colors c WHERE c.id = (v_val #>> '{}')::uuid) THEN
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value', 'field', v_key
        );
      END IF;
    END IF;

    v_updated := v_updated || v_key;
  END LOOP;

  IF array_length(v_updated, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'empty_payload',
      'reason_code', 'empty_payload'
    );
  END IF;

  v_sets := ARRAY[]::text[];
  FOR v_key IN SELECT unnest(v_updated) LOOP
    v_sets := v_sets || (
      CASE
        WHEN v_key = 'birth_date'
          THEN format('birth_date = NULLIF($1->>%L, '''')::date', v_key)
        WHEN v_key IN ('breed_id','color_id')
          THEN format('%I = NULLIF($1->>%L, '''')::uuid', v_key, v_key)
        WHEN v_key IN ('is_pony','is_gelded')
          THEN format('%I = ($1->>%L)::boolean', v_key, v_key)
        ELSE
          format('%I = ($1->>%L)', v_key, v_key)
      END
    );
  END LOOP;

  v_sql := 'UPDATE public.horses SET '
        || array_to_string(v_sets, ', ')
        || ', updated_at = now() WHERE id = $2';

  BEGIN
    EXECUTE v_sql USING p_payload, p_horse_id;
  EXCEPTION
    WHEN unique_violation THEN
      DECLARE
        v_msg text := SQLERRM;
      BEGIN
        IF v_msg ILIKE '%microchip%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','duplicate_microchip','reason_code','duplicate_microchip');
        ELSIF v_msg ILIKE '%passport%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','duplicate_passport','reason_code','duplicate_passport');
        ELSIF v_msg ILIKE '%ueln%' THEN
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','invalid_field_value','reason_code','invalid_field_value','field','ueln');
        ELSE
          RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
            'error_code','invalid_field_value','reason_code','invalid_field_value');
        END IF;
      END;
    WHEN check_violation THEN
      RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
        'error_code','invalid_field_value','reason_code','invalid_field_value');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
        'error_code','internal_error','reason_code','internal_error');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'horse_id', p_horse_id,
    'updated_fields', to_jsonb(v_updated),
    'authority_mode', v_auth->>'authority_mode',
    'authority_source', v_auth->>'authority_source',
    'is_temporary_fallback', COALESCE((v_auth->>'is_temporary_fallback')::boolean, false),
    'reason_code', v_auth->>'reason_code'
  );
END;
$function$;

-- Re-assert grants to match prior state (owner postgres, EXECUTE to authenticated only)
REVOKE ALL ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_horse_identity(uuid, uuid, jsonb) TO authenticated;