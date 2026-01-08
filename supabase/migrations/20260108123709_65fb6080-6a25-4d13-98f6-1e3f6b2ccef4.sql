-- جدول الزيارات البيطرية
CREATE TABLE public.vet_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- معلومات الزيارة
  title VARCHAR(255) NOT NULL,
  visit_type VARCHAR(50) NOT NULL DEFAULT 'routine',
  
  -- الجدولة
  scheduled_date TIMESTAMPTZ NOT NULL,
  scheduled_end_date TIMESTAMPTZ,
  actual_date TIMESTAMPTZ,
  
  -- الطبيب البيطري
  vet_name VARCHAR(255),
  vet_phone VARCHAR(50),
  vet_provider_id UUID REFERENCES public.service_providers(id),
  
  -- الخيول المشمولة
  horse_ids UUID[] DEFAULT '{}',
  
  -- الحالة والتفاصيل
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  
  notes TEXT,
  findings TEXT,
  recommendations TEXT,
  
  -- التكلفة
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  
  -- الإشعارات
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_date TIMESTAMPTZ,
  
  -- البيانات الوصفية
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- الفهارس
CREATE INDEX idx_vet_visits_tenant ON public.vet_visits(tenant_id);
CREATE INDEX idx_vet_visits_scheduled ON public.vet_visits(scheduled_date);
CREATE INDEX idx_vet_visits_status ON public.vet_visits(status);

-- RLS
ALTER TABLE public.vet_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant visits"
  ON public.vet_visits FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Managers can insert visits"
  ON public.vet_visits FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can update visits"
  ON public.vet_visits FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  ));

CREATE POLICY "Managers can delete visits"
  ON public.vet_visits FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  ));