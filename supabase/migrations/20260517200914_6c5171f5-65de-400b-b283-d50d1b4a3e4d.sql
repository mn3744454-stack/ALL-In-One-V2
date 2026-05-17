
-- ============================================================
-- L4-a-3c P4: Selected Analyses Report Sharing
-- Parent: lab_report_shares (one token, one sample, alias + locale)
-- Child:  lab_report_share_results (selected result_ids with sort_order)
-- Leaves lab_result_shares untouched (legacy per-result links).
-- ============================================================

-- 1. Parent table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.lab_samples(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  display_name_mode text NOT NULL DEFAULT 'real',
  alias_name_snapshot text NULL,
  source_horse_kind text NULL,
  source_horse_id uuid NULL,
  preferred_locale text NOT NULL DEFAULT 'ar',
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_by uuid NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_report_shares_display_name_mode_chk
    CHECK (display_name_mode = ANY (ARRAY['real','alias','sender_snapshot'])),
  CONSTRAINT lab_report_shares_alias_required_chk
    CHECK (display_name_mode <> 'alias'
           OR (alias_name_snapshot IS NOT NULL AND length(btrim(alias_name_snapshot)) > 0)),
  CONSTRAINT lab_report_shares_source_kind_chk
    CHECK (source_horse_kind IS NULL
           OR source_horse_kind = ANY (ARRAY['platform','lab','walkin','unknown'])),
  CONSTRAINT lab_report_shares_preferred_locale_chk
    CHECK (preferred_locale = ANY (ARRAY['ar','en'])),
  CONSTRAINT lab_report_shares_token_length_chk
    CHECK (length(share_token) >= 32)
);

