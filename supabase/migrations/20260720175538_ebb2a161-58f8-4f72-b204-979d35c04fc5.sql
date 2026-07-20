
DO $guard$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    '_finance_advisory_lock_key','_finance_source_lock_key','_finance_request_hash',
    '_finance_riyadh_date','_finance_idempotency_begin','_finance_idempotency_complete',
    '_finance_idempotency_purge_expired');
  IF v_count <> 0 THEN RAISE EXCEPTION 'STAGE5_GUARD: helper signatures already exist (%)', v_count; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'STAGE5_GUARD: pgcrypto missing'; END IF;
  IF (SELECT count(*) FROM public.finance_request_idempotency) <> 0 THEN
    RAISE EXCEPTION 'STAGE5_GUARD: finance_request_idempotency not empty'; END IF;
END $guard$;

CREATE FUNCTION public._finance_advisory_lock_key(p_tenant_id uuid, p_operation text, p_idempotency_key uuid)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT pg_catalog.hashtextextended(
    'fin.idem|' || COALESCE(p_tenant_id::text, '')
      || '|' || COALESCE(p_operation, '')
      || '|' || COALESCE(p_idempotency_key::text, ''),
    0::bigint);
$fn$;

CREATE FUNCTION public._finance_source_lock_key(p_tenant_id uuid, p_source_type text, p_source_id uuid)
RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT pg_catalog.hashtextextended(
    'fin.src|' || COALESCE(p_tenant_id::text, '')
      || '|' || COALESCE(p_source_type, '')
      || '|' || COALESCE(p_source_id::text, ''),
    0::bigint);
$fn$;

CREATE FUNCTION public._finance_request_hash(p_operation text, p_tenant_id uuid, p_actor_id uuid, p_source jsonb, p_intent jsonb)
RETURNS bytea LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT extensions.digest(
    pg_catalog.jsonb_build_object(
      'operation', p_operation, 'tenant_id', p_tenant_id, 'actor_id', p_actor_id,
      'source', COALESCE(p_source, '{}'::jsonb),
      'intent', COALESCE(p_intent, '{}'::jsonb))::text,
    'sha256');
$fn$;

CREATE FUNCTION public._finance_riyadh_date(p_ts timestamptz)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = '' AS $fn$
  SELECT (p_ts AT TIME ZONE 'Asia/Riyadh')::date;
$fn$;

