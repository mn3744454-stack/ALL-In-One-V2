-- Phase 8 concurrency fix: unique partial index on lab_horses(tenant_id, linked_horse_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_lab_horses_tenant_linked_horse
ON public.lab_horses (tenant_id, linked_horse_id)
WHERE linked_horse_id IS NOT NULL;