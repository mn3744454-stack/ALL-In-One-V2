-- ============================================================================
-- J5.2 · supabase/tests/database/j5_1_source_checkout.test.sql
--
-- TURN 5A.2.a RETRY — FOUNDATION ONLY.
-- HARNESS AND 10 ACTIVE TRANSACTION-LOCAL FIXTURE ROWS AUTHORED.
-- RESERVED MISSING SOURCE ID CONTRACT AUTHORED.
-- T1 EXECUTABLE RPC SCENARIOS AUTHORED: 0/54.
-- TURN 5A.2 EXECUTABLE RPC SCENARIOS AUTHORED: 0/40.
-- NOT EXECUTED.
-- NOT PASSED.
-- TURN 5A.2.b REQUIRED.
--
-- Runner contract (File 17):
--   psql -v test_actor_id=98439fe8-6881-4e9e-8ff6-18aca0ce4470 \
--        -v test_tenant_id=145f2128-83ca-4ba8-85b5-8ade245c5530 \
--        -f supabase/tests/database/j5_1_source_checkout.test.sql
--
-- Contract references:
--   docs/aml_1_b_1/stage_j5_1/preflight/17_authenticated_jwt_convention.md
--   docs/aml_1_b_1/stage_j5_2/preflight/21_turn_5a_1_live_test_contracts.md
--   docs/aml_1_b_1/stage_j5_2/preflight/22_turn_5a_fixture_uuid_map.md
--   docs/aml_1_b_1/stage_j5_2/preflight/23_turn_5a_error_token_matrix.md
--   docs/aml_1_b_1/stage_j5_2/preflight/24_turn_5a_2_t1_lab_foundation_authoring.md
--
-- Scope of this file (Turn 5A.2.a Retry):
--   * Single outer BEGIN … ROLLBACK.
--   * Zero invocations of public.create_source_checkout_invoice.
--   * Zero RPC scenario rows, zero capture rows, zero result rows.
--   * Ten transaction-local Fixture rows (1 Client + 1 Lab Horse + 8 Lab Samples).
--   * Reserved missing-Source-ID absence contract.
--   * Active Idempotency-key census (38 active + 1 retired).
--   * No production DDL, no ACL/RLS change, no persistent row mutation.
--   * No role switch to authenticated in this turn.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Top-level psql-variable materialization (File 17 §2).
--    psql interpolates :'…' ONLY at this outer level, BEFORE any DO block
--    parses. PL/pgSQL blocks read from pg_temp.test_context.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE test_context (
  actor_id                  uuid        NOT NULL,
  primary_tenant_id         uuid        NOT NULL,
  secondary_tenant_id       uuid        NOT NULL,
  original_user             name        NOT NULL,
  payment_account_id        uuid        NOT NULL,
  tenant_tax_rate           numeric     NOT NULL,
  tenant_prices_include_tax boolean     NOT NULL,
  tenant_currency           text        NOT NULL,
  missing_lab_sample_id     uuid        NOT NULL,
  started_at                timestamptz NOT NULL DEFAULT now()
) ON COMMIT DROP;

INSERT INTO test_context (
  actor_id, primary_tenant_id, secondary_tenant_id, original_user,
  payment_account_id, tenant_tax_rate, tenant_prices_include_tax,
  tenant_currency, missing_lab_sample_id
)
SELECT
  :'test_actor_id'::uuid,
  :'test_tenant_id'::uuid,
  ( -- Runtime-resolved Secondary Tenant: ANY tenant where Fixed Actor has no
    -- active membership. Used only as context (no Fixture ever writes there).
    SELECT t.id
      FROM public.tenants t
     WHERE t.id <> :'test_tenant_id'::uuid
       AND NOT EXISTS (
             SELECT 1 FROM public.tenant_members m
              WHERE m.user_id = :'test_actor_id'::uuid
                AND m.tenant_id = t.id
                AND m.is_active
           )
     ORDER BY t.created_at
     LIMIT 1
  ),
  current_user,
  ( SELECT pa.id FROM public.payment_accounts pa
     WHERE pa.tenant_id = :'test_tenant_id'::uuid
       AND pa.owner_type = 'tenant'::public.payment_owner_type
       AND pa.is_active
     ORDER BY pa.created_at LIMIT 1 ),
  ( SELECT t.default_tax_rate       FROM public.tenants t WHERE t.id = :'test_tenant_id'::uuid ),
  ( SELECT t.prices_tax_inclusive   FROM public.tenants t WHERE t.id = :'test_tenant_id'::uuid ),
  ( SELECT t.currency               FROM public.tenants t WHERE t.id = :'test_tenant_id'::uuid ),
  'deadbeef-0000-4000-8000-000000000027'::uuid
;

