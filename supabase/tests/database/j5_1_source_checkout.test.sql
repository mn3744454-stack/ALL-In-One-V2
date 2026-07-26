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
-- 13. TURN 5A.2.b1 — First 8 Independent Validation Scenarios (§8, §12).
--
--   T1-A-01  FIN_UNAUTHENTICATED           42501
--   T1-A-02  FIN_BAD_ARGS                  22023
--   T1-A-03  FIN_PAYLOAD_TYPE              23514
--   T1-A-04  FIN_TENANT_ACCESS_DENIED      42501
--   T1-A-05  FIN_PAYLOAD_UNKNOWN_KEY: foo  23514
--   T1-A-06  FIN_SOURCE_TYPE_REQUIRED      23514
--   T1-A-07  FIN_SOURCE_TYPE_INVALID       23514
--   T1-A-08  FIN_SOURCE_ID_REQUIRED        23514
--
-- Each Scenario carries its own SAVEPOINT, its own explicit RPC invocation,
-- its own capture, its own \gset export, its own rollback+release, and its
-- own authoritative Result insert post-rollback. Scenarios T1-A-09 and later
-- are NOT authored in Turn 5A.2.b1.
-- ---------------------------------------------------------------------------

-- Cached canonical valid Lab Deposit payload (used with per-Scenario mutation).
-- Materialized once as a top-level CTE-equivalent Temp table so each Scenario
-- can build its variant with jsonb_set / jsonb operators.
CREATE TEMP TABLE test_a_base_payload (payload jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO test_a_base_payload (payload) VALUES (
  jsonb_build_object(
    'source_type',      'lab_sample',
    'source_id',        'dddd4444-0000-4000-8000-000000000001',
    'link_kind',        'deposit',
    'payment_method',   'cash',
    'discount_amount',  0,
    'items',            jsonb_build_array(jsonb_build_object(
                          'description','J5.2 Test Item',
                          'quantity',   1,
                          'unit_price', 100,
                          'is_taxable', true
                        ))
  )
);

-- ===========================================================================
-- T1-A-01 — Unauthenticated Actor (cleared JWT, DB role authenticated)
-- ===========================================================================
SAVEPOINT sp_t1_a_01;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-01',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-01'),
       (SELECT payload FROM pg_temp.test_a_base_payload),
       '42501', 'FIN_UNAUTHENTICATED', false, 1;

-- Clear BOTH supported claim shapes (Actor identity absent).
SELECT set_config('request.jwt.claim.sub',  '',   true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',     '{}', true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant  uuid;
  v_key     uuid;
  v_payload jsonb;
  v_result  jsonb;
  v_state   text;
  v_msg     text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-01';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture(scenario_id, actual_sqlstate, actual_message, result_json, call_completed)
    VALUES ('T1-A-01','00000','UNEXPECTED_SUCCESS', v_result, true);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture(scenario_id, actual_sqlstate, actual_message, result_json, call_completed)
    VALUES ('T1-A-01', v_state, v_msg, NULL, false);
  END;
END $$;

RESET ROLE;

DO $$
DECLARE
  v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-01';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A01_CAPTURE_COUNT_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-01';
  IF v_done THEN RAISE EXCEPTION 'A01_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '42501' THEN RAISE EXCEPTION 'A01_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_UNAUTHENTICATED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A01_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A01_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a01_state,
       COALESCE(actual_message,'')  AS a01_message,
       COALESCE(call_completed,false)::text AS a01_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-01' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_01;
RELEASE SAVEPOINT sp_t1_a_01;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-01';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-01';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A01_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-01','A','42501','FIN_UNAUTHENTICATED',
  :'a01_state', :'a01_message',
  CASE WHEN :'a01_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Cleared JWT under authenticated DB role'
);

-- ===========================================================================
-- T1-A-02 — Null Payload
-- ===========================================================================
SAVEPOINT sp_t1_a_02;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
) VALUES (
  'T1-A-02',
  (SELECT primary_tenant_id FROM pg_temp.test_context),
  (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-02'),
  NULL, '22023', 'FIN_BAD_ARGS', false, 2
);

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
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-02';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-02','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-02', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-02';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A02_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-02';
  IF v_done THEN RAISE EXCEPTION 'A02_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '22023' THEN RAISE EXCEPTION 'A02_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_BAD_ARGS' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A02_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A02_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a02_state,
       COALESCE(actual_message,'')  AS a02_message,
       COALESCE(call_completed,false)::text AS a02_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-02' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_02;
RELEASE SAVEPOINT sp_t1_a_02;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-02';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-02';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A02_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-02','A','22023','FIN_BAD_ARGS',
  :'a02_state', :'a02_message',
  CASE WHEN :'a02_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'NULL payload rejected'
);

-- ===========================================================================
-- T1-A-03 — Payload Not An Object
-- ===========================================================================
SAVEPOINT sp_t1_a_03;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
) VALUES (
  'T1-A-03',
  (SELECT primary_tenant_id FROM pg_temp.test_context),
  (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-03'),
  '[]'::jsonb, '23514', 'FIN_PAYLOAD_TYPE', false, 3
);

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-03';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-03','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-03', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-03';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A03_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-03';
  IF v_done THEN RAISE EXCEPTION 'A03_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A03_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A03_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A03_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a03_state,
       COALESCE(actual_message,'')  AS a03_message,
       COALESCE(call_completed,false)::text AS a03_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-03' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_03;
RELEASE SAVEPOINT sp_t1_a_03;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-03';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-03';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A03_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-03','A','23514','FIN_PAYLOAD_TYPE',
  :'a03_state', :'a03_message',
  CASE WHEN :'a03_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Array payload rejected'
);

-- ===========================================================================
-- T1-A-04 — Tenant Access Denied (Secondary Tenant, valid payload)
-- ===========================================================================
SAVEPOINT sp_t1_a_04;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-04',
       (SELECT secondary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-04'),
       (SELECT payload FROM pg_temp.test_a_base_payload),
       '42501', 'FIN_TENANT_ACCESS_DENIED', false, 4;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-04';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-04','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-04', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-04';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A04_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-04';
  IF v_done THEN RAISE EXCEPTION 'A04_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '42501' THEN RAISE EXCEPTION 'A04_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_TENANT_ACCESS_DENIED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A04_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A04_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a04_state,
       COALESCE(actual_message,'')  AS a04_message,
       COALESCE(call_completed,false)::text AS a04_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-04' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_04;
RELEASE SAVEPOINT sp_t1_a_04;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-04';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-04';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A04_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-04','A','42501','FIN_TENANT_ACCESS_DENIED',
  :'a04_state', :'a04_message',
  CASE WHEN :'a04_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Secondary Tenant membership absent'
);

-- ===========================================================================
-- T1-A-05 — Unknown Root Key "foo"
-- ===========================================================================
SAVEPOINT sp_t1_a_05;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-05',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-05'),
       (SELECT payload FROM pg_temp.test_a_base_payload) || jsonb_build_object('foo', 1),
       '23514', 'FIN_PAYLOAD_UNKNOWN_KEY: foo', false, 5;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-05';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-05','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-05', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-05';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A05_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-05';
  IF v_done THEN RAISE EXCEPTION 'A05_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A05_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_UNKNOWN_KEY: foo' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A05_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A05_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a05_state,
       COALESCE(actual_message,'')  AS a05_message,
       COALESCE(call_completed,false)::text AS a05_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-05' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_05;
RELEASE SAVEPOINT sp_t1_a_05;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-05';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-05';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A05_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-05','A','23514','FIN_PAYLOAD_UNKNOWN_KEY: foo',
  :'a05_state', :'a05_message',
  CASE WHEN :'a05_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Unknown root key foo rejected'
);

-- ===========================================================================
-- T1-A-06 — Missing source_type
-- ===========================================================================
SAVEPOINT sp_t1_a_06;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-06',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-06'),
       (SELECT payload FROM pg_temp.test_a_base_payload) - 'source_type',
       '23514', 'FIN_SOURCE_TYPE_REQUIRED', false, 6;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-06';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-06','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-06', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-06';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A06_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-06';
  IF v_done THEN RAISE EXCEPTION 'A06_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A06_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_TYPE_REQUIRED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A06_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A06_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a06_state,
       COALESCE(actual_message,'')  AS a06_message,
       COALESCE(call_completed,false)::text AS a06_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-06' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_06;
RELEASE SAVEPOINT sp_t1_a_06;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-06';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-06';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A06_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-06','A','23514','FIN_SOURCE_TYPE_REQUIRED',
  :'a06_state', :'a06_message',
  CASE WHEN :'a06_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Missing source_type rejected'
);

-- ===========================================================================
-- T1-A-07 — Invalid source_type "foo"
-- ===========================================================================
SAVEPOINT sp_t1_a_07;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-07',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-07'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{source_type}', to_jsonb('foo'::text)),
       '23514', 'FIN_SOURCE_TYPE_INVALID', false, 7;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-07';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-07','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-07', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-07';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A07_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-07';
  IF v_done THEN RAISE EXCEPTION 'A07_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A07_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_TYPE_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A07_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A07_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a07_state,
       COALESCE(actual_message,'')  AS a07_message,
       COALESCE(call_completed,false)::text AS a07_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-07' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_07;
RELEASE SAVEPOINT sp_t1_a_07;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-07';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-07';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A07_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-07','A','23514','FIN_SOURCE_TYPE_INVALID',
  :'a07_state', :'a07_message',
  CASE WHEN :'a07_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'source_type=foo rejected'
);

-- ===========================================================================
-- T1-A-08 — Missing source_id
-- ===========================================================================
SAVEPOINT sp_t1_a_08;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-08',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-08'),
       (SELECT payload FROM pg_temp.test_a_base_payload) - 'source_id',
       '23514', 'FIN_SOURCE_ID_REQUIRED', false, 8;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-08';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-08','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-08', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-08';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A08_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-08';
  IF v_done THEN RAISE EXCEPTION 'A08_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A08_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_ID_REQUIRED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A08_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A08_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a08_state,
       COALESCE(actual_message,'')  AS a08_message,
       COALESCE(call_completed,false)::text AS a08_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-08' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_08;
RELEASE SAVEPOINT sp_t1_a_08;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-08';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-08';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A08_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-08','A','23514','FIN_SOURCE_ID_REQUIRED',
  :'a08_state', :'a08_message',
  CASE WHEN :'a08_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Missing source_id rejected'
);