CREATE FUNCTION public._finance_idempotency_begin(
  p_tenant_id uuid, p_operation text, p_idempotency_key uuid,
  p_actor_id uuid, p_source jsonb, p_intent jsonb
) RETURNS TABLE (is_replay boolean, request_hash bytea, stored_response jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_hash bytea; v_lock_key bigint;
  v_row public.finance_request_idempotency%ROWTYPE;
  v_updated int;
BEGIN
  IF p_tenant_id IS NULL OR p_operation IS NULL OR pg_catalog.length(p_operation) = 0
     OR p_idempotency_key IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_INVALID_ARGUMENTS' USING ERRCODE = '22023';
  END IF;
  v_hash := public._finance_request_hash(p_operation, p_tenant_id, p_actor_id, p_source, p_intent);
  v_lock_key := public._finance_advisory_lock_key(p_tenant_id, p_operation, p_idempotency_key);
  PERFORM pg_catalog.pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_row FROM public.finance_request_idempotency
   WHERE tenant_id = p_tenant_id AND operation = p_operation AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_row.expires_at > pg_catalog.now() THEN
      IF v_row.response IS NOT NULL THEN
        IF v_row.actor_id IS DISTINCT FROM p_actor_id THEN
          RAISE EXCEPTION 'FIN_IDEMPOTENCY_ACTOR_MISMATCH' USING ERRCODE = '42501'; END IF;
        IF v_row.request_hash IS DISTINCT FROM v_hash THEN
          RAISE EXCEPTION 'FIN_IDEMPOTENCY_CONFLICT' USING ERRCODE = '23514'; END IF;
        is_replay := true; request_hash := v_hash; stored_response := v_row.response;
        RETURN NEXT; RETURN;
      ELSE
        RAISE EXCEPTION 'FIN_IDEMPOTENCY_IN_PROGRESS' USING ERRCODE = '40001';
      END IF;
    ELSE
      UPDATE public.finance_request_idempotency
         SET actor_id = p_actor_id, request_hash = v_hash,
             resolved_snapshot = '{}'::jsonb, response = NULL,
             created_at = pg_catalog.now(),
             expires_at = pg_catalog.now() + interval '7 days'
       WHERE tenant_id = p_tenant_id AND operation = p_operation
         AND idempotency_key = p_idempotency_key AND expires_at <= pg_catalog.now();
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      IF v_updated = 0 THEN
        SELECT * INTO v_row FROM public.finance_request_idempotency
         WHERE tenant_id = p_tenant_id AND operation = p_operation AND idempotency_key = p_idempotency_key;
        IF v_row.response IS NULL THEN
          RAISE EXCEPTION 'FIN_IDEMPOTENCY_IN_PROGRESS' USING ERRCODE = '40001'; END IF;
        IF v_row.actor_id IS DISTINCT FROM p_actor_id THEN
          RAISE EXCEPTION 'FIN_IDEMPOTENCY_ACTOR_MISMATCH' USING ERRCODE = '42501'; END IF;
        IF v_row.request_hash IS DISTINCT FROM v_hash THEN
          RAISE EXCEPTION 'FIN_IDEMPOTENCY_CONFLICT' USING ERRCODE = '23514'; END IF;
        is_replay := true; request_hash := v_hash; stored_response := v_row.response;
        RETURN NEXT; RETURN;
      END IF;
      is_replay := false; request_hash := v_hash; stored_response := NULL;
      RETURN NEXT; RETURN;
    END IF;
  ELSE
    INSERT INTO public.finance_request_idempotency (
      tenant_id, operation, idempotency_key, actor_id, request_hash,
      resolved_snapshot, response, created_at, expires_at
    ) VALUES (
      p_tenant_id, p_operation, p_idempotency_key, p_actor_id, v_hash,
      '{}'::jsonb, NULL, pg_catalog.now(), pg_catalog.now() + interval '7 days');
    is_replay := false; request_hash := v_hash; stored_response := NULL;
    RETURN NEXT; RETURN;
  END IF;
END $fn$;

CREATE FUNCTION public._finance_idempotency_complete(
  p_tenant_id uuid, p_operation text, p_idempotency_key uuid,
  p_actor_id uuid, p_request_hash bytea,
  p_resolved_snapshot jsonb, p_response jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_updated int;
BEGIN
  IF p_response IS NULL THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_RESPONSE_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF p_tenant_id IS NULL OR p_operation IS NULL OR p_idempotency_key IS NULL
     OR p_actor_id IS NULL OR p_request_hash IS NULL THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_INVALID_ARGUMENTS' USING ERRCODE = '22023'; END IF;
  UPDATE public.finance_request_idempotency
     SET resolved_snapshot = COALESCE(p_resolved_snapshot, '{}'::jsonb), response = p_response
   WHERE tenant_id = p_tenant_id AND operation = p_operation
     AND idempotency_key = p_idempotency_key AND actor_id = p_actor_id
     AND request_hash = p_request_hash AND response IS NULL
     AND expires_at > pg_catalog.now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_COMPLETE_NO_MATCH' USING ERRCODE = '23514';
  ELSIF v_updated > 1 THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_COMPLETE_MULTI_MATCH' USING ERRCODE = '23514';
  END IF;
  RETURN p_response;
END $fn$;

CREATE FUNCTION public._finance_idempotency_purge_expired(p_cutoff timestamptz)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_deleted bigint;
BEGIN
  IF p_cutoff IS NULL THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_PURGE_CUTOFF_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF p_cutoff > pg_catalog.now() THEN
    RAISE EXCEPTION 'FIN_IDEMPOTENCY_PURGE_CUTOFF_IN_FUTURE' USING ERRCODE = '22023'; END IF;
  DELETE FROM public.finance_request_idempotency WHERE expires_at <= p_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $fn$;

REVOKE ALL ON FUNCTION public._finance_advisory_lock_key(uuid, text, uuid)         FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_source_lock_key(uuid, text, uuid)           FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_request_hash(text, uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_riyadh_date(timestamptz)                    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_idempotency_begin(uuid, text, uuid, uuid, jsonb, jsonb)             FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_idempotency_complete(uuid, text, uuid, uuid, bytea, jsonb, jsonb)   FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._finance_idempotency_purge_expired(timestamptz)      FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._finance_idempotency_purge_expired(timestamptz) TO service_role;

DO $tests$
DECLARE
  v_tenant uuid := '145f2128-83ca-4ba8-85b5-8ade245c5530';
  v_actor1 uuid := '00000000-0000-0000-0000-0000000000a1';
  v_actor2 uuid := '00000000-0000-0000-0000-0000000000a2';
  v_key    uuid := '00000000-0000-0000-0000-000000000001';
  v_key2   uuid := '00000000-0000-0000-0000-000000000002';
  v_key3   uuid := '00000000-0000-0000-0000-000000000003';
  v_op     text := 'stage5.test';
  v_h1 bytea; v_h2 bytea; v_h3 bytea;
  v_lock1 bigint; v_lock2 bigint;
  v_row record; v_resp jsonb;
  v_purged bigint; v_priv_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
    RAISE EXCEPTION 'STAGE5_TEST_PREREQ: captured tenant missing'; END IF;

  v_h1 := public._finance_request_hash(v_op, v_tenant, v_actor1, '{"a":1,"b":2}'::jsonb, '{"x":10,"y":20}'::jsonb);
  v_h2 := public._finance_request_hash(v_op, v_tenant, v_actor1, '{"b":2,"a":1}'::jsonb, '{"y":20,"x":10}'::jsonb);
  IF v_h1 IS DISTINCT FROM v_h2 THEN RAISE EXCEPTION 'TEST1_FAIL'; END IF;

  v_h3 := public._finance_request_hash(v_op, v_tenant, v_actor1, '{"a":1,"b":2}'::jsonb, '{"x":11,"y":20}'::jsonb);
  IF v_h1 = v_h3 THEN RAISE EXCEPTION 'TEST2_FAIL'; END IF;

  IF pg_catalog.octet_length(v_h1) <> 32 THEN RAISE EXCEPTION 'TEST3_FAIL'; END IF;

  IF public._finance_riyadh_date('2026-07-20 21:30:00+00'::timestamptz) <> DATE '2026-07-21' THEN
    RAISE EXCEPTION 'TEST4_FAIL'; END IF;

  v_lock1 := public._finance_advisory_lock_key(v_tenant, v_op, v_key);
  v_lock2 := public._finance_advisory_lock_key(v_tenant, v_op, v_key);
  IF v_lock1 <> v_lock2 THEN RAISE EXCEPTION 'TEST5_FAIL'; END IF;

  IF public._finance_advisory_lock_key(v_tenant, v_op, v_key)
     = public._finance_advisory_lock_key(v_actor1, v_op, v_key) THEN
    RAISE EXCEPTION 'TEST6a_FAIL'; END IF;
  IF public._finance_source_lock_key(v_tenant, 'invoice', v_key)
     = public._finance_source_lock_key(v_actor1, 'invoice', v_key) THEN
    RAISE EXCEPTION 'TEST6b_FAIL'; END IF;

  SELECT * INTO v_row FROM public._finance_idempotency_begin(
    v_tenant, v_op, v_key, v_actor1, '{"a":1}'::jsonb, '{"x":10}'::jsonb);
  IF v_row.is_replay <> false OR v_row.stored_response IS NOT NULL THEN RAISE EXCEPTION 'TEST7_FAIL'; END IF;

  v_resp := public._finance_idempotency_complete(
    v_tenant, v_op, v_key, v_actor1, v_row.request_hash,
    '{"resolved":true}'::jsonb, '{"ok":true}'::jsonb);
  IF v_resp IS DISTINCT FROM '{"ok":true}'::jsonb THEN RAISE EXCEPTION 'TEST8_FAIL'; END IF;

  SELECT * INTO v_row FROM public._finance_idempotency_begin(
    v_tenant, v_op, v_key, v_actor1, '{"a":1}'::jsonb, '{"x":10}'::jsonb);
  IF v_row.is_replay <> true OR v_row.stored_response IS DISTINCT FROM '{"ok":true}'::jsonb THEN
    RAISE EXCEPTION 'TEST9_FAIL'; END IF;

  BEGIN
    PERFORM public._finance_idempotency_begin(
      v_tenant, v_op, v_key, v_actor2, '{"a":1}'::jsonb, '{"x":10}'::jsonb);
    RAISE EXCEPTION 'TEST10_FAIL expected';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM public._finance_idempotency_begin(
      v_tenant, v_op, v_key, v_actor1, '{"a":1}'::jsonb, '{"x":999}'::jsonb);
    RAISE EXCEPTION 'TEST11_FAIL expected';
  EXCEPTION WHEN check_violation THEN NULL; END;

  SELECT * INTO v_row FROM public._finance_idempotency_begin(
    v_tenant, v_op, v_key2, v_actor1, '{}'::jsonb, '{"n":1}'::jsonb);
  IF v_row.is_replay THEN RAISE EXCEPTION 'TEST12_prep_FAIL'; END IF;
  BEGIN
    PERFORM public._finance_idempotency_begin(
      v_tenant, v_op, v_key2, v_actor1, '{}'::jsonb, '{"n":1}'::jsonb);
    RAISE EXCEPTION 'TEST12_FAIL expected';
  EXCEPTION WHEN serialization_failure THEN NULL; END;

  INSERT INTO public.finance_request_idempotency
    (tenant_id, operation, idempotency_key, actor_id, request_hash,
     resolved_snapshot, response, created_at, expires_at)
  VALUES (v_tenant, v_op, v_key3, v_actor2,
     public._finance_request_hash(v_op, v_tenant, v_actor2, '{}'::jsonb, '{"old":true}'::jsonb),
     '{"was":"old"}'::jsonb, '{"stale":true}'::jsonb,
     pg_catalog.now() - interval '30 days', pg_catalog.now() - interval '1 minute');
  SELECT * INTO v_row FROM public._finance_idempotency_begin(
    v_tenant, v_op, v_key3, v_actor1, '{}'::jsonb, '{"fresh":true}'::jsonb);
  IF v_row.is_replay <> false OR v_row.stored_response IS NOT NULL THEN
    RAISE EXCEPTION 'TEST13_FAIL'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.finance_request_idempotency
    WHERE tenant_id=v_tenant AND operation=v_op AND idempotency_key=v_key3
      AND actor_id=v_actor1 AND response IS NULL AND resolved_snapshot='{}'::jsonb) THEN
    RAISE EXCEPTION 'TEST13_FAIL reclaim state'; END IF;

  UPDATE public.finance_request_idempotency
     SET expires_at = pg_catalog.now() - interval '5 minutes'
   WHERE idempotency_key = v_key3;
  v_purged := public._finance_idempotency_purge_expired(pg_catalog.now());
  IF v_purged < 1 THEN RAISE EXCEPTION 'TEST14_FAIL count'; END IF;
  IF EXISTS (SELECT 1 FROM public.finance_request_idempotency WHERE idempotency_key=v_key3) THEN
    RAISE EXCEPTION 'TEST14_FAIL remains'; END IF;

  DELETE FROM public.finance_request_idempotency WHERE operation = v_op;
  IF (SELECT count(*) FROM public.finance_request_idempotency) <> 0 THEN
    RAISE EXCEPTION 'TEST16_FAIL'; END IF;

  SELECT count(*) INTO v_priv_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('_finance_advisory_lock_key','_finance_source_lock_key','_finance_request_hash',
      '_finance_riyadh_date','_finance_idempotency_begin','_finance_idempotency_complete',
      '_finance_idempotency_purge_expired')
    AND (pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('public', p.oid, 'EXECUTE'));
  IF v_priv_count <> 0 THEN RAISE EXCEPTION 'TEST17_FAIL pub-executable %', v_priv_count; END IF;

  SELECT count(*) INTO v_priv_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public'
    AND p.proname IN ('_finance_advisory_lock_key','_finance_source_lock_key','_finance_request_hash',
      '_finance_riyadh_date','_finance_idempotency_begin','_finance_idempotency_complete')
    AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE');
  IF v_priv_count <> 0 THEN RAISE EXCEPTION 'TEST17_FAIL service_role over-priv'; END IF;
  IF NOT pg_catalog.has_function_privilege('service_role',
      'public._finance_idempotency_purge_expired(timestamptz)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST17_FAIL purge missing'; END IF;

  IF (SELECT count(*) FROM public.permission_definitions WHERE module='finance') <> 19 THEN
    RAISE EXCEPTION 'TEST18_FAIL finance perm count'; END IF;
  IF (SELECT count(*) FROM public.bundle_permissions
       WHERE bundle_id='4d9b8917-f11d-4879-840d-1b682bad8cec'
         AND permission_key LIKE 'finance.%') <> 17 THEN
    RAISE EXCEPTION 'TEST18_FAIL bundle count'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bundle_permissions
    WHERE bundle_id='4d9b8917-f11d-4879-840d-1b682bad8cec'
      AND permission_key='finance.invoice.markPaid') THEN
    RAISE EXCEPTION 'TEST18_FAIL markPaid'; END IF;

  RAISE NOTICE 'STAGE5 TESTS PASSED';
END $tests$;