-- Exactly one context row.
DO $$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_temp.test_context;
  IF n <> 1 THEN RAISE EXCEPTION 'J5_2A_CONTEXT_ROW_COUNT_%',n; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Fixed-identity + preconditions (File 17 §1; §13 of this turn).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c    pg_temp.test_context;
  v_pa_count int;
  v_member   record;
  v_sec_mem  int;
  v_trg_enabled "char";
BEGIN
  SELECT * INTO c FROM pg_temp.test_context;

  IF c.actor_id <> '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid
     OR c.primary_tenant_id <> '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid THEN
    RAISE EXCEPTION 'J5_2A_FIXED_IDENTITY_MISMATCH';
  END IF;

  IF c.secondary_tenant_id IS NULL
     OR c.secondary_tenant_id = c.primary_tenant_id THEN
    RAISE EXCEPTION 'J5_2A_SECONDARY_TENANT_UNRESOLVED';
  END IF;

  SELECT role, is_active INTO v_member
    FROM public.tenant_members
   WHERE user_id = c.actor_id AND tenant_id = c.primary_tenant_id;
  IF NOT FOUND OR NOT v_member.is_active OR v_member.role <> 'owner' THEN
    RAISE EXCEPTION 'J5_2A_ACTOR_NOT_ACTIVE_OWNER';
  END IF;

  SELECT count(*) INTO v_sec_mem
    FROM public.tenant_members
   WHERE user_id = c.actor_id AND tenant_id = c.secondary_tenant_id AND is_active;
  IF v_sec_mem <> 0 THEN
    RAISE EXCEPTION 'J5_2A_ACTOR_UNEXPECTEDLY_IN_SECONDARY';
  END IF;

  SELECT count(*) INTO v_pa_count
    FROM public.payment_accounts
   WHERE tenant_id = c.primary_tenant_id
     AND owner_type = 'tenant'::public.payment_owner_type
     AND is_active;
  IF v_pa_count <> 1 THEN
    RAISE EXCEPTION 'J5_2A_ROUTING_ACCOUNT_INVARIANT_%', v_pa_count;
  END IF;
  IF c.payment_account_id IS NULL THEN
    RAISE EXCEPTION 'J5_2A_PAYMENT_ACCOUNT_UNCAPTURED';
  END IF;

  IF c.tenant_tax_rate IS NULL
     OR c.tenant_prices_include_tax IS NULL
     OR c.tenant_currency IS NULL THEN
    RAISE EXCEPTION 'J5_2A_TENANT_FINANCE_CAPTURE_INCOMPLETE';
  END IF;

  IF c.missing_lab_sample_id <> 'deadbeef-0000-4000-8000-000000000027'::uuid THEN
    RAISE EXCEPTION 'J5_2A_MISSING_ID_MISMATCH';
  END IF;

  IF c.original_user = 'authenticated' THEN
    RAISE EXCEPTION 'J5_2A_UNEXPECTED_AUTHENTICATED_SESSION';
  END IF;

  SELECT tgenabled INTO v_trg_enabled
    FROM pg_trigger
   WHERE tgname = 'trg_tenants_provision_payment_account';
  IF v_trg_enabled IS NULL OR v_trg_enabled = 'D' THEN
    RAISE EXCEPTION 'J5_2A_PROVISION_TRIGGER_NOT_ENABLED';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Temp harness (File 17 §2; this turn §11).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE test_scenario_inputs (
  scenario_id       text PRIMARY KEY,
  tenant_id         uuid,
  idempotency_key   uuid,
  payload           jsonb,
  expected_sqlstate text,
  expected_token    text,
  expected_success  boolean,
  chain_id          text,
  execution_order   integer,
  created_at        timestamptz NOT NULL DEFAULT now()
) ON COMMIT DROP;

CREATE TEMP TABLE test_rpc_capture (
  scenario_id     text,
  actual_sqlstate text,
  actual_message  text,
  result_json     jsonb,
  call_completed  boolean,
  captured_at     timestamptz NOT NULL DEFAULT now()
) ON COMMIT DROP;

CREATE TEMP TABLE test_scenario_results (
  scenario_id       text PRIMARY KEY,
  category          text,
  chain_id          text,
  expected_sqlstate text,
  expected_token    text,
  actual_sqlstate   text,
  actual_message    text,
  actual_status     text,
  passed            boolean,
  assertion_count   integer,
  result_json       jsonb,
  notes             text,
  recorded_at       timestamptz NOT NULL DEFAULT now()
) ON COMMIT DROP;

CREATE TEMP TABLE test_baseline (
  scope        text NOT NULL,
  row_count    bigint,
  numeric_sum  numeric,
  ordered_hash text,
  captured_at  timestamptz NOT NULL DEFAULT now(),
  notes        text
) ON COMMIT DROP;

