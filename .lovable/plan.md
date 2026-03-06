

# Finance Module Focused Audit — Report

## Executive Summary

- **InvoiceFormDialog is non-interactive** because `existingItems = []` default parameter creates a new array reference every render, causing the `useEffect` (line 106) to re-run and reset all form state on every keystroke/selection. This is the definitive root cause — not z-index or pointer-events.
- **Table header/cell alignment mismatch**: `TableHead` base class is `text-center` (table.tsx line 49) but `TableCell` has no default text alignment, causing headers and cells to misalign visually.
- **Actions column header is empty** in both InvoicesList (line 321) and ExpensesList (line 239) — no label text.
- **Grid mode works mechanically** (`getGridClass` is correctly applied) but InvoiceCard and ExpenseCard use a horizontal flex layout that breaks readability at narrow widths (3/4 columns).
- All three issues have clean, minimal fixes with no architectural changes needed.

## Evidence Map

| Component | File | Lines | Finding |
|---|---|---|---|
| InvoiceFormDialog | `InvoiceFormDialog.tsx` | 43, 67-106 | `existingItems = []` default + useEffect dependency → form resets every render |
| Create dialog mount | `DashboardFinance.tsx` | 157-159 | No `existingItems` prop passed → default `[]` kicks in |
| DialogContent | `dialog.tsx` | 42 | `grid` display base, overridden by `flex` — resolved correctly |
| SelectContent | `select.tsx` | 65-89 | Portal with `z-50` base; `z-[60]` override present and working |
| TableHead base | `table.tsx` | 49 | `text-center` default |
| TableCell base | `table.tsx` | 59 | No text alignment default (inherits `text-start`) |
| Invoices table header | `InvoicesList.tsx` | 312-322 | Actions head (321) has no label |
| Invoices date cell | `InvoicesList.tsx` | 339-341 | Missing `whitespace-nowrap` on TableCell date |
| Expenses table header | `ExpensesList.tsx` | 232-240 | Actions head (239) has no label |
| InvoiceCard layout | `InvoiceCard.tsx` | 69 | Horizontal flex (`flex items-start gap-3`) — cramped at narrow grid |
| ExpenseCard layout | `ExpenseCard.tsx` | 89 | Same horizontal flex pattern |

---

## PART A — InvoiceFormDialog Root Cause

### The Definitive Root Cause: `existingItems` Default Array Resets Form

**Mechanism (step by step):**

1. Create Invoice dialog opens — `InvoiceFormDialog` renders with `existingItems` not passed by parent (DashboardFinance.tsx line 157-159).
2. Default parameter `existingItems = []` (line 43) creates a **new array reference** `[]`.
3. `useEffect` at line 67-106 runs, enters the `else if (open && !isEditMode)` branch (line 92), sets `formData` to blank values including `client_id: ""`.
4. User selects a client → `handleClientChange` (line 125) calls `setFormData({...formData, client_id: clientId})`.
5. State updates → component re-renders.
6. On re-render, `existingItems = []` creates another **new** `[]` reference.
7. `useEffect` dependency `existingItems` has changed (new reference) → effect re-runs.
8. `open` is still `true`, `isEditMode` is still `false` → enters reset branch again.
9. `setFormData({client_id: "", ...})` → **user's selection is immediately erased**.
10. Same cycle happens for ANY input change (typing, qty, price).

**This is NOT a z-index, pointer-events, or portal issue.** The inputs DO respond — the state just gets immediately reset.

### Fix

Replace the `useEffect` with a pattern that only initializes on dialog open/close transitions, not on every render:

```
// InvoiceFormDialog.tsx — change useEffect at lines 67-106:
// Use a ref to track whether form has been initialized for current open session.
// On open=true: initialize once. On open=false: mark uninitialized.
// Remove existingItems from dependency array entirely.
```

Concretely:
- Add `const initializedRef = useRef(false)` 
- In the effect: if `!open`, reset `initializedRef.current = false` and return
- If `open && !initializedRef.current`: do the initialization, then set `initializedRef.current = true`
- Dependencies: `[open]` only

This is the standard React dialog form initialization pattern.

### Acceptance Criteria
- [ ] Open Create Invoice → select client → value persists in trigger
- [ ] Type in description/qty/price → text stays, totals update
- [ ] Click Add Item → row added, stays visible
- [ ] Close and reopen → form resets to blank (clean slate)
- [ ] Edit mode → form populates from invoice data, edits persist

---

## PART B — Table Layout Corrections

### Issue 1: Empty Actions Header

