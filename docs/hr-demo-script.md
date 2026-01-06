# HR Module Demo Script (1-2 minutes)

## Prerequisites
- Logged in as owner/manager
- At least 2 horses in the system (or demo will create them)

## Demo Flow

### 1. Load Demo Data (15 seconds)
1. Navigate to **Dashboard → HR / Team → Settings** (gear icon or bottom nav)
2. Scroll to **Demo Mode** section
3. Click **Load Demo Data**
4. Confirm toast: "Demo data loaded successfully" / "تم تحميل البيانات التجريبية بنجاح"
5. See "Demo Active" badge appear

### 2. Verify Arabic RTL (30 seconds)
1. Click **Language Selector** in sidebar footer
2. Switch to **العربية (Arabic)**
3. Observe:
   - UI flips to RTL
   - "الموارد البشرية" (HR) shows Arabic labels
   - Employee names visible
   - Employee types show Arabic (مدرب، سائس، etc.)

### 3. Check Horse Assignments (30 seconds)
1. Navigate to **Dashboard → Horses**
2. Click on any horse (e.g., Thunder / رعد)
3. Scroll to **Assigned Staff** / **الفريق المعين** section
4. Verify:
   - Staff list shows with roles
   - Arabic role labels (مسؤول الرعاية الأساسي، مدرب)
   - Phone/email contact links visible
   - Remove (X) button visible for managers

### 4. Add New Assignment (20 seconds)
1. Click **+ Add** / **+ إضافة** in Assigned Staff section
2. Search for an employee (e.g., "Lisa")
3. Select role (e.g., "Trainer" / "مدرب")
4. Click **Assign** / **تعيين**
5. Verify toast in current language
6. See new assignment appear in list

### 5. Check Employee View (15 seconds)
1. Navigate to **Dashboard → HR / Team**
2. Click on any employee (e.g., Ahmed Al-Rashid)
3. View **Employee Details** sheet
4. See **Assigned Horses** / **الخيول المعينة** section
5. Click on a horse name to navigate to horse profile

### 6. Switch Back to English (10 seconds)
1. Open **Language Selector**
2. Switch to **English**
3. Verify all strings flip back to English
4. Layout returns to LTR

### 7. Clean Up (10 seconds)
1. Go to **HR / Team → Settings**
2. Click **Remove Demo Data**
3. Confirm in dialog
4. Verify employees list clears of demo data
5. "Demo Active" badge disappears

---

## Pass Criteria Checklist

### Language & RTL
- [ ] All Arabic strings visible (no English leftovers in HR module)
- [ ] RTL layout correct (sidebar on right, text aligned right)
- [ ] No overlapping or broken elements
- [ ] Icons flip correctly (chevrons, arrows)

### Tenant Scoping
- [ ] Demo data only shows for current tenant
- [ ] Switching tenants doesn't show other tenant's demo data

### RLS Behavior
- [ ] Member role: can view employees (read-only)
- [ ] Member role: can view assignments (read-only)
- [ ] Member role: cannot see Add/Remove buttons
- [ ] Manager/Owner: can create/remove assignments
- [ ] Manager/Owner: can load/remove demo data

### Demo Mode
- [ ] Load creates 6 employees with 'demo' tag
- [ ] Load creates assignments linking employees to horses
- [ ] Load is idempotent (shows toast if already loaded)
- [ ] Remove deletes only demo-tagged data
- [ ] Real data unaffected by demo operations

### Assignment Flows
- [ ] Add assignment from Horse Profile works
- [ ] Remove assignment works (manager only)
- [ ] Employee details shows assigned horses
- [ ] Clicking horse navigates to horse profile
- [ ] Search employees in add dialog works

### Responsiveness
- [ ] Mobile: Bottom sheets for dialogs
- [ ] Mobile: Touch targets ≥ 44px
- [ ] Tablet: Proper spacing
- [ ] Desktop: Side sheets/dialogs work correctly
