
# خطة إصلاح: المنظمة لا تظهر بعد تسجيل الدخول

## المشكلة
عند تسجيل الدخول بحساب جديد، المنظمة لا تظهر رغم وجودها في قاعدة البيانات.

## السبب
ثلاث مشكلات في `TenantContext.tsx`:

1. **useEffect لا يتضمن fetchTenants** - السطر 160-162 يستخدم `[user]` فقط، لكن عندما يتغير `user`، يتم إنشاء نسخة جديدة من `fetchTenants` لا يتم استدعاؤها
2. **Stale Closure** - الشرط `!activeTenant` في السطر 125 يمنع تعيين المنظمة إذا كان هناك قيمة قديمة
3. **عدم انتظار Auth** - لا يوجد تحقق من أن `AuthContext` اكتمل تحميله

## الحل

### التغييرات في `src/contexts/TenantContext.tsx`

| السطر | التغيير |
|-------|---------|
| 68 | إضافة `loading: authLoading` من `useAuth()` |
| 75-86 | إضافة تحقق من `authLoading` قبل بدء الجلب |
| 125 | إزالة شرط `!activeTenant` ليتم تعيين المنظمة دائماً |
| 153 | إزالة `activeTenant` من dependencies وإضافة `authLoading` |
| 160-162 | تغيير dependency array إلى `[fetchTenants]` |

### الكود الجديد

```typescript
// السطر 68
const { user, loading: authLoading } = useAuth();

// السطر 75-86 (بداية fetchTenants)
const fetchTenants = useCallback(async () => {
  log('fetchTenants start', { userId: user?.id, authLoading });

  // انتظر حتى يكتمل تحميل Auth
  if (authLoading) {
    log('fetchTenants: auth still loading, waiting...');
    return;
  }

  if (!user) {
    log('fetchTenants: no user, clearing state');
    setTenants([]);
    setActiveTenantState(null);
    setActiveRoleState(null);
    setLoading(false);
    setTenantError(null);
    return;
  }
  // ... باقي الكود
```

```typescript
// السطر 124-144 - إزالة شرط !activeTenant
if (memberships.length > 0) {
  const storedTenantId = localStorage.getItem('activeTenantId');
  const storedMembership = storedTenantId 
    ? memberships.find(m => m.tenant_id === storedTenantId)
    : null;
  
  if (storedMembership) {
    setActiveTenantState(storedMembership);
    setActiveRoleState(storedMembership.role);
  } else {
    if (storedTenantId) {
      localStorage.removeItem('activeTenantId');
    }
    setActiveTenantState(memberships[0]);
    setActiveRoleState(memberships[0].role);
    localStorage.setItem('activeTenantId', memberships[0].tenant_id);
  }
} else {
  setActiveTenantState(null);
  setActiveRoleState(null);
  localStorage.removeItem('activeTenantId');
}
```

```typescript
// السطر 153 - تحديث dependencies
}, [user, authLoading]);

// السطر 160-162 - تحديث useEffect
useEffect(() => {
  fetchTenants();
}, [fetchTenants]);
```

## النتيجة المتوقعة
بعد تسجيل الدخول:
1. `AuthContext` يُحمّل المستخدم
2. `fetchTenants` تُعاد إنشاؤها (بسبب تغير `user`)
3. `useEffect` يستدعي النسخة الجديدة
4. المنظمة تظهر بشكل صحيح ✅
