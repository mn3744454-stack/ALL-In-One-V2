-- Add missing timestamp columns for sample lifecycle tracking
ALTER TABLE public.lab_samples
ADD COLUMN IF NOT EXISTS accessioned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- Add trigger to set timestamps on status transitions
CREATE OR REPLACE FUNCTION public.set_sample_lifecycle_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only handle UPDATEs (explicit safety)
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Track accessioned timestamp
  IF NEW.status = 'accessioned'
     AND (OLD.status IS NULL OR OLD.status <> 'accessioned')
     AND NEW.accessioned_at IS NULL
  THEN
    NEW.accessioned_at := NOW();
  END IF;

  -- Track processing started timestamp
  IF NEW.status = 'processing'
     AND (OLD.status IS NULL OR OLD.status <> 'processing')
     AND NEW.processing_started_at IS NULL
  THEN
    NEW.processing_started_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_sample_lifecycle_timestamps ON public.lab_samples;
CREATE TRIGGER trg_sample_lifecycle_timestamps
BEFORE UPDATE ON public.lab_samples
FOR EACH ROW
EXECUTE FUNCTION public.set_sample_lifecycle_timestamps();

-- Add permission definitions for community/bookings/payments
INSERT INTO public.permission_definitions
  (key, module, resource, action, display_name, display_name_ar, description, description_ar, is_delegatable)
VALUES
  ('community.view', 'community', 'community', 'view', 'View Community', 'عرض المجتمع', 'Access the community feed and posts', 'الوصول لمحتوى المجتمع والمنشورات', true),
  ('community.manage', 'community', 'community', 'manage', 'Manage Community', 'إدارة المجتمع', 'Create, edit, and delete posts', 'إنشاء وتعديل وحذف المنشورات', true),
  ('bookings.view', 'bookings', 'bookings', 'view', 'View Bookings', 'عرض الحجوزات', 'View booking records', 'عرض سجلات الحجوزات', true),
  ('bookings.manage', 'bookings', 'bookings', 'manage', 'Manage Bookings', 'إدارة الحجوزات', 'Create and manage bookings', 'إنشاء وإدارة الحجوزات', true),
  ('payments.view', 'payments', 'payments', 'view', 'View Payments', 'عرض المدفوعات', 'View payment records', 'عرض سجلات المدفوعات', true),
  ('payments.manage', 'payments', 'payments', 'manage', 'Manage Payments', 'إدارة المدفوعات', 'Process and manage payments', 'معالجة وإدارة المدفوعات', true)
ON CONFLICT (key) DO NOTHING;

-- Add tenant_id to community tables for org-scoped community (nullable to preserve existing data)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Create indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id
  ON public.posts(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_comments_tenant_id
  ON public.post_comments(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_likes_tenant_id
  ON public.post_likes(tenant_id) WHERE tenant_id IS NOT NULL;

-- Backfill tenant_id for existing comments/likes based on their parent post
UPDATE public.post_comments pc
SET tenant_id = p.tenant_id
FROM public.posts p
WHERE pc.post_id = p.id
  AND pc.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

UPDATE public.post_likes pl
SET tenant_id = p.tenant_id
FROM public.posts p
WHERE pl.post_id = p.id
  AND pl.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- Ensure new comments/likes inherit tenant_id from post if not provided
CREATE OR REPLACE FUNCTION public.sync_post_child_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.posts
  WHERE id = NEW.post_id;

  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_sync_tenant_id ON public.post_comments;
CREATE TRIGGER trg_post_comments_sync_tenant_id
BEFORE INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_child_tenant_id();

DROP TRIGGER IF EXISTS trg_post_likes_sync_tenant_id ON public.post_likes;
CREATE TRIGGER trg_post_likes_sync_tenant_id
BEFORE INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_child_tenant_id();