-- ---------------------------------------------------------------------------
-- 13.Z. Batch integrity assertions (§15).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_res_n     int;
  v_uniq_n    int;
  v_cat_a     int;
  v_pos_n     int;
  v_non_null  int;
  v_bad_pass  int;
  v_bad_assn  int;
  v_leak_next int;
  v_leak_a32  int;
  v_inputs_n  int;
  v_cap_n     int;
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_res_n, v_uniq_n
    FROM pg_temp.test_scenario_results;
  IF v_res_n <> 8 THEN RAISE EXCEPTION 'B1_RES_COUNT_%', v_res_n; END IF;
  IF v_uniq_n <> 8 THEN RAISE EXCEPTION 'B1_RES_UNIQ_%', v_uniq_n; END IF;

  SELECT count(*) INTO v_cat_a FROM pg_temp.test_scenario_results WHERE category='A';
  IF v_cat_a <> 8 THEN RAISE EXCEPTION 'B1_CAT_A_%', v_cat_a; END IF;

  SELECT count(*) INTO v_pos_n
    FROM pg_temp.test_scenario_results
   WHERE actual_status='success';
  IF v_pos_n <> 0 THEN RAISE EXCEPTION 'B1_POSITIVE_LEAK_%', v_pos_n; END IF;

  SELECT count(*) INTO v_non_null
    FROM pg_temp.test_scenario_results WHERE result_json IS NOT NULL;
  IF v_non_null <> 0 THEN RAISE EXCEPTION 'B1_RESULT_JSON_LEAK_%', v_non_null; END IF;

  SELECT count(*) INTO v_bad_pass
    FROM pg_temp.test_scenario_results WHERE passed IS DISTINCT FROM true;
  IF v_bad_pass <> 0 THEN RAISE EXCEPTION 'B1_PASSED_FALSE_%', v_bad_pass; END IF;

  SELECT count(*) INTO v_bad_assn
    FROM pg_temp.test_scenario_results WHERE COALESCE(assertion_count,0) <= 0;
  IF v_bad_assn <> 0 THEN RAISE EXCEPTION 'B1_ASSN_COUNT_%', v_bad_assn; END IF;

  SELECT count(*) INTO v_leak_next
    FROM pg_temp.test_scenario_results
   WHERE scenario_id NOT IN (
     'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
     'T1-A-05','T1-A-06','T1-A-07','T1-A-08'
   );
  IF v_leak_next <> 0 THEN RAISE EXCEPTION 'B1_FOREIGN_SCENARIO_%', v_leak_next; END IF;

  SELECT count(*) INTO v_leak_a32
    FROM pg_temp.test_scenario_results WHERE scenario_id = 'T1-A-32';
  IF v_leak_a32 <> 0 THEN RAISE EXCEPTION 'B1_A32_LEAK_%', v_leak_a32; END IF;

  SELECT count(*) INTO v_inputs_n FROM pg_temp.test_scenario_inputs;
  SELECT count(*) INTO v_cap_n    FROM pg_temp.test_rpc_capture;
  IF v_inputs_n <> 0 THEN RAISE EXCEPTION 'B1_INPUT_RESIDUE_%', v_inputs_n; END IF;
  IF v_cap_n    <> 0 THEN RAISE EXCEPTION 'B1_CAPTURE_RESIDUE_%', v_cap_n; END IF;
END $$;

-- Batch-level financial preservation (mirrors §11; re-checked after 8 rollbacks).
DO $$
DECLARE
  v_inv_n int; v_item_n int; v_ledg_n int; v_link_n int;
  v_bal_n int; v_idem_n int; v_pa_n int;
BEGIN
  SELECT count(*) INTO v_inv_n  FROM public.invoices
    WHERE tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
  SELECT count(*) INTO v_item_n FROM public.invoice_items
    WHERE tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
  SELECT count(*) INTO v_ledg_n FROM public.ledger_entries
    WHERE tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
  SELECT count(*) INTO v_link_n FROM public.billing_links
    WHERE tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
  SELECT count(*) INTO v_bal_n  FROM public.customer_balances
    WHERE tenant_id = (SELECT primary_tenant_id FROM pg_temp.test_context);
  SELECT count(*) INTO v_idem_n FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN ('T1-A-01','T1-A-02','T1-A-03','T1-A-04',
                           'T1-A-05','T1-A-06','T1-A-07','T1-A-08');
  IF v_idem_n <> 0 THEN
    RAISE EXCEPTION 'B1_IDEM_RESIDUE_%', v_idem_n;
  END IF;
  SELECT count(*) INTO v_pa_n FROM public.payment_accounts
   WHERE id = (SELECT payment_account_id FROM pg_temp.test_context) AND is_active;
  IF v_pa_n <> 1 THEN RAISE EXCEPTION 'B1_PAYMENT_ACCOUNT_%', v_pa_n; END IF;
END $$;


-- ===========================================================================
-- Section 13.b2 — Turn 5A.2.b2: T1-A-09 through T1-A-16.
-- Payload-Shape Validation Scenarios (post-source-type gates).
-- Base payload from test_a_base_payload; each Scenario mutates exactly one
-- field so no earlier gate can fire.
-- ===========================================================================

-- ===========================================================================
-- T1-A-09 — Invalid source_id UUID rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_09;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-09',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-09'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{source_id}', '"not-a-uuid"'::jsonb, true),
       '23514', 'FIN_SOURCE_ID_INVALID', false, 9;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-09';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-09','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-09', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-09';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A09_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-09';
  IF v_done THEN RAISE EXCEPTION 'A09_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A09_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_ID_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A09_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A09_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a09_state,
       COALESCE(actual_message,'')  AS a09_message,
       COALESCE(call_completed,false)::text AS a09_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-09' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_09;
RELEASE SAVEPOINT sp_t1_a_09;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-09';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-09';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A09_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-09','A','23514','FIN_SOURCE_ID_INVALID',
  :'a09_state', :'a09_message',
  CASE WHEN :'a09_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Invalid source_id UUID rejected'
);

-- ===========================================================================
-- T1-A-10 — Missing link_kind rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_10;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-10',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-10'),
       (SELECT payload FROM pg_temp.test_a_base_payload) - 'link_kind',
       '23514', 'FIN_LINK_KIND_REQUIRED', false, 10;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-10';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-10','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-10', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-10';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A10_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-10';
  IF v_done THEN RAISE EXCEPTION 'A10_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A10_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LINK_KIND_REQUIRED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A10_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A10_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a10_state,
       COALESCE(actual_message,'')  AS a10_message,
       COALESCE(call_completed,false)::text AS a10_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-10' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_10;
RELEASE SAVEPOINT sp_t1_a_10;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-10';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-10';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A10_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-10','A','23514','FIN_LINK_KIND_REQUIRED',
  :'a10_state', :'a10_message',
  CASE WHEN :'a10_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Missing link_kind rejected'
);

-- ===========================================================================
-- T1-A-11 — link_kind=bogus rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_11;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-11',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-11'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{link_kind}', '"bogus"'::jsonb, true),
       '23514', 'FIN_LINK_KIND_INVALID', false, 11;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-11';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-11','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-11', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-11';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A11_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-11';
  IF v_done THEN RAISE EXCEPTION 'A11_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A11_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LINK_KIND_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A11_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A11_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a11_state,
       COALESCE(actual_message,'')  AS a11_message,
       COALESCE(call_completed,false)::text AS a11_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-11' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_11;
RELEASE SAVEPOINT sp_t1_a_11;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-11';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-11';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A11_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-11','A','23514','FIN_LINK_KIND_INVALID',
  :'a11_state', :'a11_message',
  CASE WHEN :'a11_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'link_kind=bogus rejected'
);

-- ===========================================================================
-- T1-A-12 — Missing payment_method rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_12;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-12',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-12'),
       (SELECT payload FROM pg_temp.test_a_base_payload) - 'payment_method',
       '23514', 'FIN_PAYMENT_METHOD_REQUIRED', false, 12;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-12';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-12','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-12', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-12';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A12_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-12';
  IF v_done THEN RAISE EXCEPTION 'A12_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A12_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYMENT_METHOD_REQUIRED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A12_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A12_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a12_state,
       COALESCE(actual_message,'')  AS a12_message,
       COALESCE(call_completed,false)::text AS a12_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-12' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_12;
RELEASE SAVEPOINT sp_t1_a_12;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-12';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-12';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A12_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-12','A','23514','FIN_PAYMENT_METHOD_REQUIRED',
  :'a12_state', :'a12_message',
  CASE WHEN :'a12_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Missing payment_method rejected'
);

-- ===========================================================================
-- T1-A-13 — payment_method=bitcoin rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_13;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-13',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-13'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{payment_method}', '"bitcoin"'::jsonb, true),
       '23514', 'FIN_PAYMENT_METHOD_INVALID', false, 13;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-13';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-13','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-13', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-13';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A13_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-13';
  IF v_done THEN RAISE EXCEPTION 'A13_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A13_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYMENT_METHOD_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A13_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A13_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a13_state,
       COALESCE(actual_message,'')  AS a13_message,
       COALESCE(call_completed,false)::text AS a13_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-13' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_13;
RELEASE SAVEPOINT sp_t1_a_13;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-13';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-13';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A13_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-13','A','23514','FIN_PAYMENT_METHOD_INVALID',
  :'a13_state', :'a13_message',
  CASE WHEN :'a13_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'payment_method=bitcoin rejected'
);

-- ===========================================================================
-- T1-A-14 — prices_include_tax non-boolean rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_14;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-14',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-14'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{prices_include_tax}', '"yes"'::jsonb, true),
       '23514', 'FIN_PAYLOAD_TYPE: prices_include_tax', false, 14;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-14';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-14','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-14', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-14';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A14_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-14';
  IF v_done THEN RAISE EXCEPTION 'A14_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A14_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: prices_include_tax' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A14_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A14_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a14_state,
       COALESCE(actual_message,'')  AS a14_message,
       COALESCE(call_completed,false)::text AS a14_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-14' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_14;
RELEASE SAVEPOINT sp_t1_a_14;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-14';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-14';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A14_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-14','A','23514','FIN_PAYLOAD_TYPE: prices_include_tax',
  :'a14_state', :'a14_message',
  CASE WHEN :'a14_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'prices_include_tax non-boolean rejected'
);

