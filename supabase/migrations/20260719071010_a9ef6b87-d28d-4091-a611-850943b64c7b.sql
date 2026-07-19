CREATE OR REPLACE FUNCTION public._slice3_lrs_guard_test()
RETURNS TABLE(scenario text, rejected boolean, err text, persisted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req uuid := '8e028fba-24d6-4acd-820f-76e52386bfac'; -- lab_tenant = 348ce41c...
  v_foreign uuid := '96e90137-2f50-4b8a-b801-66328def24cc'; -- tenant 145f2128
  v_inactive uuid := 'bab09fc8-a59e-4be4-96b1-d9484e7210f7';
  v_valid uuid := 'ce42348d-6331-415b-8b98-7e1cfbfb3517';
  v_bogus uuid := '00000000-0000-0000-0000-000000000000';
  v_count int;
BEGIN
  -- Foreign provider
  BEGIN
    INSERT INTO lab_request_services(lab_request_id, service_id) VALUES (v_req, v_foreign);
    scenario:='foreign_provider'; rejected:=false; err:=NULL;
  EXCEPTION WHEN OTHERS THEN
    scenario:='foreign_provider'; rejected:=true; err:=SQLERRM;
  END;
  SELECT count(*) INTO v_count FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_foreign;
  persisted := v_count>0; RETURN NEXT;
  DELETE FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_foreign;

  -- Inactive
  BEGIN
    INSERT INTO lab_request_services(lab_request_id, service_id) VALUES (v_req, v_inactive);
    scenario:='inactive'; rejected:=false; err:=NULL;
  EXCEPTION WHEN OTHERS THEN
    scenario:='inactive'; rejected:=true; err:=SQLERRM;
  END;
  SELECT count(*) INTO v_count FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_inactive;
  persisted := v_count>0; RETURN NEXT;
  DELETE FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_inactive;

  -- Nonexistent
  BEGIN
    INSERT INTO lab_request_services(lab_request_id, service_id) VALUES (v_req, v_bogus);
    scenario:='nonexistent'; rejected:=false; err:=NULL;
  EXCEPTION WHEN OTHERS THEN
    scenario:='nonexistent'; rejected:=true; err:=SQLERRM;
  END;
  SELECT count(*) INTO v_count FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_bogus;
  persisted := v_count>0; RETURN NEXT;
  DELETE FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_bogus;

  -- Duplicate (valid insert then dupe)
  BEGIN
    INSERT INTO lab_request_services(lab_request_id, service_id) VALUES (v_req, v_valid);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    INSERT INTO lab_request_services(lab_request_id, service_id) VALUES (v_req, v_valid);
    scenario:='duplicate'; rejected:=false; err:=NULL;
  EXCEPTION WHEN OTHERS THEN
    scenario:='duplicate'; rejected:=true; err:=SQLERRM;
  END;
  SELECT count(*) INTO v_count FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_valid;
  persisted := v_count>1; RETURN NEXT;
  DELETE FROM lab_request_services WHERE lab_request_id=v_req AND service_id=v_valid;
END;
$$;

SELECT * FROM public._slice3_lrs_guard_test();

DROP FUNCTION public._slice3_lrs_guard_test();
