

# Evidence-Based Audit Report + Implementation Plan
## Lab Horses Registry + Desktop/Tablet UI Fixes + Create Sample Wizard Redesign

---

## SECTION 1: FINDINGS & ROOT CAUSES (Evidence-Based)

### A) Lab Horses Registry — CONFIRMED WORKING ✅

**Evidence:**
- **Table exists:** SQL query confirmed `lab_horses` table exists
  ```sql
  SELECT to_regclass('public.lab_horses') → lab_horses
  ```
- **Data persists:** 3 lab horses in registry with samples linked
  ```sql
  -- Lab horses: توتو, يب, بي (all in tenant 348ce41c...)
  -- Samples with lab_horse_id: c1a850ef, f2e71aa1, 27d648d6, 59d3f080
  ```
- **Results join works:**
  ```sql
  SELECT r.id, s.lab_horse_id, lh.name AS lab_horse_name
  -- Returns: lab_horse_name = 'بي', 'يب' correctly for linked samples
  ```

**Hook implementation verified:**
- `src/hooks/laboratory/useLabSamples.ts` lines 167-178: Includes lab_horse join
- `src/hooks/laboratory/useLabResults.ts` lines 91-99: Includes lab_horse join
- `src/lib/laboratory/horseDisplay.ts`: Priority logic correct (lab_horse → horse → horse_name → fallback)

**Root cause of any "Unknown Horse" display:**
- Some older samples have `lab_horse_id=NULL` and `horse_name` set directly (legacy walk-in entries)
- These display correctly as `horse_name` fallback per `getLabHorseDisplayName()`
- **NOT A BUG** — system is working as designed

---

### B) Translation Keys — MISSING ❌

**Evidence from `lov-search-files`:**
```
Search result: No matches found for pattern 'laboratory\.labHorses\.' in src/i18n
```

**Code references in `LabHorsePicker.tsx` (lines 185-400):**
```typescript
t("laboratory.labHorses.searchPlaceholder") || "Search by name..."
t("laboratory.labHorses.addNew") || "Register New Horse"
t("laboratory.labHorses.ownerName") || "Owner Name"
t("laboratory.labHorses.ownerNamePlaceholder") || "Enter owner name"
t("laboratory.labHorses.ownerPhone") || "Owner Phone"
t("laboratory.labHorses.ownerPhonePlaceholder") || "Enter owner phone"
t("laboratory.labHorses.registerAndSelect") || "Register & Select"
t("laboratory.labHorses.noMatchingHorses") || "No horses match your search"
t("laboratory.labHorses.noHorses") || "No horses registered yet"
t("laboratory.labHorses.noDetails") // No fallback — shows raw key
```

**Root cause:** Translation keys added to code but never added to `src/i18n/locales/ar.ts` or `en.ts`

---

### C) Wizard Step Order — NOT ALIGNED WITH LAB WORKFLOW

**Evidence from `CreateSampleDialog.tsx` lines 69-77:**
```typescript
const ALL_STEPS: StepDef[] = [
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'basic', title: 'Basic Info', titleAr: 'معلومات أساسية', icon: FlaskConical },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },  // Client is HERE
  // ...
];
```

**Current order:** Horses → Basic Info → Templates → Details (Client) → Checkout → Review

**User requirement:** Client first, then Horse, then Templates, then Operational Details

**Root cause:** Step order was designed for stable workflow (horse-centric), not lab workflow (client-centric)

---

### D) Horse Filter in AdvancedFilters — USES STABLE HORSES, NOT LAB HORSES

**Evidence from `AdvancedFilters.tsx` lines 31-32, 87:**
```typescript
import { useHorses } from "@/hooks/useHorses";
const { horses } = useHorses();  // This fetches stable horses only
```

**Root cause:** For Lab tenants, the filter should use `useLabHorses()` or a union approach

---

### E) Per-Horse Templates — NOT IMPLEMENTED

**Evidence from `CreateSampleDialog.tsx` lines 718-799:**
- Template selection is global (`formData.template_ids`)
- No per-horse template mapping exists in state or UI
- All selected horses receive the same templates