CREATE TEMP TABLE test_active_idem_keys (
  scenario_id      text PRIMARY KEY,
  idempotency_key  uuid NOT NULL,
  chain_id         text,
  shared_key_group text,
  executable       boolean NOT NULL,
  active           boolean NOT NULL,
  notes            text
) ON COMMIT DROP;

CREATE TEMP TABLE test_reserved_keys (
  scenario_id     text PRIMARY KEY,
  idempotency_key uuid NOT NULL,
  executable      boolean NOT NULL,
  active          boolean NOT NULL,
  reusable        boolean NOT NULL,
  notes           text
) ON COMMIT DROP;

-- ---------------------------------------------------------------------------
-- 3. Temp ACLs (File 17 §2; this turn §12). Privileged session grants only
--    the minimum surface required by later authenticated sub-turns.
-- ---------------------------------------------------------------------------
GRANT SELECT ON pg_temp.test_context         TO authenticated;
GRANT SELECT ON pg_temp.test_scenario_inputs TO authenticated;
GRANT INSERT ON pg_temp.test_rpc_capture     TO authenticated;

-- Verify Temp ACLs did NOT leak to authenticated on protected structures.
DO $$
DECLARE
  v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
    FROM information_schema.role_table_grants g
    JOIN pg_class c ON c.relname = g.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE g.grantee = 'authenticated'
     AND n.nspname LIKE 'pg_temp%'
     AND g.table_name IN ('test_baseline','test_scenario_results',
                          'test_active_idem_keys','test_reserved_keys');
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'J5_2A_UNEXPECTED_AUTHENTICATED_ACL_%', v_bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Protected pre-Fixture baseline snapshots (this turn §14).
-- ---------------------------------------------------------------------------
INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'invoices',
       count(*),
       coalesce(sum(total_amount),0),
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.invoices;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'invoice_items',
       count(*),
       coalesce(sum(total_price),0),
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.invoice_items;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'ledger_entries',
       count(*),
       coalesce(sum(amount),0),
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.ledger_entries;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'billing_links',
       count(*),
       0::numeric,
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.billing_links;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'customer_balances',
       count(*),
       coalesce(sum(balance),0),
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.customer_balances;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'finance_request_idempotency',
       count(*),
       0::numeric,
       md5(coalesce(string_agg(idempotency_key::text, ',' ORDER BY idempotency_key::text), '')),
       'pre-fixture'
  FROM public.finance_request_idempotency;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'payment_accounts',
       count(*),
       0::numeric,
       md5(coalesce(string_agg(id::text, ',' ORDER BY id::text), '')),
       'pre-fixture'
  FROM public.payment_accounts;

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'actor_membership_primary',
       count(*),
       0::numeric,
       md5(coalesce(string_agg(role||'|'||is_active::text, ',' ORDER BY role), '')),
       'pre-fixture'
  FROM public.tenant_members
 WHERE user_id  = (SELECT actor_id FROM pg_temp.test_context)
   AND tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);

INSERT INTO test_baseline (scope, row_count, numeric_sum, ordered_hash, notes)
SELECT 'primary_tenant_finance_config',
       1,
       coalesce(default_tax_rate,0),
       md5(coalesce(currency,'')||'|'||prices_tax_inclusive::text||'|'||coalesce(default_tax_rate::text,'')),
       'pre-fixture'
  FROM public.tenants
 WHERE id = (SELECT primary_tenant_id FROM pg_temp.test_context);

-- ---------------------------------------------------------------------------
-- 5. Active Fixture UUID collision guards (this turn §17).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_uuid uuid;
  v_hit  int;
  active_uuids CONSTANT uuid[] := ARRAY[
    'aaaa1111-0000-4000-8000-000000000001',
    'cccc3333-0000-4000-8000-000000000001',
    'dddd4444-0000-4000-8000-000000000001',
    'dddd4444-0000-4000-8000-000000000002',
    'dddd4444-0000-4000-8000-000000000003',
    'dddd4444-0000-4000-8000-000000000004',
    'dddd4444-0000-4000-8000-000000000005',
    'dddd4444-0000-4000-8000-000000000007',
    'dddd4444-0000-4000-8000-00000000000b',
    'dddd4444-0000-4000-8000-00000000000e'
  ]::uuid[];
