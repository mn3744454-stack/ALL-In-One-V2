-- Academy Booking Foundations
-- NOTE: This is a temporary scope decision - academy is tenant.type = 'academy' ONLY for this step.
-- Do NOT merge with stable or introduce academy modules now.

-- Step 1: Create helper function for academy session management
CREATE OR REPLACE FUNCTION public.can_manage_academy_sessions(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND role IN ('owner', 'manager')
    AND is_active = true
  )
$$;

-- Step 2: Create academy_sessions table
CREATE TABLE public.academy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_text TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  price_display TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create academy_bookings table
CREATE TABLE public.academy_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.academy_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_academy_sessions_tenant_id ON public.academy_sessions(tenant_id);
CREATE INDEX idx_academy_sessions_start_at ON public.academy_sessions(start_at);
CREATE INDEX idx_academy_bookings_tenant_id ON public.academy_bookings(tenant_id);
CREATE INDEX idx_academy_bookings_session_id ON public.academy_bookings(session_id);
CREATE INDEX idx_academy_bookings_user_id ON public.academy_bookings(user_id);

-- Step 5: Create consumption view for future billing
CREATE OR REPLACE VIEW public.academy_booking_consumption AS
SELECT 
  tenant_id,
  date_trunc('month', created_at) as month,
  COUNT(*)::INTEGER as total_bookings,
  COUNT(*) FILTER (WHERE status = 'confirmed')::INTEGER as confirmed_bookings
FROM public.academy_bookings
GROUP BY tenant_id, date_trunc('month', created_at);

-- Step 6: Enable RLS on tables
ALTER TABLE public.academy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_bookings ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS policies for academy_sessions

-- Public can read active public sessions from public tenants
CREATE POLICY "Anyone can view public active sessions from public tenants"
ON public.academy_sessions
FOR SELECT
USING (
  is_public = true 
  AND is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = academy_sessions.tenant_id 
    AND t.is_public = true
  )
);

-- Tenant members can view all their tenant's sessions
CREATE POLICY "Tenant members can view all sessions"
ON public.academy_sessions
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Owner/Manager can create sessions
CREATE POLICY "Owner and manager can create sessions"
ON public.academy_sessions
FOR INSERT
WITH CHECK (can_manage_academy_sessions(auth.uid(), tenant_id));

-- Owner/Manager can update sessions
CREATE POLICY "Owner and manager can update sessions"
ON public.academy_sessions
FOR UPDATE
USING (can_manage_academy_sessions(auth.uid(), tenant_id));

-- Owner/Manager can delete sessions
CREATE POLICY "Owner and manager can delete sessions"
ON public.academy_sessions
FOR DELETE
USING (can_manage_academy_sessions(auth.uid(), tenant_id));

-- Step 8: RLS policies for academy_bookings

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
ON public.academy_bookings
FOR SELECT
USING (user_id = auth.uid());

-- Tenant owner/manager can view all bookings for their tenant
CREATE POLICY "Tenant owner and manager can view bookings"
ON public.academy_bookings
FOR SELECT
USING (can_manage_academy_sessions(auth.uid(), tenant_id));

-- Authenticated users can create bookings for themselves
CREATE POLICY "Users can create their own bookings"
ON public.academy_bookings
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.academy_sessions s 
    WHERE s.id = session_id 
    AND s.is_active = true
  )
);

-- Users can cancel their own bookings (update status to cancelled only)
CREATE POLICY "Users can cancel their own bookings"
ON public.academy_bookings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (status = 'cancelled');

-- Tenant owner/manager can update booking status
CREATE POLICY "Tenant owner and manager can update bookings"
ON public.academy_bookings
FOR UPDATE
USING (can_manage_academy_sessions(auth.uid(), tenant_id));