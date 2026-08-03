-- STAGE A ROLLBACK — Batch STAGE-A-ECONDATE-20260803-1553-28-7ce5ca89
-- Restores effective_date and balance_after for the 87 affected-client ledger rows
-- to their exact frozen pre-execution values. Restores nothing else.
-- Do NOT run unless the owner authorizes a rollback of the committed Stage A batch.
DO $rb$
DECLARE v_n integer; r record;
BEGIN
  CREATE TEMP TABLE stage_a_restore(id uuid PRIMARY KEY, effective_date date, balance_after numeric NOT NULL) ON COMMIT DROP;
  INSERT INTO stage_a_restore VALUES
  ('4943ee53-588b-4074-b898-f372d1504457'::uuid,DATE '2026-02-21',155.00),
  ('1366ba8b-d14c-42aa-a7c5-ec17343165ca'::uuid,DATE '2026-03-03',385.00),
  ('9cca7047-7d62-49bb-b83c-46f22a3b243f'::uuid,NULL,3055.00),
  ('59b9a721-d41f-48db-b1ff-40ec741e8ab4'::uuid,NULL,2985.00),
  ('8817234c-610f-4f4b-a3ce-8b6f99c725dd'::uuid,NULL,2973.00),
  ('065c7158-e66e-4eeb-b326-580ff9086f18'::uuid,NULL,2888.00),
  ('46104539-677b-4c6b-b391-8d7c8530581f'::uuid,NULL,2808.00),
  ('5b301cd7-3353-4277-9c5f-2fb566cf8e34'::uuid,NULL,2785.00),
  ('61bb4abc-7cd8-411f-8574-e539133b1559'::uuid,DATE '2026-07-18',400.00),
  ('9b8b1da0-00eb-47d8-aa82-f6036a4058e1'::uuid,NULL,2770.00),
  ('dbaccc18-2c28-401b-af9f-e10167ac4ba2'::uuid,DATE '2017-02-20',50.00),
  ('e7343642-c672-4549-9b01-05e38cffc0a6'::uuid,DATE '2026-07-26',630.00),
  ('a0011739-824a-4ef8-9286-c32c4b30e3d8'::uuid,DATE '2026-07-26',400.00),
  ('9cbbe45c-02cd-4b70-b075-792bfa0178ad'::uuid,DATE '2026-07-26',610.00),
  ('04d874a8-f7ab-4472-a3c5-939c8c416a42'::uuid,DATE '2026-07-27',3100.00),
  ('1b76410e-146e-4d3f-9702-326b3c2aedb4'::uuid,DATE '2026-02-05',150.00),
  ('938b39ea-8340-4734-b176-47c2b956ffdf'::uuid,NULL,402.00),
  ('d99c7b9a-9999-4ceb-9d2c-71a5468495e7'::uuid,NULL,372.00),
  ('52c41287-7eef-44dd-b586-ff471c31aa7a'::uuid,DATE '2026-02-06',500.00),
  ('1147284a-2d17-49fb-960b-d6650d2a46b9'::uuid,DATE '2026-07-25',522.00),
  ('aac917e5-731a-4300-8b51-e8681f5f3db3'::uuid,NULL,-150.00),
  ('432b5a3f-aa95-4013-954f-226a2cbceaf4'::uuid,NULL,-160.00),
  ('fba177ba-79f4-41f3-9d4a-feb3066e7010'::uuid,DATE '2026-02-05',-10.00),
  ('4f52c3ac-9b00-4c22-b6c6-a66bb3010874'::uuid,DATE '2026-02-06',140.00),
  ('57896343-d307-4423-8eb2-b2572af95309'::uuid,DATE '2026-02-06',370.00),
  ('1c7eb5d2-2e86-4460-9c60-d30688464bdd'::uuid,NULL,140.00),
  ('650edda7-d099-4f79-b144-cbbecc99a747'::uuid,NULL,-10.00),
  ('17e217fa-7970-4447-bdf2-ad19642f5605'::uuid,NULL,-160.00),
  ('33b26a88-ce93-4fdb-b789-6b754a48f9b6'::uuid,DATE '2026-02-07',-10.00),
  ('bcc77591-af0c-4482-bced-7963dc141931'::uuid,DATE '2026-02-07',570.00),
  ('b8527f7d-ef22-48c3-ab7e-7164f7f93260'::uuid,DATE '2026-02-20',1835.00),
  ('8577a63e-6f1a-4f1f-9f24-0abe4a9ca71e'::uuid,DATE '2026-02-01',905.00),
  ('8fd6b44d-4b09-4d49-9f67-f2f834f132e7'::uuid,DATE '2026-01-30',1485.00),
  ('43cdf7bf-0abd-46ed-a42d-b28918cf70dd'::uuid,DATE '2026-04-03',905.00),
  ('e46401f3-0ffe-4c96-a30e-639c25393250'::uuid,DATE '2026-02-08',75.00),
  ('3cd0f5ab-a45a-4393-9b11-811768a29cf1'::uuid,NULL,65.00),
  ('4f445239-9ce6-4b7a-b7c0-681347f94dfe'::uuid,NULL,45.00),
  ('61cfe843-7dab-4dde-a65c-3863abe1afae'::uuid,NULL,0.00),
  ('82dd5e6f-3293-4c7f-9655-08372646428b'::uuid,DATE '2026-07-26',225.00),
  ('1bd6a1cd-0182-469c-83de-0fe83c6f7a1d'::uuid,DATE '2026-07-26',75.00),
  ('971c54d7-1900-4624-af8c-44c8c0198f2f'::uuid,DATE '2026-05-10',950.00),
  ('a71e7f99-7b39-4efb-bc5c-da744d08352c'::uuid,DATE '2026-05-09',2619.35),
  ('774175c3-7d7f-46f4-91d7-3044247e9921'::uuid,NULL,1919.35),
  ('72913983-51b6-435c-a50d-c58d3b8984fc'::uuid,NULL,1669.35),
  ('449d1078-3ad2-4182-ab22-5531046772d9'::uuid,NULL,-120.00),
  ('2663b1d6-e39e-4f29-85ef-7e07972d40e6'::uuid,NULL,-150.00),
  ('66e71c13-698e-4285-a031-4e414dcf8c21'::uuid,NULL,-260.00),
  ('c58040a8-8cbd-4761-8a46-0fb0bef7bd88'::uuid,NULL,-300.00),
  ('902835c0-01ac-4006-a84f-0a821f002249'::uuid,DATE '2026-01-31',-150.00),
  ('521febce-9df8-4691-8acb-f631bdeb7741'::uuid,DATE '2026-01-31',0.00),
  ('ac9b564b-a4f6-46a7-b44f-3dbbea1a6b95'::uuid,DATE '2026-03-13',1430.00),
  ('b69e8d1a-f4e5-4840-a1e6-a3aa2aad781c'::uuid,DATE '2026-03-27',21580.00),
  ('4ad9a252-00cc-4f47-8dc1-28e578435f07'::uuid,DATE '2025-08-12',1000.00),
  ('36adc873-5dea-4943-b6f6-a382bcd7f312'::uuid,DATE '2025-09-16',1200.00),
  ('f884b81e-c2de-4f66-9e33-51573d243f5d'::uuid,DATE '2026-03-27',21680.00),
  ('918aa4e6-ce00-447c-a9f9-5bf6b881370a'::uuid,DATE '2026-03-27',21780.00),
  ('03e3eee7-d277-4d60-9550-518436f78ffe'::uuid,NULL,164782.58),
  ('15e30041-3f64-4fd1-acf9-1c337c4422c5'::uuid,DATE '2026-03-28',21952.50),
  ('7a5c8710-3e9c-4b7b-a846-20a6b99fbcfd'::uuid,DATE '2026-03-28',23677.50),
  ('b2dabb21-fa75-4192-8eae-f3363c90128f'::uuid,NULL,163057.58),
  ('b7582789-a949-4329-b6d8-e03358200f0f'::uuid,DATE '2026-03-14',11430.00),
  ('09554b40-0851-4c24-bf8a-02a8e6df66ec'::uuid,DATE '2026-03-14',21430.00),
  ('28b12072-d3be-4044-9d79-013d07a9e248'::uuid,DATE '2026-03-28',29427.50),
  ('8cdab6b5-4e28-42e5-815b-08accec47c7c'::uuid,DATE '2026-03-28',35177.50),
  ('ad96b9b5-21e4-4525-b0b6-349412c2efcb'::uuid,DATE '2026-03-30',40927.50),
  ('acf33513-e67f-41d8-bccd-f724b12537be'::uuid,DATE '2026-03-30',147302.50),
  ('b3e6f31e-bed9-4139-af0b-74b0e11f2206'::uuid,NULL,153057.58),
  ('92c69b2c-5733-41ce-9221-b100316bca5c'::uuid,NULL,147307.58),
  ('b15c46a4-baf3-4779-9b23-45badbc7e12e'::uuid,DATE '2026-06-05',162625.08),
  ('df4629d5-0da2-43f7-a846-4378fc227ecc'::uuid,NULL,131985.00),
  ('6bfc1523-00b3-428e-9f69-821047791484'::uuid,DATE '2013-07-20',500.00),
  ('891ba41b-51f5-475e-b7e0-8276d2316bf7'::uuid,DATE '2026-07-23',162645.08),
  ('f360c741-c0b2-4cc4-946f-cd8e77bf925d'::uuid,DATE '2026-07-23',163295.08),
  ('1f4e281b-d6d0-4e18-a80c-bc8b1054adc6'::uuid,DATE '2026-07-23',163640.08),
  ('50d40024-40b3-449c-9852-a5eb4659e038'::uuid,DATE '2026-07-26',165090.08),
  ('0aa4521c-8368-4154-b33f-9c3792af84eb'::uuid,DATE '2026-07-26',165290.08),
  ('29f54e9f-4d14-42e5-a371-de5754e099d5'::uuid,DATE '2026-07-26',164840.08),
  ('becd1ed1-f9b6-45ae-a9a0-f08f61fe5216'::uuid,DATE '2026-07-26',164540.08),
  ('3c2686a5-7bfa-4ec2-87fe-6d6eea3b6c00'::uuid,DATE '2026-07-27',164440.08),
  ('0e8a2a9c-2960-4e6b-ae7e-d2e51265b249'::uuid,DATE '2026-07-23',163940.08),
  ('70f287a2-84f4-4b73-bceb-35e8ac82c0b0'::uuid,DATE '2026-07-27',164785.08),
  ('48932727-1942-4506-ac6d-c02adf0d4260'::uuid,DATE '2026-07-27',164445.08),
  ('0cfafc32-1405-4ab2-a56f-1ad7aa469cd5'::uuid,DATE '2026-07-27',164675.08),
  ('bb3726b4-1d9c-4404-9654-2cb07bc1aba0'::uuid,DATE '2026-07-27',165537.58),
  ('60786fa9-fc26-4292-8db7-1306fe82784f'::uuid,DATE '2026-07-27',165377.58),
  ('a204aef6-15ff-4794-9e4e-f89b995c98e9'::uuid,DATE '2026-07-27',164877.58),
  ('b20609a3-2bf0-490b-9c69-556a0b35d2e0'::uuid,DATE '2026-07-24',165435.08);

  SELECT count(*) INTO v_n FROM stage_a_restore;
  IF v_n <> 87 THEN RAISE EXCEPTION 'ROLLBACK_SCOPE_COUNT %', v_n; END IF;

  FOR r IN SELECT DISTINCT l.tenant_id, l.client_id FROM public.ledger_entries l
             JOIN stage_a_restore s ON s.id = l.id ORDER BY 1,2 LOOP
    PERFORM pg_advisory_xact_lock(public._finance_advisory_lock_key(r.tenant_id,'client_ledger',r.client_id));
  END LOOP;

  PERFORM 1 FROM public.ledger_entries l JOIN stage_a_restore s ON s.id = l.id FOR UPDATE;

  -- no intervening ledger write for these clients
  SELECT count(*) INTO v_n FROM public.ledger_entries l
   WHERE (l.tenant_id,l.client_id) IN (SELECT l2.tenant_id,l2.client_id FROM public.ledger_entries l2 JOIN stage_a_restore s ON s.id=l2.id)
     AND l.id NOT IN (SELECT id FROM stage_a_restore);
  IF v_n <> 0 THEN RAISE EXCEPTION 'ROLLBACK_INTERVENING_LEDGER_ROWS %', v_n; END IF;

  UPDATE public.ledger_entries l
     SET effective_date = s.effective_date, balance_after = s.balance_after
    FROM stage_a_restore s
   WHERE l.id = s.id
     AND (l.effective_date IS DISTINCT FROM s.effective_date OR l.balance_after IS DISTINCT FROM s.balance_after);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE 'ROLLBACK_ROWS_RESTORED %', v_n;

  SELECT count(*) INTO v_n FROM public.ledger_entries WHERE effective_date IS NULL;
  IF v_n <> 28 THEN RAISE EXCEPTION 'ROLLBACK_NULL_COUNT %', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.ledger_entries l JOIN stage_a_restore s ON s.id=l.id
   WHERE l.balance_after <> s.balance_after;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ROLLBACK_BALANCE_MISMATCH %', v_n; END IF;

  SELECT count(*) INTO v_n FROM (
    SELECT cb.balance - sum(l.amount) AS d FROM public.ledger_entries l
      JOIN public.customer_balances cb ON cb.tenant_id=l.tenant_id AND cb.client_id=l.client_id
     WHERE l.id IN (SELECT id FROM stage_a_restore)
     GROUP BY l.tenant_id, l.client_id, cb.balance) x WHERE d <> 0;
  IF v_n <> 0 THEN RAISE EXCEPTION 'ROLLBACK_RECONCILIATION_FAILED %', v_n; END IF;
END $rb$;