-- ===========================================================================
-- T1-A-15 — discount_amount non-numeric rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_15;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-15',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-15'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{discount_amount}', '"10"'::jsonb, true),
       '23514', 'FIN_PAYLOAD_TYPE: discount_amount', false, 15;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-15';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-15','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-15', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-15';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A15_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-15';
  IF v_done THEN RAISE EXCEPTION 'A15_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A15_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: discount_amount' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A15_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A15_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a15_state,
       COALESCE(actual_message,'')  AS a15_message,
       COALESCE(call_completed,false)::text AS a15_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-15' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_15;
RELEASE SAVEPOINT sp_t1_a_15;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-15';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-15';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A15_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-15','A','23514','FIN_PAYLOAD_TYPE: discount_amount',
  :'a15_state', :'a15_message',
  CASE WHEN :'a15_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'discount_amount non-numeric rejected'
);

-- ===========================================================================
-- T1-A-16 — Negative discount_amount rejected
-- ===========================================================================
SAVEPOINT sp_t1_a_16;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-16',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-16'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{discount_amount}', '-1'::jsonb, true),
       '23514', 'FIN_DISCOUNT_INVALID', false, 16;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-16';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-16','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-16', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-16';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A16_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-16';
  IF v_done THEN RAISE EXCEPTION 'A16_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A16_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_DISCOUNT_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A16_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A16_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a16_state,
       COALESCE(actual_message,'')  AS a16_message,
       COALESCE(call_completed,false)::text AS a16_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-16' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_16;
RELEASE SAVEPOINT sp_t1_a_16;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-16';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-16';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A16_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-16','A','23514','FIN_DISCOUNT_INVALID',
  :'a16_state', :'a16_message',
  CASE WHEN :'a16_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Negative discount_amount rejected'
);

-- ---------------------------------------------------------------------------
-- 13.b2.Z. New-batch integrity (§15) — A-09 through A-16.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_new_n int; v_new_uniq int; v_new_cat int; v_new_pos int;
  v_new_json int; v_new_pass int; v_new_assn int;
  v_inp_leak int; v_cap_leak int; v_idem_leak int;
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_new_n, v_new_uniq
    FROM pg_temp.test_scenario_results
   WHERE scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_n    <> 8 THEN RAISE EXCEPTION 'B2_NEW_COUNT_%', v_new_n; END IF;
  IF v_new_uniq <> 8 THEN RAISE EXCEPTION 'B2_NEW_UNIQ_%', v_new_uniq; END IF;

  SELECT count(*) INTO v_new_cat FROM pg_temp.test_scenario_results
   WHERE category='A'
     AND scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_cat <> 8 THEN RAISE EXCEPTION 'B2_NEW_CAT_A_%', v_new_cat; END IF;

  SELECT count(*) INTO v_new_pos FROM pg_temp.test_scenario_results
   WHERE actual_status='success'
     AND scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_pos <> 0 THEN RAISE EXCEPTION 'B2_NEW_POSITIVE_%', v_new_pos; END IF;

  SELECT count(*) INTO v_new_json FROM pg_temp.test_scenario_results
   WHERE result_json IS NOT NULL
     AND scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_json <> 0 THEN RAISE EXCEPTION 'B2_NEW_RESULT_JSON_%', v_new_json; END IF;

  SELECT count(*) INTO v_new_pass FROM pg_temp.test_scenario_results
   WHERE passed IS DISTINCT FROM true
     AND scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_pass <> 0 THEN RAISE EXCEPTION 'B2_NEW_PASSED_FALSE_%', v_new_pass; END IF;

  SELECT count(*) INTO v_new_assn FROM pg_temp.test_scenario_results
   WHERE COALESCE(assertion_count,0) <= 0
     AND scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_new_assn <> 0 THEN RAISE EXCEPTION 'B2_NEW_ASSN_%', v_new_assn; END IF;

  SELECT count(*) INTO v_inp_leak FROM pg_temp.test_scenario_inputs
   WHERE scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_inp_leak <> 0 THEN RAISE EXCEPTION 'B2_INPUT_RESIDUE_%', v_inp_leak; END IF;

  SELECT count(*) INTO v_cap_leak FROM pg_temp.test_rpc_capture
   WHERE scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                         'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_cap_leak <> 0 THEN RAISE EXCEPTION 'B2_CAPTURE_RESIDUE_%', v_cap_leak; END IF;

  SELECT count(*) INTO v_idem_leak
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN ('T1-A-09','T1-A-10','T1-A-11','T1-A-12',
                           'T1-A-13','T1-A-14','T1-A-15','T1-A-16');
  IF v_idem_leak <> 0 THEN RAISE EXCEPTION 'B2_IDEM_RESIDUE_%', v_idem_leak; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13.b2.C. Cumulative 16-Scenario integrity lock (§16).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_res_n     int;
  v_uniq_n    int;
  v_cat_a     int;
  v_pos_n     int;
  v_non_null  int;
  v_bad_pass  int;
  v_bad_assn  int;
  v_leak_next int;
  v_leak_a32  int;
  v_inputs_n  int;
  v_cap_n     int;
  v_expected  text[] := ARRAY[
    'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
    'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
    'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
    'T1-A-13','T1-A-14','T1-A-15','T1-A-16'
  ];
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_res_n, v_uniq_n FROM pg_temp.test_scenario_results;
  IF v_res_n  <> 16 THEN RAISE EXCEPTION 'B2C_RES_COUNT_%', v_res_n;  END IF;
  IF v_uniq_n <> 16 THEN RAISE EXCEPTION 'B2C_RES_UNIQ_%',  v_uniq_n; END IF;

  IF NOT (SELECT array_agg(scenario_id ORDER BY scenario_id)
            FROM pg_temp.test_scenario_results) = v_expected THEN
    RAISE EXCEPTION 'B2C_ID_SET_MISMATCH';
  END IF;

  SELECT count(*) INTO v_cat_a FROM pg_temp.test_scenario_results WHERE category='A';
  IF v_cat_a <> 16 THEN RAISE EXCEPTION 'B2C_CAT_A_%', v_cat_a; END IF;

  SELECT count(*) INTO v_pos_n FROM pg_temp.test_scenario_results
   WHERE actual_status='success';
  IF v_pos_n <> 0 THEN RAISE EXCEPTION 'B2C_POSITIVE_%', v_pos_n; END IF;

  SELECT count(*) INTO v_non_null FROM pg_temp.test_scenario_results
   WHERE result_json IS NOT NULL;
  IF v_non_null <> 0 THEN RAISE EXCEPTION 'B2C_RESULT_JSON_%', v_non_null; END IF;

  SELECT count(*) INTO v_bad_pass FROM pg_temp.test_scenario_results
   WHERE passed IS DISTINCT FROM true;
  IF v_bad_pass <> 0 THEN RAISE EXCEPTION 'B2C_PASSED_FALSE_%', v_bad_pass; END IF;

  SELECT count(*) INTO v_bad_assn FROM pg_temp.test_scenario_results
   WHERE COALESCE(assertion_count,0) <= 0;
  IF v_bad_assn <> 0 THEN RAISE EXCEPTION 'B2C_ASSN_%', v_bad_assn; END IF;

  SELECT count(*) INTO v_leak_next FROM pg_temp.test_scenario_results
   WHERE scenario_id NOT IN (
     'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
     'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
     'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
     'T1-A-13','T1-A-14','T1-A-15','T1-A-16'
   );
  IF v_leak_next <> 0 THEN RAISE EXCEPTION 'B2C_FOREIGN_%', v_leak_next; END IF;

  SELECT count(*) INTO v_leak_a32 FROM pg_temp.test_scenario_results
   WHERE scenario_id = 'T1-A-32';
  IF v_leak_a32 <> 0 THEN RAISE EXCEPTION 'B2C_A32_%', v_leak_a32; END IF;

  SELECT count(*) INTO v_inputs_n FROM pg_temp.test_scenario_inputs;
  SELECT count(*) INTO v_cap_n    FROM pg_temp.test_rpc_capture;
  IF v_inputs_n <> 0 THEN RAISE EXCEPTION 'B2C_INPUT_%',   v_inputs_n; END IF;
  IF v_cap_n    <> 0 THEN RAISE EXCEPTION 'B2C_CAPTURE_%', v_cap_n;    END IF;
END $$;

-- Cumulative Financial zero-residue re-check after 16 rollbacks.
DO $$
DECLARE v_idem_n int; v_pa_n int;
BEGIN
  SELECT count(*) INTO v_idem_n
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN (
       'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
       'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
       'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
       'T1-A-13','T1-A-14','T1-A-15','T1-A-16'
     );
  IF v_idem_n <> 0 THEN RAISE EXCEPTION 'B2C_IDEM_RESIDUE_%', v_idem_n; END IF;
  SELECT count(*) INTO v_pa_n FROM public.payment_accounts
   WHERE id = (SELECT payment_account_id FROM pg_temp.test_context) AND is_active;
  IF v_pa_n <> 1 THEN RAISE EXCEPTION 'B2C_PAYMENT_ACCOUNT_%', v_pa_n; END IF;
END $$;

-- ===========================================================================
-- Turn 5A.2.b3 — T1-A-17 through T1-A-24 (Category-A validation batch 3).
-- Base payload from test_a_base_payload; each Scenario mutates exactly one
-- field so that only the target validation gate fires. Idempotency keys are
-- resolved from test_active_idem_keys (N+3 suffix rule; A-17..A-24 → 20..27).
-- ===========================================================================

-- ===========================================================================
-- T1-A-17 — Invalid Notes type (numeric)
-- ===========================================================================
SAVEPOINT sp_t1_a_17;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-17',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-17'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{notes}', to_jsonb(123), true),
       '23514', 'FIN_PAYLOAD_TYPE: notes', false, 17;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-17';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-17','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-17', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-17';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A17_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-17';
  IF v_done THEN RAISE EXCEPTION 'A17_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A17_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: notes' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A17_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A17_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a17_state,
       COALESCE(actual_message,'')  AS a17_message,
       COALESCE(call_completed,false)::text AS a17_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-17' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_17;
RELEASE SAVEPOINT sp_t1_a_17;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-17';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-17';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A17_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-17','A','23514','FIN_PAYLOAD_TYPE: notes',
  :'a17_state', :'a17_message',
  CASE WHEN :'a17_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Numeric notes rejected'
);

-- ===========================================================================
-- T1-A-18 — Notes too long (exactly 501 characters)
-- ===========================================================================
SAVEPOINT sp_t1_a_18;

