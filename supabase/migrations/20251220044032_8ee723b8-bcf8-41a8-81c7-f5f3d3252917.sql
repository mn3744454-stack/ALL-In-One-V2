-- ============================================
-- إعادة بناء سياسات RLS من الصفر
-- ============================================

-- 1. حذف كل السياسات الموجودة على tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Members can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;

-- 2. حذف كل السياسات الموجودة على tenant_members
DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "Owners can manage tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can insert themselves as owner" ON public.tenant_members;

-- 3. حذف كل السياسات الموجودة على horses
DROP POLICY IF EXISTS "Members can view tenant horses" ON public.horses;
DROP POLICY IF EXISTS "Members with permission can manage horses" ON public.horses;

-- 4. حذف كل السياسات الموجودة على invitations
DROP POLICY IF EXISTS "Invitees can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Members with permission can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Senders can view their sent invitations" ON public.invitations;

-- 5. حذف كل السياسات الموجودة على profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of tenant members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- ============================================
-- إعادة إنشاء سياسات tenants
-- ============================================

-- أي مستخدم مسجل يمكنه إنشاء منظمة (بسيط وواضح)
CREATE POLICY "Authenticated users can create tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (true);

-- الأعضاء فقط يرون منظماتهم
CREATE POLICY "Members can view their tenants"
ON public.tenants FOR SELECT TO authenticated
USING (public.is_tenant_member(auth.uid(), id));

-- المالكون فقط يعدلون
CREATE POLICY "Owners can update their tenants"
ON public.tenants FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), id, 'owner'));

-- ============================================
-- إعادة إنشاء سياسات tenant_members
-- ============================================

-- المستخدم يضيف نفسه كمالك عند إنشاء منظمة جديدة
CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'owner');

-- الأعضاء يرون أعضاء منظماتهم
CREATE POLICY "Members can view tenant members"
ON public.tenant_members FOR SELECT TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

-- المالكون يديرون الأعضاء (تعديل وحذف)
CREATE POLICY "Owners can manage tenant members"
ON public.tenant_members FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- ============================================
-- إعادة إنشاء سياسات horses
-- ============================================

-- الأعضاء يرون خيول منظماتهم
CREATE POLICY "Members can view tenant horses"
ON public.horses FOR SELECT TO authenticated
USING (public.is_tenant_member(auth.uid(), tenant_id));

-- الأعضاء مع الصلاحية يديرون الخيول
CREATE POLICY "Members with permission can manage horses"
ON public.horses FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_members.user_id = auth.uid()
    AND tenant_members.tenant_id = horses.tenant_id
    AND (tenant_members.can_manage_horses = true OR tenant_members.role = 'owner')
    AND tenant_members.is_active = true
  )
);

-- ============================================
-- إعادة إنشاء سياسات invitations
-- ============================================

-- المدعوون يرون دعواتهم
CREATE POLICY "Invitees can view their invitations"
ON public.invitations FOR SELECT TO authenticated
USING (
  invitee_id = auth.uid() OR 
  invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- المدعوون يردون على دعواتهم
CREATE POLICY "Invitees can update their invitations"
ON public.invitations FOR UPDATE TO authenticated
USING (
  invitee_id = auth.uid() OR 
  invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- المرسلون يرون دعواتهم
CREATE POLICY "Senders can view their sent invitations"
ON public.invitations FOR SELECT TO authenticated
USING (sender_id = auth.uid());

-- الأعضاء مع الصلاحية ينشئون دعوات
CREATE POLICY "Members with permission can create invitations"
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (public.can_invite_in_tenant(auth.uid(), tenant_id));

-- ============================================
-- إعادة إنشاء سياسات profiles
-- ============================================

-- المستخدم يرى ملفه الشخصي
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- المستخدم يعدل ملفه الشخصي
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

-- المستخدم ينشئ ملفه الشخصي (للتسجيل)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- الأعضاء يرون ملفات أعضاء منظماتهم
CREATE POLICY "Users can view profiles of tenant members"
ON public.profiles FOR SELECT TO authenticated
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