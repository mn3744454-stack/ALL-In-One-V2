# RTL & Arabic Typography Guidelines

This document describes the global RTL and Arabic typography system used in Khail.

## Font System

We use a **CSS variable-based font system** that allows the Arabic font to apply globally when `lang="ar"` is set on the `<html>` element.

### CSS Variables (in `src/index.css`)

```css
:root {
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-display: "Playfair Display", Georgia, serif;
}

html[lang="ar"] {
  --font-sans: "IBM Plex Sans Arabic", system-ui, sans-serif;
  --font-display: "IBM Plex Sans Arabic", system-ui, sans-serif;
}
```

### Tailwind Configuration

In `tailwind.config.ts`, fonts reference these CSS variables:

```typescript
fontFamily: {
  sans: ["var(--font-sans)", "system-ui", "sans-serif"],
  display: ["var(--font-display)", "Georgia", "serif"],
}
```

This means **any element using Tailwind's default font stack or `font-sans` will automatically get the Arabic font when Arabic is active**.

## RTL Direction

The `I18nContext` automatically sets:
- `document.documentElement.lang = lang` (e.g., "ar" or "en")
- `document.documentElement.dir = dir` (e.g., "rtl" or "ltr")

All components should inherit direction automatically.

## RTL-Safe CSS Classes

### Banned (Physical Direction Classes)

These classes don't flip in RTL and should be avoided:

| Banned Class | RTL-Safe Replacement |
|--------------|---------------------|
| `ml-*` | `ms-*` (margin-inline-start) |
| `mr-*` | `me-*` (margin-inline-end) |
| `pl-*` | `ps-*` (padding-inline-start) |
| `pr-*` | `pe-*` (padding-inline-end) |
| `left-*` | `start-*` |
| `right-*` | `end-*` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `space-x-*` | `gap-*` |
| `rounded-l-*` | `rounded-s-*` |
| `rounded-r-*` | `rounded-e-*` |

### RTL Modifiers

Use Tailwind's `rtl:` modifier for RTL-specific styles:

```tsx
// Reverse flex direction in RTL
<div className="flex rtl:flex-row-reverse">

// Justify to end in RTL
<div className="flex justify-start rtl:justify-end">
```

## Audit Scripts

### Run i18n Audit

```bash
npm run audit:i18n
```

Checks for missing translation keys.

### Run RTL Audit

```bash
npm run audit:rtl
```

Scans for banned physical direction classes. Edit `scripts/rtl-allowlist.json` to add exceptions for UI primitives.

## Verification Checklist

When switching to Arabic:

1. **Font**: Open DevTools → Computed → `font-family` should show `"IBM Plex Sans Arabic"` for body, buttons, inputs, chips, tabs
2. **Direction**: `<html>` should have `lang="ar"` and `dir="rtl"`
3. **Layout**: Tabs start from right, chips flow right-to-left, sidebar opens from right
4. **No regressions in English**: Layout remains LTR, font is IBM Plex Sans / Playfair Display