-- Boundary proof (§15): assert generated Notes length equals 501 BEFORE call.
DO $$
DECLARE v_len int;
BEGIN
  SELECT char_length(repeat('x', 501)) INTO v_len;
  IF v_len <> 501 THEN RAISE EXCEPTION 'A18_NOTES_LEN_%', v_len; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-18',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-18'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{notes}', to_jsonb(repeat('x', 501)), true),
       '23514', 'FIN_NOTES_TOO_LONG', false, 18;

-- Confirm the Payload notes value is JSON string of length 501.
DO $$
DECLARE v_typ text; v_len int;
BEGIN
  SELECT jsonb_typeof(payload->'notes'), char_length(payload->>'notes')
    INTO v_typ, v_len
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-18';
  IF v_typ <> 'string' THEN RAISE EXCEPTION 'A18_NOTES_TYPE_%', v_typ; END IF;
  IF v_len <> 501 THEN RAISE EXCEPTION 'A18_PAYLOAD_NOTES_LEN_%', v_len; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-18';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-18','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-18', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-18';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A18_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-18';
  IF v_done THEN RAISE EXCEPTION 'A18_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A18_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_NOTES_TOO_LONG' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A18_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A18_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a18_state,
       COALESCE(actual_message,'')  AS a18_message,
       COALESCE(call_completed,false)::text AS a18_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-18' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_18;
RELEASE SAVEPOINT sp_t1_a_18;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-18';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-18';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A18_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-18','A','23514','FIN_NOTES_TOO_LONG',
  :'a18_state', :'a18_message',
  CASE WHEN :'a18_done'='true' THEN 'success' ELSE 'error' END,
  true, 22, NULL, '501-character notes rejected (boundary: 500 passes)'
);

-- ===========================================================================
-- T1-A-19 — Invalid client_name type (numeric)
-- ===========================================================================
SAVEPOINT sp_t1_a_19;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-19',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-19'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{client_name}', to_jsonb(42), true),
       '23514', 'FIN_PAYLOAD_TYPE: client_name', false, 19;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-19';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-19','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-19', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-19';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A19_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-19';
  IF v_done THEN RAISE EXCEPTION 'A19_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A19_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: client_name' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A19_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A19_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a19_state,
       COALESCE(actual_message,'')  AS a19_message,
       COALESCE(call_completed,false)::text AS a19_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-19' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_19;
RELEASE SAVEPOINT sp_t1_a_19;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-19';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-19';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A19_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-19','A','23514','FIN_PAYLOAD_TYPE: client_name',
  :'a19_state', :'a19_message',
  CASE WHEN :'a19_done'='true' THEN 'success' ELSE 'error' END,
  true, 20, NULL, 'Numeric client_name rejected'
);

-- ===========================================================================
-- T1-A-20 — items key omitted (locked missing-key variant per File 21 §H)
-- ===========================================================================
SAVEPOINT sp_t1_a_20;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-20',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-20'),
       (SELECT payload FROM pg_temp.test_a_base_payload) - 'items',
       '23514', 'FIN_ITEMS_EMPTY', false, 20;

-- Locked-variant proof (§15): items key MUST be absent (not empty array).
DO $$
DECLARE v_has_items boolean;
BEGIN
  SELECT (payload ? 'items') INTO v_has_items
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-20';
  IF v_has_items THEN RAISE EXCEPTION 'A20_ITEMS_KEY_PRESENT'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-20';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-20','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-20', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-20';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A20_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-20';
  IF v_done THEN RAISE EXCEPTION 'A20_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A20_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_ITEMS_EMPTY' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A20_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A20_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a20_state,
       COALESCE(actual_message,'')  AS a20_message,
       COALESCE(call_completed,false)::text AS a20_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-20' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_20;
RELEASE SAVEPOINT sp_t1_a_20;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-20';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-20';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A20_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-20','A','23514','FIN_ITEMS_EMPTY',
  :'a20_state', :'a20_message',
  CASE WHEN :'a20_done'='true' THEN 'success' ELSE 'error' END,
  true, 21, NULL, 'items key omitted rejected (locked missing-key variant)'
);

-- ===========================================================================
-- T1-A-21 — Item is not an object (items=[1])
-- ===========================================================================
SAVEPOINT sp_t1_a_21;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-21',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-21'),
       jsonb_set((SELECT payload FROM pg_temp.test_a_base_payload), '{items}', '[1]'::jsonb, true),
       '23514', 'FIN_PAYLOAD_TYPE: items[]', false, 21;

-- Shape proof (§15): items is array; first element is NOT object.
DO $$
DECLARE v_items_typ text; v_elem0_typ text;
BEGIN
  SELECT jsonb_typeof(payload->'items'),
         jsonb_typeof(payload->'items'->0)
    INTO v_items_typ, v_elem0_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-21';
  IF v_items_typ <> 'array'  THEN RAISE EXCEPTION 'A21_ITEMS_NOT_ARRAY_%', v_items_typ; END IF;
  IF v_elem0_typ  = 'object' THEN RAISE EXCEPTION 'A21_ELEM0_IS_OBJECT'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-21';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-21','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-21', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-21';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A21_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-21';
  IF v_done THEN RAISE EXCEPTION 'A21_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A21_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: items[]' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A21_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A21_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a21_state,
       COALESCE(actual_message,'')  AS a21_message,
       COALESCE(call_completed,false)::text AS a21_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-21' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_21;
RELEASE SAVEPOINT sp_t1_a_21;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-21';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-21';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A21_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-21','A','23514','FIN_PAYLOAD_TYPE: items[]',
  :'a21_state', :'a21_message',
  CASE WHEN :'a21_done'='true' THEN 'success' ELSE 'error' END,
  true, 22, NULL, 'items[0] not an object rejected'
);

-- ===========================================================================
-- T1-A-22 — Unknown item key (caller-owned horse_id)
-- ===========================================================================
SAVEPOINT sp_t1_a_22;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-22',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-22'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'description','J5.2 Test Item',
           'quantity',   1,
           'unit_price', 100,
           'is_taxable', true,
           'horse_id',   'dddd4444-0000-4000-8000-000000000001'
         )),
         true
       ),
       '23514', 'FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id', false, 22;

-- Item-shape proof (§15): allowed keys retained; only extra key is horse_id.
DO $$
DECLARE v_keys text[]; v_extra text[]; v_allowed text[] := ARRAY['description','quantity','unit_price','is_taxable'];
BEGIN
  SELECT array_agg(k ORDER BY k) INTO v_keys
    FROM (SELECT jsonb_object_keys(payload->'items'->0) AS k
            FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-22') s;
  IF NOT (v_allowed <@ v_keys) THEN RAISE EXCEPTION 'A22_ALLOWED_KEYS_MISSING_%', v_keys; END IF;
  SELECT array_agg(k ORDER BY k) INTO v_extra
    FROM (SELECT jsonb_object_keys(payload->'items'->0) AS k
            FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-22'
          EXCEPT SELECT unnest(v_allowed)) s;
  IF v_extra <> ARRAY['horse_id']::text[] THEN RAISE EXCEPTION 'A22_EXTRA_KEYS_%', v_extra; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-22';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-22','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-22', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-22';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A22_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-22';
  IF v_done THEN RAISE EXCEPTION 'A22_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A22_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A22_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A22_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a22_state,
       COALESCE(actual_message,'')  AS a22_message,
       COALESCE(call_completed,false)::text AS a22_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-22' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_22;
RELEASE SAVEPOINT sp_t1_a_22;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-22';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-22';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A22_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-22','A','23514','FIN_PAYLOAD_UNKNOWN_KEY: items[].horse_id',
  :'a22_state', :'a22_message',
  CASE WHEN :'a22_done'='true' THEN 'success' ELSE 'error' END,
  true, 22, NULL, 'caller-owned horse_id inside item rejected'
);

-- ===========================================================================
-- T1-A-23 — Missing item description
-- ===========================================================================
SAVEPOINT sp_t1_a_23;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-23',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-23'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'quantity',   1,
           'unit_price', 100,
           'is_taxable', true
         )),
         true
       ),
       '23514', 'FIN_LAB_ITEM_DESCRIPTION_REQUIRED', false, 23;

-- Item-shape proof (§15): description absent; other fields valid.
DO $$
DECLARE v_has_desc boolean; v_qty numeric; v_price numeric; v_tax_typ text;
BEGIN
  SELECT (payload->'items'->0 ? 'description'),
         (payload->'items'->0->>'quantity')::numeric,
         (payload->'items'->0->>'unit_price')::numeric,
         jsonb_typeof(payload->'items'->0->'is_taxable')
    INTO v_has_desc, v_qty, v_price, v_tax_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-23';
  IF v_has_desc THEN RAISE EXCEPTION 'A23_DESC_PRESENT'; END IF;
  IF v_qty     <> 1        THEN RAISE EXCEPTION 'A23_QTY_%',      v_qty; END IF;
  IF v_price   <> 100      THEN RAISE EXCEPTION 'A23_PRICE_%',    v_price; END IF;
  IF v_tax_typ <> 'boolean' THEN RAISE EXCEPTION 'A23_TAX_TYP_%', v_tax_typ; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-23';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-23','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-23', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-23';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A23_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-23';
  IF v_done THEN RAISE EXCEPTION 'A23_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A23_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LAB_ITEM_DESCRIPTION_REQUIRED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A23_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A23_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a23_state,
       COALESCE(actual_message,'')  AS a23_message,
       COALESCE(call_completed,false)::text AS a23_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-23' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_23;
RELEASE SAVEPOINT sp_t1_a_23;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-23';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-23';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A23_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-23','A','23514','FIN_LAB_ITEM_DESCRIPTION_REQUIRED',
  :'a23_state', :'a23_message',
  CASE WHEN :'a23_done'='true' THEN 'success' ELSE 'error' END,
  true, 23, NULL, 'item missing description rejected'
);

-- ===========================================================================
-- T1-A-24 — Invalid item quantity (0)
-- ===========================================================================
SAVEPOINT sp_t1_a_24;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-24',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-24'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'description','J5.2 Test Item',
           'quantity',   0,
           'unit_price', 100,
           'is_taxable', true
         )),
         true
       ),
       '23514', 'FIN_LAB_ITEM_QUANTITY_INVALID', false, 24;

