-- Create enum for tenant types
CREATE TYPE public.tenant_type AS ENUM ('stable', 'clinic', 'lab', 'academy', 'pharmacy', 'transport', 'auction');

-- Create enum for roles within tenants
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'foreman', 'vet', 'trainer', 'employee');

-- Create enum for invitation status
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type tenant_type NOT NULL,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant_members table (user-tenant relationships with roles)
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'employee',
  can_invite BOOLEAN NOT NULL DEFAULT false,
  can_manage_horses BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  proposed_role tenant_role NOT NULL,
  assigned_horse_ids UUID[] DEFAULT '{}',
  status invitation_status NOT NULL DEFAULT 'pending',
  role_accepted BOOLEAN,
  horses_accepted BOOLEAN,
  rejection_reason TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create horses table
CREATE TABLE public.horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  breed TEXT,
  color TEXT,
  birth_date DATE,
  registration_number TEXT,
  microchip_number TEXT,
  notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check tenant membership
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND is_active = true
  )
$$;

-- Create security definer function to check if user has specific role in tenant
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role tenant_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND role = _role
    AND is_active = true
  )
$$;

-- Create security definer function to check if user can invite in tenant
CREATE OR REPLACE FUNCTION public.can_invite_in_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id 
    AND tenant_id = _tenant_id 
    AND (can_invite = true OR role = 'owner')
    AND is_active = true
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view profiles of tenant members"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members tm1
    JOIN public.tenant_members tm2 ON tm1.tenant_id = tm2.tenant_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = profiles.id
    AND tm1.is_active = true
    AND tm2.is_active = true
  )
);

-- Tenants policies
CREATE POLICY "Members can view their tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (public.is_tenant_member(auth.uid(), id));

CREATE POLICY "Owners can update their tenants"
ON public.tenants FOR UPDATE
TO authenticated
USING (public.has_tenant_role(auth.uid(), id, 'owner'));

CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Tenant members policies
CREATE POLICY "Members can view tenant members"
ON public.tenant_members FOR SELECT
TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Owners can manage tenant members"
ON public.tenant_members FOR ALL
TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'owner');

-- Invitations policies
CREATE POLICY "Senders can view their sent invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Invitees can view their invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (invitee_id = auth.uid() OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Members with permission can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (public.can_invite_in_tenant(auth.uid(), tenant_id));

CREATE POLICY "Invitees can update their invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (invitee_id = auth.uid() OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Horses policies
CREATE POLICY "Members can view tenant horses"
ON public.horses FOR SELECT
TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members with permission can manage horses"
ON public.horses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = auth.uid() 
    AND tenant_id = horses.tenant_id 
    AND (can_manage_horses = true OR role = 'owner')
    AND is_active = true
  )
);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_members_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_horses_updated_at
  BEFORE UPDATE ON public.horses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();