
-- B2.5e Contracts Document System
-- New tables: contract_templates, contract_template_versions, contract_documents, contract_document_events
-- Plus enums, RPCs, permissions. No changes to existing boarding_contracts.

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.contract_type AS ENUM ('boarding','training','reproduction','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_template_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_template_version_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_document_status AS ENUM (
    'draft','sent_for_review','approved','rejected','cancelled','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_document_event_type AS ENUM (
    'created','edited','published_template','generated_from_template',
    'sent_for_review','approved','rejected','cancelled','archived','cloned','exported_pdf','linked_boarding'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLE: contract_templates ============
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_type public.contract_type NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  status public.contract_template_status NOT NULL DEFAULT 'draft',
  current_version_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_templates_tenant ON public.contract_templates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON public.contract_templates(tenant_id, contract_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'contracts.templates.view'));

CREATE POLICY "templates_insert" ON public.contract_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'contracts.templates.create'));

CREATE POLICY "templates_update" ON public.contract_templates
  FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'contracts.templates.edit'))
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'contracts.templates.edit'));

CREATE POLICY "templates_delete" ON public.contract_templates
  FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'contracts.templates.archive'));

-- ============ TABLE: contract_template_versions ============
CREATE TABLE IF NOT EXISTS public.contract_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  document_schema_version INTEGER NOT NULL DEFAULT 1,
  body_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.contract_template_version_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_ctv_template ON public.contract_template_versions(template_id, status);
-- one published current per template
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ctv_one_published ON public.contract_template_versions(template_id)
  WHERE status = 'published';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_template_versions TO authenticated;
GRANT ALL ON public.contract_template_versions TO service_role;
ALTER TABLE public.contract_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctv_select" ON public.contract_template_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contract_templates t
    WHERE t.id = template_id
      AND public.has_permission(auth.uid(), t.tenant_id, 'contracts.templates.view')
  ));

CREATE POLICY "ctv_insert" ON public.contract_template_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contract_templates t
    WHERE t.id = template_id
      AND public.has_permission(auth.uid(), t.tenant_id, 'contracts.templates.edit')
  ));

CREATE POLICY "ctv_update" ON public.contract_template_versions
  FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.contract_templates t
      WHERE t.id = template_id
        AND public.has_permission(auth.uid(), t.tenant_id, 'contracts.templates.edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contract_templates t
      WHERE t.id = template_id
        AND public.has_permission(auth.uid(), t.tenant_id, 'contracts.templates.edit')
    )
  );

-- No DELETE policy: published versions are immutable; drafts can be deleted via service-role RPC only.

-- FK current_version_id (after versions table exists)
ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.contract_template_versions(id) ON DELETE SET NULL;

-- ============ TABLE: contract_documents ============
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_type public.contract_type NOT NULL,
  source_template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  source_template_version_id UUID REFERENCES public.contract_template_versions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  boarding_contract_id UUID REFERENCES public.boarding_contracts(id) ON DELETE SET NULL,
  recipient_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  status public.contract_document_status NOT NULL DEFAULT 'draft',
  document_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  variable_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_json JSONB,
  snapshot_taken_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cd_tenant ON public.contract_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cd_recipient ON public.contract_documents(recipient_tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cd_boarding ON public.contract_documents(boarding_contract_id);
CREATE INDEX IF NOT EXISTS idx_cd_type ON public.contract_documents(tenant_id, contract_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_documents TO authenticated;
GRANT ALL ON public.contract_documents TO service_role;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- Stable side (owner tenant) can view their own documents
CREATE POLICY "cd_select_owner_side" ON public.contract_documents
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), tenant_id, 'contracts.documents.view'));

-- Recipient tenant (horse owner) can view only after sent, with view permission in recipient tenant
CREATE POLICY "cd_select_recipient_side" ON public.contract_documents
  FOR SELECT TO authenticated
  USING (
    recipient_tenant_id IS NOT NULL
    AND status IN ('sent_for_review','approved','rejected','archived')
    AND public.has_permission(auth.uid(), recipient_tenant_id, 'contracts.documents.view')
  );

