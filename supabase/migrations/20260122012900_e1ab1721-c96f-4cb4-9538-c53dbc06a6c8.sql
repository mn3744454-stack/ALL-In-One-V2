-- =============================================
-- Horse Share MVP - External Sharing Layer (SAFE/IDEMPOTENT)
-- =============================================

-- Extensions (pgcrypto needed for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A1) horse_share_packs - Preset sharing configurations
CREATE TABLE IF NOT EXISTS public.horse_share_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

-- A2) horse_shares - Individual share instances
CREATE TABLE IF NOT EXISTS public.horse_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  pack_id uuid REFERENCES public.horse_share_packs(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  recipient_email text,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_from date,
  date_to date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT token_min_length CHECK (length(token) >= 32)
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_horse_shares_tenant_horse ON public.horse_shares(tenant_id, horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_shares_token ON public.horse_shares(token);
CREATE INDEX IF NOT EXISTS idx_horse_shares_status ON public.horse_shares(status);
CREATE INDEX IF NOT EXISTS idx_horse_share_packs_tenant ON public.horse_share_packs(tenant_id);

-- Optional hardening: privileges (keep RLS as primary gate)
REVOKE ALL ON TABLE public.horse_share_packs FROM anon;
REVOKE ALL ON TABLE public.horse_share_packs FROM authenticated;
GRANT SELECT ON TABLE public.horse_share_packs TO authenticated;

REVOKE ALL ON TABLE public.horse_shares FROM anon;
REVOKE ALL ON TABLE public.horse_shares FROM authenticated;
GRANT SELECT ON TABLE public.horse_shares TO authenticated;

-- =============================================
-- A4) RLS Policies (idempotent)
-- =============================================

ALTER TABLE public.horse_share_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_shares ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist (idempotent)
DROP POLICY IF EXISTS "Tenant members can view packs" ON public.horse_share_packs;
DROP POLICY IF EXISTS "Managers can manage packs" ON public.horse_share_packs;
DROP POLICY IF EXISTS "Managers can update packs" ON public.horse_share_packs;
DROP POLICY IF EXISTS "Managers can delete packs" ON public.horse_share_packs;

DROP POLICY IF EXISTS "Tenant members can view shares" ON public.horse_shares;
DROP POLICY IF EXISTS "Managers can create shares" ON public.horse_shares;
DROP POLICY IF EXISTS "Managers can update shares" ON public.horse_shares;
DROP POLICY IF EXISTS "Managers can delete shares" ON public.horse_shares;

-- horse_share_packs policies
CREATE POLICY "Tenant members can view packs"
  ON public.horse_share_packs FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can manage packs"
  ON public.horse_share_packs FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

CREATE POLICY "Managers can update packs"
  ON public.horse_share_packs FOR UPDATE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

CREATE POLICY "Managers can delete packs"
  ON public.horse_share_packs FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

-- horse_shares policies (for internal app access)
CREATE POLICY "Tenant members can view shares"
  ON public.horse_shares FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can create shares"
  ON public.horse_shares FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

CREATE POLICY "Managers can update shares"
  ON public.horse_shares FOR UPDATE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

CREATE POLICY "Managers can delete shares"
  ON public.horse_shares FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'manager'::tenant_role)
  );

-- =============================================
-- A3) Seed system packs function (SECURED)
-- =============================================

