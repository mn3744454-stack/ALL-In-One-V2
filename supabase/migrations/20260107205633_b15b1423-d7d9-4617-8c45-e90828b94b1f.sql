-- Create RPC for initializing tenant capabilities with defaults
CREATE OR REPLACE FUNCTION public.initialize_tenant_defaults(
  p_tenant_id uuid,
  p_tenant_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Laboratory defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'laboratory',
    CASE WHEN p_tenant_type = 'lab' THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type = 'lab' THEN '{"lab_mode": "full"}'::jsonb
      WHEN p_tenant_type IN ('stable', 'clinic') THEN '{"lab_mode": "requests"}'::jsonb
      ELSE '{"lab_mode": "none"}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Vet defaults (visits)
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'vet',
    CASE WHEN p_tenant_type IN ('clinic', 'vet') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('clinic', 'vet') THEN '{"enabled": true}'::jsonb
      WHEN p_tenant_type = 'stable' THEN '{"enabled": false}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Housing defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'housing',
    CASE WHEN p_tenant_type IN ('stable', 'clinic') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('stable', 'clinic') THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Movement defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'movement',
    CASE WHEN p_tenant_type IN ('stable', 'clinic', 'transport') THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type IN ('stable', 'clinic', 'transport') THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;

  -- Breeding defaults
  INSERT INTO tenant_capabilities (tenant_id, category, has_internal, allow_external, config)
  VALUES (
    p_tenant_id,
    'breeding',
    CASE WHEN p_tenant_type = 'stable' THEN true ELSE false END,
    true,
    CASE
      WHEN p_tenant_type = 'stable' THEN '{"enabled": true}'::jsonb
      ELSE '{"enabled": false}'::jsonb
    END
  )
  ON CONFLICT (tenant_id, category) DO NOTHING;
END;
$$;

-- Create lab_requests table for requests-only lab mode
CREATE TABLE IF NOT EXISTS public.lab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  external_lab_name text,
  external_lab_id uuid REFERENCES tenants(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'processing', 'ready', 'received', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  test_description text NOT NULL,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expected_by date,
  received_at timestamptz,
  result_share_token text,
  result_url text,
  result_file_path text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_demo boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_requests_tenant ON lab_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_horse ON lab_requests(horse_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);

-- Enable RLS
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for lab_requests
CREATE POLICY "Users can view lab requests in their tenant"
  ON lab_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = lab_requests.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.is_active = true
    )
  );

CREATE POLICY "Users can create lab requests in their tenant"
  ON lab_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = lab_requests.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.is_active = true
    )
  );

CREATE POLICY "Users can update lab requests in their tenant"
  ON lab_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = lab_requests.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.is_active = true
    )
  );

CREATE POLICY "Users can delete lab requests in their tenant"
  ON lab_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenant_members
      WHERE tenant_members.tenant_id = lab_requests.tenant_id
        AND tenant_members.user_id = auth.uid()
        AND tenant_members.is_active = true
    )
  );

-- Add unique constraint for tenant_capabilities if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenant_capabilities_tenant_id_category_key'
  ) THEN
    ALTER TABLE tenant_capabilities ADD CONSTRAINT tenant_capabilities_tenant_id_category_key UNIQUE (tenant_id, category);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;