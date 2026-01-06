
-- ============================================
-- 1. Extend branches table
-- ============================================
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS city text NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Idempotent trigger creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_branches_updated_at'
  ) THEN
    CREATE TRIGGER set_branches_updated_at
      BEFORE UPDATE ON public.branches
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for branches
CREATE INDEX IF NOT EXISTS idx_branches_tenant_active 
  ON public.branches(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_branches_demo 
  ON public.branches(tenant_id, is_demo) WHERE is_demo = true;

-- ============================================
-- 2. Add current_location_id to horses
-- ============================================
ALTER TABLE public.horses
  ADD COLUMN IF NOT EXISTS current_location_id uuid NULL REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_horses_current_location 
  ON public.horses(tenant_id, current_location_id);

-- ============================================
-- 3. Create permission function
-- ============================================
CREATE OR REPLACE FUNCTION public.can_manage_movement(user_id uuid, p_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_members.user_id = $1
      AND tenant_members.tenant_id = $2
      AND tenant_members.is_active = true
      AND (
        tenant_members.role IN ('owner', 'manager')
        OR tenant_members.can_manage_horses = true
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. Create movement_type enum
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE public.movement_type AS ENUM ('in', 'out', 'transfer');
  END IF;
END $$;

-- ============================================
-- 5. Create horse_movements table
-- ============================================
CREATE TABLE IF NOT EXISTS public.horse_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  horse_id uuid NOT NULL REFERENCES public.horses(id) ON DELETE CASCADE,
  movement_type public.movement_type NOT NULL,
  from_location_id uuid NULL REFERENCES public.branches(id),
  to_location_id uuid NULL REFERENCES public.branches(id),
  movement_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid NULL REFERENCES auth.users(id),
  reason text NULL,
  notes text NULL,
  internal_location_note text NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT chk_movement_in CHECK (
    movement_type != 'in' OR to_location_id IS NOT NULL
  ),
  CONSTRAINT chk_movement_out CHECK (
    movement_type != 'out' OR from_location_id IS NOT NULL
  ),
  CONSTRAINT chk_movement_transfer CHECK (
    movement_type != 'transfer' OR (
      from_location_id IS NOT NULL AND 
      to_location_id IS NOT NULL
    )
  ),
  CONSTRAINT chk_transfer_same_branch CHECK (
    movement_type != 'transfer' 
    OR from_location_id != to_location_id 
    OR internal_location_note IS NOT NULL
  )
);

-- ============================================
-- 6. Indexes for horse_movements
-- ============================================
CREATE INDEX IF NOT EXISTS idx_horse_movements_tenant 
  ON public.horse_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_horse_movements_horse 
  ON public.horse_movements(tenant_id, horse_id);
CREATE INDEX IF NOT EXISTS idx_horse_movements_date 
  ON public.horse_movements(tenant_id, movement_at DESC);
CREATE INDEX IF NOT EXISTS idx_horse_movements_to_location 
  ON public.horse_movements(tenant_id, to_location_id);
CREATE INDEX IF NOT EXISTS idx_horse_movements_from_location 
  ON public.horse_movements(tenant_id, from_location_id);
CREATE INDEX IF NOT EXISTS idx_horse_movements_type_date 
  ON public.horse_movements(tenant_id, movement_type, movement_at DESC);
CREATE INDEX IF NOT EXISTS idx_horse_movements_demo 
  ON public.horse_movements(tenant_id, is_demo) WHERE is_demo = true;

-- ============================================
-- 7. RLS Policies (immutable - no UPDATE)
-- ============================================
ALTER TABLE public.horse_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view movements"
  ON public.horse_movements FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Managers can insert movements"
  ON public.horse_movements FOR INSERT
  WITH CHECK (can_manage_movement(auth.uid(), tenant_id));

CREATE POLICY "Managers can delete demo movements"
  ON public.horse_movements FOR DELETE
  USING (can_manage_movement(auth.uid(), tenant_id) AND is_demo = true);

-- ============================================
-- 8. Updated_at trigger (idempotent)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_horse_movements_updated_at'
  ) THEN
    CREATE TRIGGER set_horse_movements_updated_at
      BEFORE UPDATE ON public.horse_movements
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 9. Auto-update horse.current_location_id
-- ============================================
CREATE OR REPLACE FUNCTION public.update_horse_current_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' OR NEW.movement_type = 'transfer' THEN
    UPDATE public.horses 
    SET current_location_id = NEW.to_location_id,
        updated_at = now()
    WHERE id = NEW.horse_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.horses 
    SET current_location_id = NULL,
        updated_at = now()
    WHERE id = NEW.horse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_horse_location'
  ) THEN
    CREATE TRIGGER trigger_update_horse_location
      AFTER INSERT ON public.horse_movements
      FOR EACH ROW EXECUTE FUNCTION public.update_horse_current_location();
  END IF;
END $$;

-- ============================================
-- 10. Allow deleting demo branches
-- ============================================
DROP POLICY IF EXISTS "Managers can delete demo branches" ON public.branches;
CREATE POLICY "Managers can delete demo branches"
  ON public.branches FOR DELETE
  USING (can_manage_horses(auth.uid(), tenant_id) AND is_demo = true);
