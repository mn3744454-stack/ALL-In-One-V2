# Stabilization Release: Fonts + RTL + i18n

This document outlines the stabilization gate implemented for Arabic typography and RTL layout support.

## Commands to Run

### Verify i18n
```bash
npm run audit:i18n
```
Expected: 0 missing keys (exit code 0)

### Verify RTL classes
```bash
npm run audit:rtl
```
Expected: 0 violations (except allowlisted patterns)

### Build verification
```bash
npm run build
```
Expected: Build succeeds with no errors

### Type checking
```bash
npx tsc --noEmit
```
Expected: No type errors

---

## Smoke Test Checklist

### English Mode
- [ ] Font: IBM Plex Sans across all UI (check in DevTools computed style)
- [ ] Layout: LTR orientation (`<html dir="ltr">`)
- [ ] Navigation: Sidebar items aligned to left
- [ ] Tabs: Order left-to-right
- [ ] Chips/badges: Flow left-to-right
- [ ] BottomNav: Positioned correctly on mobile

### Arabic Mode
- [ ] Font: IBM Plex Sans Arabic across **ALL** text elements:
  - [ ] Headings
  - [ ] Buttons
  - [ ] Chips/badges
  - [ ] Inputs
  - [ ] Cards
  - [ ] Sidebar items
  - [ ] Dialogs
  - [ ] Tabs
- [ ] Layout: RTL orientation (`<html lang="ar" dir="rtl">`)
- [ ] Navigation: Sidebar border on right side (border-s)
- [ ] Tabs: Order starts from right
- [ ] Chips/badges: Align to right within cards
- [ ] BottomNav: Positioned correctly on mobile
- [ ] Icons with arrows: Rotated 180° in RTL (e.g., ChevronRight)

---

## Font Verification Steps

1. Open app in browser
2. Switch to Arabic via language selector
3. Open DevTools → Elements
4. Select any text element (button, chip, input, card text)
5. Check Computed tab → `font-family`
6. **Verify**: `"IBM Plex Sans Arabic"` appears FIRST in the list

### Font Cascade

The font system uses CSS variables for consistent application:

```css
:root {
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
}

html[lang="ar"] {
  --font-sans: "IBM Plex Sans Arabic", system-ui, sans-serif;
}
```

All elements inherit via `* { font-family: inherit; }`.

---

## RTL Verification Steps

1. Inspect `<html>` element in DevTools
2. Confirm: `lang="ar"` AND `dir="rtl"` are present
3. Navigate to Laboratory → Samples
4. Confirm: Filter tabs start from RIGHT
5. Confirm: Template badges in cards align RIGHT
6. Check BottomNav: Icons evenly distributed
7. Navigate to Movement page - verify same RTL behavior
8. Open any dialog - verify content is RTL-aligned

---

## RTL-Safe Classes Reference

Use these RTL-safe Tailwind utilities instead of physical direction classes:

| ❌ Avoid | ✅ Use Instead |
|----------|----------------|
| `ml-*` | `ms-*` (margin-inline-start) |
| `mr-*` | `me-*` (margin-inline-end) |
| `pl-*` | `ps-*` (padding-inline-start) |
| `pr-*` | `pe-*` (padding-inline-end) |
| `left-*` | `start-*` |
| `right-*` | `end-*` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `border-l-*` | `border-s-*` |
| `border-r-*` | `border-e-*` |
| `rounded-l-*` | `rounded-s-*` |
| `rounded-r-*` | `rounded-e-*` |
| `left-0 right-0` | `inset-x-0` |
| `space-x-*` | `gap-*` (preferred) |

### Using the useRTL Hook

For conditional RTL logic in components:

```tsx
import { useRTL } from '@/hooks/useRTL';

function MyComponent() {
  const { isRTL, rtlClass } = useRTL();
  
  return (
    <div className={rtlClass('rotate-0', 'rotate-180')}>
      <ChevronRight />
    </div>
  );
}
```

---

## Audit Scripts

### `npm run audit:i18n`
Scans for missing translation keys in `en.ts` and `ar.ts` locale files.

### `npm run audit:rtl`
Scans for physical direction CSS classes that break RTL layouts.

Banned patterns include:
- `ml-*`, `mr-*`, `pl-*`, `pr-*`
- `left-*`, `right-*`
- `text-left`, `text-right`
- `space-x-*`
- `border-l-*`, `border-r-*`
- `rounded-l-*`, `rounded-r-*`

Exceptions are documented in `scripts/rtl-allowlist.json`.

---

## Files Modified in This Stabilization

| File | Changes |
|------|---------|
| `src/index.css` | Added `* { font-family: inherit; }` for font cascade |
| `src/hooks/useRTL.ts` | NEW - reusable RTL hook |
| `src/components/laboratory/LabBottomNavigation.tsx` | `left-0 right-0` → `inset-x-0` |
| `src/components/movement/MovementBottomNav.tsx` | `left-0 right-0` → `inset-x-0` |
| `src/components/dashboard/NavGroup.tsx` | `ml-6 pl-3 border-l-2` → `ms-6 ps-3 border-s-2` |
| `src/components/laboratory/CreateSampleDialog.tsx` | `ml-*`/`mr-*` → `ms-*`/`me-*` |
| `src/components/laboratory/HorseLabSection.tsx` | `ml-1` → `ms-1` + RTL icon rotation |
| `src/components/laboratory/LabCreditsPanel.tsx` | `ml-*`/`mr-*` → `ms-*`/`me-*` |
| `src/components/horses/wizard/StepRegistration.tsx` | `space-x-3` → `gap-3`, `ml-2` → `ms-2` |
| `src/components/horses/TransferOwnershipDialog.tsx` | `space-x-2` → `gap-2` |
| `scripts/rtl-allowlist.json` | Expanded allowlist for UI primitives |