**User requirement:** When multiple horses selected, allow different templates per horse

---

### F) Banner (MVP Info Alert) — EXISTS

**Evidence from `DashboardLaboratory.tsx` lines 143-158:**
```typescript
<Alert className="mb-6 ... hidden lg:flex">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertDescription className="text-blue-700">
    {t("laboratory.alerts.mvpInfo")}  // "وحدة المختبر - النسخة التجريبية..."
  </AlertDescription>
</Alert>
```

**User wants:** Remove this banner for production polish

---

### G) View Controls (Grid/List/Table) — TOO SMALL/COLLAPSED

**Evidence from `SamplesList.tsx` lines 226-235:**
```typescript
<ViewSwitcher
  viewMode={viewMode}
  gridColumns={gridColumns}
  onViewModeChange={setViewMode}
  onGridColumnsChange={setGridColumns}
  showTable={true}
/>
```

**Issue:** ViewSwitcher is compact icon-only. User wants clearer segmented buttons with icon+label

---

### H) Filter Tabs Include "الكل" (All) — USER WANTS IT REMOVED

**Evidence from `SamplesFilterTabs.tsx` line 19:**
```typescript
const tabKeys: SampleFilterTab[] = ['all', 'today', 'received', 'unreceived', 'retest'];
```

**User requirement:** Remove 'all' tab, keep only: today, received, unreceived, retest

---

### I) Results Cell Not Interactive

**Evidence from `SamplesTable.tsx` lines 141-147:**
```typescript
<TableCell className="text-center">
  <div className="flex items-center justify-center gap-1">
    <Badge variant="outline" className="text-xs">
      <FileText className="h-3 w-3 me-1" />
      {resultsCount}/{templateCount}
    </Badge>
  </div>
</TableCell>
```

**Issue:** Badge is display-only. Should be clickable to open results drawer/dialog.

---

### J) Client Name Localization — PARTIALLY IMPLEMENTED

**Evidence from `clientDisplay.ts` lines 36-58:**
```typescript
export function getLabClientDisplayName(sample, options) {
  if (sample.client?.name) {
    if (options?.locale === 'ar' && sample.client.name_ar) {
      return sample.client.name_ar;
    }
    return sample.client.name;
  }
  // ...
}
```

**DB field exists:** SQL confirmed `clients.name_ar` column exists

**Potential issue:** The `useClients` hook may not join `name_ar`, so it's never populated

---

## SECTION 2: PROPOSED SOLUTION PLAN

### Option A: Minimal Fix (Fastest, Least Risk)
Focus on translation keys + visible bugs only. ~2-3 hours.

### Option B: Robust Future-Proof (Architecture-Aligned) ← RECOMMENDED
Full wizard redesign + Lab Horses dedicated page + all UI polish. ~8-12 hours.

---

## DETAILED IMPLEMENTATION PLAN (Option B)

### Phase 1: Translation Keys (Immediate)

**Files to modify:**
- `src/i18n/locales/ar.ts`
- `src/i18n/locales/en.ts`

**Keys to add under `laboratory`:**
```typescript
labHorses: {
  // EN
  title: "Lab Horses Registry",
  searchPlaceholder: "Search by name, microchip, passport, owner...",
  addNew: "Register New Horse",
  ownerName: "Owner Name",
  ownerNamePlaceholder: "Enter owner name",
  ownerPhone: "Owner Phone",
  ownerPhonePlaceholder: "Enter owner phone",
  registerAndSelect: "Register & Select",
  noMatchingHorses: "No horses match your search",
  noHorses: "No horses registered yet",
  noDetails: "No additional details",
  linkToPlatform: "Link to Platform Horse (Future)",
  
  // AR
  title: "سجل خيول المختبر",
  searchPlaceholder: "البحث بالاسم، الشريحة، الجواز، المالك...",
  addNew: "تسجيل خيل جديد",
  ownerName: "اسم المالك",
  ownerNamePlaceholder: "أدخل اسم المالك",
  ownerPhone: "هاتف المالك",
  ownerPhonePlaceholder: "أدخل رقم هاتف المالك",
  registerAndSelect: "تسجيل واختيار",
  noMatchingHorses: "لا توجد خيول تطابق بحثك",
  noHorses: "لا توجد خيول مسجلة بعد",
  noDetails: "لا توجد تفاصيل إضافية",
  linkToPlatform: "ربط بخيل المنصة (قريباً)",
}
```