CREATE OR REPLACE FUNCTION public.ensure_horse_share_packs(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Only owner/manager of this tenant can seed packs
  IF NOT (
    has_tenant_role(v_user_id, _tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(v_user_id, _tenant_id, 'manager'::tenant_role)
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.horse_share_packs WHERE tenant_id = _tenant_id) THEN
    INSERT INTO public.horse_share_packs (tenant_id, key, name, description, scope, is_system) VALUES
      (_tenant_id, 'medical_summary', 'Medical Summary', 'Vet treatments and lab results',
       '{"includeVet": true, "includeLab": true, "includeFiles": false}'::jsonb, true),
      (_tenant_id, 'vet_only', 'Vet Records Only', 'Only veterinary treatments',
       '{"includeVet": true, "includeLab": false, "includeFiles": false}'::jsonb, true),
      (_tenant_id, 'lab_only', 'Lab Results Only', 'Only laboratory results',
       '{"includeVet": false, "includeLab": true, "includeFiles": false}'::jsonb, true),
      (_tenant_id, 'medical_and_files', 'Medical + Files', 'Complete medical record with attachments',
       '{"includeVet": true, "includeLab": true, "includeFiles": true}'::jsonb, true),
      (_tenant_id, 'custom', 'Custom', 'Build a custom share with selected sections',
       '{"includeVet": false, "includeLab": false, "includeFiles": false}'::jsonb, true);
  END IF;
END;
$$;

-- =============================================
-- A5) RPC for creating share
-- =============================================

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

  v_token := encode(gen_random_bytes(32), 'hex');

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

-- =============================================
-- A6) RPC for revoking share
-- =============================================

CREATE OR REPLACE FUNCTION public.revoke_horse_share(_share_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.horse_shares
  WHERE id = _share_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'share_not_found');
  END IF;

  IF NOT (
    has_tenant_role(v_user_id, v_tenant_id, 'owner'::tenant_role)
    OR has_tenant_role(v_user_id, v_tenant_id, 'manager'::tenant_role)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'permission_denied');
  END IF;

  UPDATE public.horse_shares
  SET status = 'revoked', revoked_at = now()
  WHERE id = _share_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================
-- A7) RPC for viewing share (public access, SAFE columns)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_horse_share_view(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share record;
  v_horse record;
  v_user_id uuid;
  v_user_email text;
  v_vet_data jsonb;
  v_lab_data jsonb;
  v_files_data jsonb;
  v_scope jsonb;
  v_date_filter_start date;
  v_date_filter_end date;
BEGIN
  SELECT * INTO v_share
  FROM public.horse_shares
  WHERE token = _token;

  IF v_share IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_share.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'revoked');
  END IF;

  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_share.recipient_email IS NOT NULL THEN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_lock_requires_login');
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    IF lower(trim(v_user_email)) <> lower(trim(v_share.recipient_email)) THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
    END IF;
  END IF;

  -- Horse basic info (safe columns)
  SELECT
    h.id, h.name, h.name_ar, h.gender, h.birth_date, h.avatar_url, h.status,
    t.name as tenant_name
  INTO v_horse
  FROM public.horses h
  LEFT JOIN public.tenants t ON h.tenant_id = t.id
  WHERE h.id = v_share.horse_id;

  IF v_horse IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'horse_not_found');
  END IF;

  v_scope := v_share.scope;
  v_date_filter_start := v_share.date_from;
  v_date_filter_end := v_share.date_to;

  -- Vet data
  IF COALESCE((v_scope->>'includeVet')::boolean, false) = true THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', vt.id,
        'title', vt.title,
        'category', vt.category,
        'status', vt.status,
        'priority', vt.priority,
        'requested_at', vt.requested_at,
        'created_at', vt.created_at,
        'notes', vt.notes,
        'source_tenant', tn.name
      )
      ORDER BY vt.created_at DESC
    ), '[]'::jsonb)
    INTO v_vet_data
    FROM public.vet_treatments vt
    LEFT JOIN public.tenants tn ON vt.tenant_id = tn.id
    WHERE vt.horse_id = v_share.horse_id
      AND (v_date_filter_start IS NULL OR (COALESCE(vt.requested_at, vt.created_at))::date >= v_date_filter_start)
      AND (v_date_filter_end IS NULL OR (COALESCE(vt.requested_at, vt.created_at))::date <= v_date_filter_end);
  END IF;

  -- Lab data
  IF COALESCE((v_scope->>'includeLab')::boolean, false) = true THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', lr.id,
        'status', lr.status,
        'result_data', lr.result_data,
        'flags', lr.flags,
        'created_at', lr.created_at,
        'template_name', lt.name,
        'source_tenant', tn.name
      )
      ORDER BY lr.created_at DESC
    ), '[]'::jsonb)
    INTO v_lab_data
    FROM public.lab_results lr
    JOIN public.lab_samples ls ON lr.sample_id = ls.id
    LEFT JOIN public.lab_templates lt ON lr.template_id = lt.id
    LEFT JOIN public.tenants tn ON lr.tenant_id = tn.id
    WHERE ls.horse_id = v_share.horse_id
      AND (v_date_filter_start IS NULL OR lr.created_at::date >= v_date_filter_start)
      AND (v_date_filter_end IS NULL OR lr.created_at::date <= v_date_filter_end);
  END IF;

  -- Files data (OPTIONAL: only if media_assets exists)
  v_files_data := '[]'::jsonb;
  IF COALESCE((v_scope->>'includeFiles')::boolean, false) = true THEN
    IF to_regclass('public.media_assets') IS NOT NULL THEN
      EXECUTE $q$
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', ma.id,
            'filename', ma.filename,
            'mime_type', ma.mime_type,
            'bucket', ma.bucket,
            'path', ma.path,
            'created_at', ma.created_at
          )
          ORDER BY ma.created_at DESC
        ), '[]'::jsonb)
        FROM public.media_assets ma
        WHERE ma.entity_type = 'horse' AND ma.entity_id = $1
      $q$
      INTO v_files_data
      USING v_share.horse_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'share', jsonb_build_object(
      'id', v_share.id,
      'date_from', v_share.date_from,
      'date_to', v_share.date_to,
      'expires_at', v_share.expires_at,
      'scope', v_scope
    ),
    'data', jsonb_build_object(
      'horse', jsonb_build_object(
        'id', v_horse.id,
        'name', v_horse.name,
        'name_ar', v_horse.name_ar,
        'gender', v_horse.gender,
        'birth_date', v_horse.birth_date,
        'avatar_url', v_horse.avatar_url,
        'status', v_horse.status,
        'tenant_name', v_horse.tenant_name
      ),
      'vet_treatments', COALESCE(v_vet_data, '[]'::jsonb),
      'lab_results', COALESCE(v_lab_data, '[]'::jsonb),
      'files', COALESCE(v_files_data, '[]'::jsonb)
    )
  );
