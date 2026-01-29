
# خطة إصلاح: المنظمة لا تظهر بسبب Race Condition العميق

## تشخيص المشكلة

### البيانات في قاعدة البيانات (مؤكدة)
- **المستخدم**: `abdullah@gmail.com` (ID: `2a1593d8-2397-4d1f-90f5-aba5983a9b57`)
- **المنظمة**: "المتميز لتحاليل الخيل" (ID: `348ce41c-1102-4295-bf6a-2ea0203c1036`)
- **العضوية**: نشطة بدور `owner`

### المشكلة الحقيقية

الإصلاح السابق الذي اعتمد على `authLoading` لا يكفي لأن:

```text
التسلسل الحالي (المعيب):

AuthContext                          TenantContext
    │                                     │
    ▼                                     │
bootstrap() starts                        │
    │                                     │
    ▼                                     │
getSession() → قد يُرجع null             │
    │                                     │
    ▼                                     │
setLoading(false) ←────────────────────── authLoading = false
    │                                     │ لكن user = null بعد!
    ▼                                     ▼
onAuthStateChange يُطلق لاحقاً       fetchTenants() ← user = null
setUser(session.user)                    │ يُنظف الحالة! ❌
    │                                     │
    ▼                                     │
user = abdullah ← لكن متأخر جداً!        │
```

**السبب**: `AuthContext.loading` يصبح `false` قبل أن `onAuthStateChange` يُطلق حدث `SIGNED_IN` ويُحدّث `user`.

---

## الحل المقترح

### الفكرة الأساسية
بدلاً من الاعتماد على `authLoading`، سنستخدم نمط "تتبع المستخدم السابق" (`hadUserRef`) للتمييز بين:
- **"لا مستخدم بعد"** → انتظر (لا تُنظف الحالة)
- **"تسجيل خروج"** → نظّف الحالة
- **"مستخدم جديد"** → اجلب البيانات

### التغييرات المطلوبة

#### الملف: `src/contexts/TenantContext.tsx`

**التغيير 1**: إضافة `useRef` لتتبع وجود مستخدم سابق

```typescript
import { useRef } from "react"; // إضافة للـ import

const hadUserRef = useRef(false);
```

**التغيير 2**: تبسيط `fetchTenants` - إزالة منطق التنظيف

```typescript
const fetchTenants = useCallback(async () => {
  log('fetchTenants start', { userId: user?.id });

  // لا يوجد مستخدم = لا حاجة للبحث عن منظمات
  if (!user) {
    log('fetchTenants: no user, skipping fetch');
    return; // لا تُنظف الحالة هنا!
  }

  setLoading(true);
  setTenantError(null);

  try {
    // ... باقي كود الـ fetch كما هو
  } finally {
    setLoading(false);
  }
}, [user]); // إزالة authLoading
```

**التغيير 3**: تعديل `useEffect` لاستخدام نمط التتبع الذكي

```typescript
useEffect(() => {
  if (user) {
    // مستخدم موجود → اجلب المنظمات
    hadUserRef.current = true;
    fetchTenants();
  } else if (hadUserRef.current) {
    // كان هناك مستخدم والآن لا يوجد = تسجيل خروج
    log('User signed out, clearing tenant state');
    setTenants([]);
    setActiveTenantState(null);
    setActiveRoleState(null);
    setLoading(false);
    setTenantError(null);
    localStorage.removeItem('activeTenantId');
    hadUserRef.current = false;
  } else {
    // لم يكن هناك مستخدم من البداية - انتظر
    log('No user yet, waiting for auth...');
    // نبقي loading = true (القيمة الافتراضية)
  }
}, [user, fetchTenants]);
```

---

## التسلسل بعد الإصلاح

```text
التسلسل الجديد (الصحيح):

AuthContext                          TenantContext
    │                                     │
    ▼                                     │
bootstrap() starts                        │
    │                                     │
    ▼                                     │
getSession() → null                       │
    │                                     │
    ▼                                     │
setLoading(false)                         │
setUser(null) ─────────────────────────▶ useEffect: user = null
    │                                     │ hadUserRef = false
    │                                     │ → "No user yet, waiting..." ✓
    │                                     │ (لا تنظيف!)
    ▼                                     │
onAuthStateChange(SIGNED_IN)              │
    │                                     │
    ▼                                     │
setUser(session.user) ─────────────────▶ useEffect: user = abdullah
                                          │ hadUserRef.current = true
                                          │ fetchTenants() ✓
                                          │ → المنظمة تظهر! ✅
```

---

## ملخص التغييرات

| السطر | التغيير |
|-------|---------|
| 1 | إضافة `useRef` للـ imports |
| 68 | إزالة `loading: authLoading` من `useAuth()` |
| 70 | إضافة `const hadUserRef = useRef(false);` |
| 75-92 | تبسيط `fetchTenants` - إزالة منطق التنظيف عند `!user` |
| 161 | تغيير dependencies إلى `[user]` فقط |
| 168-186 | إعادة كتابة `useEffect` لاستخدام نمط التتبع الذكي |

---

## لماذا هذا الحل يعمل؟

| الحالة | السلوك السابق | السلوك الجديد |
|--------|--------------|--------------|
| تحميل أولي، لا مستخدم | ينظف الحالة ❌ | ينتظر بهدوء ✅ |
| `onAuthStateChange` بعد login | لا يُعاد الجلب | يجلب البيانات ✅ |
| تسجيل خروج | قد لا ينظف | ينظف بشكل صحيح ✅ |
| تبديل مستخدم | سلوك غير متوقع | يجلب للمستخدم الجديد ✅ |

---

## تحسين إضافي: سرعة تسجيل الدخول

المشكلة الثانية (البطء) قد تكون بسبب:
1. **شبكة بطيئة** → سنضيف timeout للـ `signIn`
2. **انتظار غير ضروري** → تم إصلاحه بإزالة الاعتماد على `authLoading`

سنضيف timeout للـ `signIn` في `AuthContext`:

```typescript
import { withTimeout, BOOTSTRAP_TIMEOUT_MS } from '@/lib/withTimeout';

const signIn = async (email: string, password: string) => {
  try {
    const { error } = await withTimeout(
      () => supabase.auth.signInWithPassword({ email, password }),
      BOOTSTRAP_TIMEOUT_MS,
      'Sign in'
    );
    return { error: error as Error | null };
  } catch (err) {
    return { error: err as Error };
  }
};
```

---

## الملفات المتأثرة

1. `src/contexts/TenantContext.tsx` - التغيير الرئيسي
2. `src/contexts/AuthContext.tsx` - إضافة timeout (اختياري لتحسين السرعة)
