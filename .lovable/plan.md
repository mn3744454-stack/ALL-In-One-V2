

# تقرير وخطة التنفيذ — تبويبات المالية الفرعية في الشريط الجانبي

## ما فهمته منك

لديك 3 طلبات على التبويبات الفرعية للمالية في الشريط الجانبي (`DashboardSidebar.tsx` سطر 194-200):

1. **"نظرة عامة"** حالياً تفتح `/dashboard/finance` وهي نفس صفحة الفواتير — تريد تحويلها إلى **"دفتر الحسابات"** وتوجيهها إلى `/dashboard/finance/ledger`
2. **"العملاء"** تريد إعادة تسميتها إلى **"أرصدة العملاء"** لتمييزها عن تبويبة "العملاء" الرئيسية (CRM) في الشريط الجانبي
3. **لا توجد تبويبة "المدفوعات"** — تريد إضافتها

## التغييرات المطلوبة

### ملف واحد: `src/components/dashboard/DashboardSidebar.tsx` (سطر 194-200)

التبويبات الحالية:
```
TrendingUp  → "نظرة عامة"      → /dashboard/finance
FileText    → "الفواتير"        → /dashboard/finance/invoices
CreditCard  → "المصروفات"       → /dashboard/finance/expenses
UsersIcon   → "العملاء"         → /dashboard/finance/customer-balances
ShoppingCart → "نقطة البيع"     → /dashboard/finance/pos
```

التبويبات الجديدة:
```
BookOpen    → "دفتر الحسابات"   → /dashboard/finance/ledger
FileText    → "الفواتير"        → /dashboard/finance/invoices
CreditCard  → "المصروفات"       → /dashboard/finance/expenses
Banknote    → "المدفوعات"       → /dashboard/finance/payments    ← جديدة
UsersIcon   → "أرصدة العملاء"   → /dashboard/finance/customer-balances
ShoppingCart → "نقطة البيع"     → /dashboard/finance/pos
```

التغييرات:
- السطر 195: تغيير الأيقونة من `TrendingUp` إلى `BookOpen`، والعنوان من `t('finance.overview')` إلى `t('finance.tabs.ledger')`، والرابط إلى `/dashboard/finance/ledger`
- إضافة سطر جديد للمدفوعات: `{ icon: Banknote, label: t('finance.tabs.payments'), href: "/dashboard/finance/payments" }`
- السطر 198: تغيير العنوان من `t('clients.title')` إلى `t('finance.customerBalances.title')`

### ملفات i18n — لا تغيير مطلوب
- `finance.tabs.ledger` = "Ledger" / "دفتر الحسابات" — **موجود بالفعل**
- `finance.tabs.payments` = "Payments" / "المدفوعات" — **موجود بالفعل**
- `finance.customerBalances.title` = "Customer Balances" / "أرصدة العملاء" — **موجود بالفعل**

### Routes — لا تغيير مطلوب
- `/dashboard/finance/ledger` و `/dashboard/finance/payments` — **مسجلين بالفعل في App.tsx**

## الملخص
تغيير واحد في ملف واحد (6 أسطر → 7 أسطر) مع استيراد أيقونتين إضافيتين (`BookOpen`, `Banknote`). كل مفاتيح الترجمة والمسارات موجودة مسبقاً.

