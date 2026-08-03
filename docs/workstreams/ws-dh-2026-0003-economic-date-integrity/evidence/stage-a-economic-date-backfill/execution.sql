-- STAGE A — Economic Date Backfill + atomic balance_after recalculation
-- Batch: STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89
-- Prompt: PROMPT-DH-SHARED-OPERATIONAL-FINANCE-HISTORICAL-MIGRATION-ECONOMIC-DATE-STAGE-A-BACKFILL-EXECUTION-07
DO $stage_a$
DECLARE
  v_n integer;
  v_dates integer;
  v_bal integer;
  v_scan integer;
  r record;
BEGIN
  -- Step 3: frozen transaction-local target map (dropped on commit)
  CREATE TEMP TABLE stage_a_map (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    client_id uuid NOT NULL,
    expected_amount numeric NOT NULL,
    expected_session uuid,
    new_effective_date date NOT NULL,
    basis text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO stage_a_map VALUES
  ('aac917e5-731a-4300-8b51-e8681f5f3db3','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-150.00,'a7d75d9f-0de7-4505-8095-8e304bdb92d9','2026-02-05','DIRECT_PAYMENT_SESSION_DATE'),
  ('432b5a3f-aa95-4013-954f-226a2cbceaf4','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-10.00,'a7d75d9f-0de7-4505-8095-8e304bdb92d9','2026-02-05','DIRECT_PAYMENT_SESSION_DATE'),
  ('938b39ea-8340-4734-b176-47c2b956ffdf','348ce41c-1102-4295-bf6a-2ea0203c1036','3e1f790b-ea8d-47dd-ac30-0f80b6415786',-120.00,'1de6e7fc-b281-4c25-8ed2-e083f54a5443','2026-02-05','DIRECT_PAYMENT_SESSION_DATE'),
  ('1c7eb5d2-2e86-4460-9c60-d30688464bdd','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-230.00,'84062999-7f93-4f3d-8c4c-f9577e9e0017','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('650edda7-d099-4f79-b144-cbbecc99a747','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-150.00,'15006e19-f81c-449d-a883-ba786e859326','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('17e217fa-7970-4447-bdf2-ad19642f5605','348ce41c-1102-4295-bf6a-2ea0203c1036','4461804b-d110-4e18-a5a3-bbc039f5b9f9',-150.00,'dab67e08-e4d1-4482-9453-1001ed84d83e','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('449d1078-3ad2-4182-ab22-5531046772d9','348ce41c-1102-4295-bf6a-2ea0203c1036','a3165b28-7b3e-414d-adae-944673e482a7',-120.00,'7b52e3a8-02cd-4f2e-840d-3362c98abf74','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('2663b1d6-e39e-4f29-85ef-7e07972d40e6','348ce41c-1102-4295-bf6a-2ea0203c1036','a3165b28-7b3e-414d-adae-944673e482a7',-30.00,'7b52e3a8-02cd-4f2e-840d-3362c98abf74','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('d99c7b9a-9999-4ceb-9d2c-71a5468495e7','348ce41c-1102-4295-bf6a-2ea0203c1036','3e1f790b-ea8d-47dd-ac30-0f80b6415786',-30.00,'76c5639b-1a85-4afa-b4e1-d5745450ce42','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('66e71c13-698e-4285-a031-4e414dcf8c21','348ce41c-1102-4295-bf6a-2ea0203c1036','a3165b28-7b3e-414d-adae-944673e482a7',-110.00,'9aaa55b6-3fda-4a83-87f5-ead7b935a531','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('c58040a8-8cbd-4761-8a46-0fb0bef7bd88','348ce41c-1102-4295-bf6a-2ea0203c1036','a3165b28-7b3e-414d-adae-944673e482a7',-40.00,'ff27e5d7-3dff-4a8d-933d-05b1251a2157','2026-02-06','DIRECT_PAYMENT_SESSION_DATE'),
  ('3cd0f5ab-a45a-4393-9b11-811768a29cf1','348ce41c-1102-4295-bf6a-2ea0203c1036','a0705f81-ec7c-4ccd-881b-42395cd4bf1d',-10.00,'679969ab-de1c-44a2-8e52-1469f780b46b','2026-02-08','DIRECT_PAYMENT_SESSION_DATE'),
  ('4f445239-9ce6-4b7a-b7c0-681347f94dfe','348ce41c-1102-4295-bf6a-2ea0203c1036','a0705f81-ec7c-4ccd-881b-42395cd4bf1d',-20.00,'679969ab-de1c-44a2-8e52-1469f780b46b','2026-02-08','DIRECT_PAYMENT_SESSION_DATE'),
  ('61cfe843-7dab-4dde-a65c-3863abe1afae','348ce41c-1102-4295-bf6a-2ea0203c1036','a0705f81-ec7c-4ccd-881b-42395cd4bf1d',-45.00,'b5f87a58-f33e-482e-a407-bdc55614e0dc','2026-02-08','DIRECT_PAYMENT_SESSION_DATE'),
  ('9cca7047-7d62-49bb-b83c-46f22a3b243f','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-45.00,'f74b07c9-a995-45dc-ad9a-7ae9d24fae25','2026-03-03','DIRECT_PAYMENT_SESSION_DATE'),
  ('59b9a721-d41f-48db-b1ff-40ec741e8ab4','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-70.00,'b635cf70-a36e-4459-8fd4-38c715411198','2026-03-03','DIRECT_PAYMENT_SESSION_DATE'),
  ('8817234c-610f-4f4b-a3ce-8b6f99c725dd','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-12.00,'a8bf3ffa-8daa-4b94-8c39-01d7343dea63','2026-03-03','DIRECT_PAYMENT_SESSION_DATE'),
  ('065c7158-e66e-4eeb-b326-580ff9086f18','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-85.00,'c509fd88-b89e-4cf1-9a5e-fea9da6f680f','2026-03-03','DIRECT_PAYMENT_SESSION_DATE'),
  ('03e3eee7-d277-4d60-9550-518436f78ffe','145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630',-95.00,'c9293f1d-b2e3-44ea-b4cd-6c940c7137cf','2026-03-28','DIRECT_PAYMENT_SESSION_DATE'),
  ('b2dabb21-fa75-4192-8eae-f3363c90128f','145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630',-1725.00,NULL,'2026-03-28','OWNER_APPROVED_CANCELLATION_ACTION_DATE'),
  ('b3e6f31e-bed9-4139-af0b-74b0e11f2206','145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630',-10000.00,NULL,'2026-04-03','OWNER_APPROVED_DUPLICATE_VOID_ACTION_DATE'),
  ('92c69b2c-5733-41ce-9221-b100316bca5c','145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630',-5750.00,NULL,'2026-04-03','OWNER_APPROVED_DUPLICATE_VOID_ACTION_DATE'),
  ('774175c3-7d7f-46f4-91d7-3044247e9921','8951ac1a-2940-4e93-9a62-95e47f110cba','a279407b-55ec-478b-b8ba-de4459df986f',-700.00,'857ed192-e414-43ce-817c-9c98ffca46ee','2026-05-09','OWNER_APPROVED_LEGACY_PRE_ISSUE_PAYMENT_DATE'),
  ('72913983-51b6-435c-a50d-c58d3b8984fc','8951ac1a-2940-4e93-9a62-95e47f110cba','a279407b-55ec-478b-b8ba-de4459df986f',-250.00,'491732ff-7439-4b0f-8ffd-7fb581af06f4','2026-05-09','OWNER_APPROVED_LEGACY_PRE_ISSUE_PAYMENT_DATE'),
  ('df4629d5-0da2-43f7-a846-4378fc227ecc','145f2128-83ca-4ba8-85b5-8ade245c5530','f225ffb7-2eb1-4346-a949-882992d6f630',-15322.58,'f3f16237-5b5a-4221-97b0-a19483059468','2026-06-05','DIRECT_PAYMENT_SESSION_DATE'),
  ('46104539-677b-4c6b-b391-8d7c8530581f','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-80.00,'6f0c28a7-e9cb-44dd-a671-e990c6a266e0','2026-07-18','DIRECT_PAYMENT_SESSION_DATE'),
  ('5b301cd7-3353-4277-9c5f-2fb566cf8e34','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-23.00,'6f0c28a7-e9cb-44dd-a671-e990c6a266e0','2026-07-18','DIRECT_PAYMENT_SESSION_DATE'),
  ('9b8b1da0-00eb-47d8-aa82-f6036a4058e1','348ce41c-1102-4295-bf6a-2ea0203c1036','364165f0-58ec-464c-bdc0-86f3e7a0c79b',-15.00,'7ffcb9a4-1aaf-41c9-90f4-16c74f78914a','2026-07-18','DIRECT_PAYMENT_SESSION_DATE');

  SELECT count(*) INTO v_n FROM stage_a_map;
  IF v_n <> 28 THEN RAISE EXCEPTION 'STAGE_A_MAP_COUNT %', v_n; END IF;

  -- Step 2: transaction-level advisory locks, deterministic tenant/client order
  FOR r IN SELECT DISTINCT tenant_id, client_id FROM stage_a_map ORDER BY tenant_id, client_id LOOP
    PERFORM pg_advisory_xact_lock(public._finance_advisory_lock_key(r.tenant_id, 'client_ledger', r.client_id));
  END LOOP;

  -- row locks over the full affected-client chain
  PERFORM 1 FROM public.ledger_entries l
   WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map)
   FOR UPDATE;
  PERFORM 1 FROM public.customer_balances cb
   WHERE (cb.tenant_id, cb.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map)
   FOR UPDATE;

  -- Step 5: preconditions re-asserted under lock
  SELECT count(*) INTO v_n FROM stage_a_map m JOIN public.ledger_entries l ON l.id = m.id
   WHERE l.effective_date IS NULL AND l.tenant_id = m.tenant_id AND l.client_id = m.client_id
     AND l.amount = m.expected_amount
     AND l.payment_session_id IS NOT DISTINCT FROM m.expected_session;
  IF v_n <> 28 THEN RAISE EXCEPTION 'STAGE_A_PRECONDITION_MISMATCH matched=%', v_n; END IF;

  SELECT count(*) INTO v_n FROM stage_a_map m JOIN public.payment_sessions ps ON ps.id = m.expected_session
   WHERE m.expected_session IS NOT NULL AND ps.payment_date <> m.new_effective_date;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_SOURCE_DATE_DRIFT rows=%', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE effective_date IS NULL;
  IF v_n <> 28 THEN RAISE EXCEPTION 'STAGE_A_GLOBAL_NULL_COUNT %', v_n; END IF;

  SELECT count(*) INTO v_scan FROM public.ledger_entries l
   WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map);
  IF v_scan <> 87 THEN RAISE EXCEPTION 'STAGE_A_AFFECTED_SCAN_COUNT %', v_scan; END IF;

  SELECT count(*) INTO v_n FROM (
    SELECT cb.balance - sum(l.amount) AS d
      FROM public.ledger_entries l
      JOIN public.customer_balances cb ON cb.tenant_id = l.tenant_id AND cb.client_id = l.client_id
     WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map)
     GROUP BY l.tenant_id, l.client_id, cb.balance) x WHERE d <> 0;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_PRE_RECONCILIATION_FAILED clients=%', v_n; END IF;

  -- Step 4: in-transaction before image
  CREATE TEMP TABLE stage_a_before ON COMMIT DROP AS
    SELECT l.id, l.tenant_id, l.client_id, l.amount, l.effective_date, l.balance_after, l.created_at
      FROM public.ledger_entries l
     WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map);

  -- Step 6: explicit UUID -> approved date backfill
  UPDATE public.ledger_entries l
     SET effective_date = m.new_effective_date
    FROM stage_a_map m
   WHERE l.id = m.id AND l.effective_date IS NULL;
  GET DIAGNOSTICS v_dates = ROW_COUNT;
  IF v_dates <> 28 THEN RAISE EXCEPTION 'STAGE_A_DATE_UPDATE_COUNT %', v_dates; END IF;

  -- Step 7: canonical running-balance recomputation, affected clients only
  WITH seq AS (
    SELECT l.id,
           sum(l.amount) OVER (PARTITION BY l.tenant_id, l.client_id
                               ORDER BY l.effective_date, l.created_at, l.id
                               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS bal
      FROM public.ledger_entries l
     WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map)
  )
  UPDATE public.ledger_entries l
     SET balance_after = seq.bal
    FROM seq
   WHERE l.id = seq.id AND l.balance_after IS DISTINCT FROM seq.bal;
  GET DIAGNOSTICS v_bal = ROW_COUNT;
  IF v_bal <> 69 THEN RAISE EXCEPTION 'STAGE_A_BALANCE_UPDATE_COUNT %', v_bal; END IF;

  -- Step 8: post-update assertions
  SELECT count(*) INTO v_n FROM public.ledger_entries l JOIN stage_a_map m ON m.id = l.id
   WHERE l.effective_date IS DISTINCT FROM m.new_effective_date;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_TARGET_DATE_NOT_APPLIED rows=%', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE effective_date IS NULL;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_GLOBAL_NULL_AFTER %', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.ledger_entries l JOIN stage_a_before b ON b.id = l.id
   WHERE l.id NOT IN (SELECT id FROM stage_a_map) AND l.effective_date IS DISTINCT FROM b.effective_date;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_NON_TARGET_DATE_CHANGED rows=%', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.ledger_entries l JOIN stage_a_before b ON b.id = l.id
   WHERE l.amount <> b.amount OR l.created_at <> b.created_at;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_IMMUTABLE_FIELD_CHANGED rows=%', v_n; END IF;

  WITH seq AS (
    SELECT l.id, l.balance_after,
           sum(l.amount) OVER (PARTITION BY l.tenant_id, l.client_id
                               ORDER BY l.effective_date, l.created_at, l.id
                               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS bal
      FROM public.ledger_entries l
     WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map))
  SELECT count(*) INTO v_n FROM seq WHERE balance_after IS DISTINCT FROM bal;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_CANONICAL_ORDER_VALIDATION_FAILED rows=%', v_n; END IF;

  SELECT count(*) INTO v_n FROM (
    SELECT cb.balance - sum(l.amount) AS d
      FROM public.ledger_entries l
      JOIN public.customer_balances cb ON cb.tenant_id = l.tenant_id AND cb.client_id = l.client_id
     WHERE (l.tenant_id, l.client_id) IN (SELECT tenant_id, client_id FROM stage_a_map)
     GROUP BY l.tenant_id, l.client_id, cb.balance) x WHERE d <> 0;
  IF v_n <> 0 THEN RAISE EXCEPTION 'STAGE_A_POST_RECONCILIATION_FAILED clients=%', v_n; END IF;

  RAISE NOTICE 'STAGE_A_OK dates=% balances=% scan=%', v_dates, v_bal, v_scan;
END
$stage_a$;