---

### Phase 2: Desktop/Tablet UI Polish (Image 1 ONLY)

| Item | Fix | File(s) |
|------|-----|---------|
| Remove MVP banner | Delete or conditionally hide the Alert | `DashboardLaboratory.tsx` lines 143-158 |
| View toggle label wrap | Add `whitespace-nowrap` to ToggleGroupItem labels | `SamplesList.tsx` lines 208-224 |
| ViewSwitcher clarity | Replace compact icons with segmented buttons (icon+label) for desktop | `ViewSwitcher.tsx` or inline in `SamplesList.tsx` |
| Remove "الكل" tab | Remove 'all' from `tabKeys` array | `SamplesFilterTabs.tsx` line 19 |
| Align tabs center | Add justify-center to container | `SamplesFilterTabs.tsx` line 30 |
| Results cell interactive | Wrap Badge in Button, call `onViewAllResults` | `SamplesTable.tsx` lines 141-147 |

---

### Phase 3: Create Sample Wizard Redesign (ALL devices)

#### Step Order Redesign for Lab Tenants:
```typescript
const LAB_STEPS: StepDef[] = [
  { key: 'client', title: 'Client', titleAr: 'العميل', icon: User },
  { key: 'horses', title: 'Horses', titleAr: 'الخيول', icon: Users },
  { key: 'templates', title: 'Templates', titleAr: 'القوالب', icon: FileText },
  { key: 'details', title: 'Details', titleAr: 'التفاصيل', icon: FlaskConical },
  { key: 'checkout', title: 'Checkout', titleAr: 'الدفع', icon: ShoppingCart, conditional: true },
  { key: 'review', title: 'Review', titleAr: 'مراجعة', icon: Check },
];
```

**Implementation:**
- Detect `isPrimaryLabTenant` (already exists at line 120)
- Use `LAB_STEPS` for lab tenants, current `ALL_STEPS` for stable tenants
- Move client mode selection from 'details' step to new 'client' step

#### Per-Horse Templates:
**New state structure:**
```typescript
interface FormData {
  // ...existing
  perHorseTemplates: Record<string, string[]>; // horseId/index → template_ids
  applyTemplateToAll: boolean;
}
```

**UI:**
- When `selectedHorses.length > 1`, show expandable accordion per horse
- Each horse section shows template checkboxes
- "Apply to all" toggle at top

---

### Phase 4: Horse Filter for Lab Tenants

**File:** `AdvancedFilters.tsx`

**Change:**
```typescript
// Add prop
interface AdvancedFiltersProps {
  // ...existing
  isLabTenant?: boolean;
}

// Conditionally fetch
const { horses: stableHorses } = useHorses();
const { labHorses } = useLabHorses({ includeArchived: false });
const horses = isLabTenant ? labHorses : stableHorses;
```

**Pass from parent:** `SamplesList.tsx` passes `isLabTenant={isPrimaryLabTenant}`

---

### Phase 5: Lab Horses Dedicated Page (Future Scope)

This is OUT OF SCOPE for immediate implementation but architecture should support:
- New route: `/dashboard/laboratory?tab=horses` or `/dashboard/lab-horses`
- Features: Registry table, horse file (analyses history, financial statement integration)
- Linking flow via connections/consent_grants pattern

---

## SECTION 3: COMPARISON TABLE