-- Item-shape proof (§15): quantity is numeric 0 (not string); all others valid.
DO $$
DECLARE v_qty_typ text; v_qty numeric; v_desc text; v_price numeric; v_tax_typ text;
BEGIN
  SELECT jsonb_typeof(payload->'items'->0->'quantity'),
         (payload->'items'->0->>'quantity')::numeric,
          payload->'items'->0->>'description',
         (payload->'items'->0->>'unit_price')::numeric,
         jsonb_typeof(payload->'items'->0->'is_taxable')
    INTO v_qty_typ, v_qty, v_desc, v_price, v_tax_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-24';
  IF v_qty_typ <> 'number'  THEN RAISE EXCEPTION 'A24_QTY_TYP_%',   v_qty_typ; END IF;
  IF v_qty     <> 0         THEN RAISE EXCEPTION 'A24_QTY_%',       v_qty;     END IF;
  IF v_desc IS NULL OR length(v_desc)=0 THEN RAISE EXCEPTION 'A24_DESC_%', v_desc; END IF;
  IF v_price   <> 100       THEN RAISE EXCEPTION 'A24_PRICE_%',     v_price;   END IF;
  IF v_tax_typ <> 'boolean' THEN RAISE EXCEPTION 'A24_TAX_TYP_%',   v_tax_typ; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-24';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-24','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-24', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-24';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A24_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-24';
  IF v_done THEN RAISE EXCEPTION 'A24_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A24_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LAB_ITEM_QUANTITY_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A24_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A24_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a24_state,
       COALESCE(actual_message,'')  AS a24_message,
       COALESCE(call_completed,false)::text AS a24_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-24' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_24;
RELEASE SAVEPOINT sp_t1_a_24;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-24';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-24';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A24_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-24','A','23514','FIN_LAB_ITEM_QUANTITY_INVALID',
  :'a24_state', :'a24_message',
  CASE WHEN :'a24_done'='true' THEN 'success' ELSE 'error' END,
  true, 24, NULL, 'quantity=0 rejected'
);

-- ---------------------------------------------------------------------------
-- 13.b3.Z. New-batch integrity (§16) — A-17 through A-24.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_new_n int; v_new_uniq int; v_new_cat int; v_new_pos int;
  v_new_json int; v_new_pass int; v_new_assn int;
  v_inp_leak int; v_cap_leak int; v_idem_leak int;
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_new_n, v_new_uniq
    FROM pg_temp.test_scenario_results
   WHERE scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_n    <> 8 THEN RAISE EXCEPTION 'B3_NEW_COUNT_%', v_new_n; END IF;
  IF v_new_uniq <> 8 THEN RAISE EXCEPTION 'B3_NEW_UNIQ_%', v_new_uniq; END IF;

  SELECT count(*) INTO v_new_cat FROM pg_temp.test_scenario_results
   WHERE category='A'
     AND scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_cat <> 8 THEN RAISE EXCEPTION 'B3_NEW_CAT_A_%', v_new_cat; END IF;

  SELECT count(*) INTO v_new_pos FROM pg_temp.test_scenario_results
   WHERE actual_status='success'
     AND scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_pos <> 0 THEN RAISE EXCEPTION 'B3_NEW_POSITIVE_%', v_new_pos; END IF;

  SELECT count(*) INTO v_new_json FROM pg_temp.test_scenario_results
   WHERE result_json IS NOT NULL
     AND scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_json <> 0 THEN RAISE EXCEPTION 'B3_NEW_RESULT_JSON_%', v_new_json; END IF;

  SELECT count(*) INTO v_new_pass FROM pg_temp.test_scenario_results
   WHERE passed IS DISTINCT FROM true
     AND scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_pass <> 0 THEN RAISE EXCEPTION 'B3_NEW_PASSED_FALSE_%', v_new_pass; END IF;

  SELECT count(*) INTO v_new_assn FROM pg_temp.test_scenario_results
   WHERE COALESCE(assertion_count,0) <= 0
     AND scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_new_assn <> 0 THEN RAISE EXCEPTION 'B3_NEW_ASSN_%', v_new_assn; END IF;

  SELECT count(*) INTO v_inp_leak FROM pg_temp.test_scenario_inputs
   WHERE scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_inp_leak <> 0 THEN RAISE EXCEPTION 'B3_INPUT_RESIDUE_%', v_inp_leak; END IF;

  SELECT count(*) INTO v_cap_leak FROM pg_temp.test_rpc_capture
   WHERE scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                         'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_cap_leak <> 0 THEN RAISE EXCEPTION 'B3_CAPTURE_RESIDUE_%', v_cap_leak; END IF;

  SELECT count(*) INTO v_idem_leak
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN ('T1-A-17','T1-A-18','T1-A-19','T1-A-20',
                           'T1-A-21','T1-A-22','T1-A-23','T1-A-24');
  IF v_idem_leak <> 0 THEN RAISE EXCEPTION 'B3_IDEM_RESIDUE_%', v_idem_leak; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13.b3.C. Cumulative 24-Scenario integrity lock (§17).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_res_n     int;
  v_uniq_n    int;
  v_cat_a     int;
  v_pos_n     int;
  v_non_null  int;
  v_bad_pass  int;
  v_bad_assn  int;
  v_leak_next int;
  v_leak_a32  int;
  v_inputs_n  int;
  v_cap_n     int;
  v_expected  text[] := ARRAY[
    'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
    'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
    'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
    'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
    'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
    'T1-A-21','T1-A-22','T1-A-23','T1-A-24'
  ];
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_res_n, v_uniq_n FROM pg_temp.test_scenario_results;
  IF v_res_n  <> 24 THEN RAISE EXCEPTION 'B3C_RES_COUNT_%', v_res_n;  END IF;
  IF v_uniq_n <> 24 THEN RAISE EXCEPTION 'B3C_RES_UNIQ_%',  v_uniq_n; END IF;

  IF NOT (SELECT array_agg(scenario_id ORDER BY scenario_id)
            FROM pg_temp.test_scenario_results) = v_expected THEN
    RAISE EXCEPTION 'B3C_ID_SET_MISMATCH';
  END IF;

  SELECT count(*) INTO v_cat_a FROM pg_temp.test_scenario_results WHERE category='A';
  IF v_cat_a <> 24 THEN RAISE EXCEPTION 'B3C_CAT_A_%', v_cat_a; END IF;

  SELECT count(*) INTO v_pos_n FROM pg_temp.test_scenario_results
   WHERE actual_status='success';
  IF v_pos_n <> 0 THEN RAISE EXCEPTION 'B3C_POSITIVE_%', v_pos_n; END IF;

  SELECT count(*) INTO v_non_null FROM pg_temp.test_scenario_results
   WHERE result_json IS NOT NULL;
  IF v_non_null <> 0 THEN RAISE EXCEPTION 'B3C_RESULT_JSON_%', v_non_null; END IF;

  SELECT count(*) INTO v_bad_pass FROM pg_temp.test_scenario_results
   WHERE passed IS DISTINCT FROM true;
  IF v_bad_pass <> 0 THEN RAISE EXCEPTION 'B3C_PASSED_FALSE_%', v_bad_pass; END IF;

  SELECT count(*) INTO v_bad_assn FROM pg_temp.test_scenario_results
   WHERE COALESCE(assertion_count,0) <= 0;
  IF v_bad_assn <> 0 THEN RAISE EXCEPTION 'B3C_ASSN_%', v_bad_assn; END IF;

  SELECT count(*) INTO v_leak_next FROM pg_temp.test_scenario_results
   WHERE scenario_id NOT IN (
     'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
     'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
     'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
     'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
     'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
     'T1-A-21','T1-A-22','T1-A-23','T1-A-24'
   );
  IF v_leak_next <> 0 THEN RAISE EXCEPTION 'B3C_FOREIGN_%', v_leak_next; END IF;

  SELECT count(*) INTO v_leak_a32 FROM pg_temp.test_scenario_results
   WHERE scenario_id = 'T1-A-32';
  IF v_leak_a32 <> 0 THEN RAISE EXCEPTION 'B3C_A32_%', v_leak_a32; END IF;

  SELECT count(*) INTO v_inputs_n FROM pg_temp.test_scenario_inputs;
  SELECT count(*) INTO v_cap_n    FROM pg_temp.test_rpc_capture;
  IF v_inputs_n <> 0 THEN RAISE EXCEPTION 'B3C_INPUT_%',   v_inputs_n; END IF;
  IF v_cap_n    <> 0 THEN RAISE EXCEPTION 'B3C_CAPTURE_%', v_cap_n;    END IF;
END $$;

-- Cumulative Financial zero-residue re-check after 24 rollbacks.
DO $$
DECLARE v_idem_n int; v_pa_n int;
BEGIN
  SELECT count(*) INTO v_idem_n
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN (
       'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
       'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
       'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
       'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
       'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
       'T1-A-21','T1-A-22','T1-A-23','T1-A-24'
     );
  IF v_idem_n <> 0 THEN RAISE EXCEPTION 'B3C_IDEM_RESIDUE_%', v_idem_n; END IF;
  SELECT count(*) INTO v_pa_n FROM public.payment_accounts
   WHERE id = (SELECT payment_account_id FROM pg_temp.test_context) AND is_active;
  IF v_pa_n <> 1 THEN RAISE EXCEPTION 'B3C_PAYMENT_ACCOUNT_%', v_pa_n; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13.b4. Turn 5A.2.b4: T1-A-25..T1-A-31 + T1-A-33 (A-32 retired).
--
--   T1-A-25  FIN_LAB_ITEM_PRICE_INVALID          23514
--   T1-A-26  FIN_PAYLOAD_TYPE: items[].is_taxable 23514
--   T1-A-27  FIN_SOURCE_NOT_FOUND                23503
--   T1-A-28  FIN_SOURCE_CANCELLED                42501
--   T1-A-29  FIN_LAB_DEPOSIT_STATUS_INVALID      42501
--   T1-A-30  FIN_LAB_FINAL_STATUS_INVALID        42501
--   T1-A-31  FIN_CLIENT_NAME_TOO_LONG            23514
--   T1-A-33  FIN_CHECKOUT_TOTAL_INVALID          23514
--   T1-A-32  RETIRED (see test_reserved_keys)
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- T1-A-25 — Negative Unit Price
-- ===========================================================================
SAVEPOINT sp_t1_a_25;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-25',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-25'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'description','J5.2 Test Item',
           'quantity',   1,
           'unit_price', -1,
           'is_taxable', true
         )),
         true
       ),
       '23514', 'FIN_LAB_ITEM_PRICE_INVALID', false, 25;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_qty numeric; v_price numeric; v_price_typ text; v_desc text; v_tax_typ text;
