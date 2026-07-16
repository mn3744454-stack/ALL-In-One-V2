
-- Phase 1.e.f.8.1.4.d.3.fix.1.r1 — Critical Identity Field Edit Governance Correction
--
-- Narrow update_horse_identity RPC governance:
--  * Remove gender, breed_id from the normal allowlist.
--  * Reject birth_at from the normal path (it was never persisted; make it explicit).
--  * Allow birth_date only when the existing horses.birth_date IS NULL
--    (first-time completion). Reject birth_date changes when a value already exists.
--  * Any restricted field in payload rejects the ENTIRE update atomically
--    with reason_code 'restricted_identity_field' + field name — no partial writes.
--
-- Preserves: SECURITY DEFINER, search_path, grants, authority resolver, blocked
-- fields (height/weight/breed/color), unique-index error surface, all safe fields.
--
-- Correction workflows for gender / breed / birth_date after registration are
-- pinned tracks (Gender Correction, Breed Correction, Birth Date Correction).

CREATE OR REPLACE FUNCTION public.update_horse_identity(
  p_horse_id uuid,
  p_active_tenant_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_auth        jsonb;
  -- Normal-path identity allowlist. Governance-restricted fields
  -- (gender, breed_id, birth_at) are intentionally NOT in this list.
  -- birth_date remains but is guarded by a first-time-only check below.
  v_allowed     text[] := ARRAY[
    'name','name_ar','birth_date',
    'color_id',
    'is_pony','is_gelded',
    'registration_number','microchip_number','passport_number','ueln',
    'mane_marks','body_marks','legs_marks','distinctive_marks_notes',
    'avatar_url'
  ];
  -- Always-blocked identity fields (owned by other tracks / never editable here).
  v_blocked     text[] := ARRAY['height','weight','breed','color'];
  -- Governance-restricted identity fields — rejected atomically with a
  -- distinct reason so the frontend can map to gender/breed/birth-date specific
  -- messages that point users to the future correction workflows.
  v_restricted  text[] := ARRAY['gender','breed_id','birth_at'];
  v_key         text;
  v_val         jsonb;
  v_updated     text[] := ARRAY[]::text[];
  v_sets        text[] := ARRAY[]::text[];
  v_sql         text;
  v_gender      text;
  v_existing_dob date;
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

  -- Pre-scan 1: reject any always-blocked identity field.
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

  -- Pre-scan 2: reject any governance-restricted identity field
  -- BEFORE authority resolution so no partial identity write can occur.
  FOR v_key IN SELECT * FROM jsonb_object_keys(p_payload) LOOP
    IF v_key = ANY (v_restricted) THEN
      RETURN jsonb_build_object(
        'success', false,
        'horse_id', p_horse_id,
        'error_code', 'restricted_identity_field',
        'reason_code', 'restricted_identity_field',
        'field', v_key
      );
    END IF;
  END LOOP;

  -- Pre-scan 3: birth_date first-time-only rule. If payload attempts to set
  -- birth_date and the horse already has one, reject atomically with a
  -- birth-date-specific restricted-field reason.
  IF p_payload ? 'birth_date' THEN
    SELECT birth_date INTO v_existing_dob
    FROM public.horses
    WHERE id = p_horse_id;

    IF v_existing_dob IS NOT NULL THEN
      -- Allow no-op sends (client posts same value) so a UI that always
      -- includes birth_date does not fail for equal values.
      IF (p_payload ->> 'birth_date') IS NULL
         OR (p_payload ->> 'birth_date') = ''
         OR (p_payload ->> 'birth_date')::date <> v_existing_dob THEN
        RETURN jsonb_build_object(
          'success', false,
          'horse_id', p_horse_id,
          'error_code', 'restricted_identity_field',
          'reason_code', 'restricted_identity_field',
          'field', 'birth_date'
        );
      END IF;
    END IF;
  END IF;

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
          'success', false,
          'horse_id', p_horse_id,
          'error_code', 'invalid_field_value',
          'reason_code', 'invalid_field_value',
          'field', 'name'
        );
      END IF;
      v_sets := array_append(v_sets, format('name = %L', v_val #>> '{}'));

    ELSIF v_key = 'name_ar' THEN
      IF jsonb_typeof(v_val) = 'null' THEN
        v_sets := array_append(v_sets, 'name_ar = NULL');
      ELSIF jsonb_typeof(v_val) = 'string' THEN
        v_sets := array_append(v_sets, format('name_ar = %L', v_val #>> '{}'));
      ELSE
        RETURN jsonb_build_object(
          'success', false, 'horse_id', p_horse_id,
          'error_code','invalid_field_value','reason_code','invalid_field_value','field','name_ar');
      END IF;

    ELSIF v_key = 'birth_date' THEN
      IF jsonb_typeof(v_val) = 'null' OR (v_val #>> '{}') IS NULL OR (v_val #>> '{}') = '' THEN
        -- No-op / null send is allowed (either horse had no DOB and user
        -- didn't enter one, or existing DOB matches null-through path).
        NULL;
      ELSE
        v_sets := array_append(v_sets, format('birth_date = %L::date', v_val #>> '{}'));
      END IF;

    ELSIF v_key = 'color_id' THEN
      IF jsonb_typeof(v_val) = 'null' OR (v_val #>> '{}') IS NULL OR (v_val #>> '{}') = '' THEN
        v_sets := array_append(v_sets, 'color_id = NULL');
      ELSE
        v_sets := array_append(v_sets, format('color_id = %L::uuid', v_val #>> '{}'));
      END IF;

    ELSIF v_key = 'is_pony' THEN
      IF jsonb_typeof(v_val) <> 'boolean' THEN
        RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
          'error_code','invalid_field_value','reason_code','invalid_field_value','field','is_pony');
      END IF;
      v_sets := array_append(v_sets, format('is_pony = %L::boolean', v_val #>> '{}'));

    ELSIF v_key = 'is_gelded' THEN
      IF jsonb_typeof(v_val) <> 'boolean' THEN
        RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
          'error_code','invalid_field_value','reason_code','invalid_field_value','field','is_gelded');
      END IF;
      -- Male-only gelding safeguard preserved.
      SELECT gender INTO v_gender FROM public.horses WHERE id = p_horse_id;
      IF (v_val #>> '{}')::boolean = true AND v_gender IS DISTINCT FROM 'male' THEN
        RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
          'error_code','invalid_field_value','reason_code','invalid_field_value','field','is_gelded');
      END IF;
      v_sets := array_append(v_sets, format('is_gelded = %L::boolean', v_val #>> '{}'));

    ELSIF v_key IN ('registration_number','microchip_number','passport_number','ueln',
                    'mane_marks','body_marks','legs_marks','distinctive_marks_notes','avatar_url') THEN
      IF jsonb_typeof(v_val) = 'null' OR (v_val #>> '{}') IS NULL OR (v_val #>> '{}') = '' THEN
        v_sets := array_append(v_sets, format('%I = NULL', v_key));
      ELSIF jsonb_typeof(v_val) = 'string' THEN
        v_sets := array_append(v_sets, format('%I = %L', v_key, v_val #>> '{}'));
      ELSE
        RETURN jsonb_build_object('success', false, 'horse_id', p_horse_id,
          'error_code','invalid_field_value','reason_code','invalid_field_value','field',v_key);
      END IF;
    END IF;

    v_updated := array_append(v_updated, v_key);
  END LOOP;

  IF array_length(v_sets, 1) IS NULL THEN
    -- Everything in payload was no-op (e.g. only birth_date sent equal to existing).
    RETURN jsonb_build_object(
      'success', true,
      'horse_id', p_horse_id,
      'updated_fields', v_updated,
      'noop', true
    );
  END IF;

  v_sql := 'UPDATE public.horses SET '
        || array_to_string(v_sets, ', ')
        || format(', updated_at = now() WHERE id = %L', p_horse_id);

  EXECUTE v_sql;

  RETURN jsonb_build_object(
    'success', true,
    'horse_id', p_horse_id,
    'updated_fields', v_updated
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Surface unique-index details so the frontend can map to
    -- microchip/passport/ueln duplicate messages.
    RETURN jsonb_build_object(
      'success', false,
      'horse_id', p_horse_id,
      'error_code', 'unique_violation',
      'reason_code', 'unique_violation',
      'details', SQLERRM
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'horse_id', p_horse_id,
      'error_code', 'internal_error',
      'reason_code', 'internal_error',
      'details', SQLERRM
    );
END;
$function$;
