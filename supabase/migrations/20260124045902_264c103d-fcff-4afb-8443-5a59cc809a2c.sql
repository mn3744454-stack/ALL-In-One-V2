-- Add performance index for client queries by tenant
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);