| Feature | Full Horses Module | Lab Horses Registry |
|---------|-------------------|---------------------|
| **Table** | `public.horses` | `public.lab_horses` |
| **Ownership** | Multi-owner with percentages | Single owner (denormalized) |
| **Pedigree** | Mother/Father/Grandparents | Not applicable |
| **Housing** | Unit assignments | Not applicable |
| **Breeding** | Breeding records | Not applicable |
| **Vet Records** | Full vet history | Via lab_results only |
| **RLS** | Complex (member_horse_access) | Simple (tenant member check) |
| **Sidebar Page** | /dashboard/horses | Future: /dashboard/laboratory?tab=horses |
| **Linking** | Native | Via `linked_horse_id` + connections pattern |

---

## SECTION 4: NEXT STEPS CHECKLIST

### Immediate (Phase 1-2):
- [ ] Add all `laboratory.labHorses.*` translation keys (ar + en)
- [ ] Remove MVP banner or add conditional hide
- [ ] Fix view toggle label wrapping
- [ ] Remove "الكل" tab from filter tabs
- [ ] Make results cell clickable

### Short-term (Phase 3-4):
- [ ] Refactor wizard step order for lab tenants
- [ ] Implement per-horse template selection UI
- [ ] Update AdvancedFilters to use lab_horses for lab tenants

### Future (Phase 5):
- [ ] Design Lab Horses dedicated page
- [ ] Implement linking flow via connections/consent pattern

---

## TECHNICAL NOTES

### Files Requiring Changes:

| File | Changes |
|------|---------|
| `src/i18n/locales/ar.ts` | Add labHorses keys |
| `src/i18n/locales/en.ts` | Add labHorses keys |
| `src/pages/DashboardLaboratory.tsx` | Remove/hide banner |
| `src/components/laboratory/SamplesList.tsx` | View toggle labels, pass isLabTenant |
| `src/components/laboratory/SamplesFilterTabs.tsx` | Remove 'all' tab |
| `src/components/laboratory/SamplesTable.tsx` | Interactive results cell |
| `src/components/laboratory/AdvancedFilters.tsx` | Support lab horses |
| `src/components/laboratory/CreateSampleDialog.tsx` | Wizard step reorder, per-horse templates |

### No Database Changes Required
All necessary schema already exists (lab_horses, lab_samples.lab_horse_id).


[Execution Mode — Implement now. No more audits. Use evidence from the previous reports you produced.]

We already have:
- lab_horses registry + lab_samples.lab_horse_id
- useLabSamples/useLabResults joined with lab_horses (as per our last changes)
- horseDisplay resolver exists (lab_horse → horse → horse_name → fallback)
- route guards + permission keys + audit triggers are done

Now implement the remaining UX + workflow fixes based on the attached screenshots:
- Image (1): Desktop/Tablet Samples page issues
- Images (2)(3)(4): Create Sample Wizard issues (ALL devices including mobile)

IMPORTANT SCOPE RULES:
- Image (1) UI fixes apply to Desktop + Tablet only (NOT mobile).
- Wizard changes (steps/order/templates-per-horse/daily-number UI/translation keys) must work on mobile + tablet + desktop.

========================================
PHASE 1 — Desktop/Tablet Samples page polish (Image 1 ONLY)
========================================

1) Remove the top MVP banner/alert that says in Arabic “وحدة المختبر - النسخة التجريبية…”.
   - Remove it entirely from the desktop/tablet layout.
   - If you want to keep it for dev, gate it behind an env flag, but default OFF.
   - Update the component that renders it (you previously found it in DashboardLaboratory.tsx as an Alert).

2) Fix the “عرض بالعينات” button text wrapping.
   - Make it render in ONE line like “عرض بالعملاء”.
   - Add proper CSS classes (e.g., whitespace-nowrap) and ensure spacing is consistent.

3) Make view controls clearer on desktop/tablet:
   - Current Table/Grid/List icons are too small/collapsed.
   - Replace with segmented buttons showing icon + label (Table / Grid / List) similar in clarity to the two “عرض …” buttons.
   - Keep mobile version compact if needed, but desktop/tablet must be explicit.

