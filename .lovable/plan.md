

# Fix Plan: Scope Selector Header RTL + Date Layout

## Root Causes

### Task A — RTL/LTR header alignment
**File:** `src/components/ui/sheet.tsx` line 81 + `src/components/clients/StatementScopeSelector.tsx` line 116-118

The `SheetHeader` uses `sm:text-left` (line 81) which is hardcoded LTR. In RTL, text should align to `text-start` instead. The close (X) button positioning (line 67-68) is already RTL-aware (`isRTL ? "left-4" : "right-4"`), so that's fine.

The real issue: `SheetHeader` uses `sm:text-left` instead of `sm:text-start`. This means in RTL the title/description text aligns left (wrong side). Fix: change to `sm:text-start` in `SheetHeader`.

### Task B — From/To stacked on desktop
**File:** `src/components/clients/StatementScopeSelector.tsx` lines 124-147

The date range container uses `space-y-2` (vertical stack) with no responsive grid. Both date rows are always stacked. Fix: use `grid grid-cols-1 sm:grid-cols-2 gap-3` so they sit side-by-side on desktop, with label above each input.

## Changes

### 1. `src/components/ui/sheet.tsx` — SheetHeader (line 81)
Change `sm:text-left` → `sm:text-start` for RTL-safe alignment.

### 2. `src/components/clients/StatementScopeSelector.tsx` — Date range section (lines 124-147)
Replace the stacked layout with a responsive grid where each cell has label above input:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div className="space-y-1">
    <label className="text-sm font-medium text-foreground">
      {t("clients.statement.scope.dateFrom")}
    </label>
    <Input type="date" value={dateFrom} onChange={...} />
  </div>
  <div className="space-y-1">
    <label className="text-sm font-medium text-foreground">
      {t("clients.statement.scope.dateTo")}
    </label>
    <Input type="date" value={dateTo} onChange={...} />
  </div>
</div>
```

## Verification Checklist
- **RTL desktop:** Title "نطاق كشف الحساب" aligns to the right (start), X on the left — correct
- **LTR desktop:** Title aligns left (start), X on the right — correct
- **Desktop (both dirs):** From/To date inputs appear side-by-side in one row, labels above
- **Mobile (both dirs):** Date inputs stack vertically, labels above each