BEGIN
  SELECT (payload->'items'->0->>'quantity')::numeric,
         (payload->'items'->0->>'unit_price')::numeric,
         jsonb_typeof(payload->'items'->0->'unit_price'),
          payload->'items'->0->>'description',
         jsonb_typeof(payload->'items'->0->'is_taxable')
    INTO v_qty, v_price, v_price_typ, v_desc, v_tax_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-25';
  IF v_price_typ <> 'number'  THEN RAISE EXCEPTION 'A25_PRICE_TYP_%', v_price_typ; END IF;
  IF v_price     <> -1        THEN RAISE EXCEPTION 'A25_PRICE_%',     v_price;     END IF;
  IF v_qty       <> 1         THEN RAISE EXCEPTION 'A25_QTY_%',       v_qty;       END IF;
  IF v_desc IS NULL OR length(v_desc)=0 THEN RAISE EXCEPTION 'A25_DESC_%', v_desc; END IF;
  IF v_tax_typ   <> 'boolean' THEN RAISE EXCEPTION 'A25_TAX_TYP_%',   v_tax_typ;   END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-25';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-25','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-25', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-25';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A25_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-25';
  IF v_done THEN RAISE EXCEPTION 'A25_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A25_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LAB_ITEM_PRICE_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A25_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A25_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a25_state,
       COALESCE(actual_message,'')  AS a25_message,
       COALESCE(call_completed,false)::text AS a25_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-25' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_25;
RELEASE SAVEPOINT sp_t1_a_25;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-25';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-25';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A25_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-25','A','23514','FIN_LAB_ITEM_PRICE_INVALID',
  :'a25_state', :'a25_message',
  CASE WHEN :'a25_done'='true' THEN 'success' ELSE 'error' END,
  true, 25, NULL, 'unit_price=-1 rejected before checkout total'
);

-- ===========================================================================
-- T1-A-26 — Invalid Taxability Type (string, not boolean)
-- ===========================================================================
SAVEPOINT sp_t1_a_26;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-26',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-26'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'description','J5.2 Test Item',
           'quantity',   1,
           'unit_price', 100,
           'is_taxable', 'true'
         )),
         true
       ),
       '23514', 'FIN_PAYLOAD_TYPE: items[].is_taxable', false, 26;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_tax_typ text; v_qty numeric; v_price numeric; v_desc text;
BEGIN
  SELECT jsonb_typeof(payload->'items'->0->'is_taxable'),
         (payload->'items'->0->>'quantity')::numeric,
         (payload->'items'->0->>'unit_price')::numeric,
          payload->'items'->0->>'description'
    INTO v_tax_typ, v_qty, v_price, v_desc
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-26';
  IF v_tax_typ <> 'string' THEN RAISE EXCEPTION 'A26_TAX_TYP_%', v_tax_typ; END IF;
  IF v_qty     <> 1        THEN RAISE EXCEPTION 'A26_QTY_%',     v_qty;     END IF;
  IF v_price   <> 100      THEN RAISE EXCEPTION 'A26_PRICE_%',   v_price;   END IF;
  IF v_desc IS NULL OR length(v_desc)=0 THEN RAISE EXCEPTION 'A26_DESC_%', v_desc; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-26';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-26','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-26', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-26';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A26_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-26';
  IF v_done THEN RAISE EXCEPTION 'A26_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A26_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_PAYLOAD_TYPE: items[].is_taxable' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A26_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A26_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a26_state,
       COALESCE(actual_message,'')  AS a26_message,
       COALESCE(call_completed,false)::text AS a26_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-26' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_26;
RELEASE SAVEPOINT sp_t1_a_26;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-26';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-26';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A26_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-26','A','23514','FIN_PAYLOAD_TYPE: items[].is_taxable',
  :'a26_state', :'a26_message',
  CASE WHEN :'a26_done'='true' THEN 'success' ELSE 'error' END,
  true, 25, NULL, 'items[].is_taxable JSON string rejected'
);

-- ===========================================================================
-- T1-A-27 — Source Not Found (reserved missing UUID)
-- ===========================================================================
SAVEPOINT sp_t1_a_27;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-27',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-27'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{source_id}',
         to_jsonb((SELECT missing_lab_sample_id::text FROM pg_temp.test_context)),
         true
       ),
       '23503', 'FIN_SOURCE_NOT_FOUND', false, 27;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_src text; v_expected uuid; v_live int; v_fx int;
BEGIN
  SELECT payload->>'source_id' INTO v_src
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-27';
  SELECT missing_lab_sample_id INTO v_expected FROM pg_temp.test_context;
  IF v_src::uuid <> v_expected THEN
    RAISE EXCEPTION 'A27_SRC_%_expected_%', v_src, v_expected;
  END IF;
  IF v_expected <> 'deadbeef-0000-4000-8000-000000000027'::uuid THEN
    RAISE EXCEPTION 'A27_RESERVED_UUID_DRIFT_%', v_expected;
  END IF;
  SELECT count(*) INTO v_live FROM public.lab_samples WHERE id = v_expected;
  IF v_live <> 0 THEN RAISE EXCEPTION 'A27_RESERVED_ID_PRESENT_%', v_live; END IF;
  SELECT count(*) INTO v_fx FROM public.lab_samples
   WHERE id = ANY (ARRAY[
     'dddd4444-0000-4000-8000-000000000001',
     'dddd4444-0000-4000-8000-000000000002',
     'dddd4444-0000-4000-8000-000000000003',
     'dddd4444-0000-4000-8000-000000000004',
     'dddd4444-0000-4000-8000-000000000005',
     'dddd4444-0000-4000-8000-000000000007',
     'dddd4444-0000-4000-8000-00000000000b',
     'dddd4444-0000-4000-8000-00000000000e'
   ]::uuid[]) AND id = v_expected;
  IF v_fx <> 0 THEN RAISE EXCEPTION 'A27_RESERVED_ID_IN_FIXTURES_%', v_fx; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-27';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-27','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-27', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-27';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A27_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-27';
  IF v_done THEN RAISE EXCEPTION 'A27_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23503' THEN RAISE EXCEPTION 'A27_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_NOT_FOUND' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A27_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A27_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a27_state,
       COALESCE(actual_message,'')  AS a27_message,
       COALESCE(call_completed,false)::text AS a27_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-27' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_27;
RELEASE SAVEPOINT sp_t1_a_27;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-27';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-27';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A27_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-27','A','23503','FIN_SOURCE_NOT_FOUND',
  :'a27_state', :'a27_message',
  CASE WHEN :'a27_done'='true' THEN 'success' ELSE 'error' END,
  true, 25, NULL, 'reserved missing lab_sample id rejected'
);

-- ===========================================================================
-- T1-A-28 — Source Cancelled (LS_CANCELLED, deposit)
-- ===========================================================================
SAVEPOINT sp_t1_a_28;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-28',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-28'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{source_id}',
         to_jsonb('dddd4444-0000-4000-8000-000000000005'::text),
         true
       ),
       '42501', 'FIN_SOURCE_CANCELLED', false, 28;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_status text; v_link text;
BEGIN
  SELECT status INTO v_status FROM public.lab_samples
   WHERE id = 'dddd4444-0000-4000-8000-000000000005'::uuid;
  IF v_status <> 'cancelled' THEN RAISE EXCEPTION 'A28_FIXTURE_STATUS_%', v_status; END IF;
  SELECT payload->>'link_kind' INTO v_link
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-28';
  IF v_link <> 'deposit' THEN RAISE EXCEPTION 'A28_LINK_%', v_link; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-28';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-28','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-28', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-28';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A28_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-28';
  IF v_done THEN RAISE EXCEPTION 'A28_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '42501' THEN RAISE EXCEPTION 'A28_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_SOURCE_CANCELLED' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A28_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A28_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a28_state,
       COALESCE(actual_message,'')  AS a28_message,
       COALESCE(call_completed,false)::text AS a28_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-28' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_28;
RELEASE SAVEPOINT sp_t1_a_28;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-28';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-28';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A28_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-28','A','42501','FIN_SOURCE_CANCELLED',
  :'a28_state', :'a28_message',
  CASE WHEN :'a28_done'='true' THEN 'success' ELSE 'error' END,
  true, 24, NULL, 'cancellation gate precedes deposit status validation'
);

-- ===========================================================================
-- T1-A-29 — Deposit Status Invalid (LS_PROCESSING, deposit)
-- ===========================================================================
SAVEPOINT sp_t1_a_29;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-29',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-29'),
       jsonb_set(
         (SELECT payload FROM pg_temp.test_a_base_payload),
         '{source_id}',
         to_jsonb('dddd4444-0000-4000-8000-000000000004'::text),
         true
       ),
       '42501', 'FIN_LAB_DEPOSIT_STATUS_INVALID', false, 29;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_status text; v_link text;
BEGIN
  SELECT status INTO v_status FROM public.lab_samples
   WHERE id = 'dddd4444-0000-4000-8000-000000000004'::uuid;
  IF v_status <> 'processing' THEN RAISE EXCEPTION 'A29_FIXTURE_STATUS_%', v_status; END IF;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'A29_NOT_CANCELLED'; END IF;
  SELECT payload->>'link_kind' INTO v_link
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-29';
  IF v_link <> 'deposit' THEN RAISE EXCEPTION 'A29_LINK_%', v_link; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-29';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-29','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-29', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-29';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A29_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-29';
  IF v_done THEN RAISE EXCEPTION 'A29_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '42501' THEN RAISE EXCEPTION 'A29_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LAB_DEPOSIT_STATUS_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A29_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A29_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a29_state,
       COALESCE(actual_message,'')  AS a29_message,
       COALESCE(call_completed,false)::text AS a29_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-29' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_29;
RELEASE SAVEPOINT sp_t1_a_29;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-29';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-29';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A29_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-29','A','42501','FIN_LAB_DEPOSIT_STATUS_INVALID',
  :'a29_state', :'a29_message',
  CASE WHEN :'a29_done'='true' THEN 'success' ELSE 'error' END,
  true, 24, NULL, 'processing status rejected for deposit link'
);

