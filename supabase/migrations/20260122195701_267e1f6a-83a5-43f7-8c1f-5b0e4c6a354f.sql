-- Fix create_horse_share to use schema-qualified pgcrypto call
CREATE OR REPLACE FUNCTION public.create_horse_share(
  _horse_id uuid,
  _pack_key text DEFAULT 'custom',
  _recipient_email text DEFAULT NULL,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _custom_scope jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_pack_scope jsonb;
  v_merged_scope jsonb;
  v_token text;
  v_share_id uuid;
  v_pack_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.horses
  WHERE id = _horse_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'horse_not_found');
  END IF;

  IF NOT (
    has_tenant_role(v_user_id, v_tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(v_user_id, v_tenant_id, 'manager'::tenant_role)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  PERFORM public.ensure_horse_share_packs(v_tenant_id);

  SELECT id, scope INTO v_pack_id, v_pack_scope
  FROM public.horse_share_packs
  WHERE tenant_id = v_tenant_id AND key = _pack_key;

  IF v_pack_scope IS NULL THEN
    SELECT id, scope INTO v_pack_id, v_pack_scope
    FROM public.horse_share_packs
    WHERE tenant_id = v_tenant_id AND key = 'custom';
    v_pack_scope := COALESCE(v_pack_scope, '{}'::jsonb);
  END IF;

  v_merged_scope := v_pack_scope || COALESCE(_custom_scope, '{}'::jsonb);

  -- FIXED: Use schema-qualified pgcrypto call
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.horse_shares (
    tenant_id, horse_id, pack_id, token, recipient_email,
    scope, date_from, date_to, expires_at, created_by
  ) VALUES (
    v_tenant_id, _horse_id, v_pack_id, v_token, lower(trim(_recipient_email)),
    v_merged_scope, _date_from, _date_to, _expires_at, v_user_id
  )
  RETURNING id INTO v_share_id;

  RETURN jsonb_build_object(
    'success', true,
    'share_id', v_share_id,
    'token', v_token,
    'expires_at', _expires_at
  );
END;
$$;

-- Fix horse_shares.token default (table always exists)
ALTER TABLE public.horse_shares
  ALTER COLUMN token SET DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

-- Safely fix lab_result_shares.share_token default (only if table and column exist)
DO $$
BEGIN
  IF to_regclass('public.lab_result_shares') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'lab_result_shares' 
        AND column_name = 'share_token'
    ) THEN
      EXECUTE 'ALTER TABLE public.lab_result_shares ALTER COLUMN share_token SET DEFAULT encode(extensions.gen_random_bytes(32), ''hex'')';
    END IF;
  END IF;
END $$;

-- Safely fix media_share_links.token default (only if table and column exist)
DO $$
BEGIN
  IF to_regclass('public.media_share_links') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'media_share_links' 
        AND column_name = 'token'
    ) THEN
      EXECUTE 'ALTER TABLE public.media_share_links ALTER COLUMN token SET DEFAULT encode(extensions.gen_random_bytes(32), ''hex'')';
    END IF;
  END IF;
END $$;