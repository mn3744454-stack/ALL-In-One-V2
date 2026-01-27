-- Fix UUID vs text comparison in the *4-arg* can_access_shared_resource used by lab_results RLS
-- Non-destructive, idempotent: replace function body only.

CREATE OR REPLACE FUNCTION public.can_access_shared_resource(
  _actor_user_id uuid,
  _resource_type text,
  _resource_id uuid,
  _required_access text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _has_access boolean := false;
BEGIN
  -- Safety: unauthenticated callers should never match grants, and must not error
  IF _actor_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.consent_grants g
    JOIN public.connections c ON c.id = g.connection_id
    WHERE
      g.status = 'active'
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND (g.revoked_at IS NULL)
      AND c.status = 'accepted'
      AND g.resource_type = _resource_type
      AND (
        g.access_level = _required_access
        OR g.access_level = 'write'
      )
      AND (
        c.recipient_profile_id = _actor_user_id
        OR (c.recipient_tenant_id IS NOT NULL AND public.is_active_tenant_member(_actor_user_id, c.recipient_tenant_id))
      )
      AND (
        g.resource_ids IS NULL
        OR array_length(g.resource_ids, 1) IS NULL
        -- Fix: compare UUID to uuid[] directly (no ::text)
        OR _resource_id = ANY(g.resource_ids)
      )
  ) INTO _has_access;

  RETURN _has_access;
END;
$$;