END;
$$;

-- =============================================
-- A8) Audit Logging Triggers (idempotent)
-- =============================================

-- Trigger function for horse_shares
CREATE OR REPLACE FUNCTION public.log_horse_share_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid;
  v_action text;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'share_created';
    INSERT INTO public.role_audit_log (
      tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
    ) VALUES (
      NEW.tenant_id, v_actor, 'horse_shares', v_action, NEW.id::text,
      NULL,
      jsonb_build_object('horse_id', NEW.horse_id, 'recipient_email', NEW.recipient_email, 'expires_at', NEW.expires_at)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'revoked' AND OLD.status <> 'revoked' THEN
      v_action := 'share_revoked';
    ELSE
      v_action := 'share_updated';
    END IF;
    INSERT INTO public.role_audit_log (
      tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
    ) VALUES (
      NEW.tenant_id, v_actor, 'horse_shares', v_action, NEW.id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'revoked_at', NEW.revoked_at)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'share_deleted';
    INSERT INTO public.role_audit_log (
      tenant_id, actor_user_id, table_name, action, row_id, old_data, new_data
    ) VALUES (
      OLD.tenant_id, v_actor, 'horse_shares', v_action, OLD.id::text,
      jsonb_build_object('horse_id', OLD.horse_id, 'recipient_email', OLD.recipient_email),
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_horse_shares ON public.horse_shares;
CREATE TRIGGER trg_audit_horse_shares
  AFTER INSERT OR UPDATE OR DELETE ON public.horse_shares
  FOR EACH ROW EXECUTE FUNCTION public.log_horse_share_change();

-- Packs trigger (reuse existing log_role_change which expects tenant_id to exist)
DROP TRIGGER IF EXISTS trg_audit_horse_share_packs ON public.horse_share_packs;
CREATE TRIGGER trg_audit_horse_share_packs
  AFTER INSERT OR UPDATE OR DELETE ON public.horse_share_packs
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();