4) Fix “Horses” filter/search source for LAB tenants on the Samples page:
   - In lab tenant, horse dropdown/filter MUST use lab_horses (useLabHorses), not stable horses (useHorses).
   - Ensure the dropdown is populated and searchable.
   - This directly addresses the “?” annotation where nothing shows for horse filtering.

5) Fix “Unknown Horse” display on Samples/Results list:
   - Horse display name priority must be:
     lab_horse (name/name_ar) → stable horse (name/name_ar) → horse_name (walk-in) → show “غير مرتبط” / “Unlinked” (NOT “Unknown”)
   - Ensure Arabic UI shows Arabic horse name when available (name_ar), and English shows name.
   - Apply the same logic consistently in:
     - Samples table/list
     - Results table/list

6) Make “Results” column cells interactive:
   - The results badge (e.g., 0/1, 1/1) must be clickable.
   - On click: open a drawer/dialog showing the list of results/tests for that sample (or navigate to the Results page filtered by that sample).
   - Implement the simplest UX that meets this: click → open results drawer OR route to /dashboard/laboratory/results?sampleId=...

7) Client name localization:
   - When UI language = Arabic, show client.name_ar if present; otherwise name.
   - When UI language = English, show client.name.
   - Ensure clients queries/select include name_ar everywhere needed.

8) Tabs:
   - Remove “الكل” tab.
   - Keep only: “اليوم - مستلم - غير مستلم - إعادة”.
   - Center/align the tabs nicely and polish spacing on desktop/tablet.

========================================
PHASE 2 — Create Sample Wizard fixes (Images 2,3,4) — ALL DEVICES
========================================

9) Fix missing translation keys in the wizard (steps 1–5):
   - Currently keys like laboratory.labHorses.searchPlaceholder, laboratory.labHorses.addNew, laboratory.labHorses.noDetails appear as raw strings.
   - Add ALL missing keys to src/i18n/locales/ar.ts and en.ts.
   - Ensure no raw translation keys appear anywhere in the wizard.

10) Wizard step order for LAB tenants (do NOT break stable tenant flow):
   Required LAB flow:
   Step 1: Client selection (Registered / Visitor / No Client)  [this currently appears later — must be first]
   Step 2: Horse selection/registration (LabHorsePicker + ability to add new)
   Step 3: Templates/Tests selection
   Step 4: Operational details
   Step 5: Review/Checkout (if applicable)
   - Keep stable tenants using the existing step order unchanged.

11) Per-horse templates when multiple horses selected:
   - If user selects 2+ horses, allow choosing different templates per horse.
   - UI: accordion per horse with template list; include optional “Apply to all” toggle.
   - Update sample creation logic so each created sample gets its own template_ids based on that horse’s selection.
   - This must work for lab horses and stable horses.

12) Per-sample daily number UI (user-controlled):
   - Single horse: daily_number input + “Use next” helper.
   - Multiple horses: show per-sample daily_number inputs + “Auto-fill sequential” button.
   - Validate uniqueness (no conflicts for today) before submitting; block submit with clear message if conflict.
   - Store each sample’s daily_number correctly.

========================================
DELIVERABLES / ACCEPTANCE CHECKLIST
========================================

A) Desktop/Tablet (Image 1)
- Banner removed
- “عرض بالعينات” no wrapping
- View controls clear labels (Table/Grid/List)
- Horse filter populated for lab tenants (from lab_horses)
- No “Unknown Horse” (use “Unlinked” if no data)
- Results badge clickable → opens results for that sample
- Client names localized (AR shows name_ar)
- Tabs exclude “الكل” and are centered/polished

B) Wizard (All devices)
- No raw translation keys
- Lab tenant wizard starts with Client step
- Multi-horse supports per-horse templates
- Multi-horse supports per-sample daily numbers with collision prevention

Implementation notes:
- Reuse existing hooks/resolvers you already created (useLabHorses/useLabSamples/useLabResults and horseDisplay).
- Keep changes minimal and architecture-aligned; do not introduce new DB changes unless absolutely necessary.
- After implementation, run a quick manual test checklist and report which files you changed.


