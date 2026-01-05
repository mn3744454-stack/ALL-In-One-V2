-- Create junction table for sample test types (many-to-many)
CREATE TABLE public.lab_sample_test_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sample_id UUID NOT NULL REFERENCES public.lab_samples(id) ON DELETE CASCADE,
  test_type_id UUID NOT NULL REFERENCES public.lab_test_types(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sample_id, test_type_id)
);

-- Create indexes for performance
CREATE INDEX idx_lab_sample_test_types_sample_id ON public.lab_sample_test_types(sample_id);
CREATE INDEX idx_lab_sample_test_types_test_type_id ON public.lab_sample_test_types(test_type_id);
CREATE INDEX idx_lab_sample_test_types_tenant_id ON public.lab_sample_test_types(tenant_id);

-- Enable RLS
ALTER TABLE public.lab_sample_test_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing helper functions
CREATE POLICY "Members can view sample test types"
ON public.lab_sample_test_types
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can insert sample test types"
ON public.lab_sample_test_types
FOR INSERT
WITH CHECK (can_manage_lab(auth.uid(), tenant_id));

CREATE POLICY "Lab managers can delete sample test types"
ON public.lab_sample_test_types
FOR DELETE
USING (can_manage_lab(auth.uid(), tenant_id));