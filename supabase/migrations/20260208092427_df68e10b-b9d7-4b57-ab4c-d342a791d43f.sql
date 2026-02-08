-- ============================================================
-- PHASE 1: UHP Junction Table + Backfill
-- ============================================================

-- 1.1 Create party_horse_links table
CREATE TABLE IF NOT EXISTS party_horse_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Party reference (clients for MVP)
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Horse reference (lab_horses for lab module MVP)
  lab_horse_id uuid NOT NULL REFERENCES lab_horses(id) ON DELETE CASCADE,
  
  -- Relationship metadata
  relationship_type text NOT NULL CHECK (relationship_type IN 
    ('lab_customer', 'payer', 'owner', 'trainer', 'stable')),
  is_primary boolean NOT NULL DEFAULT false,
  
  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Unique constraint: one link per client+horse+relationship type
CREATE UNIQUE INDEX IF NOT EXISTS uq_party_horse_links_unique
  ON party_horse_links(tenant_id, client_id, lab_horse_id, relationship_type);

-- Index for filtering horses by client (10.1 main use case)
CREATE INDEX IF NOT EXISTS idx_party_horse_links_by_client
  ON party_horse_links(tenant_id, client_id);

-- Index for finding clients for a horse (owner quick view)
CREATE INDEX IF NOT EXISTS idx_party_horse_links_by_lab_horse
  ON party_horse_links(tenant_id, lab_horse_id);

-- Enable RLS
ALTER TABLE party_horse_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tenant-scoped access
CREATE POLICY "Tenant members can view party horse links"
  ON party_horse_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));

CREATE POLICY "Tenant members can create party horse links"
  ON party_horse_links FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));

CREATE POLICY "Tenant members can delete party horse links"
  ON party_horse_links FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = party_horse_links.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ));

-- 1.2 Backfill from historical samples
WITH ranked AS (
  SELECT
    ls.tenant_id,
    ls.client_id,
    ls.lab_horse_id,
    ls.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY ls.tenant_id, ls.lab_horse_id
      ORDER BY ls.created_at DESC
    ) AS rn
  FROM lab_samples ls
  WHERE ls.lab_horse_id IS NOT NULL
    AND ls.client_id IS NOT NULL
)
INSERT INTO party_horse_links (tenant_id, client_id, lab_horse_id, relationship_type, is_primary)
SELECT
  r.tenant_id,
  r.client_id,
  r.lab_horse_id,
  'lab_customer',
  true
FROM ranked r
WHERE r.rn = 1
ON CONFLICT (tenant_id, client_id, lab_horse_id, relationship_type) DO NOTHING;