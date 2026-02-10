
CREATE TABLE IF NOT EXISTS public.lab_request_services (
  lab_request_id uuid NOT NULL REFERENCES public.lab_requests(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.lab_services(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lab_request_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_lrs_service_id ON public.lab_request_services(service_id);
CREATE INDEX IF NOT EXISTS idx_lrs_request_id ON public.lab_request_services(lab_request_id);

ALTER TABLE public.lab_request_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lrs_select_via_request_access" ON public.lab_request_services;
DROP POLICY IF EXISTS "lrs_insert_via_request_access" ON public.lab_request_services;
DROP POLICY IF EXISTS "lrs_delete_via_request_access" ON public.lab_request_services;

CREATE POLICY "lrs_select_via_request_access"
  ON public.lab_request_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND public.is_active_tenant_member(auth.uid(), r.tenant_id)
    )
  );

CREATE POLICY "lrs_insert_via_request_access"
  ON public.lab_request_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND public.is_active_tenant_member(auth.uid(), r.tenant_id)
    )
  );

CREATE POLICY "lrs_delete_via_request_access"
  ON public.lab_request_services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.lab_requests r
      WHERE r.id = lab_request_id
        AND public.is_active_tenant_member(auth.uid(), r.tenant_id)
    )
  );
