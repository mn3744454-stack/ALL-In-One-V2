
-- ============================================================================
-- Phase 4 — Notification governance foundation
-- ============================================================================
-- Adds:
--   1. notifications.actor_user_id  → actor-aware filtering & self-suppression
--   2. tenant_notification_governance → org-level family floor, default preset,
--      self-suppression, and escalation policy
--   3. tenant_role_preset_bindings  → role → default preset binding groundwork
--   4. Trigger to auto-populate actor_user_id from auth.uid() on INSERT
--   5. Helper RPCs: get_tenant_notification_governance, set_tenant_notification_governance
-- ============================================================================

-- 1. Actor column on notifications (nullable; system-generated rows leave it NULL)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_actor
  ON public.notifications(actor_user_id)
  WHERE actor_user_id IS NOT NULL;

-- Auto-populate actor on insert when not provided.
-- Only fills from auth.uid() — never invents an actor.
CREATE OR REPLACE FUNCTION public._notifications_set_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.actor_user_id IS NULL THEN
    BEGIN
      NEW.actor_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      NEW.actor_user_id := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_set_actor ON public.notifications;
CREATE TRIGGER trg_notifications_set_actor
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public._notifications_set_actor();

-- ----------------------------------------------------------------------------
-- 2. Org-level governance row (one per tenant, lazy-created)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_notification_governance (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Org default preset for newly-joined members (UI uses it as a recommendation)
  default_preset text NOT NULL DEFAULT 'all',
  -- Family floor: minimum delivery level the org enforces. Personal preferences
  -- can be MORE permissive (e.g. user wants 'all' even if floor is 'important')
  -- but cannot drop below the floor for that family.
  family_floor jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Suppress notifications to a user about their own actions
  suppress_self_actions boolean NOT NULL DEFAULT true,
  -- Escalate critical events to owners/managers even if their family level would
  -- otherwise filter them out (e.g. minimal preset still gets the critical row)
  escalate_critical_to_leadership boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.tenant_notification_governance ENABLE ROW LEVEL SECURITY;

-- Any active member can read their tenant's governance row (so the personal
-- control center can show "your org floor for X is 'important'")
CREATE POLICY "Members can read tenant notification governance"
ON public.tenant_notification_governance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_notification_governance.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

-- Only owner/manager can write
CREATE POLICY "Owners and managers manage tenant notification governance"
ON public.tenant_notification_governance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_notification_governance.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_notification_governance.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
);

-- Touch updated_at
CREATE TRIGGER trg_tenant_notification_governance_touch
BEFORE UPDATE ON public.tenant_notification_governance
FOR EACH ROW
EXECUTE FUNCTION public._touch_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Role → preset binding groundwork
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_role_preset_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Free text role key so user-defined roles can bind too. We do NOT enforce
  -- this against tenant_member_roles enum because Phase 4 must remain flexible
  -- per the investigative conclusion (no role-title hardcoding).
  role_key text NOT NULL,
  preset_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (tenant_id, role_key)
);

ALTER TABLE public.tenant_role_preset_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read role preset bindings"
ON public.tenant_role_preset_bindings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_role_preset_bindings.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

CREATE POLICY "Owners and managers manage role preset bindings"
ON public.tenant_role_preset_bindings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_role_preset_bindings.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_role_preset_bindings.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  )
);

-- ----------------------------------------------------------------------------
-- 4. RPC: get_tenant_notification_governance — returns row or defaults
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_notification_governance(_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  default_preset text,
  family_floor jsonb,
  suppress_self_actions boolean,
  escalate_critical_to_leadership boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be an active member to see this
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    _tenant_id,
    COALESCE(g.default_preset, 'all'),
    COALESCE(g.family_floor, '{}'::jsonb),
    COALESCE(g.suppress_self_actions, true),
    COALESCE(g.escalate_critical_to_leadership, true)
  FROM (SELECT 1) _
  LEFT JOIN public.tenant_notification_governance g ON g.tenant_id = _tenant_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: set_tenant_notification_governance — owner/manager only, upsert
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_tenant_notification_governance(
  _tenant_id uuid,
  _default_preset text,
  _family_floor jsonb,
  _suppress_self_actions boolean,
  _escalate_critical_to_leadership boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = _tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to manage notification governance for this tenant';
  END IF;

  INSERT INTO public.tenant_notification_governance AS g
    (tenant_id, default_preset, family_floor, suppress_self_actions,
     escalate_critical_to_leadership, updated_by, updated_at)
  VALUES (_tenant_id, _default_preset, _family_floor, _suppress_self_actions,
          _escalate_critical_to_leadership, auth.uid(), now())
  ON CONFLICT (tenant_id) DO UPDATE
    SET default_preset = EXCLUDED.default_preset,
        family_floor = EXCLUDED.family_floor,
        suppress_self_actions = EXCLUDED.suppress_self_actions,
        escalate_critical_to_leadership = EXCLUDED.escalate_critical_to_leadership,
        updated_by = auth.uid(),
        updated_at = now();
END;
$$;
