-- WS-DH-2026-0006 / RM-DH-004 Phase 2 / Stage 2 / Slice 3A Part A
-- Shared Historical Import Core Control Plane - Schema Foundation only.
-- Zero policies, zero functions, zero triggers, zero DML, deny-all ACL.

-- =====================================================================
-- 1. FAIL-CLOSED PRECONDITION BLOCK
-- =====================================================================
DO $$
DECLARE
  v_expected_default_grantees text[] := ARRAY['anon','authenticated','postgres','sandbox_exec','sandbox_exec_vhxglsvxwwpmoqjabfmj','service_role'];
  v_actual_default_grantees text[];
  v_role text;
BEGIN
  -- Migration authority
  IF NOT has_schema_privilege(current_user, 'public', 'CREATE') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: migration authority lacks CREATE on schema public (current_user=%)', current_user;
  END IF;
  IF NOT pg_has_role(current_user, 'postgres', 'MEMBER') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: migration authority % is not a member of postgres', current_user;
  END IF;

  -- No pre-existing import substrate
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: an import_%% relation already exists in schema public';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname LIKE 'import\_%') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: an import_%% function already exists in schema public';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'import\_%') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: an import_%% policy already exists';
  END IF;
  IF EXISTS (SELECT 1 FROM public.permission_definitions WHERE key LIKE 'import%') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: an import permission key already exists';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id ILIKE '%import%') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: an import storage bucket already exists';
  END IF;

  -- Tenant anchor
  IF to_regclass('public.tenants') IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: public.tenants does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute
                 WHERE attrelid = 'public.tenants'::regclass AND attname = 'id'
                   AND format_type(atttypid, NULL) = 'uuid') THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: public.tenants.id is not uuid';
  END IF;
  IF to_regprocedure('public.gen_random_uuid()') IS NULL
     AND to_regprocedure('extensions.gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: gen_random_uuid() is not available';
  END IF;

  -- Restricted roles exist
  FOREACH v_role IN ARRAY ARRAY['anon','authenticated','service_role','sandbox_exec','sandbox_exec_vhxglsvxwwpmoqjabfmj'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      RAISE EXCEPTION 'PRECONDITION FAILED: expected restricted role % does not exist', v_role;
    END IF;
  END LOOP;

  -- Default ACL automatic grantees on new public tables owned by postgres
  SELECT array_agg(DISTINCT g ORDER BY g) INTO v_actual_default_grantees
  FROM (
    SELECT split_part(unnest(d.defaclacl)::text, '=', 1) AS g
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname = 'public' AND d.defaclobjtype = 'r'
      AND pg_get_userbyid(d.defaclrole) = 'postgres'
  ) s;
  IF v_actual_default_grantees IS DISTINCT FROM v_expected_default_grantees THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: default ACL grantees drifted: %', v_actual_default_grantees;
  END IF;
END $$;

-- =====================================================================
-- 2. TABLE 1 - public.import_batches
-- =====================================================================
CREATE TABLE public.import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  batch_code text NOT NULL,
  title text NOT NULL,
  description text NULL,
  domain_code text NOT NULL DEFAULT 'finance',
  status text NOT NULL DEFAULT 'DRAFT',
  declared_total_amount numeric(14,2) NULL,
  declared_currency text NULL,
  declared_record_count integer NULL,
  source_owner_note text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz NULL,
  CONSTRAINT import_batches_pkey PRIMARY KEY (id),
  CONSTRAINT import_batches_tenant_id_key UNIQUE (tenant_id, id),
  CONSTRAINT import_batches_tenant_batch_code_key UNIQUE (tenant_id, batch_code),
  CONSTRAINT import_batches_tenant_fk FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id) ON DELETE RESTRICT,
  CONSTRAINT import_batches_batch_code_nonblank_chk CHECK (btrim(batch_code) <> ''),
  CONSTRAINT import_batches_title_nonblank_chk CHECK (btrim(title) <> ''),
  CONSTRAINT import_batches_domain_code_chk CHECK (domain_code ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT import_batches_declared_total_amount_chk CHECK (declared_total_amount IS NULL OR declared_total_amount >= 0),
  CONSTRAINT import_batches_declared_record_count_chk CHECK (declared_record_count IS NULL OR declared_record_count >= 0),
  CONSTRAINT import_batches_declared_currency_chk CHECK (declared_currency IS NULL OR declared_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT import_batches_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT import_batches_status_chk CHECK (status IN (
    'DRAFT','VALIDATING','REVIEW_REQUIRED','READY_FOR_DRY_RUN','DRY_RUN_COMPLETE',
    'AWAITING_APPROVAL','APPROVED','POST_AUTHORIZED','POSTING','POSTED','RECONCILED',
    'FAILED','CANCELLED','ROLLBACK_REQUESTED','ROLLBACK_APPROVED','REVERSING','REVERSED')),
  CONSTRAINT import_batches_cancelled_at_status_chk CHECK (cancelled_at IS NULL OR status = 'CANCELLED')
);

CREATE INDEX import_batches_tenant_status_created_idx
  ON public.import_batches (tenant_id, status, created_at DESC);

-- =====================================================================
-- 3. TABLE 2 - public.import_source_files
-- =====================================================================
CREATE TABLE public.import_source_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  original_filename text NOT NULL,
  byte_size bigint NOT NULL,
  sha256_hex text NOT NULL,
  declared_mime text NULL,
  detected_mime text NULL,
  mime_verified_at timestamptz NULL,
  storage_bucket text NULL,
  storage_object_path text NULL,
  scan_status text NOT NULL DEFAULT 'PENDING_SCAN',
  scanner_name text NULL,
  scanner_version text NULL,
  scanned_at timestamptz NULL,
  quarantine_status text NOT NULL DEFAULT 'NONE',
  legal_hold boolean NOT NULL DEFAULT false,
  legal_hold_reason text NULL,
  legal_hold_set_at timestamptz NULL,
  legal_hold_set_by uuid NULL,
  retention_class text NULL,
  retention_expires_at timestamptz NULL,
  uploaded_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_source_files_pkey PRIMARY KEY (id),
  CONSTRAINT import_source_files_tenant_id_key UNIQUE (tenant_id, id),
  CONSTRAINT import_source_files_tenant_sha256_key UNIQUE (tenant_id, sha256_hex),
  CONSTRAINT import_source_files_tenant_fk FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id) ON DELETE RESTRICT,
  CONSTRAINT import_source_files_filename_nonblank_chk CHECK (btrim(original_filename) <> ''),
  CONSTRAINT import_source_files_byte_size_chk CHECK (byte_size > 0),
  CONSTRAINT import_source_files_sha256_hex_chk CHECK (sha256_hex ~ '^[0-9a-f]{64}$'),
  CONSTRAINT import_source_files_scan_status_chk CHECK (scan_status IN
    ('PENDING_SCAN','CLEAN','INFECTED','SCAN_FAILED','UNSUPPORTED','CORRUPT')),
  CONSTRAINT import_source_files_quarantine_status_chk CHECK (quarantine_status IN ('NONE','SOFT','HARD')),
  CONSTRAINT import_source_files_scanner_consistency_chk CHECK (
    (scan_status = 'PENDING_SCAN' AND scanned_at IS NULL AND scanner_name IS NULL AND scanner_version IS NULL)
    OR (scan_status <> 'PENDING_SCAN' AND scanned_at IS NOT NULL AND btrim(coalesce(scanner_name,'')) <> '')
  ),
  CONSTRAINT import_source_files_legal_hold_consistency_chk CHECK (
    (legal_hold = false AND legal_hold_reason IS NULL AND legal_hold_set_at IS NULL AND legal_hold_set_by IS NULL)
    OR (legal_hold = true AND btrim(coalesce(legal_hold_reason,'')) <> '' AND legal_hold_set_at IS NOT NULL)
  )
);

