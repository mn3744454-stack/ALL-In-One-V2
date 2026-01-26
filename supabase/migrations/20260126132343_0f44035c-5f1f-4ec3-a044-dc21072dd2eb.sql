-- Phase 2.2: Optimize SELECT policies to use is_active_tenant_member helper function

-- 1) CONNECTIONS — Optimize SELECT policy to use helper function
DROP POLICY IF EXISTS "Connections readable by involved parties" ON public.connections;

CREATE POLICY "connections_select" ON public.connections
FOR SELECT
USING (
  public.is_active_tenant_member(auth.uid(), initiator_tenant_id)
  OR (recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), recipient_tenant_id))
  OR (recipient_profile_id IS NOT NULL AND recipient_profile_id = auth.uid())
  OR initiator_user_id = auth.uid()
);

-- 2) CONSENT_GRANTS — Optimize SELECT policy
DROP POLICY IF EXISTS "Consent grants readable by involved parties" ON public.consent_grants;

CREATE POLICY "grants_select" ON public.consent_grants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.connections c
    WHERE c.id = consent_grants.connection_id
      AND (
        public.is_active_tenant_member(auth.uid(), c.initiator_tenant_id)
        OR (c.recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), c.recipient_tenant_id))
        OR (c.recipient_profile_id IS NOT NULL AND c.recipient_profile_id = auth.uid())
      )
  )
);

-- 3) CLIENT_CLAIM_TOKENS — Optimize SELECT policy
DROP POLICY IF EXISTS "Claim tokens readable by authorized tenant members" ON public.client_claim_tokens;

CREATE POLICY "claim_tokens_select" ON public.client_claim_tokens
FOR SELECT
USING (
  public.is_active_tenant_member(auth.uid(), tenant_id)
  OR (used_by IS NOT NULL AND used_by = auth.uid())
  OR created_by = auth.uid()
);

-- 4) SHARING_AUDIT_LOG — Optimize SELECT policy (target_tenant_id EXISTS)
DROP POLICY IF EXISTS "Audit log readable by involved parties" ON public.sharing_audit_log;

CREATE POLICY "audit_select" ON public.sharing_audit_log
FOR SELECT
USING (
  (actor_user_id IS NOT NULL AND actor_user_id = auth.uid())
  OR (actor_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), actor_tenant_id))
  OR (target_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), target_tenant_id))
  OR (target_profile_id IS NOT NULL AND target_profile_id = auth.uid())
  OR (
    connection_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.id = sharing_audit_log.connection_id
        AND (
          public.is_active_tenant_member(auth.uid(), c.initiator_tenant_id)
          OR (c.recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(auth.uid(), c.recipient_tenant_id))
          OR (c.recipient_profile_id IS NOT NULL AND c.recipient_profile_id = auth.uid())
          OR c.initiator_user_id = auth.uid()
        )
    )
  )
);