-- ===========================================================================
-- T1-A-30 — Final Status Invalid (LS_DRAFT_LEGACY, final)
-- ===========================================================================
SAVEPOINT sp_t1_a_30;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-30',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-30'),
       jsonb_set(
         jsonb_set(
           (SELECT payload FROM pg_temp.test_a_base_payload),
           '{source_id}',
           to_jsonb('dddd4444-0000-4000-8000-00000000000e'::text),
           true
         ),
         '{link_kind}',
         to_jsonb('final'::text),
         true
       ),
       '42501', 'FIN_LAB_FINAL_STATUS_INVALID', false, 30;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_status text; v_link text;
BEGIN
  SELECT status INTO v_status FROM public.lab_samples
   WHERE id = 'dddd4444-0000-4000-8000-00000000000e'::uuid;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'A30_FIXTURE_STATUS_%', v_status; END IF;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'A30_NOT_CANCELLED'; END IF;
  SELECT payload->>'link_kind' INTO v_link
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-30';
  IF v_link <> 'final' THEN RAISE EXCEPTION 'A30_LINK_%', v_link; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-30';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-30','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-30', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-30';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A30_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-30';
  IF v_done THEN RAISE EXCEPTION 'A30_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '42501' THEN RAISE EXCEPTION 'A30_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_LAB_FINAL_STATUS_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A30_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A30_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a30_state,
       COALESCE(actual_message,'')  AS a30_message,
       COALESCE(call_completed,false)::text AS a30_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-30' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_30;
RELEASE SAVEPOINT sp_t1_a_30;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-30';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-30';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A30_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-30','A','42501','FIN_LAB_FINAL_STATUS_INVALID',
  :'a30_state', :'a30_message',
  CASE WHEN :'a30_done'='true' THEN 'success' ELSE 'error' END,
  true, 24, NULL, 'draft status rejected for final link'
);

-- ===========================================================================
-- T1-A-31 — Client Name Too Long (201 chars, LS_WALKIN_LONG_NAME)
-- ===========================================================================
SAVEPOINT sp_t1_a_31;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-31',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-31'),
       jsonb_set(
         jsonb_set(
           (SELECT payload FROM pg_temp.test_a_base_payload),
           '{source_id}',
           to_jsonb('dddd4444-0000-4000-8000-000000000007'::text),
           true
         ),
         '{client_name}',
         to_jsonb(repeat('a', 201)),
         true
       ),
       '23514', 'FIN_CLIENT_NAME_TOO_LONG', false, 31;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_name text; v_typ text; v_status text;
BEGIN
  SELECT payload->>'client_name', jsonb_typeof(payload->'client_name')
    INTO v_name, v_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-31';
  IF v_typ <> 'string' THEN RAISE EXCEPTION 'A31_NAME_TYP_%', v_typ; END IF;
  IF char_length(v_name) <> 201 THEN RAISE EXCEPTION 'A31_LEN_%', char_length(v_name); END IF;
  SELECT status INTO v_status FROM public.lab_samples
   WHERE id = 'dddd4444-0000-4000-8000-000000000007'::uuid;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'A31_FIXTURE_CANCELLED'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-31';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-31','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-31', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-31';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A31_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-31';
  IF v_done THEN RAISE EXCEPTION 'A31_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A31_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_CLIENT_NAME_TOO_LONG' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A31_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A31_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a31_state,
       COALESCE(actual_message,'')  AS a31_message,
       COALESCE(call_completed,false)::text AS a31_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-31' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_31;
RELEASE SAVEPOINT sp_t1_a_31;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-31';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-31';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A31_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-31','A','23514','FIN_CLIENT_NAME_TOO_LONG',
  :'a31_state', :'a31_message',
  CASE WHEN :'a31_done'='true' THEN 'success' ELSE 'error' END,
  true, 25, NULL, 'client_name length 201 exceeds cap'
);

-- ===========================================================================
-- T1-A-33 — Checkout Total Invalid (LS_ZERO_PRICE, unit_price=0)
-- ===========================================================================
SAVEPOINT sp_t1_a_33;

INSERT INTO pg_temp.test_scenario_inputs (
  scenario_id, tenant_id, idempotency_key, payload,
  expected_sqlstate, expected_token, expected_success, execution_order
)
SELECT 'T1-A-33',
       (SELECT primary_tenant_id FROM pg_temp.test_context),
       (SELECT idempotency_key FROM pg_temp.test_active_idem_keys WHERE scenario_id='T1-A-33'),
       jsonb_set(
         jsonb_set(
           (SELECT payload FROM pg_temp.test_a_base_payload),
           '{source_id}',
           to_jsonb('dddd4444-0000-4000-8000-00000000000b'::text),
           true
         ),
         '{items}',
         jsonb_build_array(jsonb_build_object(
           'description','J5.2 Test Item',
           'quantity',   1,
           'unit_price', 0,
           'is_taxable', true
         )),
         true
       ),
       '23514', 'FIN_CHECKOUT_TOTAL_INVALID', false, 33;

-- Boundary/reachability proof (§15).
DO $$
DECLARE v_qty numeric; v_price numeric; v_price_typ text; v_qty_typ text; v_gross numeric; v_status text;
BEGIN
  SELECT (payload->'items'->0->>'quantity')::numeric,
         (payload->'items'->0->>'unit_price')::numeric,
         jsonb_typeof(payload->'items'->0->'unit_price'),
         jsonb_typeof(payload->'items'->0->'quantity')
    INTO v_qty, v_price, v_price_typ, v_qty_typ
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-33';
  IF v_price_typ <> 'number'  THEN RAISE EXCEPTION 'A33_PRICE_TYP_%', v_price_typ; END IF;
  IF v_qty_typ   <> 'number'  THEN RAISE EXCEPTION 'A33_QTY_TYP_%',   v_qty_typ;   END IF;
  IF v_price <> 0 THEN RAISE EXCEPTION 'A33_PRICE_%', v_price; END IF;
  IF v_qty   <> 1 THEN RAISE EXCEPTION 'A33_QTY_%',   v_qty;   END IF;
  v_gross := v_qty * v_price;
  IF v_gross <> 0 THEN RAISE EXCEPTION 'A33_GROSS_%', v_gross; END IF;
  SELECT status INTO v_status FROM public.lab_samples
   WHERE id = 'dddd4444-0000-4000-8000-00000000000b'::uuid;
  IF v_status = 'cancelled' THEN RAISE EXCEPTION 'A33_FIXTURE_CANCELLED'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',
  (SELECT actor_id::text FROM pg_temp.test_context), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub',(SELECT actor_id FROM pg_temp.test_context),'role','authenticated')::text, true);

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_tenant uuid; v_key uuid; v_payload jsonb; v_result jsonb;
  v_state text; v_msg text;
BEGIN
  SELECT tenant_id, idempotency_key, payload
    INTO v_tenant, v_key, v_payload
    FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-33';
  BEGIN
    v_result := public.create_source_checkout_invoice(v_tenant, v_key, v_payload);
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-33','00000','UNEXPECTED_SUCCESS', v_result, true, now());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO pg_temp.test_rpc_capture VALUES
      ('T1-A-33', v_state, v_msg, NULL, false, now());
  END;
END $$;

RESET ROLE;

DO $$
DECLARE v_n int; v_state text; v_msg text; v_done boolean;
BEGIN
  SELECT count(*) INTO v_n FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-33';
  IF v_n <> 1 THEN RAISE EXCEPTION 'A33_CAPTURE_%', v_n; END IF;
  SELECT actual_sqlstate, actual_message, call_completed
    INTO v_state, v_msg, v_done
    FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-33';
  IF v_done THEN RAISE EXCEPTION 'A33_UNEXPECTED_SUCCESS'; END IF;
  IF v_state <> '23514' THEN RAISE EXCEPTION 'A33_STATE_%_MSG_%', v_state, v_msg; END IF;
  IF position('FIN_CHECKOUT_TOTAL_INVALID' IN v_msg) = 0 THEN
    RAISE EXCEPTION 'A33_TOKEN_MSG_%', v_msg;
  END IF;
  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'A33_ROLE_LEAK_%', current_user;
  END IF;
END $$;

SELECT COALESCE(actual_sqlstate,'') AS a33_state,
       COALESCE(actual_message,'')  AS a33_message,
       COALESCE(call_completed,false)::text AS a33_done
  FROM pg_temp.test_rpc_capture WHERE scenario_id='T1-A-33' \gset

ROLLBACK TO SAVEPOINT sp_t1_a_33;
RELEASE SAVEPOINT sp_t1_a_33;

DO $$
DECLARE i int; c int;
BEGIN
  SELECT count(*) INTO i FROM pg_temp.test_scenario_inputs WHERE scenario_id='T1-A-33';
  SELECT count(*) INTO c FROM pg_temp.test_rpc_capture     WHERE scenario_id='T1-A-33';
  IF i<>0 OR c<>0 THEN RAISE EXCEPTION 'A33_RESIDUE_i%_c%', i, c; END IF;
END $$;

INSERT INTO pg_temp.test_scenario_results (
  scenario_id, category, expected_sqlstate, expected_token,
  actual_sqlstate, actual_message, actual_status, passed, assertion_count, result_json, notes
) VALUES (
  'T1-A-33','A','23514','FIN_CHECKOUT_TOTAL_INVALID',
  :'a33_state', :'a33_message',
  CASE WHEN :'a33_done'='true' THEN 'success' ELSE 'error' END,
  true, 26, NULL, 'zero-total gross rejected as FIN_CHECKOUT_TOTAL_INVALID'
);

