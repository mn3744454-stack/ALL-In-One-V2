-- =====================================================
-- STEP 1: Laboratory Module Extension Migrations
-- =====================================================

-- A) Tenant Capabilities Helper Function (Hardened - NO SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_lab_feature(_tenant_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN NOT is_tenant_member(auth.uid(), _tenant_id) THEN false
    ELSE COALESCE(
      (SELECT (config->>_feature)::boolean 
       FROM public.tenant_capabilities
       WHERE tenant_id = _tenant_id AND category = 'laboratory'),
      false
    )
  END
$$;

-- B) Result Status Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_lab_result_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions: draft -> reviewed -> final (final is terminal)
  IF OLD.status = 'draft' AND NEW.status = 'reviewed' THEN
    RETURN NEW;
  ELSIF OLD.status = 'reviewed' AND NEW.status = 'final' THEN
    RETURN NEW;
  ELSIF OLD.status = 'final' THEN
    RAISE EXCEPTION 'Cannot change status from final - it is a terminal state';
  ELSE
    RAISE EXCEPTION 'Invalid result status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;

CREATE TRIGGER validate_lab_result_status_trigger
BEFORE UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_result_status_transition();

-- C) Shareable Result URLs
CREATE TABLE public.lab_result_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  use_alias boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  
  CONSTRAINT share_token_min_length CHECK (length(share_token) >= 32)
);

CREATE INDEX idx_lab_result_shares_token 
  ON public.lab_result_shares(share_token) 
  WHERE revoked_at IS NULL;
CREATE INDEX idx_lab_result_shares_result 
  ON public.lab_result_shares(result_id);
CREATE INDEX idx_lab_result_shares_tenant 
  ON public.lab_result_shares(tenant_id);

ALTER TABLE public.lab_result_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant shares"
ON public.lab_result_shares FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can create shares"
ON public.lab_result_shares FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can revoke shares"
ON public.lab_result_shares FOR UPDATE
USING (can_manage_lab(auth.uid(), tenant_id))
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

-- Lock identity fields trigger
CREATE OR REPLACE FUNCTION public.lock_lab_result_share_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id <> OLD.tenant_id
     OR NEW.result_id <> OLD.result_id
     OR NEW.share_token <> OLD.share_token
     OR NEW.created_by <> OLD.created_by
     OR NEW.created_at <> OLD.created_at
  THEN
    RAISE EXCEPTION 'Share identity fields are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_lab_result_share_identity_trigger
BEFORE UPDATE ON public.lab_result_shares
FOR EACH ROW
EXECUTE FUNCTION public.lock_lab_result_share_identity();

-- D) Horse Aliases (Privacy)
CREATE TABLE public.horse_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  alias text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT alias_min_length CHECK (length(trim(alias)) >= 2)
);

CREATE UNIQUE INDEX idx_horse_aliases_unique_active_alias 
  ON public.horse_aliases(tenant_id, alias) 
  WHERE is_active = true;

CREATE UNIQUE INDEX idx_horse_aliases_unique_active_horse 
  ON public.horse_aliases(tenant_id, horse_id) 
  WHERE is_active = true;

CREATE INDEX idx_horse_aliases_horse_active 
  ON public.horse_aliases(horse_id) 
  WHERE is_active = true;

ALTER TABLE public.horse_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant aliases"
ON public.horse_aliases FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Horse managers can insert aliases"
ON public.horse_aliases FOR INSERT
WITH CHECK (can_manage_horses(auth.uid(), tenant_id));

CREATE POLICY "Horse managers can update aliases"
ON public.horse_aliases FOR UPDATE
USING (can_manage_horses(auth.uid(), tenant_id))
WITH CHECK (can_manage_horses(auth.uid(), tenant_id));

CREATE POLICY "Horse managers can delete aliases"
ON public.horse_aliases FOR DELETE
USING (can_manage_horses(auth.uid(), tenant_id));

-- Helper function (NOT SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_horse_display_name(
  _horse_id uuid, 
  _use_alias boolean DEFAULT false
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _use_alias = true THEN 
      COALESCE(
        (SELECT alias FROM public.horse_aliases 
         WHERE horse_id = _horse_id AND is_active = true 
         LIMIT 1),
        (SELECT name FROM public.horses WHERE id = _horse_id)
      )
    ELSE 
      (SELECT name FROM public.horses WHERE id = _horse_id)
  END
$$;

-- Public share function with alias support
CREATE OR REPLACE FUNCTION public.get_shared_lab_result(_share_token text)
RETURNS TABLE (
  result_id uuid,
  status text,
  result_data jsonb,
  interpretation jsonb,
  flags text,
  created_at timestamptz,
  horse_display_name text,
  template_name text,
  tenant_display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    r.id as result_id,
    r.status,
    r.result_data,
    r.interpretation,
    r.flags,
    r.created_at,
    CASE
      WHEN s.use_alias THEN public.get_horse_display_name(ls.horse_id, true)
      ELSE h.name
    END as horse_display_name,
    t.name as template_name,
    COALESCE(ten.public_name, ten.name) as tenant_display_name
  FROM public.lab_result_shares s
  JOIN public.lab_results r ON r.id = s.result_id
  JOIN public.lab_samples ls ON ls.id = r.sample_id
  JOIN public.horses h ON h.id = ls.horse_id
  JOIN public.lab_templates t ON t.id = r.template_id
  JOIN public.tenants ten ON ten.id = r.tenant_id
  WHERE s.share_token = _share_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND r.status = 'final'
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_lab_result(text) TO authenticated;

-- E) Sample Received/Unreceived Columns (Additive)
ALTER TABLE public.lab_samples 
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS source_lab_tenant_id uuid REFERENCES public.tenants(id);

CREATE INDEX idx_lab_samples_received 
  ON public.lab_samples(tenant_id, received_at) 
  WHERE received_at IS NOT NULL;

-- Separate validation trigger for new columns only
CREATE OR REPLACE FUNCTION public.validate_lab_sample_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.received_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members 
      WHERE user_id = NEW.received_by 
        AND tenant_id = NEW.tenant_id 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Receiver is not an active member of this tenant';
    END IF;
  END IF;

  IF NEW.received_by IS NOT NULL AND NEW.received_at IS NULL THEN
    NEW.received_at := now();
  END IF;

  IF NEW.source_lab_tenant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.source_lab_tenant_id) THEN
      RAISE EXCEPTION 'Source lab tenant not found';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_lab_sample_received_trigger
BEFORE INSERT OR UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.validate_lab_sample_received();