BEGIN
  IF array_length(active_uuids,1) <> 10 THEN
    RAISE EXCEPTION 'J5_2A_ACTIVE_UUID_COUNT_%', array_length(active_uuids,1);
  END IF;

  -- CLIENT_REGISTERED
  v_uuid := active_uuids[1];
  SELECT count(*) INTO v_hit FROM public.clients WHERE id = v_uuid;
  IF v_hit <> 0 THEN RAISE EXCEPTION 'FIXTURE_UUID_COLLISION: CLIENT_REGISTERED'; END IF;

  -- LH_LEGACY_CLIENT
  v_uuid := active_uuids[2];
  SELECT count(*) INTO v_hit FROM public.lab_horses WHERE id = v_uuid;
  IF v_hit <> 0 THEN RAISE EXCEPTION 'FIXTURE_UUID_COLLISION: LH_LEGACY_CLIENT'; END IF;

  -- 8 Lab Samples (single scan)
  SELECT count(*) INTO v_hit FROM public.lab_samples
   WHERE id = ANY (active_uuids[3:10]);
  IF v_hit <> 0 THEN RAISE EXCEPTION 'FIXTURE_UUID_COLLISION: LAB_SAMPLES_ANY_OF_8'; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Reserved missing-Source-ID absence guard (this turn §18).
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_hit int;
BEGIN
  SELECT count(*) INTO v_hit FROM public.lab_samples
   WHERE id = (SELECT missing_lab_sample_id FROM pg_temp.test_context);
  IF v_hit <> 0 THEN
    RAISE EXCEPTION 'RESERVED_MISSING_ID_COLLISION: MISSING_LAB_SAMPLE_ID';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Active Idempotency-key census (this turn §19).
--    38 active distinct keys covering 40 executable Turn-5A.2 calls
--    (C1 shares one key across 3 calls; standalone P-02 = 1; C2 uses 4).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  n integer;
  suffix text;
BEGIN
  -- Category-A derived keys: N ∈ 1..31 and 33, suffix = N + 3.
  FOR n IN 1..31 LOOP
    suffix := lpad((n + 3)::text, 12, '0');
    INSERT INTO pg_temp.test_active_idem_keys (
      scenario_id, idempotency_key, chain_id, shared_key_group,
      executable, active, notes
    ) VALUES (
      'T1-A-'||lpad(n::text,2,'0'),
      ('11111111-1111-4111-8111-'||suffix)::uuid,
      NULL, NULL, true, true, 'Category A derived (N+3)'
    );
  END LOOP;

  -- A-33 (A-32 retired; skip)
  INSERT INTO pg_temp.test_active_idem_keys VALUES (
    'T1-A-33',
    ('11111111-1111-4111-8111-'||lpad('36',12,'0'))::uuid,
    NULL, NULL, true, true, 'Category A derived (N+3), skips A-32'
  );

  -- C1 shared key across P-01, P-06, A-40 (replay/idempotency chain).
  INSERT INTO pg_temp.test_active_idem_keys VALUES
    ('T1-P-01','11111111-1111-4111-8111-000000000001','C1','C1_SHARED_REPLAY',true,true,'Chain C1 shared key'),
    ('T1-P-06','11111111-1111-4111-8111-000000000001','C1','C1_SHARED_REPLAY',true,true,'Chain C1 shared key'),
    ('T1-A-40','11111111-1111-4111-8111-000000000001','C1','C1_SHARED_REPLAY',true,true,'Chain C1 shared key');

  -- Standalone Lab Final (T1-P-02).
  INSERT INTO pg_temp.test_active_idem_keys VALUES
    ('T1-P-02','22222222-2222-4222-8222-000000000001',NULL,NULL,true,true,'Standalone Lab Final');

  -- Chain C2 (coexistence + duplicate-active conflicts) — 4 distinct keys.
  INSERT INTO pg_temp.test_active_idem_keys VALUES
    ('T1-P-03','22222222-2222-4222-8222-000000000002','C2',NULL,true,true,'C2 Deposit'),
    ('T1-P-04','22222222-2222-4222-8222-000000000003','C2',NULL,true,true,'C2 Final'),
    ('T1-A-34','44444444-4444-4444-8444-000000000001','C2',NULL,true,true,'C2 Duplicate Deposit'),
    ('T1-A-42','44444444-4444-4444-8444-000000000002','C2',NULL,true,true,'C2 Duplicate Final');

  -- Retired key registry: T1-A-32 (unreachable per Turn 5A.1R5).
  INSERT INTO pg_temp.test_reserved_keys VALUES (
    'T1-A-32',
    '11111111-1111-4111-8111-000000000035',
    false, false, false,
    'FIN_SOURCE_CLIENT_CROSS_TENANT branch structurally unreachable'
  );
END $$;

-- Census invariants.
DO $$
DECLARE
  v_call_count      int;
  v_distinct_active int;
  v_retired         int;
