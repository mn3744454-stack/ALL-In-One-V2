# PWA Install Prompt Implementation Plan

## Current State

- PWA plugin `vite-plugin-pwa`) is **disabled** in `vite.config.ts` (commented out)

- A static `manifest.json` exists with correct icons (192x192, 512x512), theme color `#1a2744`, and `display: standalone`

- A `sw.js` exists for push notifications only (no caching/install logic)

- `index.html` has all required PWA meta tags (apple-touch-icon, apple-mobile-web-app-capable, manifest link)

- No existing PWA install detection or prompt code exists anywhere

- i18n uses `useI18n()` with `t()`, `lang`, `dir` from `src/i18n/I18nContext.tsx`

- Locale files are `src/i18n/locales/en.ts` and `ar.ts`

- App shell renders global toasters at `App.tsx:680-681` level (inside I18nProvider, outside Router)

- Mobile bottom nav is fixed at bottom, `z-50`, hidden on `lg:` breakpoints

- Desktop sidebar is on the start side (right in RTL, left in LTR)

---

## Critical Correction Before Execution

This is not just a visual widget. It must be implemented as a **real installability layer** with correct lifecycle behavior.

### Required behavioral rules

1. The prompt must only appear when it is actually meaningful.

2. It must disappear permanently after successful install.

3. It must not reappear repeatedly after dismissal.

4. It must support:

   - desktop

   - tablet

   - mobile

   - RTL

   - LTR

5. It must not collide with:

   - sidebar

   - bottom nav

   - toast layer

   - fixed action buttons

6. It must not introduce aggressive caching or stale PWA issues.

7. It must be globally mounted once, not duplicated per page.

8. It must be implemented with a clean internal state model, not ad hoc component state.

---

## What Needs to Happen

### 1. Re-enable PWA plugin (minimal, for installability)

Re-enable `VitePWA` in `vite.config.ts` with `registerType: "prompt"`.

### 1.1 Execution rules for this step

- Use minimal safe config only

- Do **not** enable aggressive `autoUpdate`

- Do **not** introduce heavy caching

- Reuse existing `manifest.json`

- Do not create a second manifest source of truth

- Keep installability behavior safe and predictable

### 1.2 Required output for this step

Confirm exactly:

- whether `beforeinstallprompt` will be enabled after this step

- whether existing manifest is reused

- whether any runtime caching was added, and why

---

### 2. Create `usePWAInstall` hook

**File:** `src/hooks/usePWAInstall.ts`

Responsibilities:

- Listen for `beforeinstallprompt`, store deferred prompt

- Detect if already installed via `display-mode: standalone` + `navigator.standalone` (iOS)

- Detect iOS Safari (no `beforeinstallprompt`, show manual instructions)

- Track dismiss state in `localStorage`

- Track installed state in `localStorage`

### 2.1 Correction to implementation requirements

Use app-specific storage keys, not generic keys.

Use:

- `khail:pwa-install-dismissed-at`

- `khail:pwa-installed`

### 2.2 Suppression behavior

- Dismissal suppresses the prompt for **7 days**

- Install hides it permanently

- Prompt must not flicker on every route change

- Prompt must not show if already in standalone mode

### 2.3 Hook API

Expose:

- `isInstallable`

- `isIOS`

- `isInstalled`

- `showPrompt`

- `dismiss`

- `triggerInstall`

### 2.4 Required output for this step

Explain exactly:

- how install detection works

- how iOS detection works

- how dismissal persistence works

- how installed persistence works

---

### 3. Create `PWAInstallPrompt` component

**File:** `src/components/pwa/PWAInstallPrompt.tsx`

A single responsive component that adapts layout by breakpoint.

### 3.1 Desktop/Tablet behavior

- Floating card

- Positioned bottom-end opposite the sidebar

- In RTL: bottom-left

- In LTR: bottom-right

- Must not overlap the sidebar

- Must not hide important controls

- Must use safe z-index above app content

### 3.2 Mobile behavior

- Bottom sheet-style card

- Positioned above the mobile bottom nav

- Must respect nav height and safe spacing

- Must not cover important fixed actions

### 3.3 Visual requirements

- App icon from `/icons/icon-192x192.png`

- Title + subtitle from i18n

- Install CTA

- Dismiss CTA

- Rounded card

- Elegant shadow

- Clean spacing

- Native-feeling transitions

- Styling must feel consistent with Khail, not generic browser UI

### 3.4 iOS mode

On iOS Safari:

- Do not fake a native install prompt

- Show manual install guidance instead

- Include:

  - share button hint

  - Add to Home Screen instruction

### 3.5 UX timing

- Do not show immediately in a jarring way before the app shell settles

- Use a small intentional delay if needed

- Make it feel calm and deliberate

### 3.6 Required output for this step

Report separately:

- desktop behavior

- tablet behavior

- mobile behavior

- RTL placement

- LTR placement

- iOS mode behavior

---

### 4. Add i18n keys

Add to both `en.ts` and `ar.ts` under a new `pwa` section:

```ts

pwa: {

  installTitle: "Install App",

  installSubtitle: "Install the app for faster access and a better experience",

  installNow: "Install Now",

  notNow: "Not now",

  iosTitle: "Install Khail",

  iosStep1: "Tap the Share button",

  iosStep2: "Then tap \"Add to Home Screen\"",

}