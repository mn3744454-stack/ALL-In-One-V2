-- A) INVITATIONS PRIVACY FIX

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='invitations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations;', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY invitations_select_received ON public.invitations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = invitations.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
  )
  AND
  (
    invitations.invitee_id = auth.uid()
    OR (
      invitations.invitee_email IS NOT NULL
      AND lower(invitations.invitee_email) = lower( (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()) )
    )
  )
);

CREATE POLICY invitations_select_sent ON public.invitations
FOR SELECT TO authenticated
USING (
  invitations.sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = invitations.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.can_invite = true OR tm.role IN ('owner','manager','foreman'))
  )
);

CREATE POLICY invitations_insert ON public.invitations
FOR INSERT TO authenticated
WITH CHECK (
  invitations.sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = invitations.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.can_invite = true OR tm.role IN ('owner','manager','foreman'))
  )
);

CREATE POLICY invitations_update ON public.invitations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = invitations.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (
        invitations.sender_id = auth.uid()
        OR tm.role IN ('owner','manager','foreman')
      )
  )
)
WITH CHECK (true);

-- D) HR EMPLOYEE EVENTS TABLE FOR EMPLOYMENT HISTORY

CREATE TABLE IF NOT EXISTS public.hr_employee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_employee_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hr_employee_events_select ON public.hr_employee_events;
CREATE POLICY hr_employee_events_select ON public.hr_employee_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_employee_events.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager','foreman')
  )
);

DROP POLICY IF EXISTS hr_employee_events_insert ON public.hr_employee_events;
CREATE POLICY hr_employee_events_insert ON public.hr_employee_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = hr_employee_events.tenant_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('owner','manager','foreman')
  )
);

-- REQUIRED GRANTS (DO NOT SKIP)
GRANT SELECT, INSERT ON public.hr_employee_events TO authenticated;