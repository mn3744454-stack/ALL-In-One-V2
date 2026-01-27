
# Fix Plan: Ownership UX + i18n + Grid/List/Table Layout Bugs

## Problem Summary

Based on the screenshots and code analysis, there are **3 groups of issues**:

| Issue Group | Problem | Root Cause |
|-------------|---------|------------|
| **A) Ownership UX** | Button responsibilities are swapped | `StepOwnership.tsx` - inline "+" opens modal, top button adds row |
| **A) Owner Labeling** | "Owner 1" shown when primary exists; wrong numbering | Badge logic uses `index + 1` instead of sequential non-primary count |
| **B) Missing i18n** | Add Owner/Breed/Color dialogs show English labels | `AddMasterDataDialog.tsx` uses hardcoded strings in `typeConfig` |
| **C) Table View** | Table mode shows cards, not a real table | `HorsesList.tsx` renders `HorseCard` for all view modes |
| **C) Grid 4-col** | Cards may overflow/compress on 4 columns | CSS grid configuration and card min-width constraints |

---

## Implementation Plan

### Part A: Fix Step 6 Ownership UX

**File:** `src/components/horses/wizard/StepOwnership.tsx`

#### Changes:

1. **Swap button responsibilities:**
   - **Top button** (currently `addOwner`) → Opens "Create new owner" modal (`setShowAddOwner(true)`)
   - **Inline "+" beside dropdown** → Adds another owner row (`addOwner()`)

2. **Update button labels (i18n):**
   - Top button: `horses.wizard.createNewOwner` / "Create new owner" / "إنشاء مالك جديد"
   - Inline "+": remains as icon-only (adds row)

3. **Fix owner labeling logic:**
   - Primary owner shows: "Primary Owner" / "المالك الأساسي"
   - Non-primary owners indexed starting from 2: "Owner 2", "Owner 3"...
   - Never show "Owner 1" when a primary owner exists

**Current code (lines 85-87):**
```typescript
<Button type="button" variant="outline" size="sm" onClick={addOwner} className="gap-2">
  <Plus className="w-4 h-4" /> {t('horses.wizard.addOwner')}
</Button>
```

**New behavior:**
```typescript
<Button type="button" variant="outline" size="sm" onClick={() => setShowAddOwner(true)} className="gap-2">
  <Plus className="w-4 h-4" /> {t('horses.wizard.createNewOwner')}
</Button>
```

**Current inline button (line 121-123):**
```typescript
<Button type="button" size="icon" variant="outline" onClick={() => setShowAddOwner(true)}>
  <Plus className="w-4 h-4" />
</Button>
```

**New behavior:**
```typescript
<Button type="button" size="icon" variant="outline" onClick={addOwner}>
  <Plus className="w-4 h-4" />
</Button>
```

**Fix labeling (lines 103-105):**
Current: `t('horses.wizard.ownerNumber').replace('{{number}}', String(index + 1))`

New logic:
- Count non-primary owners before current index
- Label: "Owner (count + 2)" since Owner 1 is conceptually replaced by "Primary Owner"

---

### Part B: Fix Missing i18n in Master Data Dialogs

**File:** `src/components/horses/AddMasterDataDialog.tsx`

The dialog currently has hardcoded English strings in `typeConfig`. We need to:

1. **Use i18n hook** for all titles and labels
2. **Add new i18n keys** for dialog content

**Current hardcoded config (lines 31-82):**
```typescript
const typeConfig: Record<MasterDataType, { title: string; fields: ... }> = {
  color: { title: "Add New Color", fields: [{ key: "name", label: "Name (English)" }, ...] },
  // etc.
};
```

**New approach:**
- Move config inside component to access `t()` hook
- Use i18n keys like `horses.masterData.color.title`, `horses.masterData.color.nameEn`, etc.

**New i18n keys to add:**

| Key Path | English | Arabic |
|----------|---------|--------|
| `horses.masterData.color.title` | Add New Color | إضافة لون جديد |
| `horses.masterData.color.nameEn` | Name (English) | الاسم (إنجليزي) |
| `horses.masterData.color.nameAr` | Name (Arabic) | الاسم (عربي) |
| `horses.masterData.breed.title` | Add New Breed | إضافة سلالة جديدة |
| `horses.masterData.breed.nameEn` | Name (English) | الاسم (إنجليزي) |
| `horses.masterData.breed.nameAr` | Name (Arabic) | الاسم (عربي) |
| `horses.masterData.owner.title` | Add New Owner | إضافة مالك جديد |
| `horses.masterData.owner.name` | Name | الاسم |
| `horses.masterData.owner.nameAr` | Name (Arabic) | الاسم (عربي) |
| `horses.masterData.owner.phone` | Phone | الهاتف |
| `horses.masterData.owner.email` | Email | البريد الإلكتروني |
| `horses.masterData.breeder.title` | Add New Breeder | إضافة مربي جديد |
| `horses.masterData.breeder.name` | Name | الاسم |
| `horses.masterData.breeder.nameAr` | Name (Arabic) | الاسم (عربي) |
| `horses.masterData.breeder.phone` | Phone | الهاتف |
| `horses.masterData.breeder.email` | Email | البريد الإلكتروني |
| `horses.masterData.branch.title` | Add New Branch | إضافة فرع جديد |
| `horses.masterData.branch.name` | Branch Name | اسم الفرع |
| `horses.masterData.branch.address` | Address | العنوان |
| `horses.masterData.stable.title` | Add New Stable | إضافة إسطبل جديد |
| `horses.masterData.stable.name` | Stable Name | اسم الإسطبل |
| `horses.masterData.housingUnit.title` | Add New Housing Unit | إضافة وحدة سكن جديدة |
| `horses.masterData.housingUnit.code` | Unit Code | رمز الوحدة |
| `horses.masterData.housingUnit.unitType` | Type | النوع |
| `horses.masterData.missingFields` | Missing required fields | حقول مطلوبة مفقودة |
| `horses.masterData.pleaseFillIn` | Please fill in | يرجى تعبئة |
| `horses.masterData.createdSuccess` | Created successfully | تم الإنشاء بنجاح |
| `horses.masterData.hasBeenAdded` | has been added | تمت الإضافة |
| `horses.masterData.errorCreating` | Error creating item | خطأ في الإنشاء |
| `horses.wizard.createNewOwner` | Create new owner | إنشاء مالك جديد |