CREATE POLICY "cd_insert" ON public.contract_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'contracts.documents.create'));

-- Only draft documents can be updated directly (UI inline edits); lifecycle changes go through RPCs
CREATE POLICY "cd_update_draft" ON public.contract_documents
  FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND public.has_permission(auth.uid(), tenant_id, 'contracts.documents.edit')
  )
  WITH CHECK (public.has_permission(auth.uid(), tenant_id, 'contracts.documents.edit'));

-- ============ TABLE: contract_document_events ============
CREATE TABLE IF NOT EXISTS public.contract_document_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  event_type public.contract_document_event_type NOT NULL,
  actor_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cde_document ON public.contract_document_events(document_id, created_at DESC);

GRANT SELECT, INSERT ON public.contract_document_events TO authenticated;
GRANT ALL ON public.contract_document_events TO service_role;
ALTER TABLE public.contract_document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cde_select" ON public.contract_document_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contract_documents d
    WHERE d.id = document_id
      AND (
        public.has_permission(auth.uid(), d.tenant_id, 'contracts.documents.view')
        OR (
          d.recipient_tenant_id IS NOT NULL
          AND d.status IN ('sent_for_review','approved','rejected','archived')
          AND public.has_permission(auth.uid(), d.recipient_tenant_id, 'contracts.documents.view')
        )
      )
  ));

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ct_updated_at ON public.contract_templates;
CREATE TRIGGER trg_ct_updated_at BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_ctv_updated_at ON public.contract_template_versions;
CREATE TRIGGER trg_ctv_updated_at BEFORE UPDATE ON public.contract_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_cd_updated_at ON public.contract_documents;
CREATE TRIGGER trg_cd_updated_at BEFORE UPDATE ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ PERMISSION DEFINITIONS (13 keys) ============
INSERT INTO public.permission_definitions (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable) VALUES
  ('contracts.templates.view',     'contracts','templates','view',     'View contract templates','عرض قوالب العقود','View contract templates','عرض قوالب العقود',true),
  ('contracts.templates.create',   'contracts','templates','create',   'Create contract templates','إنشاء قوالب العقود','Create new contract templates','إنشاء قوالب جديدة للعقود',true),
  ('contracts.templates.edit',     'contracts','templates','edit',     'Edit contract templates','تعديل قوالب العقود','Edit draft contract templates','تعديل قوالب العقود المسودة',true),
  ('contracts.templates.publish',  'contracts','templates','publish',  'Publish contract templates','نشر قوالب العقود','Publish contract template versions','نشر إصدارات قوالب العقود',true),
  ('contracts.templates.archive',  'contracts','templates','archive',  'Archive contract templates','أرشفة قوالب العقود','Archive contract templates','أرشفة قوالب العقود',true),
  ('contracts.documents.view',     'contracts','documents','view',     'View contract documents','عرض مستندات العقود','View contract documents','عرض مستندات العقود',true),
  ('contracts.documents.create',   'contracts','documents','create',   'Create contract documents','إنشاء مستندات العقود','Create contract documents','إنشاء مستندات العقود',true),
  ('contracts.documents.edit',     'contracts','documents','edit',     'Edit contract documents','تعديل مستندات العقود','Edit draft contract documents','تعديل مسودات مستندات العقود',true),
  ('contracts.documents.send',     'contracts','documents','send',     'Send contract documents','إرسال مستندات العقود','Send contract documents for review','إرسال مستندات العقود للمراجعة',true),
  ('contracts.documents.approve',  'contracts','documents','approve',  'Approve contract documents','اعتماد مستندات العقود','Approve received contract documents','اعتماد المستندات المستلمة',true),
  ('contracts.documents.reject',   'contracts','documents','reject',   'Reject contract documents','رفض مستندات العقود','Reject received contract documents','رفض المستندات المستلمة',true),
  ('contracts.documents.archive',  'contracts','documents','archive',  'Archive contract documents','أرشفة مستندات العقود','Archive contract documents','أرشفة مستندات العقود',true),
  ('contracts.documents.export',   'contracts','documents','export',   'Export contract documents','تصدير مستندات العقود','Export/print contract documents','تصدير أو طباعة مستندات العقود',true)
