

# خطة الإصلاح: مشكلتان محددتان

## المشكلة الأولى: الشريط الجانبي لا يتنقل للعنصر النشط

**السبب الجذري:**
الكود الحالي في `DashboardSidebar.tsx` (سطر 158) يبحث عن العنصر النشط باستخدام:
```
querySelector('[class*="from-gold"]')
```
هذا يعمل فقط مع عناصر `NavItem` المستقلة (التي تستخدم `from-gold/20` في الكلاس).
لكن العناصر الفرعية داخل `NavGroup` (مثل: الموارد البشرية ← كشف الرواتب) تستخدم `bg-gold` وليس `from-gold`. لذلك المتصفح لا يجد العنصر النشط أبداً في هذه الحالة.

**الحل:**
1. إضافة `data-nav-active="true"` على العنصر النشط في `NavItem` (سطر 70 تقريباً)
2. إضافة `data-nav-active="true"` على الرابط النشط في `NavGroup` (سطر 68)
3. تغيير الـ selector في `DashboardSidebar.tsx` من `'[class*="from-gold"]'` إلى `'[data-nav-active="true"]'`

**الملفات المتأثرة:**
- `src/components/dashboard/DashboardSidebar.tsx` — تغيير الـ selector (سطر 158)
- `src/components/dashboard/DashboardSidebar.tsx` — إضافة `data-nav-active` على `NavItem` (سطر 70)
- `src/components/dashboard/NavGroup.tsx` — إضافة `data-nav-active` على الرابط النشط (سطر 68)

---

## المشكلة الثانية: تبويب "الطلبات" في المختبر يفتح "العينات"

**السبب الجذري:**
في `DashboardLaboratory.tsx` سطر 64، قائمة التبويبات المتاحة لوضع المختبر الكامل (`full`) لا تحتوي على `'requests'`:
```ts
return ['samples', 'results', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings'];
```
عندما يضغط المستخدم على "الطلبات" من الشريط الجانبي (الذي يوجه إلى `?tab=requests`)، الكود لا يجد `requests` في القائمة فيرجع للتبويب الأول (`samples`).

**الحل:**
إضافة `'requests'` للقائمة:
```ts
return ['samples', 'results', 'requests', 'horses', 'catalog', 'compare', 'timeline', 'templates', 'settings'];
```

**الملفات المتأثرة:**
- `src/pages/DashboardLaboratory.tsx` — سطر 64 فقط

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `DashboardSidebar.tsx` (NavItem) | إضافة `data-nav-active` للعنصر النشط |
| `DashboardSidebar.tsx` (useEffect) | تغيير selector إلى `[data-nav-active="true"]` |
| `NavGroup.tsx` | إضافة `data-nav-active` للرابط الفرعي النشط |
| `DashboardLaboratory.tsx` | إضافة `requests` لقائمة التبويبات المتاحة |

ثلاث ملفات فقط، تغييرات جراحية دقيقة بدون أي تأثير جانبي.

