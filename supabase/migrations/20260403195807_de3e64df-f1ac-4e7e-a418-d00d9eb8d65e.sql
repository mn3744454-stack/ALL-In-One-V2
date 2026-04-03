
-- Dedup: revoke the newer of the two bidirectional duplicates
-- Keep 348f775a (older, 2026-02-11), revoke caaaba18 (newer, 2026-02-13)
UPDATE public.connections
SET status = 'revoked',
    revoked_at = now(),
    updated_at = now()
WHERE id = 'caaaba18-9468-4109-a67a-4494a31b1961'
  AND status = 'accepted';

-- Now create the unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique_active_pair
ON public.connections (
  LEAST(initiator_tenant_id, recipient_tenant_id),
  GREATEST(initiator_tenant_id, recipient_tenant_id)
)
WHERE status = 'accepted';
