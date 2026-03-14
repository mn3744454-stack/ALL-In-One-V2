# PWA Install Prompt — Corrective Pass

## Problems Identified

1. **Build failure**: `maximumFileSizeToCacheInBytes` not set in workbox config — the 4 MB main bundle exceeds the default 2 MiB limit, blocking the entire build.

2. **Banner never appears on desktop**: `showPrompt` depends on `beforeinstallprompt` firing. If the event doesn't fire (common in preview environments, non-Chromium browsers), the banner is permanently invisible.

3. **7-day dismissal suppression**: Dismiss writes a timestamp to `localStorage` and suppresses the banner for 7 days. This is rejected — banner must return on every reload/reopen.

4. **Behavior requirement updated**: The install banner must appear every time the user opens the app on desktop/tablet/mobile as long as the app is not installed yet. It must disappear only after actual installation.

5. **Fallback path required**: If native install prompt is unavailable, the banner must still appear with graceful fallback guidance instead of disappearing silently.

## Fixes (4 files modified, 0 files created)

### 1. `vite.config.ts`

- Add `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` inside `workbox` config to fix the build error.

- Keep `registerType: "prompt"`.

- Reuse existing public manifest.

- Keep runtime caching minimal and safe.

- Do not introduce aggressive auto-update behavior.

### 2. `src/hooks/usePWAInstall.ts` — Full rewrite

- **Remove**:

  - `DISMISS_DURATION_MS`

  - `isDismissedRecently()`

  - any timestamp-based localStorage suppression

  - `khail:pwa-install-dismissed-at`

- **Keep installed persistence only**:

  - `khail:pwa-installed`

- **Dismiss becomes session-only**:

  - `dismiss()` only sets in-memory React state

  - no localStorage write for dismissal

  - after reload/reopen, the banner appears again if not installed

- **Banner visibility must no longer depend on `beforeinstallprompt`**

- **New visibility rule**:

  - `showPrompt = !isInstalled && !dismissed`

- **Add install mode classification**:

  - `installHelpMode: "none" | "ios" | "fallback"`

  - `ios` for iOS Safari

  - `none` when native deferred prompt exists

  - `fallback` for non-iOS without deferred prompt

- **Keep native prompt support**:

  - still listen for `beforeinstallprompt`

  - store deferred prompt when available

  - use it for the real install CTA

  - but do not make banner visibility depend on it

- **Keep install detection**:

  - `(display-mode: standalone)`

  - `navigator.standalone === true`

  - `khail:pwa-installed === "true"`

- **Keep `appinstalled` listener**:

  - mark installed in localStorage

  - hide banner permanently

- **Expose debug object**:

  - `isStandalone`

  - `isInstalled`

  - `isIOS`

  - `isChromiumLike`

  - `hasDeferredPrompt`

  - `canPromptInstall`

  - `bannerVisibleReason`

  - `serviceWorkerSupported`

  - `serviceWorkerControllerPresent`

- **Add dev-only logs** with prefix `[PWA Install]`:

  - init

  - beforeinstallprompt fired

  - appinstalled

  - fallback path used

  - dismissed (session only)

  - triggerInstall called

### 3. `src/components/pwa/PWAInstallPrompt.tsx` — Three UI states

Keep the existing responsive component, but explicitly support 3 states:

#### State A — Native install available

- Standard install card

- Title

- Subtitle

- Install button

- Dismiss button

- Install button triggers deferred prompt

#### State B — iOS manual install

- iOS-specific title

- Step 1: Share button

- Step 2: Add to Home Screen

- Dismiss button

- Use relevant icons

#### State C — Fallback help mode

- Show banner even when no native prompt exists

- Title

- Subtitle

- Hint text telling user to use browser install option/menu

- Dismiss button

- Use appropriate browser/desktop icon

- Do NOT hide the banner in this case

#### Shared behavior

- Keep app icon visible

- Preserve current elegant floating-card style

- Desktop/Tablet:

  - fixed floating card

  - bottom-right in LTR

  - bottom-left in RTL

  - opposite the sidebar

- Mobile:

  - bottom-sheet style

  - positioned above mobile bottom navigation

- Keep smooth transitions

- Reduce appearance delay from `2500ms` to about `800ms`

- If installed, component returns `null`

### 4. `src/i18n/locales/en.ts` + `src/i18n/locales/ar.ts`

Extend the existing `pwa` section with fallback keys.

#### English

```ts

pwa: {

  installTitle: "Install App",

  installSubtitle: "Install the app for faster access and a better experience",

  installNow: "Install Now",

  notNow: "Not now",

  iosTitle: "Install Khail",

  iosStep1: "Tap the Share button",

  iosStep2: "Then tap \"Add to Home Screen\"",

  fallbackTitle: "Install App",

  fallbackSubtitle: "Get faster access by installing this app on your device",

  fallbackHint: "Use your browser's install option or menu to add this app to your device."

}