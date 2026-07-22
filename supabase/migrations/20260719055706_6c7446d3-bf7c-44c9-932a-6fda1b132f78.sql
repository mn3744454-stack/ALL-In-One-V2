-- 2QA-C closure — rollback-safe trigger rejection tests.
--
-- This historical migration validates existing cross-tenant service fixtures when
-- they are available. A clean rebuild intentionally has no business/demo rows at
-- this point, so absence of those fixtures must not make schema migration fail.
DO $qa_c$
DECLARE
  a_tenant uuid; b_cat uuid; ls_a uuid; ts_a uuid;
  r_ls boolean := false; r_ts boolean := false; r_ltt boolean := false;
  e_ls text := ''; e_ts text := ''; e_ltt text := '';
BEGIN
  SELECT DISTINCT s.tenant_id INTO a_tenant FROM public.lab_services s LIMIT 1;
  SELECT c.id INTO b_cat
  FROM public.tenant_service_categories c
  WHERE c.tenant_id <> a_tenant
  LIMIT 1;
  SELECT id INTO ls_a FROM public.lab_services WHERE tenant_id = a_tenant LIMIT 1;
  SELECT id INTO ts_a FROM public.tenant_services WHERE tenant_id = a_tenant LIMIT 1;

  IF a_tenant IS NULL OR b_cat IS NULL OR ls_a IS NULL OR ts_a IS NULL THEN
    RAISE NOTICE
      '[2QA-C REJECTION TEST] skipped: clean rebuild has no complete cross-tenant service fixture';
  ELSE
    BEGIN
      UPDATE public.lab_services SET category_id = b_cat WHERE id = ls_a;
      -- If it did not throw, revert immediately.
      UPDATE public.lab_services SET category_id = NULL WHERE id = ls_a;
    EXCEPTION WHEN OTHERS THEN r_ls := true; e_ls := SQLERRM; END;

    BEGIN
      UPDATE public.tenant_services SET category_id = b_cat WHERE id = ts_a;
      UPDATE public.tenant_services SET category_id = NULL WHERE id = ts_a;
    EXCEPTION WHEN OTHERS THEN r_ts := true; e_ts := SQLERRM; END;

    BEGIN
      INSERT INTO public.lab_test_types(tenant_id, code, name, category_id)
      VALUES (a_tenant, '__TQA_C_TRIGGER_TEST__', 'trigger test', b_cat);
      DELETE FROM public.lab_test_types WHERE code = '__TQA_C_TRIGGER_TEST__';
    EXCEPTION WHEN OTHERS THEN r_ltt := true; e_ltt := SQLERRM; END;

    RAISE NOTICE '[2QA-C REJECTION TEST] lab_services rejected=% err=%', r_ls, e_ls;
    RAISE NOTICE '[2QA-C REJECTION TEST] tenant_services rejected=% err=%', r_ts, e_ts;
    RAISE NOTICE '[2QA-C REJECTION TEST] lab_test_types rejected=% err=%', r_ltt, e_ltt;

    IF NOT (r_ls AND r_ts AND r_ltt) THEN
      RAISE EXCEPTION '2QA-C rejection tests FAILED: ls=%, ts=%, ltt=%',
        r_ls, r_ts, r_ltt;
    END IF;

    -- Safety net: ensure no accidental leftover row from the lab_test_types test.
    DELETE FROM public.lab_test_types WHERE code = '__TQA_C_TRIGGER_TEST__';
  END IF;
END
$qa_c$;