BEGIN
  SELECT count(*), count(DISTINCT idempotency_key)
    INTO v_call_count, v_distinct_active
    FROM pg_temp.test_active_idem_keys;
  IF v_call_count <> 40 THEN
    RAISE EXCEPTION 'J5_2A_ACTIVE_KEY_CALL_COUNT_%', v_call_count;
  END IF;
  IF v_distinct_active <> 38 THEN
    RAISE EXCEPTION 'J5_2A_ACTIVE_KEY_DISTINCT_%', v_distinct_active;
  END IF;

  SELECT count(*) INTO v_retired FROM pg_temp.test_reserved_keys;
  IF v_retired <> 1 THEN
    RAISE EXCEPTION 'J5_2A_RETIRED_KEY_COUNT_%', v_retired;
  END IF;

  -- Retired A-32 key must NOT appear in the active census.
  IF EXISTS (
    SELECT 1 FROM pg_temp.test_active_idem_keys
     WHERE idempotency_key = '11111111-1111-4111-8111-000000000035'::uuid
  ) THEN
    RAISE EXCEPTION 'J5_2A_RETIRED_KEY_LEAKED_INTO_ACTIVE';
  END IF;
END $$;

-- Live-DB collision: no active key may already exist for Primary Tenant
-- under operation create_source_checkout_invoice.
DO $$
DECLARE v_hit int;
BEGIN
  SELECT count(*) INTO v_hit
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k
      ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation = 'create_source_checkout_invoice';
  IF v_hit <> 0 THEN
    RAISE EXCEPTION 'ACTIVE_IDEM_KEY_DB_COLLISION_%', v_hit;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Fixture inserts (this turn §15, §20). Exactly 10 rows.
-- ---------------------------------------------------------------------------

-- 8.1 CLIENT_REGISTERED (Primary Tenant, minimal legal shape).
INSERT INTO public.clients (id, tenant_id, name, type, status)
VALUES (
  'aaaa1111-0000-4000-8000-000000000001',
  (SELECT primary_tenant_id FROM pg_temp.test_context),
  'J5.2 Test Client — Registered',
  'individual',
  'active'
);

-- 8.2 LH_LEGACY_CLIENT (Primary Tenant, bound to CLIENT_REGISTERED).
INSERT INTO public.lab_horses (
  id, tenant_id, name, client_id, source, created_by
)
VALUES (
  'cccc3333-0000-4000-8000-000000000001',
  (SELECT primary_tenant_id FROM pg_temp.test_context),
  'J5.2 Test Lab Horse — Legacy Client',
  'aaaa1111-0000-4000-8000-000000000001',
  'manual',
  (SELECT actor_id FROM pg_temp.test_context)
);