- `InvoicesList.tsx` line 321: `<TableHead className="w-[50px]" />` — no label
- `ExpensesList.tsx` line 239: `{canManage && <TableHead className="w-[50px]" />}` — no label

**Fix**: Add `{t("common.actions")}` as content to both TableHead elements.

### Issue 2: Header/Cell Alignment Mismatch

`TableHead` base class is `text-center` (table.tsx line 49). But several cells use `text-start` content (client name, vendor, invoice number) while their headers also say `text-center`. This creates a visual mismatch where header labels are centered but cell data is left-aligned.

**Fix per column (InvoicesList)**:
- Invoice Number (head line 314): add `text-start` to override base `text-center`
- Client (head line 315): add `text-start`
- Date (head line 316): add `whitespace-nowrap`; cell (line 339): add `whitespace-nowrap`
- Numeric columns (total/paid/outstanding): already `text-center` — correct
- Status: `text-center` — correct
- Actions: `text-center` — correct

**Fix per column (ExpensesList)**:
- Date (head line 234): already has `whitespace-nowrap` — correct
- Vendor (head line 235): add `text-start`
- Category (head line 236): add `text-start`
- Amount: `text-center` — correct
- Status: `text-center` — correct
- Actions: add label + `text-center`

### Acceptance Criteria
- [ ] All header labels align with their cell content direction
- [ ] Date columns never wrap on desktop
- [ ] Actions column shows "Actions" / "إجراءات" header
- [ ] Numeric columns remain centered with `tabular-nums`

---

## PART C — Grid Card Readability

### Problem

Both InvoiceCard (line 69) and ExpenseCard (line 89) use `flex items-start gap-3` — a horizontal layout with icon + content + menu side by side. At 3-4 grid columns (~250px card width), the content area squeezes to ~150px, causing:
- Amount text overlaps with menu button
- Client/vendor name truncates to 2-3 characters
- Paid/Outstanding line wraps chaotically

### Fix Strategy

Make cards stack vertically at narrow widths using container-aware responsive design:

**InvoiceCard changes:**
1. Icon: hide at narrow grid widths OR reduce to `w-8 h-8`
2. Content + Menu row: ensure menu is `absolute top-2 right-2` (or `end-2` for RTL) instead of flex sibling, so it doesn't compete for width
3. Amount: move below title instead of beside it (stack vertically)
4. Paid/Outstanding: use `line-clamp-1` and smaller font (`text-[10px]`)
5. Wrap: replace `truncate` with `line-clamp-2` on client name

**ExpenseCard changes:**
- Same pattern: icon shrinks, menu becomes absolute-positioned, amount stacks below title
- Description: `line-clamp-2` instead of `truncate`

### Acceptance Criteria
- [ ] 2-column grid: cards fully readable, no overlaps
- [ ] 3-column grid: all key info visible (number, client, amount, status, menu)
- [ ] 4-column grid: same — may hide secondary info (paid/outstanding) but core data readable
- [ ] Menu (⋯) always accessible, never collides with amount
- [ ] RTL: icon/menu positioning mirrors correctly
- [ ] List mode: no regression (cards still look good full-width)

---

## Gate Plan

### Gate 1: Fix InvoiceFormDialog (Hard Blocker)
**Files**: `src/components/finance/InvoiceFormDialog.tsx`
**Change**: Replace useEffect (lines 67-106) with ref-guarded initialization that runs once per dialog open. Remove `existingItems` from dependency array.
**Verify**: Select client persists, inputs editable, add item works, totals recalculate.

### Gate 2: Table Alignment + Actions Header
**Files**: `src/components/finance/InvoicesList.tsx`, `src/components/finance/ExpensesList.tsx`
**Change**: Add `text-start` to text-column headers, add `whitespace-nowrap` to date cells, add `{t("common.actions")}` to actions column header.
**Verify**: Headers align with cells, dates don't wrap, actions header labeled.

### Gate 3: Card Grid Readability
**Files**: `src/components/finance/InvoiceCard.tsx`, `src/components/finance/ExpenseCard.tsx`
**Change**: Restructure card layout — absolute-position menu, stack content vertically, use `line-clamp` instead of `truncate`, reduce icon at narrow widths.
**Verify**: Cards readable at 2/3/4 columns with no overlaps.

### Regression Risks
- Gate 1: Zero risk — only changes form initialization timing, no external API changes.
- Gate 2: Low risk — CSS class additions only. Verify all table modes in both languages.
- Gate 3: Medium risk — card layout changes affect list mode too. Must verify list + grid + RTL all look correct.

