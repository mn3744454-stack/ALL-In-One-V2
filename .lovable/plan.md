
# خطة الإصلاح الشامل لوحدة المخزون (Inventory)

بعد دراسة الـ migration المطبقة، والمعمارية القائمة (workspaceNavConfig، realtime sync، PermissionGuard، WorkspaceRouteGuard، نمط hooks الموجود في `housing/finance/vet`)، إليك الخطة على 4 مراحل قابلة للمراجعة بين كل مرحلة.

---

## المرحلة 1 — إصلاح الأساس الأمني والمعماري (Backend Hardening)

**هدف:** مواءمة الـ migration مع معايير المشروع (Skill 05 RLS Safety + Skill 08 Schema Safety) قبل بناء أي UI.

### إصلاحات قاعدة البيانات (migration واحدة):

1. **تبسيط `can_manage_inventory`** — إزالة فحص `tenant_members` للأدوار المرمّزة (`owner`/`manager`) والاعتماد فقط على `has_permission(user, tenant, 'inventory.manage')` تماشياً مع معيار المشروع (104 permission key، لا أدوار مرمّزة).

2. **إضافة `can_view_inventory`** — دالة مماثلة تستخدم `has_permission('inventory.view')` لفصل صلاحية القراءة عن التعديل.

3. **تحديث RLS policies على `inventory_items` و `inventory_transactions`:**
   - SELECT → `can_view_inventory()`
   - INSERT/UPDATE/DELETE → `can_manage_inventory()`

4. **حماية تطابق الـ tenant بين العنصر والحركة** — trigger `BEFORE INSERT/UPDATE` على `inventory_transactions` يتحقق أن `tenant_id = (SELECT tenant_id FROM inventory_items WHERE id = item_id)`. يمنع ثغرة عبور tenant.

5. **تفعيل Realtime** — `ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items, inventory_transactions`.

### مخاطر يجب القرار حولها قبل التنفيذ:
- ❓ هل نسمح بـ `inventory.view` فقط دون `inventory.manage`؟ (مفيد للموظفين الذين يطّلعون لكن لا يعدّلون)
- ❓ هل نضيف soft-delete (`is_archived`) لـ `inventory_items` بدل DELETE نهائي (تماشياً مع قاعدة المشروع: لا حذف نهائي إن وجد تاريخ)؟

---

## المرحلة 2 — طبقة البيانات (Hooks + Realtime + i18n)

**هدف:** بناء طبقة الوصول للبيانات وفق نمط `hooks/housing/*` الموجود.

1. **`src/hooks/inventory/index.ts`** — تجميع.
2. **`useInventoryItems.ts`** — list/get/create/update/archive مع React Query + invalidation.
3. **`useInventoryTransactions.ts`** — list (بفلاتر: item, type, date)، create transaction.
4. **`useInventoryInvalidation.ts`** — مفاتيح canonical على غرار `useHousingInvalidation`.
5. **تحديث `useTenantRealtimeSync.ts`** — إضافة `inventory_items` و `inventory_transactions` لخريطة `TABLE_TO_PREFIXES`.
6. **ترجمات EN/AR** في `src/i18n/locales/{en,ar}.ts` — مفتاح `inventory.*` (العنوان، الحقول، أنواع الحركات: in/out/adjustment، حالات التنبيه).

---

## المرحلة 3 — واجهة المستخدم (Mobile-First, RTL, Workspace-class)

**هدف:** صفحة + مكونات تتبع معايير المشروع (Mobile-First Design Standard + Complex Dialog Layout Standard).

1. **التنقّل:** إضافة عنصر "Inventory / المخزون" في `ORG_NAV_MODULES` (أيقونة `Package`) مع `permissionKey: 'inventory.view'` و `roles: ['owner', 'manager']`.
2. **المسار:** إضافة `/dashboard/inventory` في `App.tsx` محمياً بـ `WorkspaceRouteGuard + ModuleGuard?` (لا، Inventory ليس module مشروط)، فقط `PermissionGuard permissionKey="inventory.view"`.
3. **`src/pages/DashboardInventory.tsx`:**
   - رأس الصفحة: إجمالي الأصناف، عدد الأصناف منخفضة المخزون (badge بارز).
   - تبويبان: **الأصناف (Items)** | **الحركات (Transactions)**.
   - زر إضافة صنف جديد + أزرار حركة (إدخال/إخراج/تسوية).
4. **مكونات `src/components/inventory/`:**
   - `InventoryItemList.tsx` — قائمة mobile-first (cards على الموبايل، جدول على الديسكتوب).
   - `InventoryItemCard.tsx` — يعرض الاسم (BilingualName)، الفئة، الكمية الحالية، تنبيه أحمر عند `current_quantity <= low_stock_threshold`.
   - `InventoryItemFormDialog.tsx` — Workspace-class dialog (flex-col, fixed header/footer، single scrollable body).
   - `InventoryTransactionFormDialog.tsx` — نموذج حركة (نوع، كمية، تكلفة، مورّد، ملاحظة).
   - `InventoryTransactionList.tsx` — قائمة الحركات مع فلاتر.
   - `LowStockAlertsPanel.tsx` — لوحة التنبيهات في رأس الصفحة.
5. **اتباع قاعدة الإدخالات المحايدة** — `category` و `unit` يبدأن بـ `__neutral__`، لا اختيار قسري.
6. **In-Context Creation Bridge** — لاختيار المورّد، زر "+ إضافة مورّد جديد".

---

## المرحلة 4 — التكامل والتحقق

1. **ربط مع وحدة المصاريف (Expenses):** زر "تحويل لمصروف" على حركة الإدخال (يستخدم حقل `expense_id` الموجود في الـ schema). اختياري — قد نؤجله لمرحلة لاحقة.
2. **التحقق من الـ build** بعد كل تغيير.
3. **اختبار يدوي** للسيناريوهات:
   - إنشاء صنف، إدخال كمية، إخراج كمية، تسوية → تحديث `current_quantity` تلقائياً.
   - تنبيه low-stock عند تجاوز العتبة.
   - فصل tenants (لا تسرّب).
   - عرض/منع حسب الصلاحيات.
   - RTL في العربية.
4. **توثيق:** ملاحظة في `docs/` بخصائص الوحدة.

---

## نقاط القرار قبل البدء

1. **هل نعتمد فقط `has_permission` ونزيل فحص `tenant_members` (الأدوار المرمّزة) من `can_manage_inventory`؟** (الإجابة المقترحة: نعم — تماشياً مع معيار المشروع)
2. **هل نضيف `is_archived` بدل DELETE حقيقي للأصناف؟** (الإجابة المقترحة: نعم)
3. **هل نبدأ بالمرحلة 1 فقط ثم نعرض النتائج، أم ننفّذ كل المراحل تباعاً بعد موافقتك؟**

عند الموافقة، سأبدأ بالمرحلة 1 (migration واحدة) ثم أتوقف لعرض النتائج قبل الانتقال للمرحلة 2.