-- 8.3 Lab Samples — 8 rows.
-- Status mix required by §15.4: draft=3, accessioned=2, completed=1,
-- processing=1, cancelled=1. numbering_deferred=true keeps the sequential
-- daily-number trigger from causing collisions or unintended state.
-- horse_name is required by validate_lab_sample() whenever horse_id IS NULL
-- (walk-in and lab-only Sources). All 10 rows carry a synthetic horse_name.
INSERT INTO public.lab_samples (
  id, tenant_id, client_id, lab_horse_id, horse_name,
  status, created_by, numbering_deferred
)
VALUES
  ('dddd4444-0000-4000-8000-000000000001',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'draft',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-000000000002',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'accessioned',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-000000000003',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'completed',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-000000000004',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'processing',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-000000000005',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'cancelled',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  -- LS_WALKIN_LONG_NAME: walk-in Source, client_id IS NULL (no cross-Tenant
  -- relationship). Long-name boundary lives in a future RPC payload, not here.
  ('dddd4444-0000-4000-8000-000000000007',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   NULL,
   NULL,
   'J5.2 Walk-in Horse',
   'draft',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-00000000000b',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'accessioned',
   (SELECT actor_id FROM pg_temp.test_context),
   true),
  ('dddd4444-0000-4000-8000-00000000000e',
   (SELECT primary_tenant_id FROM pg_temp.test_context),
   'aaaa1111-0000-4000-8000-000000000001',
   'cccc3333-0000-4000-8000-000000000001',
   'J5.2 Fixture Horse',
   'draft',
   (SELECT actor_id FROM pg_temp.test_context),
   true);

-- ---------------------------------------------------------------------------
-- 9. Fixture integrity assertions (this turn §21).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_client_n  int;
  v_lh_n      int;
  v_ls_n      int;
  v_draft     int;
  v_accession int;
  v_completed int;
  v_processing int;
  v_cancelled int;
  v_prim uuid := (SELECT primary_tenant_id FROM pg_temp.test_context);
  v_sec  uuid := (SELECT secondary_tenant_id FROM pg_temp.test_context);
BEGIN
  SELECT count(*) INTO v_client_n
    FROM public.clients WHERE id = 'aaaa1111-0000-4000-8000-000000000001';
  IF v_client_n <> 1 THEN RAISE EXCEPTION 'J5_2A_CLIENT_FIXTURE_MISSING'; END IF;

  SELECT count(*) INTO v_lh_n
    FROM public.lab_horses WHERE id = 'cccc3333-0000-4000-8000-000000000001';
  IF v_lh_n <> 1 THEN RAISE EXCEPTION 'J5_2A_LAB_HORSE_FIXTURE_MISSING'; END IF;

  SELECT count(*) INTO v_ls_n
    FROM public.lab_samples
   WHERE id = ANY (ARRAY[
     'dddd4444-0000-4000-8000-000000000001',
     'dddd4444-0000-4000-8000-000000000002',
     'dddd4444-0000-4000-8000-000000000003',
     'dddd4444-0000-4000-8000-000000000004',
     'dddd4444-0000-4000-8000-000000000005',
     'dddd4444-0000-4000-8000-000000000007',
     'dddd4444-0000-4000-8000-00000000000b',
     'dddd4444-0000-4000-8000-00000000000e'
   ]::uuid[]);
  IF v_ls_n <> 8 THEN RAISE EXCEPTION 'J5_2A_LAB_SAMPLE_FIXTURE_COUNT_%', v_ls_n; END IF;

  -- Status distribution
  SELECT
    count(*) FILTER (WHERE status='draft'),
    count(*) FILTER (WHERE status='accessioned'),
    count(*) FILTER (WHERE status='completed'),
    count(*) FILTER (WHERE status='processing'),
    count(*) FILTER (WHERE status='cancelled')
  INTO v_draft, v_accession, v_completed, v_processing, v_cancelled
  FROM public.lab_samples
   WHERE id = ANY (ARRAY[
     'dddd4444-0000-4000-8000-000000000001',
     'dddd4444-0000-4000-8000-000000000002',
     'dddd4444-0000-4000-8000-000000000003',
     'dddd4444-0000-4000-8000-000000000004',
     'dddd4444-0000-4000-8000-000000000005',
     'dddd4444-0000-4000-8000-000000000007',
     'dddd4444-0000-4000-8000-00000000000b',
     'dddd4444-0000-4000-8000-00000000000e'
   ]::uuid[]);
  IF v_draft<>3 OR v_accession<>2 OR v_completed<>1 OR v_processing<>1 OR v_cancelled<>1 THEN
    RAISE EXCEPTION 'J5_2A_STATUS_DIST_%_%_%_%_%',
      v_draft,v_accession,v_completed,v_processing,v_cancelled;
  END IF;

  -- Tenant scoping: no Fixture in Secondary Tenant.
  IF EXISTS (SELECT 1 FROM public.clients
              WHERE id = 'aaaa1111-0000-4000-8000-000000000001'
                AND tenant_id <> v_prim)
     OR EXISTS (SELECT 1 FROM public.lab_horses
                 WHERE id = 'cccc3333-0000-4000-8000-000000000001'
                   AND tenant_id <> v_prim)
     OR EXISTS (SELECT 1 FROM public.lab_samples
                 WHERE id IN (
                   'dddd4444-0000-4000-8000-000000000001',
                   'dddd4444-0000-4000-8000-000000000002',
                   'dddd4444-0000-4000-8000-000000000003',
                   'dddd4444-0000-4000-8000-000000000004',
                   'dddd4444-0000-4000-8000-000000000005',
                   'dddd4444-0000-4000-8000-000000000007',
                   'dddd4444-0000-4000-8000-00000000000b',
                   'dddd4444-0000-4000-8000-00000000000e')
                   AND tenant_id <> v_prim) THEN
    RAISE EXCEPTION 'J5_2A_FIXTURE_TENANT_LEAK';
  END IF;

  -- No Fixture uses the retired T1-A-32 UUID nor the reserved missing UUID.
  IF EXISTS (SELECT 1 FROM public.lab_samples
              WHERE id = 'deadbeef-0000-4000-8000-000000000027'::uuid)
     OR EXISTS (SELECT 1 FROM public.clients
                 WHERE id = '11111111-1111-4111-8111-000000000035'::uuid) THEN
    RAISE EXCEPTION 'J5_2A_RETIRED_OR_MISSING_UUID_REUSED';
  END IF;

  -- Secondary Tenant carries zero Fixture rows.
  IF EXISTS (SELECT 1 FROM public.clients WHERE tenant_id = v_sec
              AND id = 'aaaa1111-0000-4000-8000-000000000001')
     OR EXISTS (SELECT 1 FROM public.lab_horses WHERE tenant_id = v_sec
                 AND id = 'cccc3333-0000-4000-8000-000000000001')
     OR EXISTS (SELECT 1 FROM public.lab_samples WHERE tenant_id = v_sec
                 AND id::text LIKE 'dddd4444-%') THEN
    RAISE EXCEPTION 'J5_2A_SECONDARY_TENANT_FIXTURE_LEAK';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10. Empty Scenario-state assertions (this turn §22).
-- ---------------------------------------------------------------------------
DO $$
DECLARE i int; c int; r int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs;
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture;
  SELECT count(*) INTO r FROM pg_temp.test_scenario_results;
  IF i<>0 OR c<>0 OR r<>0 THEN
    RAISE EXCEPTION 'J5_2A_SCENARIO_STATE_NOT_EMPTY_%_%_%', i,c,r;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 11. Pre-rollback preservation assertions (this turn §23).
--     Compare live protected tables against pre-Fixture baseline. Because
--     this turn inserts zero financial rows, every scope MUST be byte-equal.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  b record;
  cur_count bigint;
  cur_sum   numeric;
  cur_hash  text;
BEGIN
  FOR b IN SELECT scope FROM pg_temp.test_baseline LOOP
    IF b.scope = 'invoices' THEN
      SELECT count(*), coalesce(sum(total_amount),0),
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.invoices;
    ELSIF b.scope = 'invoice_items' THEN
      SELECT count(*), coalesce(sum(total_price),0),
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.invoice_items;
    ELSIF b.scope = 'ledger_entries' THEN
      SELECT count(*), coalesce(sum(amount),0),
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.ledger_entries;
    ELSIF b.scope = 'billing_links' THEN
      SELECT count(*), 0::numeric,
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.billing_links;
    ELSIF b.scope = 'customer_balances' THEN
      SELECT count(*), coalesce(sum(balance),0),
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.customer_balances;
    ELSIF b.scope = 'finance_request_idempotency' THEN
      SELECT count(*), 0::numeric,
             md5(coalesce(string_agg(idempotency_key::text,',' ORDER BY idempotency_key::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.finance_request_idempotency;
    ELSIF b.scope = 'payment_accounts' THEN
      SELECT count(*), 0::numeric,
             md5(coalesce(string_agg(id::text,',' ORDER BY id::text),''))
        INTO cur_count, cur_sum, cur_hash FROM public.payment_accounts;
    ELSIF b.scope = 'actor_membership_primary' THEN
      SELECT count(*), 0::numeric,
             md5(coalesce(string_agg(role||'|'||is_active::text,',' ORDER BY role),''))
        INTO cur_count, cur_sum, cur_hash FROM public.tenant_members
       WHERE user_id  = (SELECT actor_id FROM pg_temp.test_context)
         AND tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
    ELSIF b.scope = 'primary_tenant_finance_config' THEN
      SELECT 1::bigint, coalesce(default_tax_rate,0),
             md5(coalesce(currency,'')||'|'||prices_tax_inclusive::text||'|'||coalesce(default_tax_rate::text,''))
        INTO cur_count, cur_sum, cur_hash FROM public.tenants
       WHERE id = (SELECT primary_tenant_id FROM pg_temp.test_context);
    ELSE
      CONTINUE;
    END IF;

    IF (cur_count, cur_sum, cur_hash) IS DISTINCT FROM (
         SELECT (row_count, numeric_sum, ordered_hash)
           FROM pg_temp.test_baseline WHERE scope = b.scope
       ) THEN
      RAISE EXCEPTION 'J5_2A_BASELINE_DRIFT_% (protected table mutated)', b.scope;
    END IF;
  END LOOP;

  -- Role has NOT switched to authenticated.
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'J5_2A_ROLE_LEAK_%_expected_%',
      current_user, (SELECT original_user FROM pg_temp.test_context);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. TURN 5A.2.b — Temp-Schema Role-Switch Runtime Gate (§7).
--
-- Purpose:
--   Prove that the current three transaction-local pg_temp grants
--     (SELECT test_context, SELECT test_scenario_inputs,
--      INSERT test_rpc_capture)
--   are sufficient for a genuine `SET LOCAL ROLE authenticated` block to
--   read fixed identity from pg_temp.test_context, read a Gate input from
--   pg_temp.test_scenario_inputs, and insert one marker row into
--   pg_temp.test_rpc_capture — without any Source Checkout RPC invocation.
--
-- Not a T1 Scenario. Does not count toward the 32 Turn-5A.2.b RPC calls.
-- Uses a dedicated non-business Gate ID and no active Idempotency key.
-- ---------------------------------------------------------------------------
SAVEPOINT sp_temp_role_gate;

-- Privileged: seed one Gate input row (no production Source, no active key).
INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success,
  chain_id, execution_order
) VALUES (
  '__TEMP_ROLE_GATE__',
  (SELECT primary_tenant_id FROM pg_temp.test_context),
  NULL,
  jsonb_build_object('gate', 'temp_role_switch'),
  NULL, NULL, NULL, NULL, 0
);

-- Bind transaction-local JWT claims for the Fixed Actor (File 17 §2).
SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object(
    'sub',  (SELECT actor_id FROM pg_temp.test_context),
    'role', 'authenticated'
  )::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_actor    uuid;
  v_tenant   uuid;
  v_gate_in  int;
BEGIN
  -- Read fixed identity from pg_temp via the granted SELECT.
  SELECT actor_id, primary_tenant_id
    INTO v_actor, v_tenant
    FROM pg_temp.test_context;

  IF v_actor  <> '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid
  OR v_tenant <> '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid THEN
    RAISE EXCEPTION 'J5_2B_GATE_CONTEXT_MISMATCH';
  END IF;

  -- Read the Gate input row via the granted SELECT.
  SELECT count(*) INTO v_gate_in
    FROM pg_temp.test_scenario_inputs
   WHERE scenario_id = '__TEMP_ROLE_GATE__';
  IF v_gate_in <> 1 THEN
    RAISE EXCEPTION 'J5_2B_GATE_INPUT_UNREADABLE_%', v_gate_in;
  END IF;

  -- Insert marker Capture row via the granted INSERT.
  INSERT INTO pg_temp.test_rpc_capture (
    scenario_id, actual_sqlstate, actual_message,
    result_json, call_completed
  ) VALUES (
    '__TEMP_ROLE_GATE__',
    NULL,
    'temp-role-switch-gate-marker',
    NULL,
    true
  );
END $$;

RESET ROLE;

-- Privileged post-gate assertions.
DO $$
DECLARE
  v_cap    int;
  v_actor  uuid;
  v_tenant uuid;
BEGIN
  SELECT count(*) INTO v_cap
    FROM pg_temp.test_rpc_capture
   WHERE scenario_id = '__TEMP_ROLE_GATE__';
  IF v_cap <> 1 THEN
    RAISE EXCEPTION 'J5_2B_GATE_CAPTURE_MISSING_%', v_cap;
  END IF;

  SELECT actor_id, primary_tenant_id
    INTO v_actor, v_tenant
    FROM pg_temp.test_context;
  IF v_actor  <> '98439fe8-6881-4e9e-8ff6-18aca0ce4470'::uuid
  OR v_tenant <> '145f2128-83ca-4ba8-85b5-8ade245c5530'::uuid THEN
    RAISE EXCEPTION 'J5_2B_GATE_POST_CONTEXT_DRIFT';
  END IF;

  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'J5_2B_GATE_ROLE_NOT_RESET_%_expected_%',
      current_user, (SELECT original_user FROM pg_temp.test_context);
  END IF;
END $$;

ROLLBACK TO SAVEPOINT sp_temp_role_gate;
RELEASE SAVEPOINT sp_temp_role_gate;

-- Post-rollback: Gate input, Gate Capture, and any Scenario Result must be
-- gone. No business row must have changed.
DO $$
DECLARE
  v_in   int;
  v_cap  int;
  v_res  int;
BEGIN
  SELECT count(*) INTO v_in
    FROM pg_temp.test_scenario_inputs
   WHERE scenario_id = '__TEMP_ROLE_GATE__';
  SELECT count(*) INTO v_cap
    FROM pg_temp.test_rpc_capture
   WHERE scenario_id = '__TEMP_ROLE_GATE__';
  SELECT count(*) INTO v_res
    FROM pg_temp.test_scenario_results
   WHERE scenario_id = '__TEMP_ROLE_GATE__';

  IF v_in <> 0 OR v_cap <> 0 OR v_res <> 0 THEN
    RAISE EXCEPTION 'J5_2B_GATE_RESIDUE_in=%_cap=%_res=%', v_in, v_cap, v_res;
  END IF;

  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'J5_2B_GATE_POST_ROLLBACK_ROLE_LEAK';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13. TURN 5A.2.b — 32 Independent Validation Scenarios (§8, §12).
--
-- STATUS: NOT AUTHORED IN THIS FILE.
--
-- Turn 5A.2.b required 32 explicit independent Source Checkout RPC
-- invocation paths (T1-A-01..T1-A-31, T1-A-33). Faithful authoring requires
-- ~2000 lines of highly-structured, live-catalog-verified SQL that must
-- exactly match the installed create_source_checkout_invoice signature and
-- the File-23 error-token matrix. Producing that body without full live
-- verification would risk silent contract drift, which the Turn-5A.2.b
-- contract §5 and §18 explicitly forbid.
--
-- Per §22.A this file therefore reports:
--   TURN 5A.2.b PARTIALLY AUTHORED — EXACT SCENARIO OR ROLE-GATE GAP REMAINS
--
-- The Temp-Schema Role-Switch Runtime Gate above IS authored and statically
-- reviewed. It is the first hard-fail runtime gate for the qualified runner
-- (File 17 §3) and unblocks Turn 5A.2.b resumption once the 32 explicit
-- Scenario bodies are authored in a follow-up sub-turn.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 14. Terminate. Zero invocations of public.create_source_checkout_invoice
--     occurred in this file. Full ROLLBACK discards all 10 Fixture rows and
--     all Gate-related Temp state.
-- ---------------------------------------------------------------------------
ROLLBACK;

