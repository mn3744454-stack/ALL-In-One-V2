-- Turn 3B — Payment Account System-Routing Provisioning
-- Slice 01 · J5.2 · Backfill existing tenants and auto-provision future tenants.
-- Scope: two new database objects + missing-row backfill. No other mutations.

BEGIN;

-- =========================================================================
-- 1. Preflight guards (hard-fail on unexpected state)
-- =========================================================================
DO $preflight$
DECLARE
  v_dup           int;
  v_bad_owner     int;
  v_existing_fn   int;
  v_existing_trg  int;
BEGIN
  -- required schema shape
  PERFORM 1
    FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'payment_accounts';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: public.payment_accounts missing';
  END IF;

  PERFORM 1
    FROM pg_constraint
   WHERE conname = 'unique_tenant_account'
     AND conrelid = 'public.payment_accounts'::regclass;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: unique_tenant_account constraint missing';
  END IF;

  PERFORM 1
    FROM pg_constraint
   WHERE conname = 'valid_owner'
     AND conrelid = 'public.payment_accounts'::regclass;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: valid_owner check missing';
  END IF;

  -- duplicates
  SELECT COUNT(*) INTO v_dup FROM (
    SELECT tenant_id FROM public.payment_accounts
     WHERE tenant_id IS NOT NULL
     GROUP BY tenant_id HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: duplicate tenant payment accounts (%)', v_dup;
  END IF;

  -- valid_owner violations
  SELECT COUNT(*) INTO v_bad_owner
    FROM public.payment_accounts
   WHERE NOT ((owner_type = 'platform' AND tenant_id IS NULL)
           OR (owner_type = 'tenant'   AND tenant_id IS NOT NULL));
  IF v_bad_owner > 0 THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: valid_owner violations (%)', v_bad_owner;
  END IF;

  -- inactive tenant accounts (must be zero — none exist today)
  IF EXISTS (
    SELECT 1 FROM public.payment_accounts
     WHERE owner_type = 'tenant' AND is_active = false
  ) THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: unexplained inactive tenant payment account exists';
  END IF;

  -- function/trigger must not pre-exist
  SELECT COUNT(*) INTO v_existing_fn
    FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname = '_finance_provision_tenant_payment_account';
  IF v_existing_fn > 0 THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: _finance_provision_tenant_payment_account already exists';
  END IF;

  SELECT COUNT(*) INTO v_existing_trg
    FROM pg_trigger
   WHERE tgname = 'trg_tenants_provision_payment_account'
     AND tgrelid = 'public.tenants'::regclass;
  IF v_existing_trg > 0 THEN
    RAISE EXCEPTION 'TURN_3B_BLOCKED: trg_tenants_provision_payment_account already exists';
  END IF;
END
$preflight$;

-- =========================================================================
-- 2. Private trigger function
--    SECURITY DEFINER, search_path='', trigger-only ACL.
-- =========================================================================
CREATE FUNCTION public._finance_provision_tenant_payment_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
  VALUES ('tenant'::public.payment_owner_type, NEW.id, true)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END
$fn$;

ALTER FUNCTION public._finance_provision_tenant_payment_account() OWNER TO postgres;

REVOKE ALL ON FUNCTION public._finance_provision_tenant_payment_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._finance_provision_tenant_payment_account() FROM anon;
REVOKE ALL ON FUNCTION public._finance_provision_tenant_payment_account() FROM authenticated;

-- =========================================================================
-- 3. Auto-provision trigger
-- =========================================================================
CREATE TRIGGER trg_tenants_provision_payment_account
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public._finance_provision_tenant_payment_account();

-- =========================================================================
-- 4. Backfill missing tenant routing accounts
-- =========================================================================
DO $backfill$
DECLARE
  v_missing_before int;
  v_inserted       int;
  v_missing_after  int;
BEGIN
  SELECT COUNT(*) INTO v_missing_before
    FROM public.tenants t
    LEFT JOIN public.payment_accounts pa ON pa.tenant_id = t.id
   WHERE pa.id IS NULL;

  WITH ins AS (
    INSERT INTO public.payment_accounts (owner_type, tenant_id, is_active)
    SELECT 'tenant'::public.payment_owner_type, t.id, true
      FROM public.tenants t
      LEFT JOIN public.payment_accounts pa ON pa.tenant_id = t.id
     WHERE pa.id IS NULL
    ON CONFLICT (tenant_id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;

  SELECT COUNT(*) INTO v_missing_after
    FROM public.tenants t
    LEFT JOIN public.payment_accounts pa ON pa.tenant_id = t.id
   WHERE pa.id IS NULL;

  RAISE NOTICE 'Turn3B backfill: missing_before=% inserted=% missing_after=%',
    v_missing_before, v_inserted, v_missing_after;

  IF v_missing_after <> 0 THEN
    RAISE EXCEPTION 'TURN_3B_ASSERT: tenants still missing routing account (%)', v_missing_after;
  END IF;
END
$backfill$;

-- =========================================================================
-- 5. Final invariants
-- =========================================================================
DO $invariants$
DECLARE
  v int;
BEGIN
  -- exactly one active tenant account per tenant
  SELECT COUNT(*) INTO v FROM public.tenants t
   WHERE NOT EXISTS (
     SELECT 1 FROM public.payment_accounts pa
      WHERE pa.tenant_id = t.id
        AND pa.owner_type = 'tenant'
        AND pa.is_active = true
   );
  IF v <> 0 THEN
    RAISE EXCEPTION 'TURN_3B_ASSERT: tenants without active routing account (%)', v;
  END IF;

  -- no duplicates
  SELECT COUNT(*) INTO v FROM (
    SELECT tenant_id FROM public.payment_accounts
     WHERE tenant_id IS NOT NULL
     GROUP BY tenant_id HAVING COUNT(*) > 1
  ) d;
  IF v <> 0 THEN
    RAISE EXCEPTION 'TURN_3B_ASSERT: duplicate tenant accounts (%)', v;
  END IF;

  -- no null tenant_id on tenant rows
  SELECT COUNT(*) INTO v FROM public.payment_accounts
   WHERE owner_type = 'tenant' AND tenant_id IS NULL;
  IF v <> 0 THEN
    RAISE EXCEPTION 'TURN_3B_ASSERT: tenant rows with null tenant_id (%)', v;
  END IF;

  -- trigger exactly once, bound to exact function
  SELECT COUNT(*) INTO v FROM pg_trigger
   WHERE tgname = 'trg_tenants_provision_payment_account'
     AND tgrelid = 'public.tenants'::regclass
     AND tgfoid  = 'public._finance_provision_tenant_payment_account()'::regprocedure;
  IF v <> 1 THEN
    RAISE EXCEPTION 'TURN_3B_ASSERT: provisioning trigger not bound exactly once (%)', v;
  END IF;
END
$invariants$;

COMMIT;