CREATE INDEX import_source_files_tenant_scan_status_idx
  ON public.import_source_files (tenant_id, scan_status) WHERE scan_status <> 'CLEAN';
CREATE INDEX import_source_files_tenant_quarantine_status_idx
  ON public.import_source_files (tenant_id, quarantine_status) WHERE quarantine_status <> 'NONE';

-- =====================================================================
-- 4. TABLE 3 - public.import_batch_files
-- =====================================================================
CREATE TABLE public.import_batch_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  source_file_id uuid NOT NULL,
  ordinal integer NOT NULL,
  role text NOT NULL DEFAULT 'primary',
  processing_status text NOT NULL DEFAULT 'REGISTERED',
  reprocess_of_id uuid NULL,
  duplicate_of_id uuid NULL,
  duplicate_acknowledged_by uuid NULL,
  duplicate_acknowledged_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batch_files_pkey PRIMARY KEY (id),
  CONSTRAINT import_batch_files_tenant_batch_id_key UNIQUE (tenant_id, batch_id, id),
  CONSTRAINT import_batch_files_tenant_batch_ordinal_key UNIQUE (tenant_id, batch_id, ordinal),
  CONSTRAINT import_batch_files_batch_fk FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.import_batches(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_batch_files_source_file_fk FOREIGN KEY (tenant_id, source_file_id)
    REFERENCES public.import_source_files(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_batch_files_reprocess_of_fk FOREIGN KEY (tenant_id, batch_id, reprocess_of_id)
    REFERENCES public.import_batch_files(tenant_id, batch_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_batch_files_duplicate_of_fk FOREIGN KEY (tenant_id, batch_id, duplicate_of_id)
    REFERENCES public.import_batch_files(tenant_id, batch_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_batch_files_ordinal_chk CHECK (ordinal >= 0),
  CONSTRAINT import_batch_files_role_chk CHECK (role IN ('primary','supporting','evidence')),
  CONSTRAINT import_batch_files_processing_status_chk CHECK (processing_status IN
    ('REGISTERED','EXTRACTING','STAGED','FAILED','CANCELLED','SUPERSEDED')),
  CONSTRAINT import_batch_files_no_self_reprocess_chk CHECK (reprocess_of_id IS NULL OR reprocess_of_id <> id),
  CONSTRAINT import_batch_files_no_self_duplicate_chk CHECK (duplicate_of_id IS NULL OR duplicate_of_id <> id),
  CONSTRAINT import_batch_files_duplicate_ack_consistency_chk CHECK (
    (duplicate_acknowledged_by IS NULL AND duplicate_acknowledged_at IS NULL)
    OR (duplicate_acknowledged_by IS NOT NULL AND duplicate_acknowledged_at IS NOT NULL)),
  CONSTRAINT import_batch_files_lineage_exclusive_chk CHECK (
    reprocess_of_id IS NULL OR duplicate_of_id IS NULL)
);

CREATE UNIQUE INDEX import_batch_files_tenant_batch_source_uidx
  ON public.import_batch_files (tenant_id, batch_id, source_file_id) WHERE reprocess_of_id IS NULL;
CREATE INDEX import_batch_files_tenant_source_file_idx
  ON public.import_batch_files (tenant_id, source_file_id);
CREATE INDEX import_batch_files_tenant_active_processing_idx
  ON public.import_batch_files (tenant_id, processing_status)
  WHERE processing_status IN ('REGISTERED','EXTRACTING');

-- =====================================================================
-- 5. TABLE 4 - public.import_staging_rows
-- =====================================================================
CREATE TABLE public.import_staging_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  batch_file_id uuid NOT NULL,
  source_locator jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ordinal integer NOT NULL,
  raw_payload jsonb NOT NULL,
  canonical_payload jsonb NULL,
  canonical_hash text NULL,
  row_status text NOT NULL DEFAULT 'STAGED',
  extraction_version integer NOT NULL DEFAULT 1,
  correction_version integer NOT NULL DEFAULT 0,
  confidence numeric(5,4) NULL,
  confidence_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  supersedes_row_id uuid NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_staging_rows_pkey PRIMARY KEY (id),
  CONSTRAINT import_staging_rows_tenant_batch_file_id_key UNIQUE (tenant_id, batch_id, batch_file_id, id),
  CONSTRAINT import_staging_rows_version_key UNIQUE (tenant_id, batch_file_id, source_ordinal, extraction_version, correction_version),
  CONSTRAINT import_staging_rows_batch_fk FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.import_batches(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_staging_rows_batch_file_fk FOREIGN KEY (tenant_id, batch_id, batch_file_id)
    REFERENCES public.import_batch_files(tenant_id, batch_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_staging_rows_supersedes_fk FOREIGN KEY (tenant_id, batch_id, batch_file_id, supersedes_row_id)
    REFERENCES public.import_staging_rows(tenant_id, batch_id, batch_file_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_staging_rows_source_ordinal_chk CHECK (source_ordinal >= 0),
  CONSTRAINT import_staging_rows_extraction_version_chk CHECK (extraction_version >= 1),
  CONSTRAINT import_staging_rows_correction_version_chk CHECK (correction_version >= 0),
  CONSTRAINT import_staging_rows_confidence_chk CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT import_staging_rows_source_locator_object_chk CHECK (jsonb_typeof(source_locator) = 'object'),
  CONSTRAINT import_staging_rows_raw_payload_object_chk CHECK (jsonb_typeof(raw_payload) = 'object'),
  CONSTRAINT import_staging_rows_canonical_payload_object_chk CHECK (canonical_payload IS NULL OR jsonb_typeof(canonical_payload) = 'object'),
  CONSTRAINT import_staging_rows_confidence_evidence_object_chk CHECK (jsonb_typeof(confidence_evidence) = 'object'),
  CONSTRAINT import_staging_rows_canonical_hash_chk CHECK (canonical_hash IS NULL OR canonical_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT import_staging_rows_row_status_chk CHECK (row_status IN
    ('STAGED','VALIDATING','REVIEW_REQUIRED','READY','QUARANTINED','EXCLUDED','SUPERSEDED')),
  CONSTRAINT import_staging_rows_no_self_supersede_chk CHECK (supersedes_row_id IS NULL OR supersedes_row_id <> id)
);

CREATE INDEX import_staging_rows_tenant_batch_status_idx
  ON public.import_staging_rows (tenant_id, batch_id, row_status);
CREATE INDEX import_staging_rows_tenant_file_ordinal_idx
  ON public.import_staging_rows (tenant_id, batch_file_id, source_ordinal);
CREATE INDEX import_staging_rows_tenant_canonical_hash_idx
  ON public.import_staging_rows (tenant_id, canonical_hash) WHERE canonical_hash IS NOT NULL;

-- =====================================================================
-- 6. TABLE 5 - public.import_issues
-- =====================================================================
CREATE TABLE public.import_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  batch_file_id uuid NULL,
  staging_row_id uuid NULL,
  scope text NOT NULL,
  field_path text NULL,
  issue_code text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_owner_explanation text NULL,
  resolution_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  resolved_by uuid NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_issues_pkey PRIMARY KEY (id),
  CONSTRAINT import_issues_tenant_id_key UNIQUE (tenant_id, id),
  CONSTRAINT import_issues_batch_fk FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.import_batches(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_issues_batch_file_fk FOREIGN KEY (tenant_id, batch_id, batch_file_id)
    REFERENCES public.import_batch_files(tenant_id, batch_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_issues_staging_row_fk FOREIGN KEY (tenant_id, batch_id, batch_file_id, staging_row_id)
    REFERENCES public.import_staging_rows(tenant_id, batch_id, batch_file_id, id) ON DELETE RESTRICT,
  CONSTRAINT import_issues_issue_code_nonblank_chk CHECK (btrim(issue_code) <> ''),
  CONSTRAINT import_issues_detail_object_chk CHECK (jsonb_typeof(detail) = 'object'),
  CONSTRAINT import_issues_resolution_evidence_object_chk CHECK (jsonb_typeof(resolution_evidence) = 'object'),
  CONSTRAINT import_issues_scope_chk CHECK (scope IN ('batch','file','section','row','field')),
  CONSTRAINT import_issues_severity_chk CHECK (severity IN ('info','warning','blocking')),
  CONSTRAINT import_issues_status_chk CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED','WAIVED')),
  CONSTRAINT import_issues_resolution_consistency_chk CHECK (
    (resolved_by IS NULL AND resolved_at IS NULL) OR (resolved_by IS NOT NULL AND resolved_at IS NOT NULL)),
  CONSTRAINT import_issues_resolved_requires_evidence_chk CHECK (
    status <> 'RESOLVED' OR (resolved_at IS NOT NULL AND resolution_evidence <> '{}'::jsonb)),
  CONSTRAINT import_issues_blocking_not_waived_chk CHECK (NOT (severity = 'blocking' AND status = 'WAIVED')),
  CONSTRAINT import_issues_scope_relationship_chk CHECK (
    (scope = 'batch' AND batch_file_id IS NULL AND staging_row_id IS NULL)
    OR (scope IN ('file','section') AND batch_file_id IS NOT NULL AND staging_row_id IS NULL)
    OR (scope IN ('row','field') AND batch_file_id IS NOT NULL AND staging_row_id IS NOT NULL)),
  CONSTRAINT import_issues_field_path_chk CHECK (
    scope <> 'field' OR btrim(coalesce(field_path,'')) <> '')
);

CREATE INDEX import_issues_tenant_batch_status_severity_idx
  ON public.import_issues (tenant_id, batch_id, status, severity);
CREATE INDEX import_issues_tenant_staging_row_idx
  ON public.import_issues (tenant_id, staging_row_id) WHERE staging_row_id IS NOT NULL;
CREATE INDEX import_issues_tenant_batch_file_idx
  ON public.import_issues (tenant_id, batch_file_id) WHERE batch_file_id IS NOT NULL;

-- =====================================================================
-- 7. TABLE 6 - public.import_events
-- =====================================================================
CREATE TABLE public.import_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  prior_state text NULL,
  resulting_state text NULL,
  actor_id uuid NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_events_pkey PRIMARY KEY (id),
  CONSTRAINT import_events_tenant_fk FOREIGN KEY (tenant_id)
    REFERENCES public.tenants(id) ON DELETE RESTRICT,
  CONSTRAINT import_events_event_type_nonblank_chk CHECK (btrim(event_type) <> ''),
  CONSTRAINT import_events_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT import_events_aggregate_type_chk CHECK (aggregate_type IN
    ('batch','source_file','batch_file','staging_row','issue'))
);

CREATE INDEX import_events_tenant_aggregate_occurred_idx
  ON public.import_events (tenant_id, aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX import_events_correlation_idx
  ON public.import_events (correlation_id) WHERE correlation_id IS NOT NULL;

-- =====================================================================
-- 8. ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY (zero policies)
-- =====================================================================
ALTER TABLE public.import_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_files  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_staging_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_issues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_events       ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.import_batches      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_source_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_files  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_staging_rows FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_issues       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.import_events       FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- 9. DENY-ALL DIRECT TABLE PRIVILEGES (no grants issued)
-- =====================================================================
REVOKE ALL ON TABLE
  public.import_batches, public.import_source_files, public.import_batch_files,
  public.import_staging_rows, public.import_issues, public.import_events
FROM PUBLIC, anon, authenticated, service_role, sandbox_exec, sandbox_exec_vhxglsvxwwpmoqjabfmj;

-- =====================================================================
-- 10. CATALOG-ONLY POSTCONDITION GUARD
-- =====================================================================
DO $$
DECLARE
  v_tables text[] := ARRAY['import_batches','import_source_files','import_batch_files',
                           'import_staging_rows','import_issues','import_events'];
  v_restricted text[] := ARRAY['anon','authenticated','service_role','sandbox_exec','sandbox_exec_vhxglsvxwwpmoqjabfmj'];
  v_t text; v_r text; v_n bigint; v_priv text;
BEGIN
  SELECT count(*) INTO v_n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname LIKE 'import\_%'
     AND c.relkind IN ('r','p','v','m','f');
  IF v_n <> 6 THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: expected exactly 6 import relations, found %', v_n;
  END IF;

  FOREACH v_t IN ARRAY v_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname='public' AND c.relname = v_t AND c.relkind='r'
                     AND c.relrowsecurity AND c.relforcerowsecurity) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: RLS/FORCE RLS not enabled on public.%', v_t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename = v_t) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: unexpected policy on public.%', v_t;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = ('public.'||v_t)::regclass AND NOT t.tgisinternal) THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: unexpected trigger on public.%', v_t;
    END IF;
    EXECUTE format('SELECT count(*) FROM public.%I', v_t) INTO v_n;
    IF v_n <> 0 THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: public.% is not empty (% rows)', v_t, v_n;
    END IF;
    FOREACH v_r IN ARRAY v_restricted LOOP
      FOREACH v_priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(v_r, ('public.'||v_t)::regclass, v_priv) THEN
          RAISE EXCEPTION 'POSTCONDITION FAILED: role % retains % on public.%', v_r, v_priv, v_t;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname LIKE 'import\_%' AND c.contype='f' AND c.confdeltype <> 'r') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: an import foreign key does not use ON DELETE RESTRICT';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname LIKE 'import\_%') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: unexpected import function exists';
  END IF;
  IF EXISTS (SELECT 1 FROM public.permission_definitions WHERE key LIKE 'import%') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: unexpected import permission key exists';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id ILIKE '%import%') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: unexpected import storage bucket exists';
  END IF;
END $$;