ON CONFLICT (key) DO NOTHING;

-- ============ RPCs ============

-- Create template (returns id)
CREATE OR REPLACE FUNCTION public.create_contract_template(
  _tenant_id UUID, _contract_type public.contract_type,
  _name TEXT, _name_ar TEXT DEFAULT NULL,
  _description TEXT DEFAULT NULL, _description_ar TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid UUID; _vid UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), _tenant_id, 'contracts.templates.create') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.contract_templates(tenant_id, contract_type, name, name_ar, description, description_ar, created_by)
    VALUES (_tenant_id, _contract_type, _name, _name_ar, _description, _description_ar, auth.uid())
    RETURNING id INTO _tid;
  INSERT INTO public.contract_template_versions(template_id, version_no, created_by)
    VALUES (_tid, 1, auth.uid()) RETURNING id INTO _vid;
  UPDATE public.contract_templates SET current_version_id = _vid WHERE id = _tid;
  RETURN _tid;
END $$;

-- Save draft body for a template (works on current draft version; creates new draft if current is published)
CREATE OR REPLACE FUNCTION public.save_contract_template_draft(
  _template_id UUID, _body_json JSONB, _variables_json JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID; _draft_id UUID; _next_no INTEGER;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.contract_templates WHERE id = _template_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _tenant, 'contracts.templates.edit') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  SELECT id INTO _draft_id FROM public.contract_template_versions
    WHERE template_id = _template_id AND status = 'draft'
    ORDER BY version_no DESC LIMIT 1;
  IF _draft_id IS NULL THEN
    SELECT COALESCE(MAX(version_no),0)+1 INTO _next_no FROM public.contract_template_versions WHERE template_id = _template_id;
    INSERT INTO public.contract_template_versions(template_id, version_no, body_json, variables_json, created_by)
      VALUES (_template_id, _next_no, _body_json, _variables_json, auth.uid()) RETURNING id INTO _draft_id;
  ELSE
    UPDATE public.contract_template_versions
      SET body_json = _body_json, variables_json = _variables_json
      WHERE id = _draft_id;
  END IF;
  RETURN _draft_id;
END $$;

-- Publish the current draft version
CREATE OR REPLACE FUNCTION public.publish_contract_template_version(
  _version_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID; _template UUID;
BEGIN
  SELECT t.tenant_id, t.id INTO _tenant, _template
    FROM public.contract_template_versions v
    JOIN public.contract_templates t ON t.id = v.template_id
    WHERE v.id = _version_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _tenant, 'contracts.templates.publish') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  -- Archive previously published versions for this template
  UPDATE public.contract_template_versions
    SET status = 'archived'
    WHERE template_id = _template AND status = 'published';
  UPDATE public.contract_template_versions
    SET status = 'published', published_at = now(), published_by = auth.uid()
    WHERE id = _version_id;
  UPDATE public.contract_templates
    SET current_version_id = _version_id, status = 'published'
    WHERE id = _template;
END $$;

-- Archive a template
CREATE OR REPLACE FUNCTION public.archive_contract_template(_template_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.contract_templates WHERE id = _template_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _tenant, 'contracts.templates.archive') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.contract_templates SET status = 'archived' WHERE id = _template_id;
END $$;

-- Clone a template (creates a new draft template with copy of latest version)
CREATE OR REPLACE FUNCTION public.clone_contract_template(_template_id UUID, _new_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID; _ctype public.contract_type; _src public.contract_template_versions%ROWTYPE;
        _new_t UUID; _new_v UUID;
BEGIN
  SELECT tenant_id, contract_type INTO _tenant, _ctype FROM public.contract_templates WHERE id = _template_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _tenant, 'contracts.templates.create') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO _src FROM public.contract_template_versions
    WHERE template_id = _template_id ORDER BY version_no DESC LIMIT 1;
  INSERT INTO public.contract_templates(tenant_id, contract_type, name, created_by)
    VALUES (_tenant, _ctype, _new_name, auth.uid()) RETURNING id INTO _new_t;
  INSERT INTO public.contract_template_versions(template_id, version_no, body_json, variables_json, created_by)
    VALUES (_new_t, 1, COALESCE(_src.body_json,'{"type":"doc","content":[]}'::jsonb),
            COALESCE(_src.variables_json,'[]'::jsonb), auth.uid()) RETURNING id INTO _new_v;
  UPDATE public.contract_templates SET current_version_id = _new_v WHERE id = _new_t;
  RETURN _new_t;