---

### Part C: Fix Horses View Toggle (Grid/List/Table)

#### C1: Create HorsesTable Component

**New file:** `src/components/horses/HorsesTable.tsx`

Create a proper table component following the existing pattern from `OrdersList.tsx`:

```typescript
// Structure:
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Breed</TableHead>
      <TableHead>Type</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Age</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {horses.map(horse => <TableRow>...</TableRow>)}
  </TableBody>
</Table>
```

#### C2: Update HorsesList.tsx

**File:** `src/components/horses/HorsesList.tsx`

Add conditional rendering for table view:

```typescript
{viewMode === 'table' ? (
  <HorsesTable horses={filteredHorses} onHorseClick={onHorseClick} />
) : (
  <div className={getGridClass(gridColumns, viewMode)}>
    {filteredHorses.map((horse) => (
      <HorseCard
        key={horse.id}
        horse={horse}
        onClick={() => onHorseClick?.(horse)}
        compact={viewMode === 'list'}
      />
    ))}
  </div>
)}
```

#### C3: Fix HorseCard for List Mode

**File:** `src/components/horses/HorseCard.tsx`

Ensure `compact` prop is passed when `viewMode === 'list'`:
- Currently `HorsesList` doesn't pass `compact={true}` for list mode
- Need to add: `compact={viewMode === 'list'}`

#### C4: Fix Grid 4-Column Layout

**File:** `src/components/ui/ViewSwitcher.tsx` or `src/components/horses/HorseCard.tsx`

Current grid class for 4 columns (line 155):
```typescript
case 4:
  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
```

This is correct for responsive breakpoints. The issue may be in card sizing.

**Card fix in `HorseCard.tsx`:**
- Ensure card content doesn't overflow
- Add `min-w-0` to flex containers to prevent content from pushing card wider
- Consider adding `overflow-hidden` to card container

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/horses/wizard/StepOwnership.tsx` | Swap button logic, fix labeling |
| `src/components/horses/AddMasterDataDialog.tsx` | Use i18n for all strings |
| `src/components/horses/HorsesList.tsx` | Add table view rendering, pass `compact` prop |
| `src/components/horses/HorseCard.tsx` | Minor CSS fixes for 4-col grid |
| `src/components/horses/HorsesTable.tsx` | **NEW FILE** - Table view component |
| `src/components/horses/index.ts` | Export new HorsesTable |
| `src/i18n/locales/en.ts` | Add new i18n keys |
| `src/i18n/locales/ar.ts` | Add new Arabic translations |

---

## New i18n Keys Summary

**Total new keys: ~28 keys**

Categories:
- `horses.masterData.*` (dialog titles, field labels)
- `horses.wizard.createNewOwner` (new button label)
- `horses.table.*` (table column headers for new table view)

---

## Verification Gates

| Gate | Test | Expected Result |
|------|------|-----------------|
| **Gate 1** | Click inline "+" in ownership step | Adds new owner row (does NOT open modal) |
| **Gate 1** | Click top "Create new owner" button | Opens Add New Owner modal |
| **Gate 1** | Create owner in modal | New owner appears in dropdown |
| **Gate 2** | Add 2 owners, set one as primary | Shows "Primary Owner" + "Owner 2" |
| **Gate 2** | Toggle primary to other owner | Labels swap correctly, no "Owner 1" |
| **Gate 3** | Switch to Arabic, open Add Owner dialog | All labels in Arabic |
| **Gate 3** | Switch to Arabic, open Add Breed dialog | All labels in Arabic |
| **Gate 4** | Select Table view in horses list | Real table with columns renders |
| **Gate 5** | Select Grid 4-columns | Cards render properly, no overflow |

---

## Technical Details

### Owner Labeling Algorithm

```typescript
// Calculate non-primary index (0-based, excluding primary owners)
const getNonPrimaryIndex = (owners, currentIndex) => {
  let count = 0;
  for (let i = 0; i < currentIndex; i++) {
    if (!owners[i].is_primary) count++;
  }
  return count;
};

// Label: "Owner {index + 2}" since Owner 1 = Primary
const label = owner.is_primary 
  ? t('horses.wizard.primaryOwner')
  : t('horses.wizard.ownerNumber').replace('{{number}}', String(getNonPrimaryIndex(owners, index) + 2));
```

### AddMasterDataDialog i18n Approach

```typescript
export const AddMasterDataDialog = ({ ... }: AddMasterDataDialogProps) => {
  const { t } = useI18n();
  
  // Move config inside component to use t()
  const typeConfig = useMemo(() => ({
    color: {
      title: t('horses.masterData.color.title'),
      fields: [
        { key: "name", label: t('horses.masterData.color.nameEn'), required: true },
        { key: "name_ar", label: t('horses.masterData.color.nameAr') },
      ],
    },
    // ... other types
  }), [t]);
  
  // ... rest of component
};
```