CREATE INDEX IF NOT EXISTS idx_lab_report_shares_tenant
  ON public.lab_report_shares (tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_shares_sample
  ON public.lab_report_shares (sample_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_shares_tenant_sample
  ON public.lab_report_shares (tenant_id, sample_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_shares_token_active
  ON public.lab_report_shares (share_token) WHERE revoked_at IS NULL;

-- 2. Child table --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_report_share_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_share_id uuid NOT NULL REFERENCES public.lab_report_shares(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT lab_report_share_results_unique UNIQUE (report_share_id, result_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_report_share_results_parent
  ON public.lab_report_share_results (report_share_id);
CREATE INDEX IF NOT EXISTS idx_lab_report_share_results_parent_sort
  ON public.lab_report_share_results (report_share_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lab_report_share_results_result
  ON public.lab_report_share_results (result_id);

-- 3. updated_at trigger ------------------------------------------
CREATE OR REPLACE FUNCTION public.lab_report_shares_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lab_report_shares_set_updated_at ON public.lab_report_shares;
CREATE TRIGGER lab_report_shares_set_updated_at
  BEFORE UPDATE ON public.lab_report_shares
  FOR EACH ROW EXECUTE FUNCTION public.lab_report_shares_touch_updated_at();

-- 4. Child validation trigger (same-sample / same-tenant / final-only)
CREATE OR REPLACE FUNCTION public.validate_lab_report_share_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_sample uuid;
  parent_tenant uuid;
  r_sample uuid;
  r_tenant uuid;
  r_status text;
BEGIN
  SELECT sample_id, tenant_id
    INTO parent_sample, parent_tenant
  FROM public.lab_report_shares
  WHERE id = NEW.report_share_id;

  IF parent_sample IS NULL THEN
    RAISE EXCEPTION 'Parent lab_report_shares row not found';
  END IF;

  SELECT sample_id, tenant_id, status
    INTO r_sample, r_tenant, r_status
  FROM public.lab_results
  WHERE id = NEW.result_id;

  IF r_sample IS NULL THEN
    RAISE EXCEPTION 'Lab result not found';
  END IF;

  IF r_sample <> parent_sample THEN
    RAISE EXCEPTION 'Selected result does not belong to the parent sample';
  END IF;

  IF r_tenant <> parent_tenant THEN
    RAISE EXCEPTION 'Selected result does not belong to the parent tenant';
  END IF;

  IF r_status <> 'final' THEN
    RAISE EXCEPTION 'Only finalized results can be shared. Result status: %', r_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_lab_report_share_result_trigger ON public.lab_report_share_results;
CREATE TRIGGER validate_lab_report_share_result_trigger
  BEFORE INSERT ON public.lab_report_share_results
  FOR EACH ROW EXECUTE FUNCTION public.validate_lab_report_share_result();

-- 5. RLS ---------------------------------------------------------
ALTER TABLE public.lab_report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_report_share_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lab managers can view report shares" ON public.lab_report_shares;
CREATE POLICY "Lab managers can view report shares"
  ON public.lab_report_shares FOR SELECT
  USING (can_manage_lab(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Lab managers can create report shares" ON public.lab_report_shares;
CREATE POLICY "Lab managers can create report shares"
  ON public.lab_report_shares FOR INSERT
  WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Lab managers can revoke report shares" ON public.lab_report_shares;
CREATE POLICY "Lab managers can revoke report shares"
  ON public.lab_report_shares FOR UPDATE
  USING (can_manage_lab(auth.uid(), tenant_id))
  WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- No DELETE policy → direct delete denied (revoke via revoked_at).

DROP POLICY IF EXISTS "Lab managers can view report share results" ON public.lab_report_share_results;
CREATE POLICY "Lab managers can view report share results"
  ON public.lab_report_share_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lab_report_shares p
    WHERE p.id = lab_report_share_results.report_share_id
      AND can_manage_lab(auth.uid(), p.tenant_id)
  ));

DROP POLICY IF EXISTS "Lab managers can insert report share results" ON public.lab_report_share_results;
CREATE POLICY "Lab managers can insert report share results"
  ON public.lab_report_share_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lab_report_shares p
    WHERE p.id = lab_report_share_results.report_share_id
      AND can_manage_lab(auth.uid(), p.tenant_id)
  ));

-- No UPDATE/DELETE policies on child → immutable selection set.

-- 6. RPC: create_lab_report_share --------------------------------
CREATE OR REPLACE FUNCTION public.create_lab_report_share(
  _sample_id uuid,
  _result_ids uuid[],
  _display_name_mode text DEFAULT 'real',
  _alias_name_snapshot text DEFAULT NULL,
  _source_horse_kind text DEFAULT NULL,
  _source_horse_id uuid DEFAULT NULL,
  _preferred_locale text DEFAULT 'ar',
  _expires_at timestamptz DEFAULT NULL
)
RETURNS public.lab_report_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_caller uuid;
  v_share public.lab_report_shares;
  v_idx int;
  v_result_id uuid;
  v_count int;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _result_ids IS NULL OR array_length(_result_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one result must be selected';
  END IF;

  -- Resolve sample tenant
  SELECT tenant_id INTO v_tenant
  FROM public.lab_samples WHERE id = _sample_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Sample not found';
  END IF;

  IF NOT can_manage_lab(v_caller, v_tenant) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Verify every selected result belongs to this sample/tenant and is final.
  SELECT count(*) INTO v_count
  FROM public.lab_results r
  WHERE r.id = ANY(_result_ids)
    AND r.sample_id = _sample_id
    AND r.tenant_id = v_tenant
    AND r.status = 'final';
  IF v_count <> array_length(_result_ids, 1) THEN
    RAISE EXCEPTION 'One or more selected results are invalid (wrong sample/tenant or not finalized)';
  END IF;

  -- Validation
  IF _display_name_mode NOT IN ('real','alias','sender_snapshot') THEN
    RAISE EXCEPTION 'Invalid display_name_mode';
  END IF;
  IF _display_name_mode = 'alias'
     AND (_alias_name_snapshot IS NULL OR length(btrim(_alias_name_snapshot)) = 0) THEN
    RAISE EXCEPTION 'Alias mode requires alias_name_snapshot';
  END IF;
  IF _preferred_locale NOT IN ('ar','en') THEN
    RAISE EXCEPTION 'Invalid preferred_locale';
  END IF;

  -- Insert parent
  INSERT INTO public.lab_report_shares(
    tenant_id, sample_id,
    display_name_mode, alias_name_snapshot,
    source_horse_kind, source_horse_id,
    preferred_locale, expires_at, created_by
  ) VALUES (
    v_tenant, _sample_id,
    _display_name_mode,
    CASE WHEN _display_name_mode = 'alias' THEN btrim(_alias_name_snapshot) ELSE NULL END,
    _source_horse_kind, _source_horse_id,
    _preferred_locale, _expires_at, v_caller
  )
  RETURNING * INTO v_share;

  -- Insert children with sort_order from array position
  v_idx := 0;
  FOREACH v_result_id IN ARRAY _result_ids LOOP
    INSERT INTO public.lab_report_share_results(report_share_id, result_id, sort_order)
    VALUES (v_share.id, v_result_id, v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_share;
END;
$$;

-- 7. RPC: revoke_lab_report_share --------------------------------
CREATE OR REPLACE FUNCTION public.revoke_lab_report_share(
  _report_share_id uuid
)
RETURNS public.lab_report_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share public.lab_report_shares;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_share FROM public.lab_report_shares WHERE id = _report_share_id;
  IF v_share.id IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;

  IF NOT can_manage_lab(auth.uid(), v_share.tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.lab_report_shares
     SET revoked_at = now()
   WHERE id = _report_share_id
   RETURNING * INTO v_share;

  RETURN v_share;
END;
$$;

-- 8. RPC: get_shared_lab_report (public resolver) ----------------
CREATE OR REPLACE FUNCTION public.get_shared_lab_report(_share_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share public.lab_report_shares;
  v_sample public.lab_samples;
  v_tenant_name text;
  v_client_name text;
  v_horse_display text;
  v_results jsonb;
BEGIN
  IF _share_token IS NULL OR length(_share_token) = 0 THEN
    RAISE EXCEPTION 'Invalid share token';
  END IF;

  SELECT * INTO v_share
  FROM public.lab_report_shares
  WHERE share_token = _share_token;

  IF v_share.id IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  IF v_share.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Share has been revoked';
  END IF;
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at <= now() THEN
    RAISE EXCEPTION 'Share has expired';
  END IF;

  SELECT * INTO v_sample FROM public.lab_samples WHERE id = v_share.sample_id;

  SELECT COALESCE(t.public_name, t.name) INTO v_tenant_name
  FROM public.tenants t WHERE t.id = v_share.tenant_id;

  SELECT COALESCE(c.name, v_sample.client_name) INTO v_client_name
  FROM public.lab_samples ls
  LEFT JOIN public.clients c ON c.id = ls.client_id
  WHERE ls.id = v_share.sample_id;

  -- Compute horse_display_name based on display_name_mode
  IF v_share.display_name_mode = 'alias' AND v_share.alias_name_snapshot IS NOT NULL THEN
    v_horse_display := v_share.alias_name_snapshot;
  ELSIF v_share.display_name_mode = 'sender_snapshot' THEN
    SELECT COALESCE(req.horse_name_snapshot, v_sample.horse_name, 'Unknown Horse')
      INTO v_horse_display
    FROM public.lab_samples ls
    LEFT JOIN public.lab_requests req ON req.id = ls.lab_request_id
    WHERE ls.id = v_share.sample_id;
  ELSE
    SELECT COALESCE(lh.name, h.name, v_sample.horse_name, 'Unknown Horse')
      INTO v_horse_display
    FROM public.lab_samples ls
    LEFT JOIN public.lab_horses lh ON lh.id = ls.lab_horse_id
    LEFT JOIN public.horses h ON h.id = ls.horse_id
    WHERE ls.id = v_share.sample_id;
  END IF;

  -- Build ordered results array (only selected, final)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'result_id', r.id,
        'sort_order', c.sort_order,
        'status', r.status,
        'flags', r.flags,
        'result_data', r.result_data,
        'interpretation', r.interpretation,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'template_id', t.id,
        'template_name', t.name,
        'template_name_ar', t.name_ar,
        'template_fields', t.fields,
        'template_groups', t.groups,
        'template_normal_ranges', t.normal_ranges
      )
      ORDER BY c.sort_order, r.created_at
    ),
    '[]'::jsonb
  ) INTO v_results
  FROM public.lab_report_share_results c
  JOIN public.lab_results r ON r.id = c.result_id
  JOIN public.lab_templates t ON t.id = r.template_id
  WHERE c.report_share_id = v_share.id
    AND r.status = 'final';

  RETURN jsonb_build_object(
    'share', jsonb_build_object(
      'token', v_share.share_token,
      'display_name_mode', v_share.display_name_mode,
      'preferred_locale', v_share.preferred_locale,
      'expires_at', v_share.expires_at,
      'created_at', v_share.created_at
    ),
    'sample', jsonb_build_object(
      'id', v_sample.id,
      'physical_sample_id', v_sample.physical_sample_id,
      'collection_date', v_sample.collection_date,
      'received_at', v_sample.received_at
    ),
    'tenant_display_name', v_tenant_name,
    'client_display_name', CASE WHEN v_share.display_name_mode = 'alias' THEN NULL ELSE v_client_name END,
    'horse_display_name', v_horse_display,
    'results', v_results
  );
END;
$$;

-- Allow anonymous calls to the public resolver only.
GRANT EXECUTE ON FUNCTION public.get_shared_lab_report(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_lab_report_share(uuid, uuid[], text, text, text, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_lab_report_share(uuid) TO authenticated;