END $$;

-- Create document from template
CREATE OR REPLACE FUNCTION public.create_contract_document_from_template(
  _tenant_id UUID, _template_id UUID, _title TEXT, _title_ar TEXT DEFAULT NULL,
  _boarding_contract_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ctype public.contract_type; _vid UUID; _body JSONB; _vars JSONB;
        _recipient UUID; _doc UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), _tenant_id, 'contracts.documents.create') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  SELECT t.contract_type, t.current_version_id INTO _ctype, _vid
    FROM public.contract_templates t WHERE t.id = _template_id AND t.tenant_id = _tenant_id;
  IF _vid IS NULL THEN RAISE EXCEPTION 'template_has_no_published_version'; END IF;
  SELECT body_json, variables_json INTO _body, _vars
    FROM public.contract_template_versions WHERE id = _vid;
  -- Derive recipient tenant from boarding contract if provided
  IF _boarding_contract_id IS NOT NULL THEN
    SELECT CASE WHEN bc.stable_tenant_id = _tenant_id THEN bc.owner_tenant_id
                ELSE bc.stable_tenant_id END
      INTO _recipient FROM public.boarding_contracts bc WHERE bc.id = _boarding_contract_id;
  END IF;
  INSERT INTO public.contract_documents(
    tenant_id, contract_type, source_template_id, source_template_version_id,
    title, title_ar, boarding_contract_id, recipient_tenant_id,
    document_json, variables_json, created_by
  ) VALUES (
    _tenant_id, _ctype, _template_id, _vid,
    _title, _title_ar, _boarding_contract_id, _recipient,
    _body, _vars, auth.uid()
  ) RETURNING id INTO _doc;
  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id, metadata)
    VALUES (_doc, 'generated_from_template', _tenant_id, auth.uid(),
            jsonb_build_object('template_id', _template_id, 'version_id', _vid));
  RETURN _doc;
END $$;

-- Create blank document
CREATE OR REPLACE FUNCTION public.create_contract_document_blank(
  _tenant_id UUID, _contract_type public.contract_type, _title TEXT, _title_ar TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _doc UUID;
BEGIN
  IF NOT public.has_permission(auth.uid(), _tenant_id, 'contracts.documents.create') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.contract_documents(tenant_id, contract_type, title, title_ar, created_by)
    VALUES (_tenant_id, _contract_type, _title, _title_ar, auth.uid()) RETURNING id INTO _doc;
  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id)
    VALUES (_doc, 'created', _tenant_id, auth.uid());
  RETURN _doc;
END $$;

-- Save draft document
CREATE OR REPLACE FUNCTION public.save_contract_document_draft(
  _document_id UUID, _document_json JSONB, _variables_json JSONB, _variable_values JSONB
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID; _status public.contract_document_status;
BEGIN
  SELECT tenant_id, status INTO _tenant, _status FROM public.contract_documents WHERE id = _document_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _tenant, 'contracts.documents.edit') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  IF _status <> 'draft' THEN RAISE EXCEPTION 'only_draft_editable'; END IF;
  UPDATE public.contract_documents
    SET document_json = _document_json,
        variables_json = _variables_json,
        variable_values = COALESCE(_variable_values, '{}'::jsonb)
    WHERE id = _document_id;
END $$;

