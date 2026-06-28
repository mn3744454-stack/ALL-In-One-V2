
-- =====================================================================
-- Phase 1.e.f.8.0.r4.1a — Owner Bridge Schema Foundation
-- Additive only. No data backfill. No changes to existing rows.
-- Invited horse owners are NOT staff: they never get tenant_members rows.
-- Owner authority is NOT granted by names; it requires verified bridge facts.
-- Direct client access intentionally restricted; future SECURITY DEFINER
-- RPCs will read these tables with redaction.
-- =====================================================================

-- ---------- PART 1: additive nullable columns on horse_owners -----------
ALTER TABLE public.horse_owners
  ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS owner_tenant_id    uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_level text NULL,
  ADD COLUMN IF NOT EXISTS claim_status       text NULL;

-- NOTE: claimed_by_user_id is intentionally a plain uuid without FK to auth.users.
-- Project convention avoids direct FKs into auth.users (managed by Supabase).
-- Future RPC must validate the referenced user.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='horse_owners_verification_level_chk') THEN
    ALTER TABLE public.horse_owners
      ADD CONSTRAINT horse_owners_verification_level_chk
      CHECK (verification_level IS NULL OR verification_level IN
        ('unverified','weak','strong','verified','rejected','revoked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='horse_owners_claim_status_chk') THEN
    ALTER TABLE public.horse_owners
      ADD CONSTRAINT horse_owners_claim_status_chk
      CHECK (claim_status IS NULL OR claim_status IN
        ('unclaimed','invited','pending','verified','rejected','revoked','expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_horse_owners_claimed_by_user_id
  ON public.horse_owners(claimed_by_user_id) WHERE claimed_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owners_owner_tenant_id
  ON public.horse_owners(owner_tenant_id) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owners_claim_status
  ON public.horse_owners(claim_status) WHERE claim_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owners_owner_tenant_claim_status
  ON public.horse_owners(owner_tenant_id, claim_status) WHERE owner_tenant_id IS NOT NULL;

COMMENT ON COLUMN public.horse_owners.claimed_by_user_id IS
  'Future: user who has verifiably claimed this owner record. Owner authority MUST require verification_level >= strong.';
COMMENT ON COLUMN public.horse_owners.owner_tenant_id IS
  'Future: linked Horse Owner tenant. tenants.type=horse_owner enforced by future RPC, not CHECK.';

-- ---------- PART 2: horse_owner_invites --------------------------------
CREATE TABLE IF NOT EXISTS public.horse_owner_invites (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id                 uuid NOT NULL REFERENCES public.horse_owners(id) ON DELETE CASCADE,
  invited_user_id          uuid NULL,
  invited_owner_tenant_id  uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  contact_email            text NULL,
  contact_phone            text NULL,
  contact_hash             text NULL,
  token_hash               text NULL,
  status                   text NOT NULL DEFAULT 'draft',
  expires_at               timestamptz NULL,
  accepted_at              timestamptz NULL,
  revoked_at               timestamptz NULL,
  revoked_by_user_id       uuid NULL,
  revocation_reason        text NULL,
  created_by_user_id       uuid NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT horse_owner_invites_status_chk
    CHECK (status IN ('draft','sent','accepted','expired','revoked','cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.horse_owner_invites TO authenticated;
GRANT ALL ON public.horse_owner_invites TO service_role;
REVOKE ALL ON public.horse_owner_invites FROM anon;
REVOKE ALL ON public.horse_owner_invites FROM PUBLIC;

ALTER TABLE public.horse_owner_invites ENABLE ROW LEVEL SECURITY;
-- No policies created: default-deny for authenticated. All client reads/writes
-- will go through future SECURITY DEFINER RPCs that redact PII (email/phone/token).

CREATE UNIQUE INDEX IF NOT EXISTS uq_horse_owner_invites_token_hash
  ON public.horse_owner_invites(token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owner_invites_source_tenant
  ON public.horse_owner_invites(source_tenant_id);
CREATE INDEX IF NOT EXISTS idx_horse_owner_invites_owner_id
  ON public.horse_owner_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_horse_owner_invites_invited_user
  ON public.horse_owner_invites(invited_user_id) WHERE invited_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owner_invites_invited_owner_tenant
  ON public.horse_owner_invites(invited_owner_tenant_id) WHERE invited_owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horse_owner_invites_status_expires
  ON public.horse_owner_invites(status, expires_at);

CREATE TRIGGER trg_horse_owner_invites_updated_at
  BEFORE UPDATE ON public.horse_owner_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.horse_owner_invites IS
  'Invitation bridge from a tenant-local horse_owner to a person. Invited owners are NOT tenant_members and do NOT receive staff access.';

-- ---------- PART 3: horse_owner_access_grants --------------------------
CREATE TABLE IF NOT EXISTS public.horse_owner_access_grants (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id                 uuid NOT NULL REFERENCES public.horse_owners(id) ON DELETE CASCADE,
  horse_id                 uuid NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  invite_id                uuid NULL REFERENCES public.horse_owner_invites(id) ON DELETE SET NULL,
  grantee_user_id          uuid NULL,
  grantee_owner_tenant_id  uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  access_level             text NOT NULL DEFAULT 'invited_owner_read',
  status                   text NOT NULL DEFAULT 'active',
  starts_at                timestamptz NULL DEFAULT now(),
  expires_at               timestamptz NULL,
  revoked_at               timestamptz NULL,
  revoked_by_user_id       uuid NULL,
  revocation_reason        text NULL,
  created_by_user_id       uuid NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT horse_owner_access_grants_access_level_chk
    CHECK (access_level IN ('invited_owner_read','owner_read','delegated_identity','delegated_operational','delegated_documents','delegated_sharing')),
  CONSTRAINT horse_owner_access_grants_status_chk
    CHECK (status IN ('pending','active','expired','revoked','superseded'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.horse_owner_access_grants TO authenticated;
GRANT ALL ON public.horse_owner_access_grants TO service_role;
REVOKE ALL ON public.horse_owner_access_grants FROM anon;
REVOKE ALL ON public.horse_owner_access_grants FROM PUBLIC;

ALTER TABLE public.horse_owner_access_grants ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny for authenticated. Future SECURITY DEFINER RPCs only.

CREATE INDEX IF NOT EXISTS idx_hoag_source_tenant ON public.horse_owner_access_grants(source_tenant_id);
CREATE INDEX IF NOT EXISTS idx_hoag_owner_id      ON public.horse_owner_access_grants(owner_id);
CREATE INDEX IF NOT EXISTS idx_hoag_horse_id      ON public.horse_owner_access_grants(horse_id) WHERE horse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hoag_grantee_user  ON public.horse_owner_access_grants(grantee_user_id) WHERE grantee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hoag_grantee_tenant ON public.horse_owner_access_grants(grantee_owner_tenant_id) WHERE grantee_owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hoag_status        ON public.horse_owner_access_grants(status);
CREATE INDEX IF NOT EXISTS idx_hoag_active_user
  ON public.horse_owner_access_grants(grantee_user_id, status) WHERE grantee_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hoag_active_unique
  ON public.horse_owner_access_grants(owner_id, horse_id, grantee_user_id, access_level)
  WHERE status IN ('pending','active') AND grantee_user_id IS NOT NULL AND horse_id IS NOT NULL;

CREATE TRIGGER trg_hoag_updated_at
  BEFORE UPDATE ON public.horse_owner_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.horse_owner_access_grants IS
  'Pre-tenant / pre-conversion access bridge. Does NOT create tenant_members or connection_horse_access. Horse-level when horse_id is set; owner-level otherwise.';

-- ---------- PART 4: owner_claim_requests --------------------------------
CREATE TABLE IF NOT EXISTS public.owner_claim_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id                    uuid NOT NULL REFERENCES public.horse_owners(id) ON DELETE CASCADE,
  claimant_user_id            uuid NOT NULL,
  claimant_owner_tenant_id    uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  match_level                 text NOT NULL DEFAULT 'unreviewed',
  status                      text NOT NULL DEFAULT 'submitted',
  safe_match_summary          jsonb NULL,
  internal_match_evidence     jsonb NULL,
  submitted_at                timestamptz NOT NULL DEFAULT now(),
  resolved_at                 timestamptz NULL,
  resolved_by_user_id         uuid NULL,
  resolution_reason           text NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_claim_requests_match_level_chk
    CHECK (match_level IN ('unreviewed','none','weak','strong','exact','disputed')),
  CONSTRAINT owner_claim_requests_status_chk
    CHECK (status IN ('submitted','under_review','approved','rejected','cancelled','expired','revoked'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_claim_requests TO authenticated;
GRANT ALL ON public.owner_claim_requests TO service_role;
REVOKE ALL ON public.owner_claim_requests FROM anon;
REVOKE ALL ON public.owner_claim_requests FROM PUBLIC;

ALTER TABLE public.owner_claim_requests ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny. internal_match_evidence is sensitive; future RPCs redact.

CREATE INDEX IF NOT EXISTS idx_ocr_source_tenant ON public.owner_claim_requests(source_tenant_id);
CREATE INDEX IF NOT EXISTS idx_ocr_owner_id      ON public.owner_claim_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_ocr_claimant_user ON public.owner_claim_requests(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_claimant_tenant
  ON public.owner_claim_requests(claimant_owner_tenant_id) WHERE claimant_owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ocr_status        ON public.owner_claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_ocr_owner_claimant ON public.owner_claim_requests(owner_id, claimant_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ocr_open_per_owner_claimant
  ON public.owner_claim_requests(owner_id, claimant_user_id)
  WHERE status IN ('submitted','under_review');

CREATE TRIGGER trg_ocr_updated_at
  BEFORE UPDATE ON public.owner_claim_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.owner_claim_requests IS
  'Claim requests against tenant-local horse_owner rows. Owner authority is NOT granted until status=approved AND verification facts on horse_owners are set by RPC.';

-- ---------- PART 5: owner_claim_events ---------------------------------
CREATE TABLE IF NOT EXISTS public.owner_claim_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_request_id    uuid NOT NULL REFERENCES public.owner_claim_requests(id) ON DELETE CASCADE,
  source_tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id            uuid NULL REFERENCES public.horse_owners(id) ON DELETE SET NULL,
  event_type          text NOT NULL,
  event_by_user_id    uuid NULL,
  event_actor_type    text NULL,
  event_payload       jsonb NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.owner_claim_events TO authenticated;
GRANT ALL ON public.owner_claim_events TO service_role;
REVOKE ALL ON public.owner_claim_events FROM anon;
REVOKE ALL ON public.owner_claim_events FROM PUBLIC;

ALTER TABLE public.owner_claim_events ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny. Events are intentionally immutable (no UPDATE/DELETE grants).

CREATE INDEX IF NOT EXISTS idx_oce_claim_request ON public.owner_claim_events(claim_request_id);
CREATE INDEX IF NOT EXISTS idx_oce_source_tenant ON public.owner_claim_events(source_tenant_id);
CREATE INDEX IF NOT EXISTS idx_oce_owner_id      ON public.owner_claim_events(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oce_event_by_user ON public.owner_claim_events(event_by_user_id) WHERE event_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oce_created_at    ON public.owner_claim_events(created_at);

COMMENT ON TABLE public.owner_claim_events IS
  'Immutable audit trail for owner_claim_requests. event_payload may contain sensitive matching data; redacted by future RPC.';

-- ---------- PART 6: owner_delegations ----------------------------------
CREATE TABLE IF NOT EXISTS public.owner_delegations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.horse_owners(id) ON DELETE CASCADE,
  horse_id            uuid NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  owner_tenant_id     uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  delegator_user_id   uuid NULL,
  delegate_user_id    uuid NULL,
  delegate_tenant_id  uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  delegation_scope    jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'active',
  starts_at           timestamptz NULL DEFAULT now(),
  expires_at          timestamptz NULL,
  revoked_at          timestamptz NULL,
  revoked_by_user_id  uuid NULL,
  revocation_reason   text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_delegations_status_chk
    CHECK (status IN ('active','expired','revoked','superseded')),
  CONSTRAINT owner_delegations_target_chk
    CHECK (delegate_user_id IS NOT NULL OR delegate_tenant_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_delegations TO authenticated;
GRANT ALL ON public.owner_delegations TO service_role;
REVOKE ALL ON public.owner_delegations FROM anon;
REVOKE ALL ON public.owner_delegations FROM PUBLIC;

ALTER TABLE public.owner_delegations ENABLE ROW LEVEL SECURITY;
-- No policies: default-deny. Future delegation RPCs only.

CREATE INDEX IF NOT EXISTS idx_odel_owner_id        ON public.owner_delegations(owner_id);
CREATE INDEX IF NOT EXISTS idx_odel_horse_id        ON public.owner_delegations(horse_id) WHERE horse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_odel_owner_tenant    ON public.owner_delegations(owner_tenant_id) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_odel_delegate_user   ON public.owner_delegations(delegate_user_id) WHERE delegate_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_odel_delegate_tenant ON public.owner_delegations(delegate_tenant_id) WHERE delegate_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_odel_status          ON public.owner_delegations(status);
CREATE INDEX IF NOT EXISTS idx_odel_active
  ON public.owner_delegations(owner_id, status) WHERE status = 'active';

CREATE TRIGGER trg_odel_updated_at
  BEFORE UPDATE ON public.owner_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.owner_delegations IS
  'Future owner-authorized scoped delegations (identity / operational / documents / sharing). No UI or RPC yet.';
