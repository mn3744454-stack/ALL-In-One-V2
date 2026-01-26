-- Phase 1: Sharing / Connections Foundation (Corrected)
-- This migration creates the core tables and RPCs for the connections and consent system

-- Enable pgcrypto for token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ENUM: connection_type
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_type') THEN
    CREATE TYPE public.connection_type AS ENUM ('b2b', 'b2c', 'employment');
  END IF;
END$$;

-- =============================================================================
-- TABLE: connections
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_type public.connection_type NOT NULL,
  initiator_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  initiator_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email text,
  recipient_phone text,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked', 'expired')),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipient_required CHECK (
    num_nonnulls(recipient_tenant_id, recipient_profile_id, recipient_email, recipient_phone) = 1
  )
);

-- Normalize email to lowercase
CREATE OR REPLACE FUNCTION public.normalize_connection_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recipient_email IS NOT NULL THEN
    NEW.recipient_email := lower(btrim(NEW.recipient_email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_connection_email ON public.connections;
CREATE TRIGGER trg_normalize_connection_email
  BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_connection_email();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_connections_updated_at ON public.connections;
CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_connections_updated_at();

-- Indexes for connections
CREATE INDEX IF NOT EXISTS idx_connections_initiator_tenant ON public.connections(initiator_tenant_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient_tenant ON public.connections(recipient_tenant_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient_profile ON public.connections(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient_email ON public.connections(recipient_email);
CREATE INDEX IF NOT EXISTS idx_connections_token ON public.connections(token);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);

-- Unique partial indexes to prevent duplicate pending/accepted connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_b2b_pending
  ON public.connections(initiator_tenant_id, recipient_tenant_id)
  WHERE connection_type = 'b2b' AND status IN ('pending', 'accepted') AND recipient_tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_b2c_profile_pending
  ON public.connections(initiator_tenant_id, recipient_profile_id)
  WHERE connection_type = 'b2c' AND status IN ('pending', 'accepted') AND recipient_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_b2c_email_pending
  ON public.connections(initiator_tenant_id, recipient_email)
  WHERE connection_type = 'b2c' AND status IN ('pending', 'accepted') AND recipient_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_b2c_phone_pending
  ON public.connections(initiator_tenant_id, recipient_phone)
  WHERE connection_type = 'b2c' AND status IN ('pending', 'accepted') AND recipient_phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_employment_profile_pending
  ON public.connections(initiator_tenant_id, recipient_profile_id)
  WHERE connection_type = 'employment' AND status IN ('pending', 'accepted') AND recipient_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_employment_email_pending
  ON public.connections(initiator_tenant_id, recipient_email)
  WHERE connection_type = 'employment' AND status IN ('pending', 'accepted') AND recipient_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_employment_phone_pending
  ON public.connections(initiator_tenant_id, recipient_phone)
  WHERE connection_type = 'employment' AND status IN ('pending', 'accepted') AND recipient_phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_b2b_reverse_pending
  ON public.connections(recipient_tenant_id, initiator_tenant_id)
  WHERE connection_type = 'b2b' AND status IN ('pending', 'accepted') AND recipient_tenant_id IS NOT NULL;

-- =============================================================================
-- TABLE: consent_grants
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.consent_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  grantor_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  grantor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_ids uuid[] DEFAULT NULL,
  access_level text NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
  date_from date,
  date_to date,
  forward_only boolean NOT NULL DEFAULT false,
  excluded_fields text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger for consent_grants
CREATE OR REPLACE FUNCTION public.update_consent_grants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_grants_updated_at ON public.consent_grants;
CREATE TRIGGER trg_consent_grants_updated_at
  BEFORE UPDATE ON public.consent_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_consent_grants_updated_at();

-- Indexes for consent_grants
CREATE INDEX IF NOT EXISTS idx_consent_grants_connection ON public.consent_grants(connection_id);
CREATE INDEX IF NOT EXISTS idx_consent_grants_grantor_tenant ON public.consent_grants(grantor_tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_grants_resource_type ON public.consent_grants(resource_type);
CREATE INDEX IF NOT EXISTS idx_consent_grants_status ON public.consent_grants(status);

-- =============================================================================
-- TABLE: sharing_audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sharing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  connection_id uuid REFERENCES public.connections(id) ON DELETE SET NULL,
  grant_id uuid REFERENCES public.consent_grants(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resource_type text,
  resource_ids uuid[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_connection ON public.sharing_audit_log(connection_id);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_grant ON public.sharing_audit_log(grant_id);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_actor_user ON public.sharing_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_log_created_at ON public.sharing_audit_log(created_at);

-- =============================================================================
-- TABLE: client_claim_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_claim_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_claim_tokens_token ON public.client_claim_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_claim_tokens_client ON public.client_claim_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_client_claim_tokens_tenant ON public.client_claim_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_claim_tokens_status ON public.client_claim_tokens(status);

-- =============================================================================
-- ADD COLUMNS TO clients TABLE FOR PORTAL LINKING
-- =============================================================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS linked_profile_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clients_profile_id ON public.clients(profile_id);
CREATE INDEX IF NOT EXISTS idx_clients_linked_profile_id ON public.clients(linked_profile_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_claim_tokens ENABLE ROW LEVEL SECURITY;

-- Connections: Read-only for involved parties
DROP POLICY IF EXISTS "Connections readable by involved parties" ON public.connections;
CREATE POLICY "Connections readable by involved parties" ON public.connections
  FOR SELECT USING (
    initiator_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    OR recipient_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    OR recipient_profile_id = auth.uid()
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Consent grants: Read-only for grantor tenant members and connection recipients
DROP POLICY IF EXISTS "Consent grants readable by involved parties" ON public.consent_grants;
CREATE POLICY "Consent grants readable by involved parties" ON public.consent_grants
  FOR SELECT USING (
    grantor_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    OR connection_id IN (
      SELECT id FROM public.connections 
      WHERE recipient_profile_id = auth.uid()
         OR recipient_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    )
  );

-- Sharing audit log: Read-only for actors and targets
DROP POLICY IF EXISTS "Audit log readable by involved parties" ON public.sharing_audit_log;
CREATE POLICY "Audit log readable by involved parties" ON public.sharing_audit_log
  FOR SELECT USING (
    actor_user_id = auth.uid()
    OR actor_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    OR target_tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
    OR target_profile_id = auth.uid()
  );

-- Client claim tokens: Read-only for tenant members with permission
DROP POLICY IF EXISTS "Claim tokens readable by authorized tenant members" ON public.client_claim_tokens;
CREATE POLICY "Claim tokens readable by authorized tenant members" ON public.client_claim_tokens
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- =============================================================================
-- PERMISSION DEFINITIONS (using correct column names: display_name, module)
-- =============================================================================
INSERT INTO public.permission_definitions (key, module, resource, action, display_name, description, is_delegatable)
VALUES
  ('connections.create', 'connections', 'connections', 'create', 'Create Connections', 'Create new connection requests to other tenants or users', true),
  ('connections.accept', 'connections', 'connections', 'accept', 'Accept Connections', 'Accept incoming connection requests', true),
  ('connections.revoke', 'connections', 'connections', 'revoke', 'Revoke Connections', 'Revoke existing connections', true),
  ('consent_grants.create', 'connections', 'consent_grants', 'create', 'Create Consent Grants', 'Grant data access to connected parties', true),
  ('consent_grants.revoke', 'connections', 'consent_grants', 'revoke', 'Revoke Consent Grants', 'Revoke data access grants', true),
  ('clients.portal.manage', 'clients', 'portal', 'manage', 'Manage Client Portal', 'Create/revoke client portal claim tokens and manage client portal linking', true)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if user is active tenant member
CREATE OR REPLACE FUNCTION public.is_active_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is tenant owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid, _tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = 'owner'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check tenant permission - calls existing has_permission with correct argument order
CREATE OR REPLACE FUNCTION public.check_tenant_permission(_user_id uuid, _tenant_id uuid, _permission_key text)
RETURNS boolean AS $$
BEGIN
  -- Owner bypass
  IF public.is_tenant_owner(_user_id, _tenant_id) THEN
    RETURN true;
  END IF;
  
  -- Check active membership
  IF NOT public.is_active_tenant_member(_user_id, _tenant_id) THEN
    RETURN false;
  END IF;
  
  -- Check permission using existing has_permission function
  -- Signature: (user_id uuid, tenant_id uuid, permission_key text)
  RETURN public.has_permission(_user_id, _tenant_id, _permission_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Log sharing event
CREATE OR REPLACE FUNCTION public.log_sharing_event(
  _event_type text,
  _connection_id uuid DEFAULT NULL,
  _grant_id uuid DEFAULT NULL,
  _actor_user_id uuid DEFAULT NULL,
  _actor_tenant_id uuid DEFAULT NULL,
  _target_tenant_id uuid DEFAULT NULL,
  _target_profile_id uuid DEFAULT NULL,
  _resource_type text DEFAULT NULL,
  _resource_ids uuid[] DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.sharing_audit_log (
    event_type, connection_id, grant_id, actor_user_id, actor_tenant_id,
    target_tenant_id, target_profile_id, resource_type, resource_ids, metadata
  ) VALUES (
    _event_type, _connection_id, _grant_id, _actor_user_id, _actor_tenant_id,
    _target_tenant_id, _target_profile_id, _resource_type, _resource_ids, _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: create_connection_request
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_connection_request(
  _connection_type text,
  _initiator_tenant_id uuid,
  _recipient_tenant_id uuid DEFAULT NULL,
  _recipient_profile_id uuid DEFAULT NULL,
  _recipient_email text DEFAULT NULL,
  _recipient_phone text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _connection_id uuid;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _initiator_tenant_id, 'connections.create') THEN
    RAISE EXCEPTION 'Permission denied: connections.create required';
  END IF;
  
  -- Validate recipient
  IF num_nonnulls(_recipient_tenant_id, _recipient_profile_id, _recipient_email, _recipient_phone) != 1 THEN
    RAISE EXCEPTION 'Exactly one recipient channel must be specified';
  END IF;
  
  -- Insert connection
  INSERT INTO public.connections (
    connection_type, initiator_tenant_id, initiator_user_id,
    recipient_tenant_id, recipient_profile_id, recipient_email, recipient_phone,
    expires_at, metadata
  ) VALUES (
    _connection_type::public.connection_type, _initiator_tenant_id, _user_id,
    _recipient_tenant_id, _recipient_profile_id, 
    CASE WHEN _recipient_email IS NOT NULL THEN lower(btrim(_recipient_email)) ELSE NULL END,
    _recipient_phone,
    _expires_at, _metadata
  )
  RETURNING id INTO _connection_id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_created',
    _connection_id,
    NULL,
    _user_id,
    _initiator_tenant_id,
    _recipient_tenant_id,
    _recipient_profile_id,
    NULL,
    NULL,
    jsonb_build_object('connection_type', _connection_type)
  );
  
  RETURN _connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: accept_connection
-- =============================================================================
CREATE OR REPLACE FUNCTION public.accept_connection(_token text)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _user_email text;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find connection by token
  SELECT * INTO _conn FROM public.connections WHERE token = _token;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status != 'pending' THEN
    RAISE EXCEPTION 'Connection is not pending';
  END IF;
  
  IF _conn.expires_at IS NOT NULL AND _conn.expires_at < now() THEN
    RAISE EXCEPTION 'Connection has expired';
  END IF;
  
  -- Get user email for matching
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Authorization: user must be valid recipient
  IF _conn.recipient_profile_id IS NOT NULL THEN
    IF _conn.recipient_profile_id != _user_id THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_email IS NOT NULL THEN
    IF _conn.recipient_email != lower(btrim(_user_email)) THEN
      RAISE EXCEPTION 'Not authorized to accept this connection';
    END IF;
  ELSIF _conn.recipient_tenant_id IS NOT NULL THEN
    IF NOT public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.accept') THEN
      RAISE EXCEPTION 'Permission denied: connections.accept required';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid connection recipient configuration';
  END IF;
  
  -- Accept the connection
  UPDATE public.connections
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = _user_id,
      recipient_profile_id = COALESCE(recipient_profile_id, _user_id)
  WHERE id = _conn.id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_accepted',
    _conn.id,
    NULL,
    _user_id,
    _conn.recipient_tenant_id,
    _conn.initiator_tenant_id,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: revoke_connection
-- =============================================================================
CREATE OR REPLACE FUNCTION public.revoke_connection(_token text)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find connection by token (string-based lookup, no uuid cast)
  SELECT * INTO _conn FROM public.connections WHERE token = _token;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status = 'revoked' THEN
    RAISE EXCEPTION 'Connection is already revoked';
  END IF;
  
  -- Authorization: initiator tenant or recipient tenant can revoke
  IF public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'connections.revoke') THEN
    -- OK: initiator can revoke
    NULL;
  ELSIF _conn.recipient_tenant_id IS NOT NULL 
        AND public.check_tenant_permission(_user_id, _conn.recipient_tenant_id, 'connections.revoke') THEN
    -- OK: recipient tenant can revoke
    NULL;
  ELSIF _conn.recipient_profile_id = _user_id THEN
    -- OK: individual recipient can revoke their own connection
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied: connections.revoke required';
  END IF;
  
  -- Revoke the connection
  UPDATE public.connections
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _conn.id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'connection_revoked',
    _conn.id,
    NULL,
    _user_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{}'::jsonb
  );
  
  RETURN _conn.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: Auto-revoke grants when connection is revoked/expired
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_revoke_grants_on_connection_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('revoked', 'expired') AND OLD.status NOT IN ('revoked', 'expired') THEN
    UPDATE public.consent_grants
    SET status = 'revoked',
        revoked_at = now()
    WHERE connection_id = NEW.id
      AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_connections_auto_revoke_grants ON public.connections;
CREATE TRIGGER trg_connections_auto_revoke_grants
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_revoke_grants_on_connection_change();

-- =============================================================================
-- RPC: create_consent_grant
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_consent_grant(
  _connection_id uuid,
  _resource_type text,
  _resource_ids uuid[] DEFAULT NULL,
  _access_level text DEFAULT 'read',
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL,
  _forward_only boolean DEFAULT false,
  _excluded_fields text[] DEFAULT ARRAY[]::text[],
  _expires_at timestamptz DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _conn public.connections%ROWTYPE;
  _grant_id uuid;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find and validate connection
  SELECT * INTO _conn FROM public.connections WHERE id = _connection_id;
  
  IF _conn.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  
  IF _conn.status != 'accepted' THEN
    RAISE EXCEPTION 'Connection must be accepted to create grants';
  END IF;
  
  -- Permission check: grantor must be from initiator tenant
  IF NOT public.check_tenant_permission(_user_id, _conn.initiator_tenant_id, 'consent_grants.create') THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.create required';
  END IF;
  
  -- Create grant
  INSERT INTO public.consent_grants (
    connection_id, grantor_tenant_id, grantor_user_id,
    resource_type, resource_ids, access_level,
    date_from, date_to, forward_only, excluded_fields,
    expires_at, metadata
  ) VALUES (
    _connection_id, _conn.initiator_tenant_id, _user_id,
    _resource_type, _resource_ids, _access_level,
    _date_from, _date_to, _forward_only, _excluded_fields,
    _expires_at, _metadata
  )
  RETURNING id INTO _grant_id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'grant_created',
    _connection_id,
    _grant_id,
    _user_id,
    _conn.initiator_tenant_id,
    _conn.recipient_tenant_id,
    _conn.recipient_profile_id,
    _resource_type,
    _resource_ids,
    jsonb_build_object('access_level', _access_level)
  );
  
  RETURN _grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: revoke_consent_grant
-- =============================================================================
CREATE OR REPLACE FUNCTION public.revoke_consent_grant(_grant_id uuid)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find grant
  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;
  
  IF _grant.id IS NULL THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;
  
  IF _grant.status = 'revoked' THEN
    RAISE EXCEPTION 'Grant is already revoked';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _grant.grantor_tenant_id, 'consent_grants.revoke') THEN
    RAISE EXCEPTION 'Permission denied: consent_grants.revoke required';
  END IF;
  
  -- Revoke grant
  UPDATE public.consent_grants
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = _user_id
  WHERE id = _grant_id;
  
  -- Log event
  PERFORM public.log_sharing_event(
    'grant_revoked',
    _grant.connection_id,
    _grant_id,
    _user_id,
    _grant.grantor_tenant_id,
    NULL,
    NULL,
    _grant.resource_type,
    _grant.resource_ids,
    '{}'::jsonb
  );
  
  RETURN _grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: get_granted_data (stub for Phase 1 - no lab_results dependency)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_granted_data(
  _grant_id uuid,
  _date_from date DEFAULT NULL,
  _date_to date DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  _user_id uuid := auth.uid();
  _grant public.consent_grants%ROWTYPE;
  _conn public.connections%ROWTYPE;
  _effective_from date;
  _effective_to date;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find grant
  SELECT * INTO _grant FROM public.consent_grants WHERE id = _grant_id;
  
  IF _grant.id IS NULL THEN
    RAISE EXCEPTION 'Grant not found';
  END IF;
  
  IF _grant.status != 'active' THEN
    RAISE EXCEPTION 'Grant is not active';
  END IF;
  
  IF _grant.expires_at IS NOT NULL AND _grant.expires_at < now() THEN
    RAISE EXCEPTION 'Grant has expired';
  END IF;
  
  -- Find connection
  SELECT * INTO _conn FROM public.connections WHERE id = _grant.connection_id;
  
  -- Authorization: must be recipient of the connection
  IF _conn.recipient_profile_id IS NOT NULL AND _conn.recipient_profile_id = _user_id THEN
    -- OK: individual recipient
    NULL;
  ELSIF _conn.recipient_tenant_id IS NOT NULL 
        AND public.is_active_tenant_member(_user_id, _conn.recipient_tenant_id) THEN
    -- OK: recipient tenant member
    NULL;
  ELSE
    RAISE EXCEPTION 'Not authorized to access this grant';
  END IF;
  
  -- Calculate effective date window with NULL safety
  _effective_from := COALESCE(_date_from, _grant.date_from, '1900-01-01'::date);
  _effective_to := COALESCE(_date_to, _grant.date_to, '2999-12-31'::date);
  
  -- Validate date range
  IF _effective_from > _effective_to THEN
    RAISE EXCEPTION 'Invalid date range: from (%) is after to (%)', _effective_from, _effective_to;
  END IF;
  
  -- Log access event
  PERFORM public.log_sharing_event(
    'data_accessed',
    _grant.connection_id,
    _grant_id,
    _user_id,
    _conn.recipient_tenant_id,
    _grant.grantor_tenant_id,
    NULL,
    _grant.resource_type,
    _grant.resource_ids,
    jsonb_build_object('date_from', _effective_from, 'date_to', _effective_to)
  );
  
  -- Return stub payload (Phase 1: no direct dependency on lab_results)
  RETURN jsonb_build_object(
    'grant_id', _grant_id,
    'resource_type', _grant.resource_type,
    'access_level', _grant.access_level,
    'horse_ids', COALESCE(_grant.resource_ids, ARRAY[]::uuid[]),
    'effective_from', _effective_from,
    'effective_to', _effective_to,
    'excluded_fields', _grant.excluded_fields,
    'lab_results', '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: generate_client_claim_token
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_client_claim_token(_client_id uuid)
RETURNS text AS $$
DECLARE
  _user_id uuid := auth.uid();
  _client public.clients%ROWTYPE;
  _token text;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find client
  SELECT * INTO _client FROM public.clients WHERE id = _client_id;
  
  IF _client.id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  
  -- Permission check
  IF NOT public.check_tenant_permission(_user_id, _client.tenant_id, 'clients.portal.manage') THEN
    RAISE EXCEPTION 'Permission denied: clients.portal.manage required';
  END IF;
  
  -- Check if client already claimed
  IF _client.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Client portal has already been claimed';
  END IF;
  
  -- Revoke any existing active tokens for this client
  UPDATE public.client_claim_tokens
  SET status = 'revoked',
      revoked_at = now()
  WHERE client_id = _client_id
    AND status = 'active';
  
  -- Generate new token
  _token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.client_claim_tokens (tenant_id, client_id, token, created_by)
  VALUES (_client.tenant_id, _client_id, _token, _user_id);
  
  RETURN _token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: claim_client_portal
-- =============================================================================
CREATE OR REPLACE FUNCTION public.claim_client_portal(_token text)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _claim public.client_claim_tokens%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find token
  SELECT * INTO _claim FROM public.client_claim_tokens WHERE token = _token;
  
  IF _claim.id IS NULL THEN
    RAISE EXCEPTION 'Invalid claim token';
  END IF;
  
  IF _claim.status != 'active' THEN
    RAISE EXCEPTION 'Claim token is no longer valid';
  END IF;
  
  IF _claim.expires_at < now() THEN
    -- Mark as expired
    UPDATE public.client_claim_tokens SET status = 'expired' WHERE id = _claim.id;
    RAISE EXCEPTION 'Claim token has expired';
  END IF;
  
  -- Update token status
  UPDATE public.client_claim_tokens
  SET status = 'used',
      used_at = now(),
      used_by = _user_id
  WHERE id = _claim.id;
  
  -- Link client to profile
  UPDATE public.clients
  SET linked_profile_id = _user_id,
      profile_id = _user_id,
      claimed_at = now()
  WHERE id = _claim.client_id;
  
  RETURN _claim.client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: revoke_client_claim_token
-- =============================================================================
CREATE OR REPLACE FUNCTION public.revoke_client_claim_token(_token text)
RETURNS uuid AS $$
DECLARE
  _user_id uuid := auth.uid();
  _claim public.client_claim_tokens%ROWTYPE;
BEGIN
  -- Auth check
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find token
  SELECT * INTO _claim FROM public.client_claim_tokens WHERE token = _token;
  
  IF _claim.id IS NULL THEN
    RAISE EXCEPTION 'Claim token not found';
  END IF;
  
  IF _claim.status = 'revoked' THEN
    RAISE EXCEPTION 'Token is already revoked';
  END IF;
  
  -- Authorization: creator or tenant member with permission
  IF _claim.created_by = _user_id THEN
    -- OK: creator can revoke
    NULL;
  ELSIF public.check_tenant_permission(_user_id, _claim.tenant_id, 'clients.portal.manage') THEN
    -- OK: tenant member with permission
    NULL;
  ELSE
    RAISE EXCEPTION 'Permission denied: clients.portal.manage required';
  END IF;
  
  -- Revoke token
  UPDATE public.client_claim_tokens
  SET status = 'revoked',
      revoked_at = now()
  WHERE id = _claim.id;
  
  RETURN _claim.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;