-- ---------------------------------------------------------------------------
-- 13.b4.Z. New-batch integrity (§16) — A-25..A-31 + A-33.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_new_ids text[] := ARRAY[
    'T1-A-25','T1-A-26','T1-A-27','T1-A-28',
    'T1-A-29','T1-A-30','T1-A-31','T1-A-33'
  ];
  v_n int; v_uniq int; v_cat int; v_pos int; v_nonnull int;
  v_bad_pass int; v_bad_assn int; v_a32 int;
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_n, v_uniq
    FROM pg_temp.test_scenario_results WHERE scenario_id = ANY(v_new_ids);
  IF v_n    <> 8 THEN RAISE EXCEPTION 'B4Z_ROW_%',    v_n;    END IF;
  IF v_uniq <> 8 THEN RAISE EXCEPTION 'B4Z_UNIQ_%',   v_uniq; END IF;

  SELECT count(*) INTO v_cat FROM pg_temp.test_scenario_results
   WHERE scenario_id = ANY(v_new_ids) AND category='A';
  IF v_cat <> 8 THEN RAISE EXCEPTION 'B4Z_CAT_A_%', v_cat; END IF;

  SELECT count(*) INTO v_pos FROM pg_temp.test_scenario_results
   WHERE scenario_id = ANY(v_new_ids) AND actual_status='success';
  IF v_pos <> 0 THEN RAISE EXCEPTION 'B4Z_POS_%', v_pos; END IF;

  SELECT count(*) INTO v_nonnull FROM pg_temp.test_scenario_results
   WHERE scenario_id = ANY(v_new_ids) AND result_json IS NOT NULL;
  IF v_nonnull <> 0 THEN RAISE EXCEPTION 'B4Z_RESULT_JSON_%', v_nonnull; END IF;

  SELECT count(*) INTO v_bad_pass FROM pg_temp.test_scenario_results
   WHERE scenario_id = ANY(v_new_ids) AND passed IS DISTINCT FROM true;
  IF v_bad_pass <> 0 THEN RAISE EXCEPTION 'B4Z_PASSED_%', v_bad_pass; END IF;

  SELECT count(*) INTO v_bad_assn FROM pg_temp.test_scenario_results
   WHERE scenario_id = ANY(v_new_ids) AND COALESCE(assertion_count,0) <= 0;
  IF v_bad_assn <> 0 THEN RAISE EXCEPTION 'B4Z_ASSN_%', v_bad_assn; END IF;

  SELECT count(*) INTO v_a32 FROM pg_temp.test_scenario_results
   WHERE scenario_id = 'T1-A-32';
  IF v_a32 <> 0 THEN RAISE EXCEPTION 'B4Z_A32_LEAK_%', v_a32; END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13.b4.C. Cumulative 32-Scenario Validation integrity lock (§17).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_res_n     int;
  v_uniq_n    int;
  v_cat_a     int;
  v_pos_n     int;
  v_non_null  int;
  v_bad_pass  int;
  v_bad_assn  int;
  v_leak_next int;
  v_leak_a32  int;
  v_inputs_n  int;
  v_cap_n     int;
  v_expected  text[] := ARRAY[
    'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
    'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
    'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
    'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
    'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
    'T1-A-21','T1-A-22','T1-A-23','T1-A-24',
    'T1-A-25','T1-A-26','T1-A-27','T1-A-28',
    'T1-A-29','T1-A-30','T1-A-31','T1-A-33'
  ];
BEGIN
  SELECT count(*), count(DISTINCT scenario_id)
    INTO v_res_n, v_uniq_n FROM pg_temp.test_scenario_results;
  IF v_res_n  <> 32 THEN RAISE EXCEPTION 'B4C_RES_COUNT_%', v_res_n;  END IF;
  IF v_uniq_n <> 32 THEN RAISE EXCEPTION 'B4C_RES_UNIQ_%',  v_uniq_n; END IF;

  IF NOT (SELECT array_agg(scenario_id ORDER BY scenario_id)
            FROM pg_temp.test_scenario_results) = v_expected THEN
    RAISE EXCEPTION 'B4C_ID_SET_MISMATCH';
  END IF;

  SELECT count(*) INTO v_cat_a FROM pg_temp.test_scenario_results WHERE category='A';
  IF v_cat_a <> 32 THEN RAISE EXCEPTION 'B4C_CAT_A_%', v_cat_a; END IF;

  SELECT count(*) INTO v_pos_n FROM pg_temp.test_scenario_results
   WHERE actual_status='success';
  IF v_pos_n <> 0 THEN RAISE EXCEPTION 'B4C_POSITIVE_%', v_pos_n; END IF;

  SELECT count(*) INTO v_non_null FROM pg_temp.test_scenario_results
   WHERE result_json IS NOT NULL;
  IF v_non_null <> 0 THEN RAISE EXCEPTION 'B4C_RESULT_JSON_%', v_non_null; END IF;

  SELECT count(*) INTO v_bad_pass FROM pg_temp.test_scenario_results
   WHERE passed IS DISTINCT FROM true;
  IF v_bad_pass <> 0 THEN RAISE EXCEPTION 'B4C_PASSED_FALSE_%', v_bad_pass; END IF;

  SELECT count(*) INTO v_bad_assn FROM pg_temp.test_scenario_results
   WHERE COALESCE(assertion_count,0) <= 0;
  IF v_bad_assn <> 0 THEN RAISE EXCEPTION 'B4C_ASSN_%', v_bad_assn; END IF;

  SELECT count(*) INTO v_leak_next FROM pg_temp.test_scenario_results
   WHERE scenario_id NOT IN (
     'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
     'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
     'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
     'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
     'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
     'T1-A-21','T1-A-22','T1-A-23','T1-A-24',
     'T1-A-25','T1-A-26','T1-A-27','T1-A-28',
     'T1-A-29','T1-A-30','T1-A-31','T1-A-33'
   );
  IF v_leak_next <> 0 THEN RAISE EXCEPTION 'B4C_FOREIGN_%', v_leak_next; END IF;

  SELECT count(*) INTO v_leak_a32 FROM pg_temp.test_scenario_results
   WHERE scenario_id = 'T1-A-32';
  IF v_leak_a32 <> 0 THEN RAISE EXCEPTION 'B4C_A32_%', v_leak_a32; END IF;

  SELECT count(*) INTO v_inputs_n FROM pg_temp.test_scenario_inputs;
  SELECT count(*) INTO v_cap_n    FROM pg_temp.test_rpc_capture;
  IF v_inputs_n <> 0 THEN RAISE EXCEPTION 'B4C_INPUT_%',   v_inputs_n; END IF;
  IF v_cap_n    <> 0 THEN RAISE EXCEPTION 'B4C_CAPTURE_%', v_cap_n;    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 13.b4.F. Cumulative Financial and Fixture zero-residue re-check (§18).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_idem_n     int;
  v_pa_n       int;
  v_a32_row    int;
  v_ls_fx_n    int;
  v_ls_draft   int;
  v_ls_acc     int;
  v_ls_comp    int;
  v_ls_proc    int;
  v_ls_canc    int;
  v_client_n   int;
  v_lh_n       int;
  v_missing_n  int;
BEGIN
  SELECT count(*) INTO v_idem_n
    FROM public.finance_request_idempotency f
    JOIN pg_temp.test_active_idem_keys k ON k.idempotency_key = f.idempotency_key
   WHERE f.tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND f.operation  = 'create_source_checkout_invoice'
     AND k.scenario_id IN (
       'T1-A-01','T1-A-02','T1-A-03','T1-A-04',
       'T1-A-05','T1-A-06','T1-A-07','T1-A-08',
       'T1-A-09','T1-A-10','T1-A-11','T1-A-12',
       'T1-A-13','T1-A-14','T1-A-15','T1-A-16',
       'T1-A-17','T1-A-18','T1-A-19','T1-A-20',
       'T1-A-21','T1-A-22','T1-A-23','T1-A-24',
       'T1-A-25','T1-A-26','T1-A-27','T1-A-28',
       'T1-A-29','T1-A-30','T1-A-31','T1-A-33'
     );
  IF v_idem_n <> 0 THEN RAISE EXCEPTION 'B4F_IDEM_RESIDUE_%', v_idem_n; END IF;

  SELECT count(*) INTO v_pa_n FROM public.payment_accounts
   WHERE id = (SELECT payment_account_id FROM pg_temp.test_context) AND is_active;
  IF v_pa_n <> 1 THEN RAISE EXCEPTION 'B4F_PAYMENT_ACCOUNT_%', v_pa_n; END IF;

  SELECT count(*) INTO v_a32_row
    FROM public.finance_request_idempotency
   WHERE idempotency_key = '11111111-1111-4111-8111-000000000035'::uuid
     AND tenant_id  = (SELECT primary_tenant_id FROM pg_temp.test_context)
     AND operation  = 'create_source_checkout_invoice';
  IF v_a32_row <> 0 THEN RAISE EXCEPTION 'B4F_A32_KEY_RESIDUE_%', v_a32_row; END IF;

  SELECT count(*) INTO v_ls_fx_n
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
  IF v_ls_fx_n <> 8 THEN RAISE EXCEPTION 'B4F_LS_FIXTURE_%', v_ls_fx_n; END IF;

  SELECT
    count(*) FILTER (WHERE status='draft'),
    count(*) FILTER (WHERE status='accessioned'),
    count(*) FILTER (WHERE status='completed'),
    count(*) FILTER (WHERE status='processing'),
    count(*) FILTER (WHERE status='cancelled')
  INTO v_ls_draft, v_ls_acc, v_ls_comp, v_ls_proc, v_ls_canc
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
  IF v_ls_draft<>3 OR v_ls_acc<>2 OR v_ls_comp<>1 OR v_ls_proc<>1 OR v_ls_canc<>1 THEN
    RAISE EXCEPTION 'B4F_LS_STATUS_%_%_%_%_%',
      v_ls_draft, v_ls_acc, v_ls_comp, v_ls_proc, v_ls_canc;
  END IF;

  SELECT count(*) INTO v_client_n FROM public.clients
   WHERE id = 'aaaa1111-0000-4000-8000-000000000001';
  IF v_client_n <> 1 THEN RAISE EXCEPTION 'B4F_CLIENT_%', v_client_n; END IF;

  SELECT count(*) INTO v_lh_n FROM public.lab_horses
   WHERE id = 'cccc3333-0000-4000-8000-000000000001';
  IF v_lh_n <> 1 THEN RAISE EXCEPTION 'B4F_LAB_HORSE_%', v_lh_n; END IF;

  SELECT count(*) INTO v_missing_n FROM public.lab_samples
   WHERE id = 'deadbeef-0000-4000-8000-000000000027'::uuid;
  IF v_missing_n <> 0 THEN RAISE EXCEPTION 'B4F_MISSING_ID_PRESENT_%', v_missing_n; END IF;

  IF current_user <> (SELECT original_user FROM pg_temp.test_context) THEN
    RAISE EXCEPTION 'B4F_ROLE_LEAK_%', current_user;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 14. Terminate. Thirty-two explicit invocations of
--     public.create_source_checkout_invoice occurred in this file inside
--     independent SAVEPOINTs (T1-A-01..T1-A-31 + T1-A-33; T1-A-32 retired);
--     every Scenario rolled back before this final outer ROLLBACK. Full
--     ROLLBACK discards all 10 Fixture rows and all Gate-related Temp state.
-- ---------------------------------------------------------------------------
ROLLBACK;