-- Send for review (atomic: freeze snapshot, set status, log event, optionally set recipient)
CREATE OR REPLACE FUNCTION public.send_contract_document_for_review(
  _document_id UUID, _recipient_tenant_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant UUID; _doc public.contract_documents%ROWTYPE; _snapshot JSONB;
        _vars JSONB; _values JSONB; _v JSONB; _key TEXT; _required BOOLEAN;
BEGIN
  SELECT * INTO _doc FROM public.contract_documents WHERE id = _document_id;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _doc.tenant_id, 'contracts.documents.send') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  IF _doc.status <> 'draft' THEN RAISE EXCEPTION 'not_in_draft'; END IF;

  _vars := COALESCE(_doc.variables_json, '[]'::jsonb);
  _values := COALESCE(_doc.variable_values, '{}'::jsonb);
  -- Validate required variables present
  FOR _v IN SELECT * FROM jsonb_array_elements(_vars) LOOP
    _key := _v->>'key';
    _required := COALESCE((_v->>'required')::boolean, false);
    IF _required AND (NOT (_values ? _key) OR (_values->>_key) IS NULL OR length(trim(_values->>_key))=0) THEN
      RAISE EXCEPTION 'missing_required_variable: %', _key;
    END IF;
  END LOOP;

  _snapshot := jsonb_build_object(
    'schema_version', 1,
    'frozen_at', now(),
    'document_json', _doc.document_json,
    'variables_json', _vars,
    'variable_values', _values,
    'title', _doc.title,
    'title_ar', _doc.title_ar
  );

  UPDATE public.contract_documents
    SET status = 'sent_for_review',
        snapshot_json = _snapshot,
        snapshot_taken_at = now(),
        sent_at = now(),
        sent_by = auth.uid(),
        recipient_tenant_id = COALESCE(_recipient_tenant_id, recipient_tenant_id)
    WHERE id = _document_id;

  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id)
    VALUES (_document_id, 'sent_for_review', _doc.tenant_id, auth.uid());
END $$;

-- Approve
CREATE OR REPLACE FUNCTION public.approve_contract_document(_document_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _doc public.contract_documents%ROWTYPE;
BEGIN
  SELECT * INTO _doc FROM public.contract_documents WHERE id = _document_id;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _doc.recipient_tenant_id IS NULL
     OR NOT public.has_permission(auth.uid(), _doc.recipient_tenant_id, 'contracts.documents.approve') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  IF _doc.status <> 'sent_for_review' THEN RAISE EXCEPTION 'not_sent_for_review'; END IF;
  UPDATE public.contract_documents
    SET status='approved', approved_at = now(), approved_by = auth.uid()
    WHERE id = _document_id;
  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id)
    VALUES (_document_id, 'approved', _doc.recipient_tenant_id, auth.uid());
END $$;

-- Reject
CREATE OR REPLACE FUNCTION public.reject_contract_document(_document_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _doc public.contract_documents%ROWTYPE;
BEGIN
  SELECT * INTO _doc FROM public.contract_documents WHERE id = _document_id;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _doc.recipient_tenant_id IS NULL
     OR NOT public.has_permission(auth.uid(), _doc.recipient_tenant_id, 'contracts.documents.reject') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  IF _doc.status <> 'sent_for_review' THEN RAISE EXCEPTION 'not_sent_for_review'; END IF;
  UPDATE public.contract_documents
    SET status='rejected', rejected_at = now(), rejected_by = auth.uid(), rejection_reason = _reason
    WHERE id = _document_id;
  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id, metadata)
    VALUES (_document_id, 'rejected', _doc.recipient_tenant_id, auth.uid(), jsonb_build_object('reason', _reason));
END $$;

-- Archive document
CREATE OR REPLACE FUNCTION public.archive_contract_document(_document_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _doc public.contract_documents%ROWTYPE;
BEGIN
  SELECT * INTO _doc FROM public.contract_documents WHERE id = _document_id;
  IF _doc.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT public.has_permission(auth.uid(), _doc.tenant_id, 'contracts.documents.archive') THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  UPDATE public.contract_documents SET status='archived' WHERE id=_document_id;
  INSERT INTO public.contract_document_events(document_id, event_type, actor_tenant_id, actor_user_id)
    VALUES (_document_id, 'archived', _doc.tenant_id, auth.uid());
END $$;
